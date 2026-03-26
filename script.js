    const AGENT_API_BASE = "http://localhost:7777";
    const AGENT_ID = "professor-programacao";
    const USER_ID = "usuario-web";

    let isTyping = false;
    let chats = [];
    let currentChatId = null;

    function generateId() {
        return "chat-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    }

    function createEmptyChat() {
        return {
            id: generateId(),
            title: "Novo Chat",
            messages: []
        };
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function toggleSidebar() {
        const sidebar = document.getElementById("sidebar");
        if (sidebar) {
            sidebar.classList.toggle("open");
        }
    }

    function autoResize(textarea) {
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";

        const sendBtn = document.getElementById("sendBtn");
        if (sendBtn) {
            sendBtn.disabled = textarea.value.trim() === "";
        }
    }

    function handleKeyDown(event) {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    }

    function copyCode(button) {
        const code = button.getAttribute("data-code") || "";
        navigator.clipboard.writeText(code).then(() => {
            const original = button.textContent;
            button.textContent = "Copiado";
            setTimeout(() => {
                button.textContent = original;
            }, 1200);
        });
    }

    function renderCodeBlocks(text) {
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;

        return text.replace(codeBlockRegex, (_, lang, code) => {
            const safeCode = escapeHtml(code.trim());
            const safeLang = escapeHtml(lang || "código");
            const rawCode = code.trim().replace(/"/g, "&quot;");

            return `
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-lang">${safeLang}</span>
                        <button class="code-copy-btn" data-code="${rawCode}" onclick="copyCode(this)">Copiar</button>
                    </div>
                    <pre><code>${safeCode}</code></pre>
                </div>
            `;
        });
    }

    function renderInlineMarkdown(text) {
        let html = escapeHtml(text);

        html = html
            .replace(/^### (.*)$/gim, "<h3>$1</h3>")
            .replace(/^## (.*)$/gim, "<h2>$1</h2>")
            .replace(/^# (.*)$/gim, "<h1>$1</h1>")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/`([^`]+)`/g, '<span class="inline-code">$1</span>');

        html = html.replace(/^\- (.*)$/gim, "<li>$1</li>");
        html = html.replace(/(<li>.*<\/li>)/gims, "<ul>$1</ul>");
        html = html.replace(/\n/g, "<br>");

        return html;
    }

    function formatMessage(content) {
        const raw = String(content);

        const blocks = [];
        const placeholderText = raw.replace(/```(\w+)?\n([\s\S]*?)```/g, (_, lang, code) => {
            const safeCode = escapeHtml(code.trim());
            const safeLang = escapeHtml(lang || "código");
            const rawCode = code.trim().replace(/"/g, "&quot;");

            const blockHtml = `
                <div class="code-block">
                    <div class="code-header">
                        <span class="code-lang">${safeLang}</span>
                        <button class="code-copy-btn" data-code="${rawCode}" onclick="copyCode(this)">Copiar</button>
                    </div>
                    <pre><code>${safeCode}</code></pre>
                </div>
            `;

            blocks.push(blockHtml);
            return `__CODE_BLOCK_${blocks.length - 1}__`;
        });

        let html = renderInlineMarkdown(placeholderText);

        html = html.replace(/__CODE_BLOCK_(\d+)__/g, (_, index) => {
            return blocks[Number(index)];
        });

        return html;
    }

    function getCurrentChat() {
        return chats.find(chat => chat.id === currentChatId) || null;
    }

    function renderChatHistory() {
        const history = document.getElementById("chatHistory");
        if (!history) return;

        history.innerHTML = chats.map(chat => `
            <div class="chat-item ${chat.id === currentChatId ? "active" : ""}">
                <div class="chat-item-left" onclick="openChat('${chat.id}')">
                    <span>💬</span>
                    <span class="chat-title">${escapeHtml(chat.title)}</span>
                </div>
                <button class="delete-chat-btn" onclick="deleteChat('${chat.id}', event)" title="Excluir chat">🗑️</button>
            </div>
        `).join("");
    }

    function renderWelcome() {
        const container = document.getElementById("chatContainer");
        if (!container) return;

        container.innerHTML = `
            <div class="welcome-screen" id="welcomeScreen">
                <div class="welcome-icon">🤖</div>
                <h1 class="welcome-title">Bem-vindo ao Seu Robo</h1>
                <p class="welcome-subtitle">
                    Seu agente de IA avançado pronto para ajudar com programação,
                    escrita criativa, análise de dados e muito mais.
                </p>
                <div class="suggestion-grid">
                    <div class="suggestion-card" onclick="sendSuggestion('Explique quantum computing de forma simples')">
                        <div class="suggestion-icon">⚛️</div>
                        <div class="suggestion-text">Explique quantum computing de forma simples</div>
                    </div>
                    <div class="suggestion-card" onclick="sendSuggestion('Crie um script Python para automação')">
                        <div class="suggestion-icon">🐍</div>
                        <div class="suggestion-text">Crie um script Python para automação</div>
                    </div>
                    <div class="suggestion-card" onclick="sendSuggestion('Ajude-me a escrever um e-mail profissional')">
                        <div class="suggestion-icon">✉️</div>
                        <div class="suggestion-text">Ajude-me a escrever um e-mail profissional</div>
                    </div>
                    <div class="suggestion-card" onclick="sendSuggestion('Explique o que é uma API REST')">
                        <div class="suggestion-icon">📈</div>
                        <div class="suggestion-text">Explique o que é uma API REST</div>
                    </div>
                </div>
            </div>
        `;
    }

    function addMessageToDOM(role, content, time = null) {
        const container = document.getElementById("chatContainer");
        if (!container) return;

        const messageDiv = document.createElement("div");
        messageDiv.className = `message ${role}`;

        const avatar = role === "user" ? "U" : "🤖";
        const author = role === "user" ? "Você" : "Professor";
        const messageTime = time || new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        messageDiv.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-header">
                    <span class="message-author">${author}</span>
                    <span class="message-time">${messageTime}</span>
                </div>
                <div class="message-text">${formatMessage(content)}</div>
            </div>
        `;

        container.appendChild(messageDiv);
        container.scrollTop = container.scrollHeight;
    }

    function renderMessages() {
        const container = document.getElementById("chatContainer");
        if (!container) return;

        const currentChat = getCurrentChat();

        if (!currentChat || currentChat.messages.length === 0) {
            renderWelcome();
            return;
        }

        container.innerHTML = "";
        currentChat.messages.forEach(msg => {
            addMessageToDOM(msg.role, msg.content, msg.time);
        });

        container.scrollTop = container.scrollHeight;
    }

    function addMessage(role, content) {
        const currentChat = getCurrentChat();
        if (!currentChat) return;

        const time = new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
        });

        currentChat.messages.push({ role, content, time });

        if (currentChat.title === "Novo Chat" && role === "user") {
            currentChat.title = String(content).slice(0, 28) || "Novo Chat";
        }

        renderChatHistory();
        renderMessages();
    }

    function showTyping() {
        removeTyping();

        const container = document.getElementById("chatContainer");
        if (!container) return;

        const welcome = document.getElementById("welcomeScreen");
        if (welcome) {
            welcome.remove();
        }

        const typingDiv = document.createElement("div");
        typingDiv.className = "message assistant";
        typingDiv.id = "typingIndicator";
        typingDiv.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;

        container.appendChild(typingDiv);
        container.scrollTop = container.scrollHeight;
    }

    function removeTyping() {
        const typing = document.getElementById("typingIndicator");
        if (typing) {
            typing.remove();
        }
    }

    async function callAgent(message) {
            const payload = {
            message: message,
            agent_id: AGENT_ID,
            user_id: USER_ID,
            session_id: currentChatId,
            provider: "auto"
    };

        const response = await fetch(`${AGENT_API_BASE}/chat`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const rawText = await response.text();

        if (!rawText || !rawText.trim()) {
            throw new Error("O servidor respondeu vazio.");
        }

        let data;
        try {
            data = JSON.parse(rawText);
        } catch (e) {
            throw new Error("A resposta do servidor não é JSON válido.");
        }

        if (!response.ok) {
            throw new Error(data.detail || data.content || "Erro no servidor");
        }

        if (data.content === undefined || data.content === null) {
            throw new Error("O servidor não enviou 'content'.");
        }

        return String(data.content);
    }

    async function sendMessage() {
        const input = document.getElementById("userInput");
        if (!input) return;

        const message = input.value.trim();
        if (!message || isTyping) return;

        addMessage("user", message);

        input.value = "";
        input.style.height = "auto";

        const sendBtn = document.getElementById("sendBtn");
        if (sendBtn) {
            sendBtn.disabled = true;
        }

        showTyping();
        isTyping = true;

        try {
            const reply = await callAgent(message);
            removeTyping();
            addMessage("assistant", reply);
        } catch (error) {
            removeTyping();
            addMessage("assistant", `Erro: ${error.message}`);
        } finally {
            isTyping = false;
        }
    }

    function sendSuggestion(text) {
        const input = document.getElementById("userInput");
        if (!input) return;

        input.value = text;
        autoResize(input);
        sendMessage();
    }

    function openChat(chatId) {
        currentChatId = chatId;
        renderChatHistory();
        renderMessages();

        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById("sidebar");
            if (sidebar) sidebar.classList.remove("open");
        }
    }

    function newChat() {
        const chat = createEmptyChat();
        chats.unshift(chat);
        currentChatId = chat.id;
        renderChatHistory();
        renderMessages();

        const input = document.getElementById("userInput");
        const sendBtn = document.getElementById("sendBtn");

        if (input) {
            input.value = "";
            input.style.height = "auto";
            input.focus();
        }

        if (sendBtn) {
            sendBtn.disabled = true;
        }

        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById("sidebar");
            if (sidebar) sidebar.classList.remove("open");
        }
    }

    function deleteChat(chatId, event) {
        event.stopPropagation();

        chats = chats.filter(chat => chat.id !== chatId);

        if (chats.length === 0) {
            const newEmpty = createEmptyChat();
            chats = [newEmpty];
            currentChatId = newEmpty.id;
        } else if (currentChatId === chatId) {
            currentChatId = chats[0].id;
        }

        renderChatHistory();
        renderMessages();
    }

    window.onload = function () {
        const input = document.getElementById("userInput");
        const sendBtn = document.getElementById("sendBtn");

        const firstChat = createEmptyChat();
        chats = [firstChat];
        currentChatId = firstChat.id;

        renderChatHistory();
        renderMessages();

        if (input && sendBtn) {
            sendBtn.disabled = true;
        }
    };
