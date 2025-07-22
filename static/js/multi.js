document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const ROOM_ID = window.location.pathname.split("/").pop();

  const messageInput  = document.getElementById("messageInput");
  const sendChatBtn   = document.getElementById("sendChatBtn");
  const sendIABtn     = document.getElementById("sendIABtn");
  const messagesDiv   = document.getElementById("messagesContainer");
  const typingBox     = document.getElementById("typingBox");
  const lockOverlay   = document.getElementById("lockOverlay");

  // -------- Initialisation --------
  enter();
  socket.emit("join", {room: ROOM_ID, user: USERNAME});

  // -------- Envoi avec la touche Entrée --------
  function enter() {
    sendChatBtn.addEventListener('click', addMsg);

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendChatBtn.disabled) {
          addMsg();
        }
      }
    });

    // Typing broadcast
    let typingTimeout;
    messageInput.addEventListener("input", () => {
      clearTimeout(typingTimeout);
      socket.emit("typing", {room: ROOM_ID, text: messageInput.value});
      typingTimeout = setTimeout(() => socket.emit("typing", {room: ROOM_ID, text: ""}), 1000);
    });
  }

  socket.on("typing_update", (typingMap) => {
    const arr = Object.entries(typingMap).filter(([, txt]) => txt);
    if (arr.length === 0) { typingBox.textContent = ""; return; }
    const preview = arr.map(([u, txt]) => `${u}: ${txt.slice(0, 999999)}…`).join(" | ");
    typingBox.textContent = `✍️ ${preview}`;
  });

  socket.on("lock_status", ({locked}) => {
    lockOverlay.classList.toggle("hidden", !locked);
    sendIABtn.disabled = locked;
  });

  function addMsg(user = USERNAME, msg = messageInput.value.trim(), isAI = false, stream = false) {
    if (!msg && !stream) return;
    const div = document.createElement("div");
    div.className = `chat-message flex${isAI ? " message-ai" : ""}`;
    if (isAI && stream) {
      div.innerHTML = `
        <div class="flex items-start space-x-3">
          <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: #334155; border-radius: 25px; margin-top: 26px;">
            IA
          </div>
          <div class="flex-1 glass-dark mt-1 ai-response-content" id="ai-stream" style="word-break: break-word; white-space: pre-wrap; border-radius: 20px; padding-right: 22px; color: #222; font-size: 1rem;"></div>
        </div>`;
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
      return div.querySelector('.ai-response-content');
    } else if (isAI) {
      div.innerHTML = `
        <div class="flex items-start space-x-3">
          <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: #334155; border-radius: 25px; margin-top: 26px;">
            IA
          </div>
          <div class="flex-1 text-white glass-dark mt-1 ai-response-content" style="word-break: break-word; white-space: pre-wrap;border-radius: 20px; padding-right: 22px;">
            ${formatMarkdown(msg)}
          </div>
        </div>`;
      messagesDiv.appendChild(div);
      addCopyButtonsToCodeBlocks();
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    } else {
      div.innerHTML = `
        <div class="flex items-start space-x-3">
          <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: black; border-radius: 25px; margin-top: 26px;">
            ${user}
          </div>
          <div class="flex-1 text-white glass-dark mt-1" style="word-break: break-word; white-space: pre-wrap;border-radius: 20px; padding-right: 22px;">
            ${msg}
          </div>
        </div>`;
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }

  // Markdown rendering (copié/adapté de chat.js)
  function formatMarkdown(text) {
    if (typeof marked !== 'undefined') {
      marked.setOptions({
        highlight: function(code, lang) {
          if (lang && window.hljs && hljs.getLanguage(lang)) {
            try {
              return hljs.highlight(code, { language: lang }).value;
            } catch (err) {}
          }
          return window.hljs ? hljs.highlightAuto(code).value : code;
        },
        breaks: true,
        gfm: true
      });
      let html = marked.parse(text);
      html = html.replace(/<pre><code class="language-(\w+)">/g,
        '<div class="code-block"><div class="code-header">$1</div><pre><code class="language-$1">');
      html = html.replace(/<\/code><\/pre>/g, '</code></pre></div>');
      return html;
    }
    return text;
  }

  function addCopyButtonsToCodeBlocks() {
    document.querySelectorAll('.message-ai pre code').forEach((block) => {
      if (block.parentNode.querySelector('.copy-btn')) return;
      const btn = document.createElement('button');
      btn.className = 'copy-btn absolute top-2 right-2 bg-slate-700 text-white text-xs px-2 py-1 rounded hover:bg-blue-500 transition z-10';
      btn.textContent = 'Copier';
      btn.title = 'Copier le code';
      btn.onclick = (e) => {
        e.stopPropagation();
        const code = block.innerText;
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(code).then(() => {
            btn.textContent = 'Copié !';
            setTimeout(() => btn.textContent = 'Copier', 1200);
          }).catch(() => {
            fallbackCopyTextToClipboard(code, btn);
          });
        } else {
          fallbackCopyTextToClipboard(code, btn);
        }
      };
      block.parentNode.style.position = 'relative';
      block.parentNode.appendChild(btn);
    });
  }
  function fallbackCopyTextToClipboard(text, btn) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', '');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      if (btn) {
        btn.textContent = 'Copié !';
        setTimeout(() => btn.textContent = 'Copier', 1200);
      }
    } catch (err) {
      if (btn) {
        btn.textContent = 'Erreur';
        setTimeout(() => btn.textContent = 'Copier', 1200);
      }
    }
  }
  socket.on("new_message", ({user, msg}) => addMsg(user, msg));
  socket.on("user_joined", ({user}) => addMsg("System", `${user} a rejoint.`));
  // Streaming IA : markdown et copy
  let aiStreamDiv = null;
  let aiStreamText = "";
  socket.on("ia_stream", ({delta}) => {
    if (!aiStreamDiv) {
      aiStreamDiv = addMsg("IA", "", true, true);
      aiStreamText = "";
    }
    aiStreamText += delta;
    aiStreamDiv.innerHTML = formatMarkdown(aiStreamText);
    addCopyButtonsToCodeBlocks();
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });
  socket.on("lock_status", ({locked}) => {
    lockOverlay.classList.toggle("hidden", !locked);
    sendIABtn.disabled = locked;
    if (!locked) {
      aiStreamDiv = null;
      aiStreamText = "";
    }
  });

  function send(is_for_ai) {
    const text = messageInput.value.trim();
    if (!text) return;
    let model = "phi3:mini";
    const modelSelect = document.getElementById("modelSelect");
    if (modelSelect) model = modelSelect.value;
    socket.emit("send_message", {room: ROOM_ID, message: text, is_for_ai, model});
    messageInput.value = "";
    socket.emit("typing", {room: ROOM_ID, text: ""});
  }

  sendChatBtn.onclick = () => send(false);
  sendIABtn.onclick   = () => send(true);
});
