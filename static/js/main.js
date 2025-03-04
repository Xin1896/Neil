// Wait for the DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM fully loaded and parsed');
    
    // DOM Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const newChatBtn = document.getElementById('new-chat-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeModal = document.querySelector('.close');
    const saveSettingsBtn = document.getElementById('save-settings');
    const systemMessageInput = document.getElementById('system-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const chatHistory = document.getElementById('chat-history');

    // Debug element references
    console.log('Send button:', sendBtn);
    console.log('New chat button:', newChatBtn);
    console.log('Settings button:', settingsBtn);

    // Initial load of chat history
    loadChatHistory();

    // Function to load chat history
    function loadChatHistory() {
        console.log('Loading chat history...');
        fetch('/api/get_history')
            .then(response => response.json())
            .then(data => {
                console.log('Chat history loaded:', data);
                // Clear current messages
                chatMessages.innerHTML = '';
                
                // Show welcome message if no messages
                if (data.messages.length === 0) {
                    const welcomeDiv = document.createElement('div');
                    welcomeDiv.className = 'welcome-message';
                    welcomeDiv.innerHTML = `
                        <h1>Deepseek Chat</h1>
                        <p>Welcome to Deepseek Chat! Ask me anything and I'll do my best to help.</p>
                    `;
                    chatMessages.appendChild(welcomeDiv);
                } else {
                    // Display messages
                    data.messages.forEach(msg => {
                        addMessage(msg.role, msg.content);
                    });
                    
                    // Scroll to bottom
                    scrollToBottom();
                }
            })
            .catch(error => {
                console.error('Error loading chat history:', error);
            });
    }

    // Function to add a message to the chat
    function addMessage(role, content) {
        console.log('Adding message:', role, content);
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${role}-message`;

        const headerDiv = document.createElement('div');
        headerDiv.className = 'message-header';
        headerDiv.textContent = role === 'user' ? 'You' : 'Deepseek';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        // If assistant message, render as markdown
        if (role === 'assistant') {
            // Configure marked to use highlight.js for code highlighting
            marked.setOptions({
                highlight: function(code, language) {
                    if (language && hljs.getLanguage(language)) {
                        return hljs.highlight(code, { language }).value;
                    }
                    return hljs.highlightAuto(code).value;
                },
                breaks: true,
                gfm: true
            });
            
            contentDiv.innerHTML = marked.parse(content);
            
            // Apply syntax highlighting to all code blocks
            contentDiv.querySelectorAll('pre code').forEach(block => {
                hljs.highlightElement(block);
            });
        } else {
            // For user messages, just display the text
            contentDiv.textContent = content;
        }

        messageDiv.appendChild(headerDiv);
        messageDiv.appendChild(contentDiv);
        
        // Remove welcome message if present
        const welcomeMessage = chatMessages.querySelector('.welcome-message');
        if (welcomeMessage) {
            chatMessages.removeChild(welcomeMessage);
        }
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Function to scroll chat to bottom
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to send a message
    function sendMessage() {
        console.log('Send button clicked');
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message to chat
        addMessage('user', message);
        
        // Clear input
        chatInput.value = '';
        chatInput.style.height = 'auto';
        
        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        
        // Send message to server
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ message })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok: ' + response.statusText);
            }
            return response.json();
        })
        .then(data => {
            console.log('Response received:', data);
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            // Add assistant response to chat
            addMessage('assistant', data.response);
            
            // Update chat history in sidebar
            updateChatHistorySidebar(message);
        })
        .catch(error => {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            console.error('Error sending message:', error);
            addMessage('assistant', 'Sorry, there was an error processing your request. Please try again.');
        });
    }

    // Function to update chat history in sidebar
    function updateChatHistorySidebar(message) {
        console.log('Updating chat history sidebar with:', message);
        // This is a simplified version - in a real app you'd want to maintain
        // proper chat sessions with IDs, timestamps, etc.
        const historyItem = document.createElement('div');
        historyItem.className = 'chat-history-item';
        // Truncate long messages
        historyItem.textContent = message.length > 30 ? message.substring(0, 30) + '...' : message;
        
        // Add to the top of history
        if (chatHistory.firstChild) {
            chatHistory.insertBefore(historyItem, chatHistory.firstChild);
        } else {
            chatHistory.appendChild(historyItem);
        }
    }

    // Function to start a new chat
    function startNewChat() {
        console.log('New chat button clicked');
        fetch('/api/new_chat', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            console.log('New chat response:', data);
            if (data.success) {
                // Clear current messages
                chatMessages.innerHTML = '';
                
                // Add welcome message
                const welcomeDiv = document.createElement('div');
                welcomeDiv.className = 'welcome-message';
                welcomeDiv.innerHTML = `
                    <h1>Deepseek Chat</h1>
                    <p>Welcome to Deepseek Chat! Ask me anything and I'll do my best to help.</p>
                `;
                chatMessages.appendChild(welcomeDiv);
            }
        })
        .catch(error => {
            console.error('Error starting new chat:', error);
        });
    }

    // Function to update system message
    function updateSystemMessage() {
        console.log('Save settings button clicked');
        const newSystemMessage = systemMessageInput.value.trim();
        if (!newSystemMessage) return;

        // Show loading indicator
        loadingIndicator.classList.remove('hidden');
        
        fetch('/api/update_system_message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ system_message: newSystemMessage })
        })
        .then(response => response.json())
        .then(data => {
            console.log('Update system message response:', data);
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            if (data.success) {
                // Close modal
                settingsModal.style.display = 'none';
                
                // Show confirmation message
                const confirmDiv = document.createElement('div');
                confirmDiv.className = 'message assistant-message';
                confirmDiv.innerHTML = '<div class="message-header">System</div><div class="message-content">System message updated successfully! Your changes will take effect in the current and future conversations.</div>';
                
                chatMessages.appendChild(confirmDiv);
                scrollToBottom();
            }
        })
        .catch(error => {
            // Hide loading indicator
            loadingIndicator.classList.add('hidden');
            
            console.error('Error updating system message:', error);
            
            // Show error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'message assistant-message';
            errorDiv.innerHTML = '<div class="message-header">System</div><div class="message-content">Sorry, there was an error updating the system message. Please try again.</div>';
            
            chatMessages.appendChild(errorDiv);
            scrollToBottom();
        });
    }

    // Event Listeners - Add more robust click handling
    if (sendBtn) {
        console.log('Adding event listener to send button');
        sendBtn.onclick = sendMessage;
        sendBtn.addEventListener('click', function(e) {
            console.log('Send button clicked (event listener)');
            sendMessage();
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                console.log('Enter key pressed');
                e.preventDefault();
                sendMessage();
            }
        });
        
        // Auto-resize textarea as user types
        chatInput.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
    
    if (newChatBtn) {
        console.log('Adding event listener to new chat button');
        newChatBtn.onclick = startNewChat;
        newChatBtn.addEventListener('click', function(e) {
            console.log('New chat button clicked (event listener)');
            startNewChat();
        });
    }
    
    // Settings modal
    if (settingsBtn) {
        console.log('Adding event listener to settings button');
        settingsBtn.onclick = function() {
            console.log('Settings button clicked');
            settingsModal.style.display = 'block';
        };
        
        settingsBtn.addEventListener('click', function(e) {
            console.log('Settings button clicked (event listener)');
            settingsModal.style.display = 'block';
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            console.log('Close modal clicked');
            settingsModal.style.display = 'none';
        });
    }
    
    window.addEventListener('click', function(e) {
        if (e.target === settingsModal) {
            console.log('Clicked outside modal');
            settingsModal.style.display = 'none';
        }
    });
    
    if (saveSettingsBtn) {
        console.log('Adding event listener to save settings button');
        saveSettingsBtn.onclick = updateSystemMessage;
        saveSettingsBtn.addEventListener('click', function(e) {
            console.log('Save settings button clicked (event listener)');
            updateSystemMessage();
        });
    }

    // Add a simple test button to verify JavaScript is working
    const testButton = document.createElement('button');
    testButton.textContent = 'Test JavaScript';
    testButton.style.position = 'fixed';
    testButton.style.bottom = '10px';
    testButton.style.right = '10px';
    testButton.style.zIndex = '9999';
    testButton.style.padding = '10px';
    testButton.style.backgroundColor = '#10a37f';
    testButton.style.color = 'white';
    testButton.style.border = 'none';
    testButton.style.borderRadius = '5px';
    testButton.style.cursor = 'pointer';
    
    testButton.addEventListener('click', function() {
        alert('JavaScript is working! This is a test button.');
    });
    
    document.body.appendChild(testButton);
    
    console.log('All event listeners attached');
});

// Alternative approach: Add event listeners when window loads
window.onload = function() {
    console.log('Window loaded');
    
    // Add direct onclick handlers as a fallback
    const sendBtn = document.getElementById('send-btn');
    if (sendBtn) {
        sendBtn.onclick = function() {
            console.log('Send button clicked (window.onload)');
            const chatInput = document.getElementById('chat-input');
            if (!chatInput) return;
            
            const message = chatInput.value.trim();
            if (!message) return;
            
            alert('Send button clicked: ' + message);
        };
    }
    
    const newChatBtn = document.getElementById('new-chat-btn');
    if (newChatBtn) {
        newChatBtn.onclick = function() {
            console.log('New chat button clicked (window.onload)');
            alert('New chat button clicked');
        };
    }
    
    const settingsBtn = document.getElementById('settings-btn');
    if (settingsBtn) {
        settingsBtn.onclick = function() {
            console.log('Settings button clicked (window.onload)');
            const settingsModal = document.getElementById('settings-modal');
            if (settingsModal) {
                settingsModal.style.display = 'block';
            }
        };
    }
};