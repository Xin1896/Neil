// static/js/main.js
document.addEventListener('DOMContentLoaded', function() {
    // 全局变量
    let currentConversationId = null;
    
    // DOM元素
    const chatInput = document.getElementById('chat-input');
    const sendButton = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('messages');
    const welcomeContainer = document.getElementById('welcome-container');
    const thinking = document.getElementById('thinking');
    const chatTitle = document.getElementById('chat-title');
    const conversationsList = document.getElementById('conversations-list');
    const newChatBtn = document.getElementById('new-chat-btn');
    const refreshBtn = document.getElementById('refresh-btn');
    const deleteBtn = document.getElementById('delete-btn');
    const examplePrompts = document.getElementById('example-prompts');
    
    // 移动端菜单
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const closeSidebarBtn = document.getElementById('close-sidebar');
    
    // 设置对话框
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const closeSettingsModal = document.getElementById('close-settings-modal');
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    
    // 初始化
    loadConversations();
    setupEventListeners();
    loadSettings();
    
    // 设置事件监听器
    function setupEventListeners() {
        // 输入框事件
        chatInput.addEventListener('input', function() {
            sendButton.disabled = chatInput.value.trim() === '';
            
            // 自动调整高度
            chatInput.style.height = 'auto';
            chatInput.style.height = (chatInput.scrollHeight) + 'px';
        });
        
        // 发送消息
        sendButton.addEventListener('click', sendMessage);
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!sendButton.disabled) {
                    sendMessage();
                }
            }
        });
        
        // 示例提示点击
        if (examplePrompts) {
            const promptElements = examplePrompts.querySelectorAll('.example-prompt');
            promptElements.forEach(element => {
                element.addEventListener('click', function() {
                    const promptText = this.querySelector('.example-prompt-text').textContent;
                    chatInput.value = promptText;
                    chatInput.dispatchEvent(new Event('input'));
                    chatInput.focus();
                });
            });
        }
        
        // 新对话按钮
        newChatBtn.addEventListener('click', startNewConversation);
        
        // 移动端菜单
        mobileMenuBtn.addEventListener('click', function() {
            sidebar.classList.add('open');
        });
        
        closeSidebarBtn.addEventListener('click', function() {
            sidebar.classList.remove('open');
        });
        
        // 设置对话框
        settingsBtn.addEventListener('click', function() {
            settingsModal.classList.add('open');
        });
        
        closeSettingsModal.addEventListener('click', function() {
            settingsModal.classList.remove('open');
        });
        
        saveSettingsBtn.addEventListener('click', saveSettings);
        
        // 深色模式切换
        darkModeToggle.addEventListener('change', function() {
            document.documentElement.setAttribute('data-theme', this.checked ? 'dark' : 'light');
            localStorage.setItem('darkMode', this.checked);
        });
        
        // 删除对话
        deleteBtn.addEventListener('click', function() {
            if (currentConversationId) {
                if (confirm('确定要删除这个对话吗？')) {
                    deleteConversation(currentConversationId);
                }
            }
        });
        
        // 刷新对话
        refreshBtn.addEventListener('click', function() {
            if (currentConversationId) {
                loadConversation(currentConversationId);
            }
        });
    }
    
    // 发送消息
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;
        
        // 隐藏欢迎界面
        welcomeContainer.style.display = 'none';
        messagesContainer.style.display = 'flex';
        
        // 添加用户消息到界面
        appendMessage('user', message);
        
        // 清空输入框
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendButton.disabled = true;
        
        // 显示思考状态
        thinking.style.display = 'flex';
        scrollToBottom();
        
        // 发送到服务器
        fetch('/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                conversation_id: currentConversationId
            }),
        })
        .then(response => response.json())
        .then(data => {
            // 隐藏思考状态
            thinking.style.display = 'none';
            
            // 更新当前对话ID
            if (data.id && !currentConversationId) {
                currentConversationId = data.id;
                chatTitle.textContent = data.title || '新对话';
                loadConversations(); // 刷新侧边栏
            }
            
            // 添加AI回复
            appendMessage('assistant', data.message);
            scrollToBottom();
        })
        .catch(error => {
            thinking.style.display = 'none';
            console.error('Error:', error);
            appendMessage('assistant', '很抱歉，发生了错误。请重试。');
            scrollToBottom();
        });
    }
    
    // 添加消息到界面
    function appendMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = `message-avatar ${role}`;
        avatarDiv.textContent = role === 'user' ? 'U' : 'N';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        
        const authorDiv = document.createElement('div');
        authorDiv.className = 'message-author';
        authorDiv.textContent = role === 'user' ? '您' : 'Neil';
        
        const textDiv = document.createElement('div');
        textDiv.className = 'message-text';
        
        // 使用marked.js处理Markdown
        if (role === 'assistant' && window.marked) {
            textDiv.innerHTML = marked.parse(content);
            
            // 代码高亮
            if (window.hljs) {
                textDiv.querySelectorAll('pre code').forEach(block => {
                    hljs.highlightBlock(block);
                });
            }
        } else {
            textDiv.textContent = content;
        }
        
        contentDiv.appendChild(authorDiv);
        contentDiv.appendChild(textDiv);
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        messagesContainer.appendChild(messageDiv);
    }
    
    // 滚动到底部
    function scrollToBottom() {
        const chatContainer = document.getElementById('chat-container');
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
    
    // 加载对话列表
    function loadConversations() {
        fetch('/api/conversations')
            .then(response => response.json())
            .then(data => {
                // 清空列表
                conversationsList.innerHTML = '';
                
                if (data.length === 0) {
                    const emptyState = document.createElement('div');
                    emptyState.className = 'empty-conversations';
                    emptyState.innerHTML = '<p>暂无对话历史</p>';
                    conversationsList.appendChild(emptyState);
                    return;
                }
                
                // 添加每个对话
                data.forEach(conversation => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'conversation-item';
                    if (conversation.id === currentConversationId) {
                        itemDiv.classList.add('active');
                    }
                    
                    itemDiv.innerHTML = `
                        <svg class="chat-icon" viewBox="0 0 24 24">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span class="conversation-title">${conversation.title}</span>
                        <span class="conversation-time">${formatDate(conversation.timestamp)}</span>
                    `;
                    
                    itemDiv.addEventListener('click', function() {
                        loadConversation(conversation.id);
                    });
                    
                    conversationsList.appendChild(itemDiv);
                });
            })
            .catch(error => {
                console.error('Error loading conversations:', error);
                conversationsList.innerHTML = '<div class="error-state">加载失败</div>';
            });
    }
    
    // 加载特定对话
    function loadConversation(conversationId) {
        fetch(`/api/conversations/${conversationId}`)
            .then(response => response.json())
            .then(data => {
                currentConversationId = conversationId;
                welcomeContainer.style.display = 'none';
                messagesContainer.style.display = 'flex';
                messagesContainer.innerHTML = '';
                
                chatTitle.textContent = data.title || '新对话';
                
                // 添加所有消息
                data.messages.forEach(message => {
                    appendMessage(message.role, message.content);
                });
                
                // 更新侧边栏选中状态
                document.querySelectorAll('.conversation-item').forEach(item => {
                    item.classList.remove('active');
                });
                
                document.querySelectorAll('.conversation-item').forEach(item => {
                    const title = item.querySelector('.conversation-title').textContent;
                    if (title === data.title) {
                        item.classList.add('active');
                    }
                });
                
                scrollToBottom();
            })
            .catch(error => {
                console.error('Error loading conversation:', error);
            });
    }
    
    // 开始新对话
    function startNewConversation() {
        currentConversationId = null;
        chatTitle.textContent = '新对话';
        welcomeContainer.style.display = 'flex';
        messagesContainer.style.display = 'none';
        messagesContainer.innerHTML = '';
        
        // 更新侧边栏选中状态
        document.querySelectorAll('.conversation-item').forEach(item => {
            item.classList.remove('active');
        });
    }
    
    // 删除对话
    function deleteConversation(conversationId) {
        fetch(`/api/conversations/${conversationId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                startNewConversation();
                loadConversations();
            } else {
                alert('删除失败: ' + (data.error || '未知错误'));
            }
        })
        .catch(error => {
            console.error('Error deleting conversation:', error);
            alert('删除失败，请重试');
        });
    }
    
    // 格式化日期
    function formatDate(dateString) {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffSecs = Math.floor(diffMs / 1000);
        const diffMins = Math.floor(diffSecs / 60);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        if (diffSecs < 60) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;
        
        return date.toLocaleDateString();
    }
    
    // 加载设置
    function loadSettings() {
        // 深色模式
        const darkMode = localStorage.getItem('darkMode') === 'true';
        darkModeToggle.checked = darkMode;
        document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
        
        // 其他设置...
    }
    
    // 保存设置
    function saveSettings() {
        // 已在各个控件的事件监听器中处理
        settingsModal.classList.remove('open');
    }
});