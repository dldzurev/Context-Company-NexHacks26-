import os

# TOOL 1: See what files exist
def list_files(directory: str = ".") -> dict:
    """
    Lists all files in the given directory.
    Use this to explore the project structure and find relevant code.
    """
    try:
        # Get all files in the current directory (ignoring hidden .git folders)
        files = [f for f in os.listdir(directory) if not f.startswith('.')]
        return {"files": files}
    except Exception as e:
        return {"error": str(e)}

# TOOL 2: Read the content of a file
def read_file(filepath: str) -> dict:
    """
    Reads the contents of a specific file.
    Use this to inspect code before suggesting fixes.
    """
    try:
        with open(filepath, 'r') as f:
            content = f.read()
        return {"content": content}
    except Exception as e:
        return {"error": str(e)}

# Export the list so we can import it easily in brain.py
file_tools = [list_files, read_file]