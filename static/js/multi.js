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

  function addMsg(user = USERNAME, msg = messageInput.value.trim(), isAI = false) {
    if (!msg) return;
    const div = document.createElement("div");
    div.className = `chat-message flex${isAI ? " message-ai" : ""}`;
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

  socket.on("new_message", ({user, msg}) => addMsg(user, msg));
  socket.on("user_joined", ({user}) => addMsg("System", `${user} a rejoint.`));
  socket.on("ia_stream", ({delta}) => {
    let aiDiv = document.getElementById("ai-stream");
    if (!aiDiv) {
      addMsg("IA", "<span id='ai-stream'></span>", true);
      aiDiv = document.getElementById("ai-stream");
    }
    aiDiv.innerHTML += delta;
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
  });

  function send(is_for_ai) {
    const text = messageInput.value.trim();
    if (!text) return;
    socket.emit("send_message", {room: ROOM_ID, message: text, is_for_ai});
    messageInput.value = "";
    socket.emit("typing", {room: ROOM_ID, text: ""});
  }

  sendChatBtn.onclick = () => send(false);
  sendIABtn.onclick   = () => send(true);
});
