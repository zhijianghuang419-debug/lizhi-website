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
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

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
            let fallbackMessage = "请求失败，请稍后再试。";
            if (response.status === 403) {
                fallbackMessage = "助手暂时无法访问，请确认打开的是 https://lizhi-website.vercel.app";
            } else if (response.status === 503) {
                fallbackMessage = "助手尚未配置完成，请稍后再试。";
            } else if (response.status >= 500) {
                fallbackMessage = "AI 服务暂时繁忙，请稍后再试一次。";
            }
            throw new Error(data.error || fallbackMessage);
        }

        if (!data.reply) {
            throw new Error("AI 没有返回有效回复，请再试一次。");
        }

        chatHistory.push({ role: "assistant", content: data.reply });
        appendMessage(data.reply, false);
    } catch (error) {
        loadingMessage.remove();

        // Keep history clean so the next retry is not stuck on a failed turn.
        if (chatHistory.length && chatHistory[chatHistory.length - 1].role === "user") {
            chatHistory.pop();
        }

        const message = error?.message || "";
        const isNetworkError = /failed to fetch|networkerror|load failed/i.test(message);
        appendMessage(
            isNetworkError
                ? "网络连接失败，请确认打开的是 https://lizhi-website.vercel.app 后重试。"
                : message || "发送失败，请稍后再试，或直接发邮件：zhijianghuang419@gmail.com"
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

function initParallaxOrbs() {
    if (isTouchDevice || prefersReducedMotion) {
        return;
    }

    const orbs = document.querySelectorAll("[data-parallax]");
    if (!orbs.length) {
        return;
    }

    window.addEventListener("mousemove", (event) => {
        const x = (event.clientX / window.innerWidth - 0.5) * 2;
        const y = (event.clientY / window.innerHeight - 0.5) * 2;

        orbs.forEach((orb) => {
            const strength = Number(orb.dataset.parallax) || 0.04;
            orb.style.transform = `translate(${x * strength * 120}px, ${y * strength * 120}px)`;
        });
    });
}

function initMagneticButtons() {
    if (isTouchDevice || prefersReducedMotion) {
        return;
    }

    document.querySelectorAll(".magnetic").forEach((button) => {
        button.addEventListener("mousemove", (event) => {
            const rect = button.getBoundingClientRect();
            const x = event.clientX - rect.left - rect.width / 2;
            const y = event.clientY - rect.top - rect.height / 2;
            button.style.transform = `translate(${x * 0.18}px, ${y * 0.22}px)`;
        });

        button.addEventListener("mouseleave", () => {
            button.style.transform = "translate(0, 0)";
        });
    });
}

function initRevealMotion() {
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
        const inHero = Boolean(item.closest(".hero"));

        gsap.to(item, {
            opacity: 1,
            y: 0,
            duration: inHero ? 1.05 : 0.9,
            ease: "power3.out",
            delay: inHero ? index * 0.1 : 0,
            scrollTrigger: {
                trigger: item,
                start: "top 92%",
                toggleActions: "play none none none",
                once: true,
            },
        });
    });

    const watermark = document.querySelector(".hero-watermark");
    if (watermark) {
        gsap.to(watermark, {
            yPercent: 18,
            ease: "none",
            scrollTrigger: {
                trigger: ".hero",
                start: "top top",
                end: "bottom top",
                scrub: true,
            },
        });
    }
}

initParallaxOrbs();
initMagneticButtons();
initRevealMotion();
