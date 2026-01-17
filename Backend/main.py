from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
# --- NEW: Import FastMCP ---
from fastmcp import FastMCP

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*", "null"], allow_methods=["*"], allow_headers=["*"])

# --- NEW: Initialize MCP Server ---
mcp = FastMCP("ContextLink")

class TextInput(BaseModel):
    text: str

# --- NEW: Register your function as an MCP Tool ---
@mcp.tool()
def reverse_text_tool(text: str) -> str:
    """Reverses the provided text string."""
    return text[::-1]

@app.post("/reverse")
def reverse_text(data: TextInput):
    # This keeps your existing API working for your current frontend
    return {"reversed": reverse_text_tool(data.text)}

# --- NEW: Run the MCP server if script is executed directly ---
if __name__ == "__main__":
    mcp.run()