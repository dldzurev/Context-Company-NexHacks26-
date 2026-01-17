"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
/**
 * MUST match package.json:
 * contributes.views -> id
 */
const CHAT_VIEW_ID = "nexhacks26.chatView";
/**
 * MUST match package.json:
 * contributes.viewsContainers.activitybar -> id
 *
 * VS Code auto-creates a command to focus this view container:
 * workbench.view.extension.<CONTAINER_ID>
 */
const CONTAINER_ID = "nexhacks26Container";
function activate(context) {
    /**
     * Register the sidebar WebviewViewProvider.
     * If this is not registered (or the ID doesn't match), you'll see:
     * "There is no data provider registered..."
     */
    const provider = new NexHacksChatViewProvider(context);
    context.subscriptions.push(vscode.window.registerWebviewViewProvider(CHAT_VIEW_ID, provider, {
        webviewOptions: { retainContextWhenHidden: true }
    }));
    /**
     * Optional command to focus/open the chat view container quickly
     * (like Cursor/Copilot feel).
     */
    context.subscriptions.push(vscode.commands.registerCommand("nexhacks26.openChat", async () => {
        await vscode.commands.executeCommand(`workbench.view.extension.${CONTAINER_ID}`);
    }));
}
function deactivate() { }
/**
 * Provides the actual sidebar view content (webview).
 */
class NexHacksChatViewProvider {
    constructor(context) {
        this.context = context;
    }
    resolveWebviewView(webviewView) {
        /**
         * Webview permissions:
         * enableScripts: required for fetch() + UI logic
         */
        webviewView.webview.options = {
            enableScripts: true
        };
        /**
         * Set the HTML for the sidebar view.
         * This is basically your previous webview HTML, but "docked"
         * (no floating draggable box needed).
         */
        webviewView.webview.html = getWebviewHtml();
    }
}
/**
 * Webview HTML (Cursor-ish look, docked sidebar)
 */
function getWebviewHtml() {
    const nonce = String(Math.random()).slice(2);
    /**
     * CSP:
     * connect-src MUST allow your FastAPI backend or fetch() will fail.
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
      --border: rgba(255,255,255,0.10);
      --border2: rgba(255,255,255,0.14);
      --text: rgba(255,255,255,0.92);
      --muted: rgba(255,255,255,0.70);

      /* Cursor-ish accent */
      --accent: #7dd3fc;
      --accentBg: rgba(125,211,252,0.18);
      --accentBorder: rgba(125,211,252,0.35);

      /* Assistant style */
      --assistantBar: rgba(255,255,255,0.18);
    }

    /* In sidebar: fill the entire view */
    body {
      margin: 0;
      height: 100vh;
      overflow: hidden;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
      background:
        radial-gradient(1200px 600px at 70% -10%, rgba(56,189,248,0.12), transparent 55%),
        radial-gradient(900px 500px at 15% 0%, rgba(125,211,252,0.08), transparent 60%),
        var(--bg);
      color: var(--text);
    }

    /* Main container (docked, not draggable) */
    #chatRoot {
      height: 100vh;
      display: flex;
      flex-direction: column;
      background: var(--panel);
      border: 1px solid var(--border);
      border-radius: 10px;
      overflow: hidden;
      backdrop-filter: blur(14px);
    }

    /* Header */
    #header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 650;
      letter-spacing: 0.2px;
    }

    /* Status pill */
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
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    #messages::-webkit-scrollbar { width: 10px; }
    #messages::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.10);
      border-radius: 999px;
      border: 2px solid rgba(0,0,0,0);
      background-clip: padding-box;
    }

    .msg {
      max-width: 88%;
      font-size: 14px;
      line-height: 1.45;
      white-space: pre-wrap;
      word-break: break-word;
    }

    /* User bubble (right) */
    .me {
      align-self: flex-end;
      padding: 10px 12px;
      border-radius: 14px;
      background: var(--accentBg);
      border: 1px solid var(--accentBorder);
      color: var(--text);
    }

    /* Assistant message (left) — not a textbox */
    .bot {
      align-self: flex-start;
      max-width: 92%;
      padding: 2px 0 2px 12px;
      border-left: 3px solid var(--assistantBar);
      color: rgba(255,255,255,0.88);
    }

    /* Composer */
    #composer {
      padding: 12px;
      border-top: 1px solid var(--border);
      display: flex;
      gap: 10px;
      background: rgba(0,0,0,0.12);
    }

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

    /* Send button pops */
    #send {
      height: 42px;
      padding: 0 14px;
      border-radius: 12px;
      border: 1px solid rgba(125,211,252,0.55);
      background: rgba(125,211,252,0.95);
      color: #071018;
      font-weight: 700;
      cursor: pointer;
    }

    #send:active { transform: translateY(1px); }
  </style>
</head>

<body>
  <div id="chatRoot">
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
     * FastAPI endpoint
     */
    const API_URL = "http://127.0.0.1:8000/chat";

    const statusEl = document.getElementById("status");
    const messagesEl = document.getElementById("messages");
    const inputEl = document.getElementById("input");
    const sendBtn = document.getElementById("send");

    function setStatus(s) { statusEl.textContent = s; }

    function addMsg(text, who) {
      const d = document.createElement("div");
      d.className = "msg " + who;
      d.textContent = text;
      messagesEl.appendChild(d);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    async function sendMessage() {
      const text = inputEl.value.trim();
      if (!text) return;

      inputEl.value = "";
      addMsg(text, "me");
      setStatus("sending...");

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });

        // non-200 => show error bubble
        if (!res.ok) {
          addMsg("error", "bot");
          setStatus("error");
          return;
        }

        const data = await res.json();
        const reply = (data && typeof data.reply === "string") ? data.reply : "";

        // Only allow expected replies
        const allowed = new Set(["hello world", "bye world", "uhhhhh what?"]);

        if (allowed.has(reply)) {
          addMsg(reply, "bot");
          setStatus("idle");
        } else {
          addMsg("error", "bot");
          setStatus("error");
        }

      } catch {
        // backend unreachable => no bot bubble
        setStatus("offline");
      }
    }

    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", (e) => { if (e.key === "Enter") sendMessage(); });

    addMsg("Type: hi → hello world, bye → bye world, anything else → uhhhhh what?", "bot");
  </script>
</body>
</html>`;
}
//# sourceMappingURL=extension.js.map