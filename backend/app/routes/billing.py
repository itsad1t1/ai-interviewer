import os
from fastapi import APIRouter, Depends, HTTPException, Header, Request
from fastapi.responses import RedirectRedirect, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
import stripe

from app.database import SessionLocal
from app.models.interview import UserBilling
from app.routes.interview import get_db

router = APIRouter()

# Initialize stripe key
stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

class CheckoutRequest(BaseModel):
    user_id: str
    plan: str # "basic" (5 credits, $5) or "pro" (15 credits, $12)

# Helper function to get or create billing profile
def get_or_create_billing(user_id: str, db: Session) -> UserBilling:
    profile = db.query(UserBilling).filter(UserBilling.user_id == user_id).first()
    if not profile:
        profile = UserBilling(
            user_id=user_id,
            credits=5, # 5 free credits default
            subscription_status="inactive"
        )
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile

@router.get("/credits")
def get_credits(user_id: Optional[str] = None, x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    uid = user_id or x_user_id
    if not uid:
        raise HTTPException(status_code=400, detail="X-User-Id header or user_id query param required")
    
    profile = get_or_create_billing(uid, db)
    return {
        "credits": profile.credits,
        "subscription_status": profile.subscription_status
    }

@router.post("/checkout-session")
def create_checkout_session(data: CheckoutRequest, db: Session = Depends(get_db)):
    user_id = data.user_id
    plan = data.plan
    
    # Define credit addition and pricing
    credit_amount = 5 if plan == "basic" else 15
    price_cents = 500 if plan == "basic" else 1200
    
    # Check if Stripe is configured
    if not stripe.api_key:
        # STRIPE FALLBACK DEV MODE: Return a simulated URL
        # We redirect to our local backend simulator endpoint
        simulator_url = f"http://localhost:8000/billing/simulate-success?user_id={user_id}&credits={credit_amount}"
        return {
            "checkout_url": simulator_url,
            "mode": "simulation"
        }
        
    try:
        # Real Stripe checkout session
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[{
                "price_data": {
                    "currency": "usd",
                    "product_data": {
                        "name": f"AI Interviewer {credit_amount} Credits Pack",
                        "description": f"Adds {credit_amount} interview tokens to your SaaS account.",
                    },
                    "unit_amount": price_cents,
                },
                "quantity": 1,
            }],
            mode="payment",
            success_url=f"http://localhost:5173/?payment=success&credits={credit_amount}",
            cancel_url="http://localhost:5173/?payment=cancelled",
            metadata={
                "user_id": user_id,
                "credits": str(credit_amount)
            }
        )
        return {
            "checkout_url": session.url,
            "mode": "stripe"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create Stripe Checkout: {str(e)}")

@router.get("/simulate-success")
def simulate_success(user_id: str, credits: int, db: Session = Depends(get_db)):
    """
    Developer fallback endpoint to simulate stripe webhook credit additions.
    Increments database credits and redirects the user back to the React app dashboard.
    """
    profile = get_or_create_billing(user_id, db)
    profile.credits += credits
    db.add(profile)
    db.commit()
    
    # Redirect back to frontend dashboard with success query param
    return RedirectResponse(url=f"http://localhost:5173/?payment=success&credits={credits}")

@router.post("/claim-free")
def claim_free_credits(user_id: Optional[str] = None, x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """
    Allows developers or testing accounts to claim 5 free test credits.
    """
    uid = user_id or x_user_id
    if not uid:
        raise HTTPException(status_code=400, detail="User ID is required")
        
    profile = get_or_create_billing(uid, db)
    profile.credits += 5
    db.add(profile)
    db.commit()
    
    return {
        "message": "5 free trial credits added",
        "credits": profile.credits
    }

@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Validates and processes checkout completion payloads sent from Stripe.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")
        
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        
        user_id = session.get("metadata", {}).get("user_id")
        credits_to_add = int(session.get("metadata", {}).get("credits", "0"))
        
        if user_id and credits_to_add > 0:
            profile = get_or_create_billing(user_id, db)
            profile.credits += credits_to_add
            db.add(profile)
            db.commit()
            print(f"Stripe billing: Added {credits_to_add} credits to user {user_id}")
            
    return {"status": "success"}
