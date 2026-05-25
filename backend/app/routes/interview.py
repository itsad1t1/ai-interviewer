import os
from fastapi import APIRouter, Depends, HTTPException, Header, File, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from app.database import SessionLocal
from app.models.interview import InterviewSession, UserBilling
from app.services.evaluator import evaluate_interview

router = APIRouter()

# DB Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Request schemas
class StartInterviewRequest(BaseModel):
    user_id: Optional[str] = None
    company_name: str
    role: str
    difficulty: str
    interview_type: str
    questions: List[Dict[str, Any]]

class SubmitAnswerRequest(BaseModel):
    question_idx: int
    answer: str
    duration_seconds: Optional[int] = 0

@router.post("/start")
def start(data: StartInterviewRequest, x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    # Use header user id as fallback if not in JSON body
    uid = data.user_id or x_user_id
    if not uid:
        raise HTTPException(status_code=400, detail="User ID is required")
        
    # Get or create billing profile
    billing = db.query(UserBilling).filter(UserBilling.user_id == uid).first()
    if not billing:
        billing = UserBilling(user_id=uid, credits=5)
        db.add(billing)
        db.commit()
        db.refresh(billing)
        
    if billing.credits < 1:
        raise HTTPException(
            status_code=403, 
            detail="Insufficient credits. Please purchase credits to start a mock interview."
        )
        
    # Deduct 1 credit
    billing.credits -= 1
    db.add(billing)
    
    session_id = str(uuid.uuid4())
    new_session = InterviewSession(
        id=session_id,
        user_id=uid,
        company_name=data.company_name,
        role=data.role,
        difficulty=data.difficulty,
        interview_type=data.interview_type,
        questions=data.questions,
        answers=[],
        status="started"
    )
    
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    return {
        "session_id": session_id,
        "message": "Interview Started successfully"
    }

@router.post("/{session_id}/answer")
def submit_answer(session_id: str, data: SubmitAnswerRequest, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    # Get current answers and update or append
    answers = list(session.answers or [])
    
    # Check if we already answered this index
    existing_idx = -1
    for i, ans in enumerate(answers):
        if ans.get("question_idx") == data.question_idx:
            existing_idx = i
            break
            
    new_answer = {
        "question_idx": data.question_idx,
        "answer": data.answer,
        "duration_seconds": data.duration_seconds
    }
    
    if existing_idx != -1:
        answers[existing_idx] = new_answer
    else:
        answers.append(new_answer)
        
    # Mark modified for JSON field in SQLAlchemy
    session.answers = answers
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return {"message": f"Answer for question {data.question_idx} saved"}

@router.post("/{session_id}/finish")
def finish_interview(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    # Evaluate using AI Evaluator
    report = evaluate_interview(
        company_name=session.company_name,
        role=session.role,
        difficulty=session.difficulty,
        interview_type=session.interview_type,
        questions=session.questions or [],
        answers=session.answers or []
    )
    
    session.score = report.get("overall_score", 0)
    session.evaluation_report = report
    session.status = "completed"
    
    db.add(session)
    db.commit()
    db.refresh(session)
    
    return report

@router.get("/history")
def get_history(user_id: Optional[str] = None, x_user_id: Optional[str] = Header(None), db: Session = Depends(get_db)):
    uid = user_id or x_user_id
    if not uid:
        # If no user_id is provided, return all completed sessions for testing/anonymous fallback
        sessions = db.query(InterviewSession).filter(InterviewSession.status == "completed").order_by(InterviewSession.created_at.desc()).all()
    else:
        sessions = db.query(InterviewSession).filter(
            InterviewSession.user_id == uid,
            InterviewSession.status == "completed"
        ).order_by(InterviewSession.created_at.desc()).all()
        
    return [
        {
            "session_id": s.id,
            "company_name": s.company_name,
            "role": s.role,
            "difficulty": s.difficulty,
            "interview_type": s.interview_type,
            "score": s.score,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "evaluation_report": s.evaluation_report
        }
        for s in sessions
    ]

@router.get("/{session_id}")
def get_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    return {
        "session_id": session.id,
        "user_id": session.user_id,
        "company_name": session.company_name,
        "role": session.role,
        "difficulty": session.difficulty,
        "interview_type": session.interview_type,
        "questions": session.questions,
        "answers": session.answers,
        "status": session.status,
        "score": session.score,
        "evaluation_report": session.evaluation_report,
        "created_at": session.created_at.isoformat() if session.created_at else None
    }

@router.post("/{session_id}/recording/{question_idx}")
async def upload_recording(session_id: str, question_idx: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    session = db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Interview session not found")
        
    recordings_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads/recordings"))
    os.makedirs(recordings_dir, exist_ok=True)
    
    filename = f"{session_id}_{question_idx}.webm"
    filepath = os.path.join(recordings_dir, filename)
    
    try:
        with open(filepath, "wb") as f:
            content = await file.read()
            f.write(content)
            
        answers = list(session.answers or [])
        updated = False
        
        for ans in answers:
            if ans.get("question_idx") == question_idx:
                ans["video_url"] = f"http://localhost:8000/interview/recording/{session_id}/{question_idx}"
                updated = True
                break
                
        if not updated:
            answers.append({
                "question_idx": question_idx,
                "answer": "",
                "video_url": f"http://localhost:8000/interview/recording/{session_id}/{question_idx}"
            })
            
        session.answers = answers
        db.add(session)
        db.commit()
        
        return {
            "message": "Recording saved successfully",
            "video_url": f"http://localhost:8000/interview/recording/{session_id}/{question_idx}"
        }
    except Exception as e:
        print("RECORDING WRITE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to save recording binary: {str(e)}")

@router.get("/recording/{session_id}/{question_idx}")
def get_recording(session_id: str, question_idx: int):
    recordings_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads/recordings"))
    filepath = os.path.join(recordings_dir, f"{session_id}_{question_idx}.webm")
    
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Recording file not found")
        
    from fastapi.responses import FileResponse
    return FileResponse(filepath, media_type="video/webm")