document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const searchInput = document.getElementById('userSearchInput');
  const searchResultsContainer = document.getElementById('search-results');
  const notificationsBtn = document.getElementById('notificationsBtn');
  const notificationsPopup = document.getElementById('notifications-popup');
  const notificationsList = document.getElementById('notifications-list');

  // --- Fonctions utilitaires ---

  // Afficher popup notification temporaire
  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-popup';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  }

  // Fetch JSON helper
  async function fetchJSON(url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Fetch error:', e);
      return null;
    }
  }

  // --- Recherche utilisateurs ---

  let searchTimeout = null;
  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    const query = searchInput.value.trim();
    if (query.length < 2) {
      searchResultsContainer.innerHTML = '';
      return;
    }

    searchTimeout = setTimeout(async () => {
      const users = await fetchJSON(`/search_users?q=${encodeURIComponent(query)}`);
      if (!users) {
        searchResultsContainer.innerHTML = '<p>Erreur lors de la recherche.</p>';
        return;
      }
      if (users.length === 0) {
        searchResultsContainer.innerHTML = '<p>Aucun utilisateur trouvé.</p>';
        return;
      }
      // Affiche les résultats avec bouton "Ajouter"
      searchResultsContainer.innerHTML = users.map(u => `
        <div class="user-result">
          <span>${u.username}</span>
          <button class="add-friend-btn" data-username="${u.username}">Ajouter</button>
        </div>
      `).join('');

      // Ajouter événements aux boutons
      document.querySelectorAll('.add-friend-btn').forEach(btn => {
        btn.onclick = async () => {
          btn.disabled = true;
          const username = btn.dataset.username;
          const res = await fetchJSON('/send_friend_request', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({username})
          });
          if (res?.success) {
            showToast('Demande envoyée');
          } else {
            showToast(res?.error || 'Erreur envoi demande');
          }
          btn.disabled = false;
        };
      });
    }, 300);
  });

  // --- Notifications ---

  // Charger notifications
  async function loadNotifications() {
    const notifications = await fetchJSON('/notifications');
    if (!notifications) {
      notificationsList.innerHTML = '<p>Erreur chargement notifications.</p>';
      return;
    }
    if (notifications.length === 0) {
      notificationsList.innerHTML = '<p>Aucune notification.</p>';
      return;
    }
    notificationsList.innerHTML = notifications.map(n => `
      <div class="notification-item ${n.is_read ? 'read' : 'unread'}" data-id="${n.id}">
        <p>${n.message}</p>
        ${n.type === 'friend_request' && !n.is_read ? `
          <div class="notification-actions">
            <button class="accept-btn" data-request-id="${n.related_id}">Accepter</button>
            <button class="reject-btn" data-request-id="${n.related_id}">Refuser</button>
          </div>
        ` : ''}
      </div>
    `).join('');

    // Actions accepter/refuser
    document.querySelectorAll('.accept-btn').forEach(btn => {
      btn.onclick = () => respondFriendRequest(btn.dataset.requestId, 'accept');
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
      btn.onclick = () => respondFriendRequest(btn.dataset.requestId, 'reject');
    });
  }

  // Afficher / cacher popup notifications
  notificationsBtn.onclick = () => {
    if (notificationsPopup.style.display === 'block') {
      notificationsPopup.style.display = 'none';
    } else {
      notificationsPopup.style.display = 'block';
      loadNotifications();
    }
  };

  // Répondre à une demande d’ami
  async function respondFriendRequest(requestId, action) {
    const res = await fetchJSON('/respond_friend_request', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({request_id: requestId, action})
    });
    if (res?.success) {
      showToast(res.message);
      loadNotifications();
    } else {
      showToast(res?.error || 'Erreur réponse demande');
    }
  }

  // Fermer popup si clic à l’extérieur
  document.addEventListener('click', (e) => {
    if (!notificationsPopup.contains(e.target) && e.target !== notificationsBtn) {
      notificationsPopup.style.display = 'none';
    }
  });

  // --- Style minimal (tu peux adapter à ton CSS) ---
  const style = document.createElement('style');
  style.textContent = `
    #search-results {
      position: absolute;
      background: white;
      border: 1px solid whitesmoke;
      width: 325px;
      max-height: 300px;
      overflow-y: auto;
      z-index: 1000;
      top: 40px;
      left: 50%;
      transform: translateX(-58%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    .user-result {
      display: flex;
      justify-content: space-between;
      padding: 6px 10px;
      border-bottom: 1px solid #eee;
    }
    .user-result button {
      background-color: #007bff;
      border: none;
      color: white;
      padding: 3px 8px;
      cursor: pointer;
      border-radius: 4px;
    }
    .user-result button:disabled {
      background-color: #aaa;
      cursor: not-allowed;
    }
    #notifications-popup {
      display: none;
      position: fixed;
      top: 50px;
      right: 20px;
      width: 320px;
      max-height: 400px;
      background: white;
      border: 1px solid #ccc;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      overflow-y: auto;
      z-index: 1100;
      padding: 10px;
      border-radius: 6px;
    }
    .notification-item {
      border-bottom: 1px solid #eee;
      padding: 8px 5px;
    }
    .notification-item.unread {
      background: #e7f3ff;
      font-weight: bold;
    }
    .notification-actions button {
      margin-right: 5px;
      background-color: #28a745;
      border: none;
      color: white;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 4px;
    }
    .notification-actions button:last-child {
      background-color: #dc3545;
    }
    .toast-popup {
      position: fixed;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 10px 20px;
      border-radius: 20px;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 2000;
      pointer-events: none;
      font-size: 14px;
    }
    .toast-popup.visible {
      opacity: 1;
    }
  `;
  document.head.appendChild(style);
});
