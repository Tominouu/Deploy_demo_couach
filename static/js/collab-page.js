// static/js/collab.js - Collaborators functionality

let collaborators = [];
let currentCollaboratorToRemove = null;

function initCollaborators() {
    setupEventListeners();
    loadCollaborators();
}

function setupEventListeners() {
    // Modal controls
    document.getElementById('addCollaboratorBtn').addEventListener('click', showAddModal);
    document.getElementById('closeAddModal').addEventListener('click', hideAddModal);
    document.getElementById('cancelAddCollaborator').addEventListener('click', hideAddModal);
    document.getElementById('closeRemoveModal').addEventListener('click', hideRemoveModal);
    document.getElementById('cancelRemoveCollaborator').addEventListener('click', hideRemoveModal);
    
    // Search functionality
    document.getElementById('searchCollaborators').addEventListener('input', filterCollaborators);
    document.getElementById('collaboratorUsername').addEventListener('input', searchUsers);
    
    // Actions
    document.getElementById('sendFriendRequest').addEventListener('click', sendFriendRequest);
    document.getElementById('confirmRemoveCollaborator').addEventListener('click', confirmRemoveCollaborator);
    
    // Close modals on backdrop click
    document.getElementById('addCollaboratorModal').addEventListener('click', function(e) {
        if (e.target === this) hideAddModal();
    });
    document.getElementById('removeCollaboratorModal').addEventListener('click', function(e) {
        if (e.target === this) hideRemoveModal();
    });
}

function showAddModal() {
    document.getElementById('addCollaboratorModal').classList.remove('hidden');
    document.getElementById('collaboratorUsername').focus();
}

function hideAddModal() {
    document.getElementById('addCollaboratorModal').classList.add('hidden');
    document.getElementById('collaboratorUsername').value = '';
    document.getElementById('userSearchResults').innerHTML = '';
}

function showRemoveModal(username) {
    currentCollaboratorToRemove = username;
    document.getElementById('collaboratorToRemove').textContent = username;
    document.getElementById('removeCollaboratorModal').classList.remove('hidden');
}

function hideRemoveModal() {
    document.getElementById('removeCollaboratorModal').classList.add('hidden');
    currentCollaboratorToRemove = null;
}

async function loadCollaborators() {
    try {
        const response = await fetch('/get_friends');
        if (response.ok) {
            collaborators = await response.json();
            displayCollaborators(collaborators);
        }
    } catch (error) {
        console.error('Error loading collaborators:', error);
        showToast('Erreur lors du chargement des collaborateurs', 'error');
    }
}

function displayCollaborators(collaboratorsToShow) {
    const container = document.getElementById('collaboratorsList');
    const emptyState = document.getElementById('emptyState');
    
    if (collaboratorsToShow.length === 0) {
        container.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    container.innerHTML = collaboratorsToShow.map(collaborator => `
        <div class="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md transition">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-slate-700 to-slate-600 rounded-full flex items-center justify-center">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="8" r="4"/>
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="font-semibold text-gray-900">${collaborator.username}</h3>
                        <p class="text-sm text-gray-500">Collaborateur depuis ${formatDate(collaborator.created_at)}</p>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <button onclick="inviteToConversation('${collaborator.username}')" 
                            class="btn-primary px-6 py-2 rounded-xl text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                        </svg>
                        <span>Inviter à une conversation</span>
                    </button>
                    <button onclick="showRemoveModal('${collaborator.username}')" 
                            class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition flex items-center space-x-2">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        <span>Supprimer</span>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

function filterCollaborators() {
    const query = document.getElementById('searchCollaborators').value.toLowerCase();
    const filtered = collaborators.filter(collaborator => 
        collaborator.username.toLowerCase().includes(query)
    );
    displayCollaborators(filtered);
}

let searchTimeout;
async function searchUsers() {
    clearTimeout(searchTimeout);
    const query = document.getElementById('collaboratorUsername').value.trim();
    
    if (query.length < 2) {
        document.getElementById('userSearchResults').innerHTML = '';
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/search_users?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const users = await response.json();
                displaySearchResults(users);
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    }, 300);
}

function displaySearchResults(users) {
    const container = document.getElementById('userSearchResults');
    
    if (users.length === 0) {
        container.innerHTML = '<p class="text-sm text-gray-500">Aucun utilisateur trouvé</p>';
        return;
    }
    
    container.innerHTML = users.map(user => `
        <div class="p-2 hover:bg-gray-100 rounded cursor-pointer" onclick="selectUser('${user.username}')">
            <div class="flex items-center space-x-2">
                <div class="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center">
                    <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="12" cy="8" r="4"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 20c0-3.314 3.134-6 7-6s7 2.686 7 6"/>
                    </svg>
                </div>
                <span class="text-sm">${user.username}</span>
            </div>
        </div>
    `).join('');
}

function selectUser(username) {
    document.getElementById('collaboratorUsername').value = username;
    document.getElementById('userSearchResults').innerHTML = '';
}

async function sendFriendRequest() {
    const username = document.getElementById('collaboratorUsername').value.trim();
    
    if (!username) {
        showToast('Veuillez entrer un nom d\'utilisateur', 'error');
        return;
    }
    
    try {
        const response = await fetch('/send_friend_request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username: username })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Demande envoyée avec succès');
            hideAddModal();
        } else {
            showToast(result.error || 'Erreur lors de l\'envoi de la demande', 'error');
        }
    } catch (error) {
        console.error('Error sending friend request:', error);
        showToast('Erreur lors de l\'envoi de la demande', 'error');
    }
}

async function confirmRemoveCollaborator() {
    if (!currentCollaboratorToRemove) return;
    
    try {
        const response = await fetch('/remove_friend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ friend_username: currentCollaboratorToRemove })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            showToast(result.message || 'Collaborateur supprimé avec succès');
            hideRemoveModal();
            loadCollaborators(); // Reload the list
        } else {
            showToast(result.error || 'Erreur lors de la suppression', 'error');
        }
    } catch (error) {
        console.error('Error removing collaborator:', error);
        showToast('Erreur lors de la suppression', 'error');
    }
}

async function inviteToConversation(username) {
    // Visual feedback only - this would typically open a modal or redirect
    let num_room = (Math.random() + 1).toString(36).substring(7);
    try {
        const response = await fetch('/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ numroom: num_room, receiver: username})
        });
        if (response.ok) {
            showToast(`Invitation envoyée à ${username} pour rejoindre une conversation`);
        } else {
            showToast('Erreur lors de l\'invitation', 'error');
        }
    } catch (error) {
        console.error('Error inviting to conversation:', error);
        showToast('Erreur lors de l\'invitation', 'error');
    }
    //hideAddModal();
    //loadCollaborators(); // Reload the list to reflect changes
    //showToast(`Invitation envoyée à ${username} pour rejoindre une conversation IA`);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function showToast(message, type = 'info') {
    const toast = document.getElementById('toastNotification');
    const messageSpan = document.getElementById('toastMessage');
    
    messageSpan.textContent = message;
    
    // Change icon based on type
    const icon = toast.querySelector('svg');
    if (type === 'error') {
        icon.classList.add('text-red-500');
        icon.classList.remove('text-blue-500');
    } else {
        icon.classList.add('text-blue-500');
        icon.classList.remove('text-red-500');
    }
    
    toast.classList.remove('hidden');
    
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}