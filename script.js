const chatToggle = document.querySelector(".ai-chat-toggle");
const chatWindow = document.querySelector(".ai-chat-window");
const chatClose = document.querySelector(".ai-chat-close");
const chatInput = document.querySelector(".ai-chat-input input");
const chatSend = document.querySelector(".ai-chat-input button");
const chatContent = document.querySelector(".ai-chat-content");

function setChatOpen(isOpen) {
    chatWindow.classList.toggle("is-open", isOpen);
    chatWindow.setAttribute("aria-hidden", String(!isOpen));
    chatToggle.setAttribute("aria-expanded", String(isOpen));
    chatToggle.setAttribute("aria-label", isOpen ? "关闭 AI 聊天助手" : "打开 AI 聊天助手");
}

chatToggle.addEventListener("click", () => {
    setChatOpen(!chatWindow.classList.contains("is-open"));
});

chatClose.addEventListener("click", () => {
    setChatOpen(false);
    chatToggle.focus();
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && chatWindow.classList.contains("is-open")) {
        setChatOpen(false);
        chatToggle.focus();
    }
});

function appendMessage(text, isUser) {
    const message = document.createElement("div");
    message.className = isUser
        ? "ai-chat-message ai-chat-message-user"
        : "ai-chat-message";

    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    message.appendChild(paragraph);

    chatContent.appendChild(message);
    chatContent.scrollTop = chatContent.scrollHeight;
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (!text) {
        return;
    }

    appendMessage(text, true);
    chatInput.value = "";

    setTimeout(() => {
        appendMessage(
            "谢谢你的消息！真正的对话功能还在开发中。有事欢迎发邮件：zhijianghuang419@gmail.com"
        );
    }, 600);
}

chatSend.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        sendMessage();
    }
});
