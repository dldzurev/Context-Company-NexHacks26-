import os
from atlassian import Confluence
from dotenv import load_dotenv
from bs4 import BeautifulSoup

load_dotenv()

def _get_client():
    """Helper to initialize Confluence client using your existing Jira credentials."""
    # CHECK VARIABLES: Ensure we aren't passing None to the library
    url = os.getenv("JIRA_SERVER")
    email = os.getenv("JIRA_EMAIL")       # Changed from ATLASSIAN_USER
    token = os.getenv("JIRA_API_TOKEN")   # Changed from ATLASSIAN_API_TOKEN

    if not url or not email or not token:
        raise ValueError("Missing .env variables. Ensure JIRA_SERVER, JIRA_EMAIL, and JIRA_API_TOKEN are set.")

    return Confluence(
        url=url,
        username=email, 
        password=token,
        cloud=True
    )

def search_confluence_pages(query: str = "") -> str:
    """
    Searches Confluence for pages. If query is empty, returns recently updated pages.
    """
    try:
        confluence = _get_client()

        if not query or query.strip() == "":
            print(f"🔎 Fetching recent Confluence pages...")
            # CQL for recently updated pages
            cql = 'type in (page, blogpost) ORDER BY lastModified DESC'
        else:
            # Escape quotes for CQL
            safe_query = query.replace('"', '\\"')
            print(f"🔎 Executing Confluence Search: {query}")
            cql = f'type in (page, blogpost) AND text ~ "{safe_query}"'
        
        results = confluence.cql(cql, limit=5)
        
        if not results.get("results"):
            return "No Confluence pages found matching your query."
            
        output = []
        base_url = os.getenv("JIRA_SERVER")
        
        for page in results["results"]:
            title = page["content"]["title"]
            page_id = page["content"]["id"]
            link = base_url + "/wiki" + page["content"]["_links"]["webui"]
            output.append(f"Page ID: {page_id} | Title: {title} | Link: {link}")
            
        return "\n".join(output)

    except Exception as e:
        return f"Error searching Confluence: {str(e)}"

def get_confluence_page(page_id: str) -> str:
    """
    Gets the text content of a Confluence page.
    """
    try:
        confluence = _get_client()
        
        print(f"🔌 Fetching content for Page ID: {page_id}...")
        page = confluence.get_page_by_id(page_id, expand='body.storage')
        
        title = page['title']
        raw_html = page['body']['storage']['value']
        
        soup = BeautifulSoup(raw_html, "html.parser")
        clean_text = soup.get_text(separator="\n")
        
        # --- FIX 3: CHARACTER LIMIT ---
        # Truncate text to 3000 characters (approx 750 tokens)
        # This ensures one page doesn't consume your whole minute's quota.
        if len(clean_text) > 500:
            clean_text = clean_text[:500] + "\n... [CONTENT TRUNCATED TO SAVE QUOTA] ..."

        # Remove excessive empty lines
        clean_text = "\n".join([line for line in clean_text.splitlines() if line.strip()])

        details = f"""
Title: {title}
Link: {os.getenv("JIRA_SERVER")}/wiki{page['_links']['webui']}
--- CONTENT ---
{clean_text}
"""
        return details.strip()

    except Exception as e:
        return f"Error getting Confluence page {page_id}: {str(e)}"

# Export tools
confluence_tools = [search_confluence_pages, get_confluence_page]

# TEST BLOCK
# TEST BLOCK
if __name__ == "__main__":
    print("--- Testing Confluence Tools (List All / Recent) ---")
    
    # Passing an empty string "" triggers the "recent pages" logic
    results = search_confluence_pages("") 
    
    print(results)