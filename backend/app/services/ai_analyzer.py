import os
import re
import google.generativeai as genai

from dotenv import load_dotenv

load_dotenv()

genai.configure(
    api_key=os.getenv(
        "GEMINI_API_KEY"
    )
)

model = genai.GenerativeModel(
    "gemini-2.0-flash"
)

COMMON_SKILLS = [

"Python","Java","React","Next.js",
"Node.js","FastAPI","Springboot",
"MongoDB","PostgreSQL","Docker",
"AWS","Kafka","Redis","SQL",
"LangChain","TensorFlow","Kubernetes"

]

def fallback_analysis(

    resume_text,
    job_description

):

    found_skills = []

    for skill in COMMON_SKILLS:

        if skill.lower() in resume_text.lower():

            found_skills.append(
                skill
            )

    missing_skills = []

    for skill in COMMON_SKILLS:

        if (

            skill.lower()
            in job_description.lower()

            and

            skill.lower()
            not in resume_text.lower()

        ):

            missing_skills.append(
                skill
            )

    return {

        "candidate_summary":
        "Fallback analysis used",

        "skills":
        found_skills,

        "experience_years":
        "Estimated from resume",

        "projects":
        [],

        "jd_match_score":
        75,

        "missing_skills":
        missing_skills,

        "question_focus_areas":
        missing_skills[:5]

    }

from app.utils.json_parser import extract_and_parse_json

def analyze_candidate(
    resume_text,
    job_description
):
    try:
        prompt = f"""
You are an expert recruiter.
Analyze the candidate's resume relative to the Job Description and return a JSON object with this schema:
{{
  "candidate_summary": "A brief summary of the candidate's profile relative to the JD",
  "skills": ["Extracted skills from resume"],
  "experience_years": "Number of years or experience description",
  "projects": ["Key projects listed in resume"],
  "jd_match_score": 85, // out of 100
  "missing_skills": ["Skills from JD not present in resume"],
  "question_focus_areas": ["Top areas to focus questions on"]
}}

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}

Return ONLY valid JSON. Do not include markdown wraps unless necessary, but format properly.
"""
        response = model.generate_content(prompt)
        # Parse output using our helper utility
        return extract_and_parse_json(response.text)

    except Exception as e:
        print("AI ANALYZER ERROR:", str(e))
        return fallback_analysis(
            resume_text,
            job_description
        )