import json
import re

def extract_and_parse_json(text: str):
    """
    Extracts JSON content from potentially malformed or markdown-wrapped LLM text
    and parses it into a Python dictionary or list.
    """
    cleaned = text.strip()
    
    # Remove markdown block ticks like ```json ... ``` or ``` ... ```
    match = re.search(r"```(?:json)?\s*([\s\S]*?)\s*```", cleaned, re.IGNORECASE)
    if match:
        cleaned = match.group(1).strip()
    
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Try to locate the JSON boundaries manually
        try:
            start_dict = cleaned.find('{')
            end_dict = cleaned.rfind('}')
            if start_dict != -1 and end_dict != -1 and end_dict > start_dict:
                return json.loads(cleaned[start_dict:end_dict + 1])
                
            start_arr = cleaned.find('[')
            end_arr = cleaned.rfind(']')
            if start_arr != -1 and end_arr != -1 and end_arr > start_arr:
                return json.loads(cleaned[start_arr:end_arr + 1])
        except Exception as e:
            print("Error parsing bounding brackets for JSON:", str(e))
            
        raise ValueError("Could not parse JSON from model output: " + text[:500])
