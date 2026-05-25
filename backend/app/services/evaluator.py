import os
import re
import google.generativeai as genai
from dotenv import load_dotenv
from app.utils.json_parser import extract_and_parse_json

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.0-flash")

def evaluate_interview(company_name, role, difficulty, interview_type, questions, answers):
    """
    Grades the candidate's answers based on the role, company, difficulty,
    calculates communication pacing and filler word usage, and evaluates performance.
    """
    filler_words = ["like", "um", "uh", "basically", "so", "actually", "literally", "you know"]
    
    total_words = 0
    total_duration = 0
    total_fillers = 0
    
    qa_list = []
    # Convert answers list to map for easy lookup: {question_idx: {answer, duration_seconds, video_url}}
    answers_map = {}
    for item in answers:
        if isinstance(item, dict) and "question_idx" in item:
            answers_map[item["question_idx"]] = item
            
    for idx, q in enumerate(questions):
        q_text = q.get("question", "")
        q_type = q.get("type", "text")
        
        ans_item = answers_map.get(idx, {})
        ans_text = ans_item.get("answer", "")
        duration = ans_item.get("duration_seconds", 0) or 0
        video_url = ans_item.get("video_url", "")
        
        # Calculate word count
        words = len(re.findall(r'\w+', ans_text))
        total_words += words
        total_duration += duration
        
        # Count filler words
        filler_count = 0
        ans_lower = ans_text.lower()
        for fw in filler_words:
            matches = re.findall(rf'\b{fw}\b', ans_lower)
            filler_count += len(matches)
        total_fillers += filler_count
        
        # Compute pacing (words per minute)
        wpm = 0
        if duration > 0:
            wpm = int((words / duration) * 60)
        else:
            wpm = 120 if ans_text.strip() else 0
            
        qa_list.append({
            "index": idx,
            "category": q.get("category", "technical"),
            "type": q_type,
            "question": q_text,
            "candidate_answer": ans_text if ans_text.strip() else "(No answer provided)",
            "words_count": words,
            "duration_seconds": duration,
            "filler_words_count": filler_count,
            "wpm": wpm,
            "video_url": video_url
        })
        
    # Calculate overall pacing rating
    overall_wpm = int((total_words / total_duration) * 60) if total_duration > 0 else 130
    pacing_rating = "Good Pacing"
    if total_words > 0:
        if overall_wpm > 150:
            pacing_rating = "Too Fast"
        elif overall_wpm < 110:
            pacing_rating = "Too Slow"
    else:
        overall_wpm = 0
        pacing_rating = "No Answer"
        
    try:
        prompt = f"""
You are an expert technical interviewer and talent assessor at a tier-1 technology firm.
Evaluate the candidate's performance in the mock interview.

INTERVIEW METADATA:
- Target Company: {company_name}
- Target Role: {role}
- Target Difficulty: {difficulty}
- Interview Focus: {interview_type}

CANDIDATE RESPONSES & METRICS:
{qa_list}

INSTRUCTIONS:
1. Grade the overall performance (score from 0 to 100) and break it down into four categories (out of 100):
   - technical_accuracy
   - communication
   - problem_solving
   - culture_fit
2. Outline specific Key Strengths and Key Weaknesses based on their responses and communication stats.
3. For each question:
   - Grade the answer (score out of 100)
   - Provide concise specific feedback explaining what was good or where they fell short.
   - Provide a brief "model_answer" showing what a top-tier answer looks like.
4. Give a final hiring recommendation: "Strong Hire", "Hire", "Weak Hire", "No Hire".
5. Provide a summary feedback statement.

Return ONLY a valid JSON object matching the schema below. No markdown wrappers.

Schema:
{{
  "overall_score": 85,
  "category_scores": {{
    "technical_accuracy": 80,
    "communication": 90,
    "problem_solving": 85,
    "culture_fit": 85
  }},
  "strengths": [
    "Identified edge cases in code quickly",
    "Great verbal clarity explaining complexity"
  ],
  "weaknesses": [
    "Did not discuss memory optimization or garbage collection details",
    "HR response on deadlock scenarios was slightly brief"
  ],
  "question_feedback": [
    {{
      "question": "The question text...",
      "answer": "The candidate's answer...",
      "score": 80,
      "feedback": "Detail feedback on this response...",
      "model_answer": "What a perfect response looks like..."
    }}
  ],
  "recommendation": "Hire",
  "summary_feedback": "A summary statement about the candidate's general performance..."
}}
"""
        response = model.generate_content(prompt)
        report = extract_and_parse_json(response.text)
        
        # Inject computed pacing and fillers directly into the final report
        report["communication_metrics"] = {
            "overall_wpm": overall_wpm,
            "total_fillers": total_fillers,
            "pacing_rating": pacing_rating,
            "total_words": total_words,
            "total_duration_seconds": total_duration
        }
        
        # Map per-question video URLs and stats to the feedback items
        for q_feedback in report.get("question_feedback", []):
            q_text = q_feedback.get("question", "")
            # Find the matching candidate metrics from qa_list
            match = next((item for item in qa_list if item["question"].strip() == q_text.strip()), None)
            if match:
                q_feedback["video_url"] = match.get("video_url", "")
                q_feedback["wpm"] = match.get("wpm", 0)
                q_feedback["filler_words_count"] = match.get("filler_words_count", 0)
                q_feedback["duration_seconds"] = match.get("duration_seconds", 0)
            else:
                q_feedback["video_url"] = ""
                q_feedback["wpm"] = 0
                q_feedback["filler_words_count"] = 0
                q_feedback["duration_seconds"] = 0
                
        return report
        
    except Exception as e:
        print("EVALUATOR AI ERROR:", str(e))
        # Return fallback report containing computed metrics
        fallback_report = {
            "overall_score": 70,
            "category_scores": {
                "technical_accuracy": 70,
                "communication": 75,
                "problem_solving": 65,
                "culture_fit": 70
            },
            "strengths": ["Completed the interview session", "Attempted all questions"],
            "weaknesses": ["Evaluation fallback enabled due to model service interruption"],
            "question_feedback": [
                {
                    "question": item["question"],
                    "answer": item["candidate_answer"],
                    "score": 70,
                    "feedback": "Answer submitted. Evaluation fallback enabled.",
                    "model_answer": "Refer to standard documentation for technical definitions.",
                    "video_url": item.get("video_url", ""),
                    "wpm": item.get("wpm", 0),
                    "filler_words_count": item.get("filler_words_count", 0),
                    "duration_seconds": item.get("duration_seconds", 0)
                }
                for item in qa_list
            ],
            "recommendation": "Weak Hire",
            "summary_feedback": "The evaluation was calculated using a default grading logic.",
            "communication_metrics": {
                "overall_wpm": overall_wpm,
                "total_fillers": total_fillers,
                "pacing_rating": pacing_rating,
                "total_words": total_words,
                "total_duration_seconds": total_duration
            }
        }
        return fallback_report
