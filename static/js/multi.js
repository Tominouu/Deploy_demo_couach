// static/js/multi.js
(() => {
  const socket = io();
  const ROOM_ID = window.location.pathname.split("/").pop();
  const USERNAME = document.getElementById("username")?.textContent || "Anon";

  const messageInput  = document.getElementById("messageInput");
  const sendChatBtn   = document.getElementById("sendChatBtn");
  const sendIABtn     = document.getElementById("sendIABtn");
  const messagesDiv   = document.getElementById("messagesContainer");
  const typingBox     = document.getElementById("typingBox");
  const lockOverlay   = document.getElementById("lockOverlay");

  /* … rest of the file … */


socket.emit("join", {room: ROOM_ID});

// -------- Typing broadcast --------
let typingTimeout;
messageInput.addEventListener("input", () => {
    clearTimeout(typingTimeout);
    socket.emit("typing", {room: ROOM_ID, text: messageInput.value});
    typingTimeout = setTimeout(() => socket.emit("typing", {room: ROOM_ID, text: ""}), 1000);
});

socket.on("typing_update", (typingMap) => {
    const arr = Object.entries(typingMap).filter(([, txt]) => txt);
    if (arr.length === 0) { typingBox.textContent = ""; return; }
    const preview = arr.map(([u, txt]) => `${u}: ${txt.slice(0, 30)}…`).join(" | ");
    typingBox.textContent = `✍️ ${preview}`;
});

// -------- Lock/Unlock --------
socket.on("lock_status", ({locked}) => {
    lockOverlay.classList.toggle("hidden", !locked);
    sendIABtn.disabled = locked;
});

// -------- Messages --------
function addMsg(user, msg, isAI=false) {
    const div = document.createElement("div");
    div.className = `chat-message ${isAI ? "message-ai" : ""}`;
    div.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="text-xs font-bold w-20">${user}</div>
            <div class="flex-1">${msg}</div>
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

// -------- Send buttons --------
function send(is_for_ai) {
    const text = messageInput.value.trim();
    if (!text) return;
    socket.emit("send_message", {room: ROOM_ID, message: text, is_for_ai});
    messageInput.value = "";
    socket.emit("typing", {room: ROOM_ID, text: ""});
}
sendChatBtn.onclick = () => send(false);
sendIABtn.onclick   = () => send(true);
})();