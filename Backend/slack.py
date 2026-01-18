#!/usr/bin/env python3
import os
import sys
import json
import argparse
from datetime import datetime, timezone
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError

# File to store usernames locally
CACHE_FILE = "slack_users_cache.json"

def _fmt_ts(ts: str) -> str:
    dt = datetime.fromtimestamp(float(ts), tz=timezone.utc).astimezone()
    return dt.strftime("%Y-%m-%d %I:%M %p")

class SlackSearcher:
    def __init__(self, token):
        self.client = WebClient(token=token)
        self.user_cache = self._load_cache()

    def _load_cache(self):
        if os.path.exists(CACHE_FILE):
            with open(CACHE_FILE, "r") as f:
                return json.load(f)
        return {}

    def _save_cache(self):
        with open(CACHE_FILE, "w") as f:
            json.dump(self.user_cache, f)

    def get_real_name(self, user_id):
        """Resolves User ID to Real Name and saves it to a local file."""
        if user_id in self.user_cache:
            return self.user_cache[user_id]
        
        try:
            # Only hits the API if the user isn't in our local file
            res = self.client.users_info(user=user_id)
            name = res["user"]["real_name"]
            self.user_cache[user_id] = name
            self._save_cache()
            return name
        except:
            return user_id

    def get_my_channels(self):
        """Fetches every conversation you are a member of."""
        channels = []
        try:
            cursor = None
            while True:
                result = self.client.conversations_list(
                    types="public_channel,private_channel,im,mpim",
                    cursor=cursor
                )
                channels.extend(result["channels"])
                cursor = result.get("response_metadata", {}).get("next_cursor")
                if not cursor: break
            return channels
        except SlackApiError as e:
            print(f"Error listing channels: {e.response['error']}")
            return []

    def run_global_search(self, query, limit):
        all_chans = self.get_my_channels()
        print(f"--- Searching {len(all_chans)} conversations for '{query}' ---")

        for chan in all_chans:
            c_id = chan["id"]
            # Use channel name or DM recipient info
            c_name = chan.get("name") or f"DM ({c_id})"
            
            try:
                res = self.client.conversations_history(channel=c_id, limit=limit)
                for msg in res.get("messages", []):
                    text = msg.get("text", "")
                    if query.lower() in text.lower():
                        user_name = self.get_real_name(msg.get("user"))
                        ts = _fmt_ts(msg.get("ts"))
                        
                        print(f"\nMATCH in #{c_name}")
                        print(f"[{ts}] {user_name}:")
                        print(f"  {text}")
            except SlackApiError:
                continue

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--query", required=True)
    parser.add_argument("--limit", type=int, default=50)
    args = parser.parse_args()

    token = os.environ.get("SLACK_USER_TOKEN")
    searcher = SlackSearcher(token)
    searcher.run_global_search(args.query, args.limit)