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

      /* Data Card (The Grey Box) */
      --cardBg: rgba(30, 35, 45, 0.6);
      --cardBorder: rgba(255, 255, 255, 0.15);
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
      gap: 16px;
    }

    #messages::-webkit-scrollbar { width: 10px; }
    #messages::-webkit-scrollbar-thumb {
      background: rgba(255,255,255,0.10);
      border-radius: 999px;
      border: 2px solid rgba(0,0,0,0);
      background-clip: padding-box;
    }

    .msg {
      max-width: 90%;
      font-size: 14px;
      line-height: 1.5;
      word-break: break-word;
    }

    .me {
      align-self: flex-end;
      background: var(--accentBg);
      border: 1px solid var(--accentBorder);
      color: var(--text);
      padding: 10px 14px;
      border-radius: 14px;
    }

    .bot {
      align-self: flex-start;
      color: rgba(255,255,255,0.95);
      padding-left: 4px;
    }

    /* THE GREY BOX */
    .data-card {
      background: var(--cardBg);
      border: 1px solid var(--cardBorder);
      border-radius: 8px;
      padding: 12px;
      margin: 8px 0;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 13px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    /* CUSTOM FORMATTING STYLES */
    
    /* Jira: Simple Bullet */
    .jira-row {
        display: flex;
        align-items: flex-start;
        margin-bottom: 6px;
        color: rgba(255,255,255,0.9);
    }
    .jira-bullet { margin-right: 8px; color: var(--accent); }

    /* Slack: User/Header + Message Body */
    .slack-container {
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(255,255,255,0.05);
    }
    .slack-container:last-child { border-bottom: none; margin-bottom: 0; }

    .slack-header {
        font-size: 0.85em;
        color: var(--accent);
        margin-bottom: 4px;
        font-weight: 600;
        opacity: 0.9;
    }
    .slack-msg {
        color: rgba(255,255,255,0.85);
        white-space: pre-wrap;
    }
    
    /* Banner */
    .banner {
        align-self: center;
        width: 100%;
        color: var(--accent);
        margin-bottom: 10px;
        opacity: 0.9;
    }
    .banner pre {
        font-family: 'Courier New', Courier, monospace;
        font-size: 5px; 
        font-weight: bold;
        line-height: 1.1;
        white-space: pre;
        overflow-x: hidden; 
        margin: 0;
        text-align: center;
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

    // --- STRICT DATA FORMATTER ---
    function formatDataContent(rawText) {
        // Remove all markdown bolding (**text**) globally first
        const cleanText = rawText.replace(/\\*\\*/g, ""); 
        
        const lines = cleanText.split('\\n');
        let htmlOutput = "";
        let foundData = false;

        lines.forEach(line => {
            if (!line.trim()) return;

            // 1. JIRA MATCH
            // Pattern in tools_jira.py: "Ticket: KEY | Status: STATUS | Summary: TEXT | Link: URL"
            // We want to extract Status and Summary only.
            // Regex explanation:
            // Ticket:.*?Status:\\s*([^|]+)  -> Capture Status (Group 1)
            // .*?Summary:\\s*([^|]+)       -> Capture Summary (Group 2)
            const jiraRegex = /Ticket:.*?Status:\s*([^|]+).*?Summary:\s*([^|]+)/i;
            const jiraMatch = line.match(jiraRegex);
            
            if (jiraMatch) {
                foundData = true;
                const status = jiraMatch[1].trim();
                const summary = jiraMatch[2].trim();
                
                // Requested Format: "- Summary - Status"
                htmlOutput += \`
                <div class="jira-row">
                    <span class="jira-bullet">-</span>
                    <span>\${summary} - \${status}</span>
                </div>\`;
                return;
            }

            // 2. SLACK MATCH
            // Pattern in tools_slack.py: "[TIME] Channel: #CH | User: NAME | Msg: TEXT"
            // We want: NAME #CH TIME \n TEXT
            // Regex explanation:
            // \\[([^\]]+)\\]             -> Capture Time (Group 1)
            // .*?Channel:\\s*([^|]+)     -> Capture Channel (Group 2)
            // .*?User:\\s*([^|]+)        -> Capture User (Group 3)
            // .*?Msg:\\s*(.*)            -> Capture Message (Group 4)
            const slackRegex = /\\[([^\]]+)\\].*?Channel:\s*([^|]+).*?User:\s*([^|]+).*?Msg:\s*(.*)/i;
            const slackMatch = line.match(slackRegex);
            
            if (slackMatch) {
                foundData = true;
                const time = slackMatch[1].trim();
                const channel = slackMatch[2].trim();
                const user = slackMatch[3].trim();
                const msg = slackMatch[4].trim();

                // Requested Format: "User #Channel Time <newline> Message"
                htmlOutput += \`
                <div class="slack-container">
                    <div class="slack-header">\${user} #\${channel} \${time}</div>
                    <div class="slack-msg">\${msg}</div>
                </div>\`;
                return;
            }
        });

        // If we found valid data rows, return them.
        // If we found NO data rows (just "Here is the list..."), return EMPTY STRING.
        // This effectively hides the "extra text from you".
        if (foundData) {
            return htmlOutput;
        } else {
            // Fallback: If it's code but not our specific formats, just print it plain
            // but strip the first line if it's generic conversational text.
            return rawText.replace(/</g, "&lt;");
        }
    }

    function parseMarkdown(text) {
      // 1. Separate code blocks from normal text
      const parts = text.split(/(\`\`\`[\\s\\S]*?\`\`\`)/g);

      return parts.map(part => {
        if (part.startsWith("\`\`\`")) {
             // Remove backticks
             const content = part.slice(3, -3);
             
             // Run our strict formatter
             const formatted = formatDataContent(content);
             
             // Only render the grey box if there is actual content
             if (formatted.trim().length > 0 && formatted.includes("div")) {
                 return \`<div class="data-card">\${formatted}</div>\`;
             } else {
                 return ""; // Hide empty/irrelevant code blocks
             }
        } else {
             // Conversational text (outside grey box)
             return part
                .replace(/</g, "&lt;")
                .replace(/\\n/g, "<br>");
        }
      }).join("");
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
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          
          botDiv.innerHTML = parseMarkdown(fullText);
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
        welcomeDiv.textContent = "System Ready. Ask me to 'Search Jira' or 'Find Slack messages'.";
        messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 500);

  </script>
</body>
</html>`;
}