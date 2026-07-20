const chatToggle = document.querySelector(".ai-chat-toggle");
const chatWindow = document.querySelector(".ai-chat-window");
const chatClose = document.querySelector(".ai-chat-close");
const chatInput = document.querySelector(".ai-chat-input input");
const chatSend = document.querySelector(".ai-chat-input button");
const chatContent = document.querySelector(".ai-chat-content");

const mascotDoll = document.querySelector(".hero-mascot-doll");
const mascotRoot = document.getElementById("hero-mascot");
const mascotTilt = document.querySelector(".hero-mascot-tilt");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let mascotIdleTimer = null;
let mascotGreetingAgain = false;

function setMascotState(state) {
    if (!mascotDoll) {
        return;
    }

    mascotDoll.classList.remove("is-greeting", "is-idle");
    mascotDoll.classList.add(state === "greeting" ? "is-greeting" : "is-idle");
}

function scheduleMascotIdle(delayMs) {
    if (mascotIdleTimer) {
        clearTimeout(mascotIdleTimer);
    }

    mascotIdleTimer = window.setTimeout(() => {
        setMascotState("idle");
        mascotGreetingAgain = false;
    }, delayMs);
}

function playMascotGreeting() {
    if (!mascotDoll || mascotGreetingAgain) {
        return;
    }

    mascotGreetingAgain = true;
    setMascotState("greeting");
    scheduleMascotIdle(prefersReducedMotion ? 1200 : 2800);
}

if (mascotDoll) {
    if (prefersReducedMotion) {
        setMascotState("idle");
    } else {
        playMascotGreeting();
    }

    mascotRoot?.addEventListener("mouseenter", playMascotGreeting);
    mascotRoot?.addEventListener("focusin", playMascotGreeting);
}

function setMascotTilt(xRatio, yRatio) {
    if (!mascotTilt) {
        return;
    }

    mascotTilt.style.setProperty("--mascot-tilt-y", `${xRatio * 16}deg`);
    mascotTilt.style.setProperty("--mascot-tilt-x", `${-yRatio * 12}deg`);
}

function resetMascotTilt() {
    if (!mascotTilt) {
        return;
    }

    mascotTilt.style.setProperty("--mascot-tilt-y", "0deg");
    mascotTilt.style.setProperty("--mascot-tilt-x", "0deg");
}

if (mascotRoot && mascotTilt && !prefersReducedMotion) {
    mascotRoot.addEventListener("mousemove", (event) => {
        const rect = mascotRoot.getBoundingClientRect();
        const xRatio = (event.clientX - rect.left) / rect.width - 0.5;
        const yRatio = (event.clientY - rect.top) / rect.height - 0.5;
        setMascotTilt(xRatio, yRatio);
    });

    mascotRoot.addEventListener("mouseleave", resetMascotTilt);
}

const chatHistory = [];
let isSending = false;

function setChatOpen(isOpen) {
    chatWindow.classList.toggle("is-open", isOpen);
    chatWindow.setAttribute("aria-hidden", String(!isOpen));
    chatToggle.setAttribute("aria-expanded", String(isOpen));
    chatToggle.setAttribute("aria-label", isOpen ? "关闭 AI 聊天助手" : "打开 AI 聊天助手");

    if (isOpen) {
        chatInput.focus();
    }
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

chatSend.addEventListener("click", sendMessage);

chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
});
