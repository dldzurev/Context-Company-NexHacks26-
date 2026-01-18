'''
import os
import warnings
import google.generativeai as genai
from dotenv import load_dotenv

# --- TOOL IMPORTS ---
from tools_files import file_tools
from tools_jira import jira_tools
# from tools_slack import slack_tools 

warnings.filterwarnings("ignore", category=FutureWarning)
load_dotenv()

# 1. CONFIGURE API
api_key = os.getenv("GEMINI_API_KEY")
if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file.")
genai.configure(api_key=api_key)

# 2. COMBINE TOOLS
all_tools = file_tools + jira_tools 

# 3. INITIALIZE MODEL
model = genai.GenerativeModel(
    model_name="gemini-1.5-flash-001", # switched to stable flash version
    tools=all_tools
)
# 4. INITIALIZE CHAT SESSION (GLOBAL MEMORY)
# We start it here so it persists across requestsList
chat_session = model.start_chat(enable_automatic_function_calling=True)

def agent_chat(user_message):
    """
    Sends a message to the existing chat session.
    """
    # FIX IS HERE: Declare global at the very top!
    global chat_session 
    
    try:
        # Now we can use it safely
        response = chat_session.send_message(user_message)
        return response.text
    except Exception as e:
        # If the chat session crashes (e.g. token limit or timeout), restart it
        print(f"⚠️ Chat Error: {e}. Restarting memory...")
        chat_session = model.start_chat(enable_automatic_function_calling=True)
        
        # Try one more time with the new session
        try:
            response = chat_session.send_message(user_message)
            return response.text
        except Exception as e2:
            return f"Agent Error: {e2}"

# TEST BLOCK
if __name__ == "__main__":
    print("--- Testing ContextLink Agent ---")
    query = "Do I have any Jira tickets regarding a 'loan'? If so, give me the details of the most relevant one."
    print(f"User: {query}")
    print(f"Agent: {agent_chat(query)}")
'''
import os
import time
from dotenv import load_dotenv
from google import genai
from google.genai import types

# --- TOOL IMPORTS ---
from tools_files import list_files, read_all_code_files
from tools_jira import jira_tools 
from tools_slack import slack_tools

load_dotenv()

# 1. INITIALIZE CLIENT
client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

# 2. PREPARE TOOLS
my_tools = [list_files, read_all_code_files] + jira_tools + slack_tools

# 3. GLOBAL MEMORY
chat_history = []

def agent_chat(user_message):
    global chat_history

    # Add User's message to history
    chat_history.append(types.Content(
        role="user",
        parts=[types.Part.from_text(text=user_message)]
    ))

    # Config
    generate_config = types.GenerateContentConfig(
        tools=my_tools,
        automatic_function_calling=types.AutomaticFunctionCallingConfig(
            disable=False,
            maximum_remote_calls=15
        ),
        temperature=0.7
    )

    # --- RETRY LOOP FOR 503 ERRORS ---
    max_retries = 3
    for attempt in range(max_retries):
        try:
            response = client.models.generate_content(
                model="gemini-3-flash-preview", 
                contents=chat_history,
                config=generate_config
            )

            # Success!
            response_text = response.text
            
            if response_text:
                chat_history.append(types.Content(
                    role="model",
                    parts=[types.Part.from_text(text=response_text)]
                ))
                yield response_text
            else:
                yield "✅ Task completed."
            
            return # Exit function on success

        except Exception as e:
            error_msg = str(e)
            
            # CHECK FOR 503 (Overloaded) OR 429 (Quota)
            if "503" in error_msg or "overloaded" in error_msg.lower():
                print(f"⚠️ Google Server Busy (503). Retrying {attempt+1}/{max_retries}...")
                time.sleep(3) # Wait 3 seconds
                continue # Try again
            
            elif "429" in error_msg:
                print(f"⚠️ Quota hit. Waiting 10s...")
                time.sleep(10)
                # Let loop retry
                continue 
            
            else:
                # Real crash
                print(f"❌ Error: {error_msg}")
                yield f"⚠️ Agent Error: {error_msg}"
                return

    # If we exit the loop, we failed 3 times
    yield "❌ Servers are too busy right now. Please try again in a minute."

# TEST BLOCK
if __name__ == "__main__":
    print("--- Testing New GenAI Client ---")
    for chunk in agent_chat("Hello"):
        print(chunk)