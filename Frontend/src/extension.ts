import * as vscode from "vscode";

/**
 * This is the VS Code extension entrypoint.
 * - It registers a command (nexhacks26.openChat)
 * - When you run the command, it opens a Webview panel on the right
 * - The Webview contains a draggable chat UI that POSTs to FastAPI
 */
export function activate(context: vscode.ExtensionContext) {
  /**
   * Register the command you added in package.json:
   * "nexhacks26.openChat"
   */
  const disposable = vscode.commands.registerCommand("nexhacks26.openChat", () => {
    /**
     * Create a Webview panel.
     * viewColumn: Two means "open on the right side" (2nd editor column).
     */
    const panel = vscode.window.createWebviewPanel(
      "nexhacks26Chat", // internal identifier
      "NexHacks26 Chat", // tab title
      { viewColumn: vscode.ViewColumn.Two, preserveFocus: true },
      {
        enableScripts: true, // allow our in-webview JavaScript to run
        retainContextWhenHidden: true // keep webview state when you switch tabs
      }
    );

    // Inject the HTML + CSS + JS into the webview
    panel.webview.html = getWebviewHtml();
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}

/**
 * Returns the full HTML for the Webview UI.
 * This contains:
 * - CSP (security policy)
 * - Draggable chat window UI
 * - JS that sends user messages to the FastAPI backend
 */
function getWebviewHtml(): string {
  // Nonce is used in CSP to allow only this script to run.
  const nonce = String(Math.random()).slice(2);

  /**
   * Content Security Policy (CSP)
   * - default-src 'none': block everything by default
   * - style-src 'unsafe-inline': allow inline CSS
   * - script-src 'nonce-...': allow only the script with our nonce
   * - connect-src: allow fetch() calls to local FastAPI
   */
  const csp = [
    "default-src 'none';",
    "img-src data:;",
    "style-src 'unsafe-inline';",
    `script-src 'nonce-${nonce}';`,
    "connect-src http://127.0.0.1:8000 http://localhost:8000;"
  ].join(" ");

  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy" content="${csp}">
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>NexHacks26 Chat</title>

  <style>
  :root{
    --bg: #0b0f17;
    --panel: rgba(18, 22, 34, 0.78);
    --panelSolid: #121622;
    --border: rgba(255,255,255,0.10);
    --border2: rgba(255,255,255,0.14);
    --text: rgba(255,255,255,0.92);
    --muted: rgba(255,255,255,0.70);

    /* Cursor-ish accent */
    --accent: #7dd3fc;        /* light blue */
    --accent2: #38bdf8;       /* slightly deeper */
    --accentBg: rgba(125,211,252,0.18);
    --accentBorder: rgba(125,211,252,0.35);

    /* Assistant style */
    --assistantBar: rgba(255,255,255,0.18);
  }

  body {
    margin: 0;
    font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
    height: 100vh;
    overflow: hidden;
    background: radial-gradient(1200px 600px at 70% -10%, rgba(56,189,248,0.12), transparent 55%),
                radial-gradient(900px 500px at 15% 0%, rgba(125,211,252,0.08), transparent 60%),
                var(--bg);
    color: var(--text);
  }

  /* Floating draggable chat box (Cursor-ish “glass”) */
  #chatBox {
    position: fixed;
    top: 24px;
    right: 24px;
    width: 380px;
    height: 560px;

    border-radius: 18px;
    background: var(--panel);
    border: 1px solid var(--border);
    box-shadow: 0 20px 60px rgba(0,0,0,0.55);
    backdrop-filter: blur(14px);

    display: flex;
    flex-direction: column;
    user-select: none;
  }

  /* Header (drag handle) */
  #header {
    padding: 12px 14px;
    cursor: grab;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-weight: 650;
    letter-spacing: 0.2px;
  }

  /* Status pill (top-right) */
  #status {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted);
    padding: 4px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: rgba(255,255,255,0.04);
  }

  /* Message list */
  #messages {
    flex: 1;
    padding: 14px;
    overflow: auto;
    user-select: text;

    /* clean spacing like Cursor */
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* Subtle scrollbar */
  #messages::-webkit-scrollbar { width: 10px; }
  #messages::-webkit-scrollbar-thumb {
    background: rgba(255,255,255,0.10);
    border-radius: 999px;
    border: 2px solid rgba(0,0,0,0);
    background-clip: padding-box;
  }
  #messages::-webkit-scrollbar-thumb:hover {
    background: rgba(255,255,255,0.16);
    border: 2px solid rgba(0,0,0,0);
    background-clip: padding-box;
  }

  /* Message base */
  .msg {
    max-width: 88%;
    font-size: 14px;
    line-height: 1.45;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* USER messages: right aligned, light-blue “chip” */
  .me {
    align-self: flex-end;
    padding: 10px 12px;
    border-radius: 14px;
    background: var(--accentBg);
    border: 1px solid var(--accentBorder);
    color: var(--text);
    box-shadow: 0 6px 18px rgba(0,0,0,0.25);
  }

  /* ASSISTANT messages: NOT a textbox — just text with a subtle left bar + padding */
  .bot {
    align-self: flex-start;
    max-width: 92%;
    padding: 2px 0 2px 12px;      /* left padding for the bar */
    margin-left: 2px;            /* tiny offset from edge */
    border-left: 3px solid var(--assistantBar);
    color: rgba(255,255,255,0.88);
  }

  /* Composer row */
  #composer {
    padding: 12px;
    border-top: 1px solid var(--border);
    display: flex;
    gap: 10px;
    background: rgba(0,0,0,0.12);
  }

  /* Input: Cursor-ish */
  #input {
    flex: 1;
    height: 42px;
    border-radius: 12px;
    border: 1px solid var(--border2);
    background: rgba(10, 12, 20, 0.65);
    color: var(--text);
    padding: 0 12px;
    outline: none;
  }

  #input:focus {
    border-color: rgba(125,211,252,0.45);
    box-shadow: 0 0 0 3px rgba(125,211,252,0.15);
  }

  /* Send button: solid light blue pop */
  #send {
    height: 42px;
    padding: 0 14px;
    border-radius: 12px;
    border: 1px solid rgba(125,211,252,0.55);
    background: rgba(125,211,252,0.95);
    color: #071018;
    font-weight: 700;
    cursor: pointer;
    transition: transform 0.05s ease, filter 0.15s ease;
  }

  #send:hover { filter: brightness(1.03); }
  #send:active { transform: translateY(1px); }
</style>

</head>

<body>
  <div id="chatBox">
    <div id="header">
      <div>NexHacks Chat</div>
      <div id="status">idle</div>
    </div>

    <div id="messages"></div>

    <div id="composer">
      <input id="input" placeholder="Type a message..." />
      <button id="send">Send</button>
    </div>
  </div>

  <script nonce="${nonce}">
    /**
     * Backend endpoint (FastAPI)
     * - You must have FastAPI running on 127.0.0.1:8000
     * - Route must be POST /chat
     */
    const API_URL = "http://127.0.0.1:8000/chat";

    // DOM references
    const chatBox = document.getElementById("chatBox");
    const header = document.getElementById("header");
    const statusEl = document.getElementById("status");
    const messagesEl = document.getElementById("messages");
    const inputEl = document.getElementById("input");
    const sendBtn = document.getElementById("send");

    // Status helper
    function setStatus(s) { statusEl.textContent = s; }

    // Message helper
    function addMsg(text, who) {
      const d = document.createElement("div");
      d.className = "msg " + who;
      d.textContent = text;
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    /**
     * Send flow (your rules):
     * 1) Always show the user's message bubble
     * 2) Immediately POST to backend for processing
     * 3) If backend is unreachable -> NO bot message bubble (silent fail)
     * 4) If backend returns non-200 -> show bot bubble "error"
     * 5) If backend returns 200, only allow these replies:
     *    - "hello world" (when user typed hi)
     *    - "bye world"   (when user typed bye)
     *    - "uhhhhh what?" (when user typed anything else)
     *    Anything else -> "error"
     */
    async function sendMessage() {
      const text = inputEl.value.trim();

      // Prevent sending empty messages (you can change this if you want empty -> error)
      if (!text) return;

      // Clear input + show user's bubble immediately
      inputEl.value = "";
      addMsg(text, "me");

      setStatus("sending...");

      try {
        // Make the POST request to FastAPI
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });

        // Backend responded but not OK => invalid request or backend error
        if (!res.ok) {
          addMsg("error", "bot");
          setStatus("error");
          return;
        }

        // Backend success (200): parse JSON
        const data = await res.json();

        // We display EXACTLY what backend replied (no hardcoding)
        const reply = (data && typeof data.reply === "string") ? data.reply : "";

        // Only accept the expected replies
        const allowed = new Set(["hello world", "bye world", "uhhhhh what?"]);

        if (allowed.has(reply)) {
          addMsg(reply, "bot");
          setStatus("idle");
        } else {
          // Backend returned unexpected JSON; treat as error
          addMsg("error", "bot");
          setStatus("error");
        }

      } catch (e) {
        /**
         * fetch() threw:
         * - backend is down
         * - wrong port
         * - request blocked
         *
         * Your requirement: "no response if frontend isn't properly communicating"
         * So we do NOT add a bot message bubble here.
         */
        setStatus("offline");
        return;
      }
    }

    // UI events: click + Enter key
    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMessage();
    });

    /**
     * Draggable window logic:
     * - drag using the header bar
     * - clamp to stay inside webview viewport
     */
    let dragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;

    header.addEventListener("mousedown", (e) => {
      dragging = true;
      header.style.cursor = "grabbing";

      // Save starting mouse coords + starting box coords
      const rect = chatBox.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;

      e.preventDefault();
    });

    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;

      // Mouse movement delta
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // Proposed new position
      const unclampedLeft = startLeft + dx;
      const unclampedTop = startTop + dy;

      // Clamp within viewport boundaries
      const newLeft = Math.min(Math.max(0, unclampedLeft), window.innerWidth - chatBox.offsetWidth);
      const newTop = Math.min(Math.max(0, unclampedTop), window.innerHeight - chatBox.offsetHeight);

      // Apply position. Once dragged, stop anchoring to "right"
      chatBox.style.left = newLeft + "px";
      chatBox.style.top = newTop + "px";
      chatBox.style.right = "auto";
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
      header.style.cursor = "grab";
    });

    // Optional starter message (purely UI, no backend call)
    addMsg("Type: hi → hello world, bye → bye world, anything else → uhhhhh what?", "bot");
  </script>
</body>
</html>`;
}
