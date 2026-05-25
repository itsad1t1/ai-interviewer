import os
import google.generativeai as genai
from dotenv import load_dotenv
from app.utils.json_parser import extract_and_parse_json

load_dotenv()

genai.configure(
    api_key=os.getenv("GEMINI_API_KEY")
)

model = genai.GenerativeModel("gemini-2.0-flash")

def fallback_questions(resume_text, job_description, analysis, difficulty="Medium", interview_type="Technical"):
    skills = analysis.get("skills", ["Software Engineering"]) if isinstance(analysis, dict) else ["Software Engineering"]
    missing = analysis.get("missing_skills", []) if isinstance(analysis, dict) else []
    
    # Return a basic default set of questions depending on type
    if "coding" in interview_type.lower() or "tech" in interview_type.lower():
        return {
            "questions": [
                {
                    "id": 1,
                    "category": "technical",
                    "type": "coding",
                    "question": f"Given an array of integers, write a function to return the sum of the elements. Focus on optimal complexity for {skills[0] if skills else 'general'} scale.",
                    "constraints": "Array size N: 1 <= N <= 10^5",
                    "examples": "Input: [1, 2, 3]\nOutput: 6",
                    "code_templates": {
                        "python": "def arraySum(arr: list[int]) -> int:\n    # Write your code here\n    return 0",
                        "javascript": "function arraySum(arr) {\n    // Write your code here\n    return 0;\n}",
                        "cpp": "class Solution {\npublic:\n    int arraySum(vector<int>& arr) {\n        // Write your code here\n        return 0;\n    }\n};"
                    }
                },
                {
                    "id": 2,
                    "category": "technical",
                    "type": "text",
                    "question": f"Explain the architectural details of using {skills[0] if skills else 'a database'} and how you prevent latency or concurrency issues."
                },
                {
                    "id": 3,
                    "category": "project",
                    "type": "text",
                    "question": "Describe the architecture of your most challenging project. What were the trade-offs and bottleneck decisions?"
                },
                {
                    "id": 4,
                    "category": "behavioral",
                    "type": "text",
                    "question": "Tell me about a time you had to deliver a feature under a tight deadline and how you managed the quality and scope."
                }
            ]
        }
    else:
        return {
            "questions": [
                {
                    "id": 1,
                    "category": "behavioral",
                    "type": "text",
                    "question": "Tell me about yourself and why you're interested in this role."
                },
                {
                    "id": 2,
                    "category": "behavioral",
                    "type": "text",
                    "question": "Describe a technical disagreement you had with a team member. How did you resolve it?"
                },
                {
                    "id": 3,
                    "category": "project",
                    "type": "text",
                    "question": "Walk me through one of your resume projects. Why did you choose your technology stack?"
                },
                {
                    "id": 4,
                    "category": "system_design",
                    "type": "text",
                    "question": f"How would you design a scalable notification service using {skills[0] if skills else 'message queues'}?"
                }
            ]
        }

def generate_questions(resume_text, job_description, analysis, company_name="Target Company", role="Software Engineer", difficulty="Medium", interview_type="Technical"):
    try:
        prompt = f"""
You are a senior tech interviewer from a top tech company (like Google or Netflix).
Generate a list of 4-6 tailored, highly personalized interview questions for a candidate.

INTERVIEW CONFIGURATION:
- Target Company: {company_name}
- Target Role/Position: {role}
- Difficulty Level: {difficulty} (Entry, Mid, Senior, Expert)
- Interview Type: {interview_type} (Coding/Technical, System Design, Behavioral)

CANDIDATE PROFILE:
- Resume text:
{resume_text}

- Resume Suitability Analysis:
{analysis}

- Job Description:
{job_description}

INSTRUCTIONS:
1. Tailor questions to the candidate's actual projects, technologies, and the job description.
2. If difficulty is "Senior" or "Expert", ensure questions are deep, involving scaling, bottlenecks, and complex system trade-offs.
3. If Interview Type is "Coding/Technical", include at least 1-2 coding problems where they must write code. Make these coding questions clean and practical.
4. For each coding problem, provide base starter template code in Python, JavaScript, and C++.
5. The remaining questions should be text-based conceptual, project-based, or behavioral questions.

Return ONLY a valid JSON object matching the schema below. No extra commentary.

Schema:
{{
  "questions": [
    {{
      "id": 1,
      "category": "technical", // "technical", "behavioral", "project", "system_design"
      "type": "coding", // "coding" or "text"
      "question": "Coding question description and requirements...",
      "constraints": "Optional constraints (e.g. O(N) runtime, N <= 100)",
      "examples": "Input: ...\\nOutput: ...",
      "code_templates": {{ // required only if type is "coding"
        "python": "def solve(s: str) -> bool:\\n    pass",
        "javascript": "function solve(s) {{\\n    // code\\n}}",
        "cpp": "class Solution {{\\npublic:\\n    bool solve(string s) {{\\n        \\n    }}\\n}};"
      }}
    }},
    {{
      "id": 2,
      "category": "behavioral",
      "type": "text",
      "question": "Question text here..."
    }}
  ]
}}
"""
        response = model.generate_content(prompt)
        # Parse cleanly using our JSON parser
        return extract_and_parse_json(response.text)

    except Exception as e:
        print("QUESTION GENERATOR ERROR:", str(e))
        return fallback_questions(
            resume_text=resume_text,
            job_description=job_description,
            analysis=analysis,
            difficulty=difficulty,
            interview_type=interview_type
        )