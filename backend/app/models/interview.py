from sqlalchemy import Column, String, Integer, Text, DateTime, JSON
from app.database import Base
import datetime
import uuid

class InterviewSession(Base):
    __tablename__ = "interview_sessions"

    id = Column(String, primary_key=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, index=True, nullable=True)
    company_name = Column(String, nullable=True)
    role = Column(String, nullable=True)
    difficulty = Column(String, nullable=True)
    interview_type = Column(String, nullable=True)
    questions = Column(JSON, nullable=True)  # Store JSON array of questions
    answers = Column(JSON, default=list)      # Store JSON array of responses: [{"question_idx": 0, "answer": "..."}]
    status = Column(String, default="started") # "started", "completed"
    score = Column(Integer, nullable=True)
    evaluation_report = Column(JSON, nullable=True) # Full AI evaluation details
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class UserBilling(Base):
    __tablename__ = "user_billings"

    user_id = Column(String, primary_key=True, index=True)
    credits = Column(Integer, default=5) # Default 5 free credits on signup
    subscription_status = Column(String, default="inactive") # "active", "inactive"
    stripe_customer_id = Column(String, nullable=True)
    stripe_subscription_id = Column(String, nullable=True)

