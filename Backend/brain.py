# brain.py
import os
import warnings
# Suppress all FutureWarnings (including the google.generativeai deprecation)
warnings.filterwarnings("ignore", category=FutureWarning)
import google.generativeai as genai
from google.generativeai.types import FunctionDeclaration, Tool
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# 1. SETUP: Configure the API Key from environment variable
# Get the API key from environment variable (set in .env file)
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in environment variables. Please set it in .env file.")
genai.configure(api_key=api_key)

# 2. INITIALIZE: Connect to the specific model
# Try 'gemini-pro' or 'gemini-1.5-pro' if 'gemini-1.5-flash-latest' doesn't work
model = genai.GenerativeModel('gemini-flash-latest')

def ask_gemini(user_message):
    """
    A simple function to send text to Gemini and return the text reply.
    """
    try:
        response = model.generate_content(user_message)
        return response.text
    except Exception as e:
        return f"Error contacting Brain: {e}"

# TEST BLOCK (Only runs if you type 'python brain.py')
if __name__ == "__main__":
    print(ask_gemini("Hello! Are you online?"))