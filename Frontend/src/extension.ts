import * as vscode from "vscode";

const CHAT_VIEW_ID = "nexhacks26.chatView";
const CONTAINER_ID = "nexhacks26Container";

export function activate(context: vscode.ExtensionContext) {
  const provider = new NexHacksChatViewProvider(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(CHAT_VIEW_ID, provider, {
      webviewOptions: { retainContextWhenHidden: true }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("nexhacks26.openChat", async () => {
      await vscode.commands.executeCommand(`workbench.view.extension.${CONTAINER_ID}`);
    })
  );
}

export function deactivate() {}

class NexHacksChatViewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView) {
    webviewView.webview.options = { enableScripts: true };
    webviewView.webview.html = getWebviewHtml();
  }
}

function getWebviewHtml(): string {
  const nonce = String(Math.random()).slice(2);
  
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
  <title>NexHacks Chat</title>

  <style>
    :root {
      --bg: #0b0f17;
      --panel: rgba(18, 22, 34, 0.78);
      --border: rgba(255,255,255,0.10);
      --border2: rgba(255,255,255,0.14);
      --text: rgba(255,255,255,0.92);
      --muted: rgba(255,255,255,0.70);

      /* User Bubble (Blueish) */
      --accent: #7dd3fc;
      --accentBg: rgba(125,211,252,0.18);
      --accentBorder: rgba(125,211,252,0.35);

      /* Bot Bubble (Greyish) */
      --botBg: rgba(255, 255, 255, 0.08);
      --botBorder: rgba(255, 255, 255, 0.15);
    }

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

    #header {
      padding: 12px 14px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-weight: 650;
      letter-spacing: 0.2px;
    }

    #status {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      padding: 4px 10px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(255,255,255,0.04);
    }

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
      padding: 10px 12px;
      border-radius: 14px;
    }

    /* CLI Banner Style */
    .banner {
        align-self: center;
        width: 100%;
        color: var(--accent);
        margin-bottom: 10px;
        opacity: 0.9;
    }
    .banner pre {
        font-family: 'Courier New', Courier, monospace;
        font-size: 5px; /* Tiny font to make the wider banner fit */
        font-weight: bold;
        line-height: 1.1;
        white-space: pre;
        overflow-x: hidden; 
        margin: 0;
        text-align: center;
    }

    /* User Message (Right / Blue) */
    .me {
      align-self: flex-end;
      background: var(--accentBg);
      border: 1px solid var(--accentBorder);
      color: var(--text);
    }

    /* Bot Message (Left / Grey Box) */
    .bot {
      align-self: flex-start;
      background: var(--botBg);
      border: 1px solid var(--botBorder);
      color: rgba(255,255,255,0.92);
    }

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
      <div>NexHacks Agent</div>
      <div id="status">idle</div>
    </div>

    <div id="messages"></div>

    <div id="composer">
      <input id="input" placeholder="Ask about Jira, Slack, or Code..." />
      <button id="send">Send</button>
    </div>
  </div>

  <script nonce="${nonce}">
    const API_URL = "http://127.0.0.1:8000/chat";

    const statusEl = document.getElementById("status");
    const messagesEl = document.getElementById("messages");
    const inputEl = document.getElementById("input");
    const sendBtn = document.getElementById("send");

    let isGenerating = false;

    // --- ASCII ART BANNER (Corrected Spelling) ---
    const BANNER_ART = \`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║  ██████╗ ██████╗ ███╗   ██╗████████╗███████╗██╗  ██╗████████╗ ║
║ ██╔════╝██╔═══██╗████╗  ██║╚══██╔══╝██╔════╝╚██╗██╔╝╚══██╔══╝ ║
║ ██║     ██║   ██║██╔██╗ ██║   ██║   █████╗   ╚███╔╝    ██║    ║
║ ██║     ██║   ██║██║╚██╗██║   ██║   ██╔══╝   ██╔██╗    ██║    ║
║ ╚██████╗╚██████╔╝██║ ╚████║   ██║   ███████╗██╔╝ ██╗   ██║    ║
║  ╚═════╝ ╚═════╝ ╚═╝  ╚═══╝   ╚═╝   ╚══════╝╚═╝  ╚═╝   ╚═╝    ║
║                                                               ║
║          ██████╗  █████                                       ║
║         ██╔═══   ██╔══██╗                                     ║
║         ██║      ██║  ██║                                     ║
║         ██║      ██║  ██║                                     ║
║         ╚██████   ██████                                      ║
║          ╚═════╝  ╚════╝                                      ║
║                                                               ║
║ ╔═══════════════════════════════════════════════════════════╗ ║
║ ║      🧠 AI-Powered Context Assistant                      ║ ║
║ ║      🔗 Connect | Search | Understand                     ║ ║
║ ╚═══════════════════════════════════════════════════════════╝ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝\`;

    function setStatus(s) { statusEl.textContent = s; }

    function createMsgDiv(who) {
      const d = document.createElement("div");
      d.className = "msg " + who;
      messagesEl.appendChild(d);
      return d;
    }

    function addBanner() {
      const d = document.createElement("div");
      d.className = "banner";
      const pre = document.createElement("pre");
      pre.textContent = BANNER_ART;
      d.appendChild(pre);
      messagesEl.appendChild(d);
    }

    async function sendMessage() {
      if (isGenerating) return; 
      const text = inputEl.value.trim();
      if (!text) return;

      inputEl.value = "";
      
      const userDiv = createMsgDiv("me");
      userDiv.textContent = text;
      messagesEl.scrollTop = messagesEl.scrollHeight;
      
      setStatus("thinking...");
      isGenerating = true;

      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text })
        });

        if (!res.ok) throw new Error("Backend Error " + res.status);

        const botDiv = createMsgDiv("bot");
        setStatus("generating...");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          botDiv.textContent += chunk;
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        setStatus("idle");

      } catch (err) {
        const errDiv = createMsgDiv("bot");
        errDiv.textContent = "Error connecting to Agent: " + err.message;
        errDiv.style.color = "#ff6b6b";
        setStatus("offline");
      } finally {
        isGenerating = false;
      }
    }

    sendBtn.addEventListener("click", sendMessage);
    inputEl.addEventListener("keydown", (e) => { 
      if (e.key === "Enter") sendMessage(); 
    });

    addBanner();
    setTimeout(() => {
        const welcomeDiv = createMsgDiv("bot");
        welcomeDiv.textContent = "System Ready. How can I help you today?";
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 500);

  </script>
</body>
</html>`;
}