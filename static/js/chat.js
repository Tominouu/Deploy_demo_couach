// État de l'application
        let currentChatId = null;
        let chats = {};
        let chatCounter = 0;
        let sidebarCollapsed = false;
        
        // Éléments DOM
        let sidebar, toggleSidebar, newChatBtn, chatHistory, messagesContainer;
        let messageInput, sendBtn, typingIndicator, charCount, chatContainer;

        // Fonctions
        function initializeElements() {
            sidebar = document.getElementById('sidebar');
            toggleSidebar = document.getElementById('toggleSidebar');
            newChatBtn = document.getElementById('newChatBtn');
            chatHistory = document.getElementById('chatHistory');
            messagesContainer = document.getElementById('messagesContainer');
            messageInput = document.getElementById('messageInput');
            sendBtn = document.getElementById('sendBtn');
            typingIndicator = document.getElementById('typingIndicator');
            charCount = document.getElementById('charCount');
            chatContainer = document.getElementById('chatContainer');

            // S'assurer que typingIndicator est dans messagesContainer
            if (typingIndicator && typingIndicator.parentNode !== messagesContainer) {
                messagesContainer.appendChild(typingIndicator);
            }

            return !!(messageInput && sendBtn && typingIndicator && messagesContainer);
        }

        // Initialisation des gestionnaires d'événements
        function initializeEventListeners() {
            // Gestion de l'envoi des messages
            sendBtn.addEventListener('click', sendMessage);
            
            messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!sendBtn.disabled) {
                        sendMessage();
                    }
                }
            });
            
            messageInput.addEventListener('input', () => {
                updateCharCount();
                adjustTextareaHeight();
            });

            // Gestion de la sidebar
            toggleSidebar.addEventListener('click', () => {
                sidebarCollapsed = !sidebarCollapsed;
                sidebar.classList.toggle('collapsed');
                
                const sidebarContent = document.getElementById('sidebarContent');
                const newChatText = document.getElementById('newChatText');
                const newChatIcon = document.getElementById('newChatIcon');
                const userDetails = document.getElementById('userDetails');
                
                if (sidebarCollapsed) {
                    sidebarContent.style.display = 'none';
                    newChatText.classList.add('hidden');
                    newChatIcon.classList.remove('hidden');
                    userDetails.style.display = 'none';
                } else {
                    sidebarContent.style.display = 'block';
                    newChatText.classList.remove('hidden');
                    newChatIcon.classList.add('hidden');
                    userDetails.style.display = 'block';
                }
            });

            // Gestion des chats
            newChatBtn.addEventListener('click', createNewChat);

            // Gestion du redimensionnement
            window.addEventListener('resize', () => {
                scrollToBottom();
            });
        }

        // Attendre que le DOM soit complètement chargé
        document.addEventListener('DOMContentLoaded', () => {
            // Initialisation des éléments DOM
            if (!initializeElements()) {
                console.error('Éléments du formulaire non trouvés');
                return;
            }

            // Initialisation des événements
            initializeEventListeners();

            // Initialisation de l'interface
            addWelcomeMessage();
            messageInput.focus();
        });

        document.addEventListener('DOMContentLoaded', async () => {
            // Initialisation des éléments DOM
            if (!initializeElements()) {
                console.error('Éléments du formulaire non trouvés');
                return;
            }

            // Initialisation des événements
            initializeEventListeners();

            // Chargement des conversations existantes
            await loadExistingChats();

            // Focus sur l'input
            messageInput.focus();
        });


         async function createNewChat() {
            const title = `Conversation ${chatCounter + 1}`;
            
            try {
                const response = await fetch('/conversation', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title })
                });

                // Vérifier si la réponse est OK
                if (!response.ok) {
                    console.error('Erreur serveur:', response.status, response.statusText);
                    alert(`Erreur lors de la création de la conversation: ${response.status}`);
                    return;
                }

                // Vérifier le type de contenu
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    console.error('Réponse non-JSON reçue:', contentType);
                    const textResponse = await response.text();
                    console.error('Contenu de la réponse:', textResponse);
                    alert('Erreur: Réponse serveur invalide');
                    return;
                }

                const data = await response.json();
                
                if (!data.conversation_id) {
                    alert('Erreur lors de la création de la conversation.');
                    return;
                }

                chatCounter++;
                const chatId = `chat-${chatCounter}`;
                const conversationId = data.conversation_id;

                chats[chatId] = {
                    id: chatId,
                    dbId: conversationId,
                    title,
                    messages: [],
                    createdAt: new Date()
                };

                addChatToHistory(chatId, title);
                switchToChat(chatId);

            } catch (error) {
                console.error('Erreur lors de la création du chat:', error);
                alert('Erreur de connexion lors de la création de la conversation');
            }
        }

        async function loadExistingChats() {
            try {
                const response = await fetch('/conversations');
                
                if (!response.ok) {
                    console.error('Erreur lors du chargement des conversations:', response.status);
                    return;
                }

                const conversations = await response.json();

                conversations.forEach((conv, index) => {
                    const chatId = `chat-${index + 1}`;
                    chats[chatId] = {
                        id: chatId,
                        dbId: conv.id,
                        title: conv.title,
                        messages: [],
                        createdAt: new Date(conv.created_at)
                    };
                    addChatToHistory(chatId, conv.title);
                });

                // Mettre à jour le compteur
                chatCounter = conversations.length;

                if (Object.keys(chats).length > 0) {
                    const firstChatId = Object.keys(chats)[0];
                    switchToChat(firstChatId);
                } else {
                    // Si aucune conversation, en créer une nouvelle
                    await createNewChat();
                }

            } catch (error) {
                console.error('Erreur lors du chargement des conversations:', error);
                // En cas d'erreur, créer une nouvelle conversation
                await createNewChat();
            }
        }




         //function createNewChat() {
            //chatCounter++;
            //const chatId = `chat-${chatCounter}`;
            //const chatTitle = `Conversation ${chatCounter}`;
            
           // chats[chatId] = {
                //id: chatId,
                //title: chatTitle,
                //messages: [],
                //createdAt: new Date()
           // };
            
            //addChatToHistory(chatId, chatTitle);
            //switchToChat(chatId);
        //}
        
        function addChatToHistory(chatId, title) {
            const chatItem = document.createElement('div');
            chatItem.className = 'chat-item p-3 rounded-lg text-white text-sm';
            chatItem.dataset.chatId = chatId;
            
            chatItem.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex-1 truncate">
                        <p class="font-medium truncate">${title}</p>
                        <p class="text-white/60 text-xs">Aujourd'hui</p>
                    </div>
                    <button class="delete-chat text-white/60 hover:text-red-400 p-1" data-chat-id="${chatId}">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                    </button>
                </div>
            `;
            
            chatItem.addEventListener('click', (e) => {
                if (!e.target.closest('.delete-chat')) {
                    switchToChat(chatId);
                }
            });
            
            chatItem.querySelector('.delete-chat').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteChat(chatId);
            });
            
            chatHistory.appendChild(chatItem);
        }
        
        function switchToChat(chatId) {
            document.querySelectorAll('.chat-item').forEach(item => {
                item.classList.remove('active');
            });
            
            const chatItem = document.querySelector(`[data-chat-id="${chatId}"]`);
            if (chatItem) {
                chatItem.classList.add('active');
            }
            
            currentChatId = chatId;
            loadChatMessages(chatId);
        }
        
        async function deleteChat(chatId) {
            if (confirm('Êtes-vous sûr de vouloir supprimer cette conversation ?')) {
                const chat = chats[chatId];
                
                // Optionnel : supprimer aussi de la base de données
                try {
                    await fetch(`/conversation/${chat.dbId}`, {
                        method: 'DELETE'
                    });
                } catch (error) {
                    console.error('Erreur lors de la suppression:', error);
                }
                
                delete chats[chatId];
                document.querySelector(`[data-chat-id="${chatId}"]`).remove();
                
                if (currentChatId === chatId) {
                    currentChatId = null;
                    clearMessages();
                    addWelcomeMessage();
                }
            }
        }

        async function loadChatMessages(chatId) {
            clearMessages();

            const chat = chats[chatId];
            if (!chat) return;

            // Si on a déjà les messages en cache
            if (chat.messages.length > 0) {
                chat.messages.forEach(msg => {
                    addMessageToUI(msg.content, msg.isUser, false);
                });
                return;
            }

            // Sinon, les charger depuis la base
            try {
                const response = await fetch(`/conversation/${chat.dbId}/history`);
                const history = await response.json();

                history.forEach(entry => {
                    const userMsg = { content: entry.prompt, isUser: true };
                    const aiMsg = { content: entry.response, isUser: false };
                    
                    chat.messages.push(userMsg);
                    chat.messages.push(aiMsg);
                    
                    addMessageToUI(userMsg.content, userMsg.isUser, false);
                    addMessageToUI(aiMsg.content, aiMsg.isUser, false);
                });
            } catch (error) {
                console.error('Erreur lors du chargement de l\'historique:', error);
                addWelcomeMessage();
            }
        }


        
        //function loadChatMessages(chatId) {
           // clearMessages();
            
            //const chat = chats[chatId];
         //   if (chat && chat.messages.length > 0) {
           //     chat.messages.forEach(message => {
             //       addMessageToUI(message.content, message.isUser, false);
               // });
          //  } else {
             //   addWelcomeMessage();
           // }
       // }
        
        function clearMessages() {
            messagesContainer.innerHTML = '';
            // Recréer l'indicateur de frappe
            const typingDiv = document.createElement('div');
            typingDiv.id = 'typingIndicator';
            typingDiv.className = 'typing-indicator chat-message';
            typingDiv.innerHTML = `
                <div class="message-ai rounded-2xl p-4 shadow-sm">
                    <div class="flex items-center space-x-3">
                        <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center">
                            <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                            </svg>
                        </div>
                        <div class="flex space-x-1">
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                            <div class="typing-dot"></div>
                        </div>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(typingDiv);
            typingIndicator = typingDiv;
        }
        
        function addWelcomeMessage() {
            const welcomeMessage = `
                <div class="chat-message">
                    <div class="message-ai rounded-2xl p-4 shadow-sm">
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="font-medium text-slate-800 mb-1">Assistant CouachGPT</p>
                                <div class="text-slate-700">
                                    <p>Bonjour ! Je suis votre assistant CouachGPT</p>
                                    <p class="mt-2">Je peux vous aider avec :</p>
                                    <ul class="mt-2 space-y-1 text-sm">
                                        <li>• Développement web</li>
                                        <li>• Conseils de programmation</li>
                                        <li>• Services informatiques</li>
                                        <li>• Maintenance et support technique</li>
                                    </ul>
                                    <p class="mt-3 text-sm text-slate-600">Comment puis-je vous assister aujourd'hui ?</p>
                                </div>
                                <span class="text-xs text-slate-500 mt-2 block">Maintenant</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            messagesContainer.innerHTML = welcomeMessage + messagesContainer.innerHTML;
        }
        
        function addMessageToUI(message, isUser, animate = true) {
            const messageDiv = document.createElement('div');
            messageDiv.className = `chat-message${animate ? '' : ' opacity-100'}`;
            
            const timestamp = new Date().toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            });
            
            if (isUser) {
                messageDiv.innerHTML = `
                    <div class="message-user rounded-2xl p-4 shadow-sm">
                        <div class="flex items-start space-x-3">
                            <div>
                                <div class="text-white">
                                    <p>${message}</p>
                                </div>
                                <span class="text-xs text-white/70 mt-2 block">${timestamp}</span>
                            </div>
                            <div class="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                messageDiv.innerHTML = `
                    <div class="message-ai rounded-2xl p-4 shadow-sm">
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="font-medium text-slate-800 mb-1">Assistant Couach IA</p>
                                <div class="text-slate-700">
                                    <p>${message}</p>
                                </div>
                                <span class="text-xs text-slate-500 mt-2 block">${timestamp}</span>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            // Vérifier si typingIndicator est un enfant de messagesContainer
            if (typingIndicator && typingIndicator.parentNode === messagesContainer) {
                messagesContainer.insertBefore(messageDiv, typingIndicator);
            } else {
                messagesContainer.appendChild(messageDiv);
            }
            scrollToBottom();
        }
        
        function showTyping() {
            typingIndicator.classList.add('active');
            scrollToBottom();
        }
        
        function hideTyping() {
            typingIndicator.classList.remove('active');
        }
        
        function scrollToBottom() {
            setTimeout(() => {
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }, 100);
        }
        
        // Variable pour suivre le message IA en cours
        let aiMessageElement = null;
        
        function updateAIMessage(text) {
            if (!aiMessageElement) {
                const timestamp = new Date().toLocaleTimeString('fr-FR', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const messageDiv = document.createElement('div');
                messageDiv.className = 'chat-message';
                messageDiv.innerHTML = `
                    <div class="message-ai rounded-2xl p-4 shadow-sm">
                        <div class="flex items-start space-x-3">
                            <div class="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                                </svg>
                            </div>
                            <div>
                                <p class="font-medium text-slate-800 mb-1">Assistant Couach IA</p>
                                <div class="text-slate-700">
                                    <p class="ai-response-text"></p>
                                </div>
                                <span class="text-xs text-slate-500 mt-2 block">${timestamp}</span>
                            </div>
                        </div>
                    </div>
                `;
                
                if (typingIndicator && typingIndicator.parentNode === messagesContainer) {
                    messagesContainer.insertBefore(messageDiv, typingIndicator);
                } else {
                    messagesContainer.appendChild(messageDiv);
                }
                
                aiMessageElement = messageDiv.querySelector('.ai-response-text');
            }
            
            aiMessageElement.textContent = text;
            scrollToBottom();
        }
        

        // Envoi de message
        async function sendMessage() {
            const message = messageInput.value.trim();
            if (!message) return;
            
            if (!currentChatId) {
                await createNewChat();
                // Vérifier si la création a réussi
                if (!currentChatId) {
                    alert('Impossible de créer une nouvelle conversation');
                    return;
                }
            }
            
            sendBtn.disabled = true;
            
            // Ajouter le message utilisateur
            addMessageToUI(message, true);
            
            // Sauvegarder le message utilisateur
            if (currentChatId) {
                chats[currentChatId].messages.push({
                    content: message,
                    isUser: true,
                    timestamp: new Date()
                });
            }
            
            messageInput.value = '';
            updateCharCount();
            adjustTextareaHeight();
            
            // Afficher l'indicateur de frappe
            showTyping();
            aiMessageElement = null;
            
            // Vérifier que le chat existe et a un dbId
            const currentChat = chats[currentChatId];
            if (!currentChat || !currentChat.dbId) {
                console.error('Chat ou dbId manquant:', currentChat);
                hideTyping();
                addMessageToUI("❌ Erreur: Conversation invalide.", false);
                sendBtn.disabled = false;
                return;
            }
            
            // Envoi réel à l'API backend
            const payload = {
                prompt: message,
                model: 'phi3:mini',
                userMessage: message,
                conversation_id: currentChat.dbId
            };

            try {
                const response = await fetch('/ask', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let buffer = '';
                let fullResponse = '';

                function read() {
                    return reader.read().then(({ done, value }) => {
                        if (done) {
                            hideTyping();
                            
                            // Sauvegarder la réponse complète dans l'historique local
                            if (currentChatId && fullResponse) {
                                chats[currentChatId].messages.push({
                                    content: fullResponse,
                                    isUser: false,
                                    timestamp: new Date()
                                });
                            }
                            
                            aiMessageElement = null;
                            return;
                        }

                        buffer += decoder.decode(value, { stream: true });
                        const lines = buffer.split('\n');
                        buffer = lines.pop();

                        for (const line of lines) {
                            if (line.trim()) {
                                try {
                                    const json = JSON.parse(line);
                                    if (json.response) {
                                        fullResponse += json.response;
                                        updateAIMessage(fullResponse);
                                    }
                                } catch (e) {
                                    console.warn("Ligne invalide JSON:", line);
                                }
                            }
                        }

                        return read();
                    });
                }

                await read();

            } catch (error) {
                console.error('Erreur IA:', error);
                hideTyping();
                addMessageToUI(`❌ Erreur de connexion: ${error.message}`, false);
            } finally {
                sendBtn.disabled = false;
            }
        }

        function updateCharCount() {
            const count = messageInput.value.length;
            charCount.textContent = `${count}/2000`;
            
            if (count > 1800) {
                charCount.classList.add('text-red-500');
            } else {
                charCount.classList.remove('text-red-500');
            }
            
            if (count >= 2000) {
                messageInput.value = messageInput.value.substring(0, 2000);
            }
        }
        
        function adjustTextareaHeight() {
            messageInput.style.height = 'auto';
            messageInput.style.height = Math.min(messageInput.scrollHeight, 128) + 'px';
        }
        