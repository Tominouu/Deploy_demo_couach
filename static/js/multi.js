document.addEventListener("DOMContentLoaded", () => {
  // Initialisation des éléments DOM
  const messageInput = document.getElementById("messageInput");
  const saveMsgBtn = document.getElementById('saveMsgBtn');
  if (saveMsgBtn) {
    saveMsgBtn.addEventListener('click', async () => {
      if (!messageInput) return alert('Champ message non trouvé.');
      const msg = messageInput.value.trim();
      if (!msg) return alert('Aucun message à enregistrer.');
      const roomId = window.location.pathname.split("/").pop();
      try {
        const response = await fetch('/save_multi_message', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: roomId, user: USERNAME, prompt: msg })
        });
        if (response.ok) {
          alert('Message enregistré !');
          loadRoomHistory(roomId); // Recharge l'historique pour afficher le message
        } else {
          alert('Erreur lors de l\'enregistrement.');
        }
      } catch (e) {
        alert('Erreur réseau.');
      }
    });
  }
  // Fonction pour afficher l'historique d'une room collaborative
  async function loadRoomHistory(roomId) {
    try {
      const response = await fetch(`/multi_history/${roomId}`);
      if (!response.ok) return;
      const history = await response.json();
      messagesDiv.innerHTML = '';
      history.forEach(msg => {
        // Message utilisateur
        const userDiv = document.createElement('div');
        userDiv.className = 'chat-message flex';
        userDiv.innerHTML = `
          <div class="flex items-start space-x-3" style="background: #3c4a5d;">
            <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: black; border-radius: 25px; margin-top: 26px;">
              ${msg.user}
            </div>
            <div class="flex-1 text-white glass-dark mt-1" style="word-break: break-word; white-space: pre-wrap;border-radius: 20px; padding-right: 22px;">
              ${msg.prompt}
            </div>
          </div>`;
        messagesDiv.appendChild(userDiv);
        // Message IA (si présent)
        if (msg.response) {
          const aiDiv = document.createElement('div');
          aiDiv.className = 'chat-message flex message-ai';
          aiDiv.innerHTML = `
            <div class="flex items-start space-x-3" style="background: #3c4a5d;">
              <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: #334155; border-radius: 25px; margin-top: 26px;">IA</div>
              <div class="flex-1 text-white glass-dark mt-1 ai-response-content" style="word-break: break-word; white-space: pre-wrap;border-radius: 20px; padding-right: 22px;">
                ${formatMarkdown(msg.response)}
              </div>
            </div>`;
          messagesDiv.appendChild(aiDiv);
        }
      });
      setTimeout(() => { chatContainer.scrollTop = chatContainer.scrollHeight; }, 10);
      addCopyButtonsToCodeBlocks();
    } catch (e) { console.error(e); }
  }
  // Sidebar multi rooms
  const chatHistory = document.getElementById('chatHistory');
  const newChatBtn = document.getElementById('newChatBtn');
  const searchChatInput = document.getElementById('searchChatInput');

  // Charger les rooms collaboratives
  async function loadMultiRooms() {
    try {
      const response = await fetch('/multi_rooms');
      if (!response.ok) return;
      const rooms = await response.json();
      chatHistory.innerHTML = '';
      const currentRoomId = ROOM_ID;
      rooms.forEach(room => {
        const item = document.createElement('div');
        item.className = 'chat-item p-3 rounded-lg text-white text-sm cursor-pointer flex items-center justify-between' + (room.room_id === currentRoomId ? ' active bg-blue-900/60' : ' hover:bg-slate-700/60');
        item.dataset.roomId = room.room_id;
        let thetime = room.timestamp ? new Date(room.timestamp).toLocaleString('fr-FR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
        item.innerHTML = `
          <div class="flex-1 truncate">
            <p class="font-medium truncate">Room ${room.room_id}</p>
            <p class="text-white/60 text-xs">${thetime}</p>
            <p class="text-white/50 text-xs truncate">${room.last_prompt ? room.last_prompt.slice(0, 40) : ''}</p>
          </div>
          <div class="ml-2 flex items-center">
            <button class="edit-room text-white/60 hover:text-blue-400 p-1 mr-2" title="Renommer" style="margin-top: 1px;">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 3.487a2.25 2.25 0 113.182 3.182l-10.61 10.61a2 2 0 01-.708.444l-3.11 1.11a.5.5 0 01-.64-.64l1.11-3.11a2 2 0 01.444-.708l10.61-10.61z"></path>
              </svg>
            </button>
            <button class="delete-room text-white/60 hover:text-red-400 p-1" title="Supprimer">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
              </svg>
            </button>
            <span class="w-2 h-2 rounded-full ${room.room_id === currentRoomId ? 'bg-blue-400' : 'bg-slate-500'}"></span>
          </div>
        `;
        item.addEventListener('click', (e) => {
          if (!e.target.closest('.delete-room') && !e.target.closest('.edit-room')) {
            loadRoomHistory(room.room_id);
            document.querySelectorAll('.chat-item').forEach(i => i.classList.remove('active', 'bg-blue-900/60'));
            item.classList.add('active', 'bg-blue-900/60');
          }
        });
        // Renommer la room
        item.querySelector('.edit-room').addEventListener('click', (e) => {
          e.stopPropagation();
          const overlay = document.createElement('div');
          overlay.style.position = 'fixed';
          overlay.style.top = 0;
          overlay.style.left = 0;
          overlay.style.width = '100vw';
          overlay.style.height = '100vh';
          overlay.style.background = 'rgba(30, 41, 59, 0.6)';
          overlay.style.zIndex = 10000;
          overlay.style.display = 'flex';
          overlay.style.alignItems = 'center';
          overlay.style.justifyContent = 'center';
          const popup = document.createElement('div');
          popup.className = 'rounded-xl bg-slate-800 text-white p-6 shadow-xl max-w-xs w-full';
          popup.innerHTML = `
            <div class="flex items-center mb-4">
              <svg class="w-6 h-6 text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 30px;">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16.862 3.487a2.25 2.25 0 113.182 3.182l-10.61 10.61a2 2 0 01-.708.444l-3.11 1.11a.5.5 0 01-.64-.64l1.11-3.11a2 2 0 01.444-.708l10.61-10.61z"></path>
              </svg>
              <span class="font-semibold text-lg">Renommer la conversation</span>
            </div>
            <p class="mb-4 text-slate-300">Entrez le nouveau titre de la conversation :</p>
            <input id="editTitleInput" class="w-full p-2 rounded bg-slate-700 text-white mb-4" type="text" value="${room.room_id}" maxlength="100" autofocus />
            <div class="flex justify-end space-x-2">
              <button id="cancelEdit" class="px-4 py-2 rounded bg-slate-600 hover:bg-slate-700 text-white">Annuler</button>
              <button id="confirmEdit" class="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white">Renommer</button>
            </div>
          `;
          overlay.appendChild(popup);
          document.body.appendChild(overlay);
          const input = popup.querySelector('#editTitleInput');
          input.focus();
          input.select();
          popup.querySelector('#cancelEdit').onclick = () => {
            document.body.removeChild(overlay);
          };
          popup.querySelector('#confirmEdit').onclick = async () => {
            const newTitle = input.value.trim();
            if (newTitle && newTitle !== room.room_id) {
              // Appel backend pour renommer la room
              await fetch(`/rename_multi_room/${room.room_id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_title: newTitle })
              });
              loadMultiRooms();
            }
            document.body.removeChild(overlay);
          };
          input.addEventListener('keydown', (ev) => {
            if (ev.key === 'Enter') {
              popup.querySelector('#confirmEdit').click();
            }
          });
        });
        // Supprimer la room
        item.querySelector('.delete-room').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm('Supprimer cette conversation ?')) return;
          await fetch(`/delete_multi_room/${room.room_id}`, { method: 'POST' });
          loadMultiRooms();
        });
        chatHistory.appendChild(item);
      });
    } catch (e) { console.error(e); }
  }

  // Recherche dans la sidebar
  if (searchChatInput) {
    searchChatInput.addEventListener('input', function() {
      const search = this.value.toLowerCase();
      document.querySelectorAll('.chat-item').forEach(item => {
        const title = item.querySelector('.font-medium')?.textContent?.toLowerCase() || '';
        item.style.display = title.includes(search) ? '' : 'none';
      });
    });
  }

  // Nouvelle room collaborative (génère un nouvel ID et redirige)
  if (newChatBtn) {
    newChatBtn.addEventListener('click', () => {
      const newRoomId = Math.random().toString(36).substring(2, 10);
      window.location.href = `/conversations/${newRoomId}`;
    });
  }

  // Charger la liste et l'historique au démarrage
  loadMultiRooms();
  loadRoomHistory(window.location.pathname.split("/").pop());
  const socket = io();
  const ROOM_ID = window.location.pathname.split("/").pop();

  const sendChatBtn   = document.getElementById("sendChatBtn");
  const sendIABtn     = document.getElementById("sendIABtn");
  const messagesDiv   = document.getElementById("messagesContainer");
  const chatContainer = document.getElementById("chatContainer");
  const typingBox     = document.getElementById("typingBox");
  const lockOverlay   = document.getElementById("lockOverlay");

  // -------- Initialisation --------
  enter();
  socket.emit("join", {room: ROOM_ID, user: USERNAME});

  // -------- Envoi avec la touche Entrée --------
  function enter() {
    sendChatBtn.addEventListener('click', () => send(false));

    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (!sendChatBtn.disabled) {
          send(false);
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
        <div class="flex items-start space-x-3" style="background: #3c4a5d;">
          <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: #334155; border-radius: 25px; margin-top: 26px;">
            IA
          </div>
              <div class="flex-1 glass-dark mt-1 ai-response-content" id="ai-stream" style="word-break: break-word; white-space: pre-wrap; border-radius: 20px; padding-right: 22px; color: white; font-size: 1rem;"></div>

        </div>`;
      messagesDiv.appendChild(div);
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);
      return div.querySelector('.ai-response-content');
    } else if (isAI) {
      div.innerHTML = `
        <div class="flex items-start space-x-3" style="background: #3c4a5d;">
          <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: #334155; border-radius: 25px; margin-top: 26px;">
        IA
          </div>
          <div class="flex-1 text-white glass-dark mt-1 ai-response-content" style="word-break: break-word; white-space: pre-wrap;border-radius: 20px; padding-right: 22px;">
        ${formatMarkdown(msg)}
          </div>
        </div>`;
      messagesDiv.appendChild(div);
      addCopyButtonsToCodeBlocks();
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);
    } else {
      div.innerHTML = `
        <div class="flex items-start space-x-3" style="background: #3c4a5d;">
          <div class="flex-none text-xs font-bold w-20 h-8 text-white flex justify-center items-center" style="background: black; border-radius: 25px; margin-top: 26px;">
            ${user}
          </div>
          <div class="flex-1 text-white glass-dark mt-1" style="word-break: break-word; white-space: pre-wrap;border-radius: 20px; padding-right: 22px;">
            ${msg}
          </div>
        </div>`;
      messagesDiv.appendChild(div);
      setTimeout(() => {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }, 10);
    }
    // Correction : émission du message à tous les utilisateurs du salon si ce n'est pas IA
    if (!isAI && !stream) {
      socket.emit("new_message", {user, msg});
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
    // Scroll automatique vers le bas pendant le streaming IA
    setTimeout(() => {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }, 10);
  });
  socket.on("lock_status", ({locked}) => {
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
