from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import (
    engine,
    Base
)

# Import models so SQLAlchemy creates their tables on startup
from app.models.interview import InterviewSession

from app.routes.auth import (
    router as auth_router
)

from app.routes.resume import (
    router as resume_router
)

from app.routes.questions import (
    router as question_router
)

from app.routes.interview import (
    router as interview_router
)

from app.routes.billing import (
    router as billing_router
)

Base.metadata.create_all(
    bind=engine
)

app = FastAPI(title="AI Interviewer API")
# Add CORS Middleware to support frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for dev simplicity
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(
    auth_router,
    prefix="/auth",
    tags=["Authentication"]
)

app.include_router(
    resume_router,
    prefix="/resume",
    tags=["Resume"]
)

app.include_router(
    question_router,
    prefix="/questions",
    tags=["Questions"]
)

app.include_router(
    interview_router,
    prefix="/interview",
    tags=["Interview"]
)

app.include_router(
    billing_router,
    prefix="/billing",
    tags=["Billing"]
)


@app.get("/")
def home():
    return {
        "message":"AI Interviewer API Running"
    }