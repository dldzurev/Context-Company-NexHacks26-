from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

# -----------------------------
# FastAPI app instance
# -----------------------------
app = FastAPI()

# -----------------------------
# CORS:
# VS Code webviews run in their own origin.
# This allows the webview to call http://127.0.0.1:8000 from inside the panel.
# For local dev, allow all origins is fine.
# -----------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],     # dev-only convenience
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------
# Request schema:
# A valid request MUST be JSON with a string field "message".
# If it is missing / wrong type, FastAPI returns 422 automatically.
# -----------------------------
class ChatRequest(BaseModel):
    message: str

# -----------------------------
# POST /chat
# Returns:
# - "hi"          only if message is exactly "hello world" (case-insensitive)
# - "bye"         only if message is exactly "bye world" (case-insensitive)
# - "hmmmm what?" for anything else (but still a valid request)
#
# Errors:
# - Empty/whitespace message => 400 invalid request
# - Malformed JSON / missing message field => 422 (FastAPI default)
# -----------------------------
@app.post("/chat")
def chat(req: ChatRequest):
    # Extra validation on top of Pydantic:
    # message must not be empty/whitespace.
    if not req.message or not req.message.strip():
        raise HTTPException(status_code=400, detail="invalid request")

    # Normalize the user's message so matching is consistent:
    # - strip() removes leading/trailing whitespace
    # - lower() makes matching case-insensitive
    msg = req.message.strip().lower()

    # Decide reply based on exact phrase
    if msg == "hi":
        return {"reply": "hello world"}
    elif msg == "bye":
        return {"reply": "bye world"}
    else:
        return {"reply": "hmmmm what?"}

# -----------------------------
# Everything else:
# - Unknown routes -> 404
# - Wrong method (e.g., GET /chat) -> 405
# -----------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
