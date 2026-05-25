from fastapi import APIRouter

router = APIRouter()

@router.post("/signup")
def signup():
    return {"message": "Signup working"}

@router.post("/login")
def login():
    return {"message": "Login working"}