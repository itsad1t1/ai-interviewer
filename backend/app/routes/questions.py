from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from app.services.question_generator import generate_questions

router = APIRouter()

class QuestionRequest(BaseModel):
    resume_text: str
    job_description: str
    analysis: Dict[str, Any]
    company_name: Optional[str] = "Target Company"
    role: Optional[str] = "Software Engineer"
    difficulty: Optional[str] = "Medium"
    interview_type: Optional[str] = "Technical"

@router.post("/generate")
def generate(data: QuestionRequest):
    questions_response = generate_questions(
        resume_text=data.resume_text,
        job_description=data.job_description,
        analysis=data.analysis,
        company_name=data.company_name,
        role=data.role,
        difficulty=data.difficulty,
        interview_type=data.interview_type
    )
    
    # Return questions array directly
    return questions_response