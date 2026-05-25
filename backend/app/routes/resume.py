import os
import uuid
from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
from app.services.resume_parser import parse_pdf, parse_docx
from app.services.ai_analyzer import analyze_candidate

router = APIRouter()

class AnalyzeRequest(BaseModel):
    resume_text: str
    job_description: str

@router.post("/upload")
async def upload_resume(file: UploadFile = File(...)):
    filename = file.filename
    ext = os.path.splitext(filename)[1].lower()
    if ext not in [".pdf", ".docx"]:
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported")
    
    # Target directory for temporary files
    upload_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../uploads"))
    os.makedirs(upload_dir, exist_ok=True)
    
    temp_filename = f"{uuid.uuid4()}{ext}"
    temp_filepath = os.path.join(upload_dir, temp_filename)
    
    try:
        # Write contents to temporary file
        with open(temp_filepath, "wb") as f:
            content = await file.read()
            f.write(content)
        
        # Parse depending on file extension
        if ext == ".pdf":
            parsed_text = parse_pdf(temp_filepath)
        else:
            parsed_text = parse_docx(temp_filepath)
            
        return {
            "filename": filename,
            "parsed_text": parsed_text
        }
    except Exception as e:
        print("RESUME PARSE ROUTE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Failed to parse resume file: {str(e)}")
    finally:
        # Cleanup temporary file
        if os.path.exists(temp_filepath):
            os.remove(temp_filepath)

@router.post("/analyze")
def analyze(data: AnalyzeRequest):
    analysis = analyze_candidate(data.resume_text, data.job_description)
    return {
        "analysis": analysis
    }