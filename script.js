const chatToggle = document.querySelector(".ai-chat-toggle");
const chatWindow = document.querySelector(".ai-chat-window");
const chatClose = document.querySelector(".ai-chat-close");
const chatInput = document.querySelector(".ai-chat-input input");
const chatSend = document.querySelector(".ai-chat-input button");
const chatContent = document.querySelector(".ai-chat-content");
const openChatButtons = document.querySelectorAll("[data-open-chat]");

const chatHistory = [];
let isSending = false;
const hasChat = Boolean(chatToggle && chatWindow && chatClose && chatInput && chatSend && chatContent);

function setChatOpen(isOpen) {
    if (!hasChat) {
        return;
    }

    chatWindow.classList.toggle("is-open", isOpen);
    chatWindow.setAttribute("aria-hidden", String(!isOpen));
    chatToggle.setAttribute("aria-expanded", String(isOpen));
    chatToggle.setAttribute("aria-label", isOpen ? "关闭 AI 聊天助手" : "打开 AI 聊天助手");

    if (isOpen) {
        chatInput.focus();
    }
}

if (hasChat) {
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

    openChatButtons.forEach((button) => {
        button.addEventListener("click", () => setChatOpen(true));
    });
}

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

    return message;
}

function appendLoadingMessage() {
    const message = document.createElement("div");
    message.className = "ai-chat-message ai-chat-message-loading";
    message.innerHTML = "<p><span></span><span></span><span></span></p>";
    chatContent.appendChild(message);
    chatContent.scrollTop = chatContent.scrollHeight;
    return message;
}

function setChatBusy(busy) {
    isSending = busy;
    chatInput.disabled = busy;
    chatSend.disabled = busy;
}

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || isSending) {
        return;
    }

    appendMessage(text, true);
    chatInput.value = "";
    chatHistory.push({ role: "user", content: text });

    setChatBusy(true);
    const loadingMessage = appendLoadingMessage();

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: chatHistory }),
        });

        let data = {};
        try {
            data = await response.json();
        } catch {
            data = {};
        }

        loadingMessage.remove();

        if (!response.ok) {
            const fallbackMessage = response.status === 403
                ? "助手暂时无法访问，请确认使用官网地址打开并重试。"
                : "请求失败，请稍后再试。";
            throw new Error(data.error || fallbackMessage);
        }

        chatHistory.push({ role: "assistant", content: data.reply });
        appendMessage(data.reply, false);
    } catch (error) {
        loadingMessage.remove();
        appendMessage(
            error.message || "发送失败，请稍后再试，或直接发邮件：zhijianghuang419@gmail.com"
        );
    } finally {
        setChatBusy(false);
        chatInput.focus();
    }
}

if (hasChat) {
    chatSend.addEventListener("click", sendMessage);

    chatInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

function initRevealMotion() {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const revealItems = document.querySelectorAll("[data-reveal]");

    if (!revealItems.length) {
        return;
    }

    if (prefersReducedMotion || typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
        revealItems.forEach((item) => {
            item.style.opacity = "1";
            item.style.transform = "none";
        });
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray(revealItems).forEach((item, index) => {
        const delay = item.closest(".hero") ? index * 0.08 : 0;

        gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: 0.95,
            ease: "power3.out",
            delay,
            scrollTrigger: {
                trigger: item,
                start: "top 90%",
                toggleActions: "play none none none",
                once: true,
            },
        });
    });
}

initRevealMotion();
