/* =========================================================
   SYED HAIDER  - pro CHATBOT
   Vanilla JavaScript
========================================================= */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

/* ================= STORAGE ================= */

const STORAGE = {
    API_KEY: "nova_api_key",
    MODEL: "nova_model",
    TEMPERATURE: "nova_temperature",
    MAX_TOKENS: "nova_max_tokens",
    THEME: "nova_theme",
    HISTORY: "nova_chat_history",
    CURRENT_CHAT: "nova_current_chat"
};

/* ================= STATE ================= */

let messages = [];
let isGenerating = false;

/* ================= DOM ================= */

const $ = (id) => document.getElementById(id);

const messageInput = $("messageInput");
const sendBtn = $("sendBtn");
const messagesContainer = $("messages");
const welcomeScreen = $("welcomeScreen");

const settingsOverlay = $("settingsOverlay");
const apiKeyInput = $("apiKeyInput");
const modelSelect = $("modelSelect");
const temperature = $("temperature");
const temperatureValue = $("temperatureValue");
const maxTokens = $("maxTokens");
const themeSelect = $("themeSelect");

const historyList = $("historyList");

const typingIndicator = $("typingIndicator");

const sidebar = $("sidebar");

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {

    loadSettings();
    loadCurrentChat();
    loadHistory();

    updateApiStatus();
    updateModelName();

    autoResize();

    document.querySelectorAll("[data-prompt]").forEach(button => {
        button.addEventListener("click", () => {
            messageInput.value = button.dataset.prompt;
            autoResize();
            messageInput.focus();
        });
    });

    lucide.createIcons();
});

/* ================= SETTINGS ================= */

function loadSettings() {

    const savedKey = localStorage.getItem(STORAGE.API_KEY);
    const savedModel = localStorage.getItem(STORAGE.MODEL);
    const savedTemperature = localStorage.getItem(STORAGE.TEMPERATURE);
    const savedMaxTokens = localStorage.getItem(STORAGE.MAX_TOKENS);
    const savedTheme = localStorage.getItem(STORAGE.THEME);

    if (savedKey) {
        apiKeyInput.value = savedKey;
    }

    if (savedModel) {
        modelSelect.value = savedModel;
    }

    if (savedTemperature) {
        temperature.value = savedTemperature;
    }

    if (savedMaxTokens) {
        maxTokens.value = savedMaxTokens;
    }

    if (savedTheme) {
        themeSelect.value = savedTheme;
        applyTheme(savedTheme);
    }

    temperatureValue.textContent = temperature.value;
}

function saveSettings() {

    const key = apiKeyInput.value.trim();

    if (key) {
        localStorage.setItem(STORAGE.API_KEY, key);
    } else {
        localStorage.removeItem(STORAGE.API_KEY);
    }

    localStorage.setItem(STORAGE.MODEL, modelSelect.value);
    localStorage.setItem(STORAGE.TEMPERATURE, temperature.value);
    localStorage.setItem(STORAGE.MAX_TOKENS, maxTokens.value);
    localStorage.setItem(STORAGE.THEME, themeSelect.value);

    updateApiStatus();
    updateModelName();
    applyTheme(themeSelect.value);

    closeSettings();

    showToast("Settings saved successfully");
}

function removeApiKey() {

    localStorage.removeItem(STORAGE.API_KEY);

    apiKeyInput.value = "";

    updateApiStatus();

    showToast("API key removed");
}

/* ================= API STATUS ================= */

function updateApiStatus() {

    const key = localStorage.getItem(STORAGE.API_KEY);

    const dot = $("statusDot");
    const text = $("apiStatusText");

    if (key) {

        dot.classList.add("connected");
        text.textContent = "API Connected";

    } else {

        dot.classList.remove("connected");
        text.textContent = "API Not Connected";

    }
}

/* ================= MODEL ================= */

function updateModelName() {

    const selected =
        modelSelect.options[modelSelect.selectedIndex];

    $("currentModel").textContent =
        selected ? selected.textContent.trim() : "Select a model";
}

/* ================= CHAT ================= */

function loadCurrentChat() {

    try {

        const saved =
            localStorage.getItem(STORAGE.CURRENT_CHAT);

        if (saved) {
            messages = JSON.parse(saved);
        }

    } catch (error) {

        messages = [];

    }

    renderMessages();
}

function saveCurrentChat() {

    localStorage.setItem(
        STORAGE.CURRENT_CHAT,
        JSON.stringify(messages)
    );
}

function newChat() {

    messages = [];

    localStorage.removeItem(STORAGE.CURRENT_CHAT);

    renderMessages();

    messageInput.value = "";

    autoResize();

    showToast("New chat started");

    closeMobileSidebar();
}

function clearChat() {

    if (!messages.length) {
        showToast("Chat is already empty");
        return;
    }

    messages = [];

    localStorage.removeItem(STORAGE.CURRENT_CHAT);

    renderMessages();

    showToast("Conversation cleared");
}

/* ================= SEND MESSAGE ================= */

async function sendMessage() {

    if (isGenerating) return;

    const text = messageInput.value.trim();

    if (!text) return;

    const apiKey =
        localStorage.getItem(STORAGE.API_KEY);

    if (!apiKey) {

        openSettings();

        showToast("Please add your Groq API key first");

        return;
    }

    addMessage("user", text);

    messageInput.value = "";

    autoResize();

    showTyping(true);

    isGenerating = true;

    sendBtn.disabled = true;

    try {

        const response =
            await callGroqAPI(apiKey);

        addMessage("assistant", response);

    } catch (error) {

        console.error(error);

        addMessage(
            "assistant",
            `⚠️ **Error:** ${error.message}`
        );

    } finally {

        showTyping(false);

        isGenerating = false;

        sendBtn.disabled = false;

    }
}

/* ================= GROQ API ================= */

async function callGroqAPI(apiKey) {

    const model = modelSelect.value;

    const temp = parseFloat(temperature.value);

    const tokens = parseInt(maxTokens.value);

    const systemMessage = {
        role: "system",
        content:
            "You are Nova AI, a helpful, intelligent and friendly AI assistant. " +
            "Give clear, accurate and well-structured answers. " +
            "Use Markdown formatting when useful. " +
            "For programming questions, provide clean and readable code."
    };

    const apiMessages = [
        systemMessage,
        ...messages.map(message => ({
            role: message.role,
            content: message.content
        }))
    ];

    const response = await fetch(GROQ_URL, {

        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({

            model: model,

            messages: apiMessages,

            temperature: temp,

            max_tokens: tokens

        })

    });

    let data;

    try {

        data = await response.json();

    } catch {

        throw new Error(
            "The server returned an invalid response."
        );

    }

    if (!response.ok) {

        const errorMessage =
            data?.error?.message ||
            `API request failed (${response.status})`;

        if (response.status === 401) {

            throw new Error(
                "Invalid Groq API key. Please check your key in Settings."
            );

        }

        if (response.status === 429) {

            throw new Error(
                "Rate limit reached. Please wait and try again."
            );

        }

        throw new Error(errorMessage);
    }

    const answer =
        data?.choices?.[0]?.message?.content;

    if (!answer) {

        throw new Error(
            "No response was returned by the AI."
        );

    }

    return answer;
}

/* ================= ADD MESSAGE ================= */

function addMessage(role, content) {

    messages.push({
        role,
        content,
        timestamp: Date.now()
    });

    saveCurrentChat();

    renderMessages();

    saveHistory();

}

/* ================= RENDER ================= */

function renderMessages() {

    if (!messages.length) {

        welcomeScreen.classList.remove("hidden");

        messagesContainer.innerHTML = "";

        return;
    }

    welcomeScreen.classList.add("hidden");

    messagesContainer.innerHTML = "";

    messages.forEach((message, index) => {

        const wrapper =
            document.createElement("div");

        wrapper.className =
            `message ${message.role}`;

        const avatar =
            document.createElement("div");

        avatar.className = "avatar";

        avatar.innerHTML =
            message.role === "user"
                ? `<i data-lucide="user"></i>`
                : `<i data-lucide="sparkles"></i>`;

        const content =
            document.createElement("div");

        content.className = "message-content";

        const bubble =
            document.createElement("div");

        bubble.className = "message-bubble";

        bubble.innerHTML =
            formatMessage(message.content);

        content.appendChild(bubble);

        if (message.role === "assistant") {

            const actions =
                document.createElement("div");

            actions.className = "message-actions";

            actions.innerHTML = `
                <button title="Copy">
                    <i data-lucide="copy"></i>
                </button>

                <button title="Regenerate">
                    <i data-lucide="refresh-cw"></i>
                </button>
            `;

            actions.children[0]
                .addEventListener("click", () => {
                    copyText(message.content);
                });

            actions.children[1]
                .addEventListener("click", () => {
                    regenerate(index);
                });

            content.appendChild(actions);
        }

        wrapper.appendChild(avatar);
        wrapper.appendChild(content);

        messagesContainer.appendChild(wrapper);

    });

    lucide.createIcons();

    scrollToBottom();
}

/* ================= MARKDOWN ================= */

function escapeHTML(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function formatMessage(text) {

    let html = escapeHTML(text);

    /* Code blocks */

    html = html.replace(
        /```(\w+)?\n?([\s\S]*?)```/g,
        (match, language, code) => {

            const lang =
                language || "code";

            return `
                <div>
                    <small style="
                        display:block;
                        color:#8b5cf6;
                        margin-bottom:5px;
                    ">${lang}</small>

                    <pre><code>${code.trim()}</code></pre>
                </div>
            `;
        }
    );

    /* Bold */

    html = html.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    /* Inline code */

    html = html.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );

    /* Links */

    html = html.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:#a78bfa;">$1</a>'
    );

    /* Lists */

    html = html.replace(
        /^\s*[-*]\s+(.+)$/gm,
        "<li>$1</li>"
    );

    html = html.replace(
        /(<li>.*<\/li>)/gs,
        "<ul>$1</ul>"
    );

    /* Line breaks */

    html = html.replace(/\n/g, "<br>");

    return html;
}

/* ================= REGENERATE ================= */

async function regenerate(index) {

    if (isGenerating) return;

    const target =
        messages[index];

    if (!target || target.role !== "assistant") return;

    messages.splice(index, 1);

    saveCurrentChat();

    renderMessages();

    showTyping(true);

    isGenerating = true;

    try {

        const apiKey =
            localStorage.getItem(STORAGE.API_KEY);

        if (!apiKey) {

            throw new Error(
                "Please add your Groq API key in Settings."
            );

        }

        const response =
            await callGroqAPI(apiKey);

        addMessage("assistant", response);

    } catch (error) {

        addMessage(
            "assistant",
            `⚠️ **Error:** ${error.message}`
        );

    } finally {

        showTyping(false);

        isGenerating = false;

    }
}

/* ================= COPY ================= */

async function copyText(text) {

    try {

        await navigator.clipboard.writeText(text);

        showToast("Copied to clipboard");

    } catch {

        showToast("Could not copy text");

    }
}

/* ================= TYPING ================= */

function showTyping(show) {

    if (show) {

        typingIndicator.classList.remove("hidden");

        scrollToBottom();

    } else {

        typingIndicator.classList.add("hidden");

    }
}

/* ================= AUTO SCROLL ================= */

function scrollToBottom() {

    setTimeout(() => {

        const container =
            $("chatContainer");

        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth"
        });

    }, 50);
}

/* ================= TEXTAREA ================= */

function autoResize() {

    messageInput.style.height = "auto";

    messageInput.style.height =
        Math.min(messageInput.scrollHeight, 180) + "px";
}

messageInput.addEventListener(
    "input",
    autoResize
);

messageInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            sendMessage();
        }

    }
);

sendBtn.addEventListener(
    "click",
    sendMessage
);

/* ================= SETTINGS EVENTS ================= */

$("settingsBtn").addEventListener(
    "click",
    openSettings
);

$("topSettingsBtn").addEventListener(
    "click",
    openSettings
);

$("closeSettings").addEventListener(
    "click",
    closeSettings
);

settingsOverlay.addEventListener(
    "click",
    event => {

        if (event.target === settingsOverlay) {
            closeSettings();
        }

    }
);

$("saveSettingsBtn").addEventListener(
    "click",
    saveSettings
);

$("removeApiBtn").addEventListener(
    "click",
    removeApiKey
);

$("toggleApiKey").addEventListener(
    "click",
    () => {

        const icon =
            $("toggleApiKey").querySelector("svg");

        if (apiKeyInput.type === "password") {

            apiKeyInput.type = "text";

            $("toggleApiKey").innerHTML =
                `<i data-lucide="eye-off"></i>`;

        } else {

            apiKeyInput.type = "password";

            $("toggleApiKey").innerHTML =
                `<i data-lucide="eye"></i>`;

        }

        lucide.createIcons();

    }
);

temperature.addEventListener(
    "input",
    () => {

        temperatureValue.textContent =
            temperature.value;

    }
);

modelSelect.addEventListener(
    "change",
    updateModelName
);

/* ================= MODAL ================= */

function openSettings() {

    settingsOverlay.classList.remove("hidden");

    apiKeyInput.value =
        localStorage.getItem(STORAGE.API_KEY) || "";

    lucide.createIcons();

}

function closeSettings() {

    settingsOverlay.classList.add("hidden");

}

/* ================= NEW CHAT ================= */

$("newChatBtn").addEventListener(
    "click",
    newChat
);

$("clearChatBtn").addEventListener(
    "click",
    clearChat
);

$("clearHistoryBtn").addEventListener(
    "click",
    () => {

        localStorage.removeItem(STORAGE.HISTORY);

        renderHistory();

        showToast("Chat history cleared");

    }
);

/* ================= SIDEBAR ================= */

$("menuBtn").addEventListener(
    "click",
    () => {

        sidebar.classList.add("open");

    }
);

$("closeSidebar").addEventListener(
    "click",
    closeMobileSidebar
);

function closeMobileSidebar() {

    sidebar.classList.remove("open");

}

/* ================= HISTORY ================= */

function saveHistory() {

    if (!messages.length) return;

    let history = [];

    try {

        history =
            JSON.parse(
                localStorage.getItem(STORAGE.HISTORY)
            ) || [];

    } catch {

        history = [];

    }

    const firstUserMessage =
        messages.find(
            message => message.role === "user"
        );

    if (!firstUserMessage) return;

    const title =
        firstUserMessage.content
            .slice(0, 45);

    const existing =
        history.find(
            item => item.id === currentChatId()
        );

    if (!existing) {

        history.unshift({
            id: currentChatId(),
            title,
            messages
        });

    } else {

        existing.messages = messages;

    }

    history =
        history.slice(0, 30);

    localStorage.setItem(
        STORAGE.HISTORY,
        JSON.stringify(history)
    );

    renderHistory();
}

function currentChatId() {

    if (!messages.length) {
        return "empty";
    }

    return String(messages[0].timestamp);
}

function loadHistory() {

    renderHistory();

}

function renderHistory() {

    historyList.innerHTML = "";

    let history = [];

    try {

        history =
            JSON.parse(
                localStorage.getItem(STORAGE.HISTORY)
            ) || [];

    } catch {

        history = [];

    }

    if (!history.length) {

        historyList.innerHTML = `
            <div style="
                color:#555567;
                font-size:11px;
                padding:12px;
            ">
                No previous chats
            </div>
        `;

        return;
    }

    history.forEach(item => {

        const div =
            document.createElement("div");

        div.className = "history-item";

        div.textContent = item.title;

        div.title = item.title;

        div.addEventListener(
            "click",
            () => {

                messages =
                    item.messages || [];

                saveCurrentChat();

                renderMessages();

                closeMobileSidebar();

            }
        );

        historyList.appendChild(div);

    });

}

/* ================= THEME ================= */

function applyTheme(theme) {

    if (theme === "light") {

        document.body.classList.add("light-theme");

    } else {

        document.body.classList.remove("light-theme");

    }
}

/* ================= TOAST ================= */

let toastTimer;

function showToast(message) {

    const toast = $("toast");

    $("toastMessage").textContent =
        message;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer =
        setTimeout(() => {

            toast.classList.remove("show");

        }, 2500);

}
/* =====================================================
   LIGHT / DARK MODE
===================================================== */

const themeToggle = document.getElementById("themeToggle");

if (themeToggle) {

    themeToggle.addEventListener("click", () => {

        document.body.classList.toggle("light-mode");

        const isLight =
            document.body.classList.contains("light-mode");

        localStorage.setItem(
            "theme",
            isLight ? "light" : "dark"
        );

    });

}


/* =====================================================
   LOAD SAVED THEME
===================================================== */

if (localStorage.getItem("theme") === "light") {

    document.body.classList.add("light-mode");

}