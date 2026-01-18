import os
import json
from datetime import datetime, timezone
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
from dotenv import load_dotenv

load_dotenv()

# File to store usernames locally
CACHE_FILE = "slack_users_cache.json"

def _fmt_ts(ts: str) -> str:
    try:
        dt = datetime.fromtimestamp(float(ts), tz=timezone.utc).astimezone()
        return dt.strftime("%Y-%m-%d %I:%M %p")
    except:
        return ts

class SlackSearcher:
    def __init__(self):
        self.token = os.environ.get("SLACK_USER_TOKEN")
        if not self.token:
            raise ValueError("SLACK_USER_TOKEN not found in .env")
        self.client = WebClient(token=self.token)
        self.user_cache = self._load_cache()

    def _load_cache(self):
        if os.path.exists(CACHE_FILE):
            try:
                with open(CACHE_FILE, "r") as f:
                    return json.load(f)
            except:
                return {}
        return {}

    def _save_cache(self):
        try:
            with open(CACHE_FILE, "w") as f:
                json.dump(self.user_cache, f)
        except:
            pass

    def get_real_name(self, user_id):
        """Resolves User ID to Real Name."""
        if not user_id: return "Unknown"
        if user_id in self.user_cache:
            return self.user_cache[user_id]
        
        try:
            res = self.client.users_info(user=user_id)
            name = res["user"]["real_name"]
            self.user_cache[user_id] = name
            self._save_cache()
            return name
        except:
            return user_id

    def get_my_channels(self):
        """Fetches conversations you are a member of."""
        channels = []
        try:
            cursor = None
            while True:
                # Limit types to reduce API load for the agent
                result = self.client.conversations_list(
                    types="public_channel,private_channel,im,mpim",
                    limit=200, 
                    cursor=cursor
                )
                channels.extend(result["channels"])
                cursor = result.get("response_metadata", {}).get("next_cursor")
                if not cursor: break
            return channels
        except SlackApiError as e:
            return []

    def run_search(self, query: str):
        """
        ACTUAL TOOL FUNCTION: Searches Slack history for the query.
        """
        results = []
        try:
            all_chans = self.get_my_channels()
            
            # Search logic
            for chan in all_chans:
                c_id = chan["id"]
                c_name = chan.get("name") or f"DM ({c_id})"
                
                try:
                    # Limit to recent 20 messages per channel to be fast
                    res = self.client.conversations_history(channel=c_id, limit=20)
                    for msg in res.get("messages", []):
                        text = msg.get("text", "")
                        if query.lower() in text.lower():
                            user_name = self.get_real_name(msg.get("user"))
                            ts = _fmt_ts(msg.get("ts"))
                            
                            results.append(f"[{ts}] Channel: #{c_name} | User: {user_name} | Msg: {text}")
                except SlackApiError:
                    continue
            
            if not results:
                return "No Slack messages found matching that query."
            
            return "\n".join(results[:15]) # Return top 15 matches to avoid token limits

        except Exception as e:
            return f"Slack Search Error: {str(e)}"

# --- EXPORTED TOOL FUNCTION ---
def search_slack(query: str) -> str:
    """
    Searches the user's Slack history for a specific keyword or phrase.
    Useful for finding past discussions, requirements, or decisions.
    """
    print(f"💬 [TOOL] Searching Slack for: '{query}'")
    try:
        searcher = SlackSearcher()
        return searcher.run_search(query)
    except Exception as e:
        return f"Error connecting to Slack: {e}"

# Export list for brain.py
slack_tools = [search_slack]