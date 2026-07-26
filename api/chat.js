const STATIC_ALLOWED_ORIGINS = new Set([
    "https://lizhi-website.vercel.app",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://localhost:8765",
    "http://127.0.0.1:8000",
    "http://127.0.0.1:8765",
]);

const VERCEL_ORIGIN_PATTERN = /^https:\/\/lizhi-website(?:-[a-z0-9-]+)*\.vercel\.app$/;

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 500;

const SYSTEM_PROMPT = `你是 Coco AI，Coco 个人网站上的智能助手。

关于 Coco：
- AI 实践者，专注于用 AI 提升个人和企业的工作效率
- 能力方向：AI 工作流、网站开发、SEO/GEO、自动化、内容创作
- 服务现已可咨询，共三项：
  1) 个人/小微企业官网搭建：从定位到上线，通常 1–2 周，¥1000 起
  2) SEO/GEO 基础优化：体检、结构优化与可执行清单，按范围评估
  3) AI 效率咨询与工作流设计：诊断、排序优先事项、给出可落地方案，按范围评估
- 联系邮箱：zhijianghuang419@gmail.com
- GitHub：github.com/zhijianghuang419-debug
- 官网服务区：页面中的「服务」板块

回答要求：
- 用简洁、友好的中文回答，每次回复控制在 150 字以内
- 不确定的事情诚实说不知道，不要编造
- 「¥1000 起」只表示官网搭建的最低起步价，不是一口价或固定套餐价
- 遇到「1000 / 1200 / 预算多少能做完」这类问题：不要承诺某个金额一定能做完整个项目；要说明具体价格需按页面数量、内容与功能需求评估，可先了解大致需求，并引导发邮件详谈：zhijianghuang419@gmail.com
- 涉及合作、报价或定制开发，可简介服务与官网搭建起步价，并引导发邮件详谈
- 你是网站助手，聚焦 Coco 的服务和 AI 实践话题，避免无关闲聊`;

function normalizeHost(host) {
    if (!host) {
        return "";
    }

    return host.split(",")[0].trim().split(":")[0].toLowerCase();
}

function isAllowedHost(host) {
    const normalizedHost = normalizeHost(host);

    if (!normalizedHost) {
        return false;
    }

    if (
        normalizedHost === "lizhi-website.vercel.app" ||
        normalizedHost.startsWith("lizhi-website.") ||
        (normalizedHost.endsWith(".vercel.app") && normalizedHost.includes("lizhi-website"))
    ) {
        return true;
    }

    if (normalizedHost === "localhost" || normalizedHost === "127.0.0.1") {
        return true;
    }

    const customSiteUrl = process.env.SITE_URL;
    if (customSiteUrl) {
        try {
            return normalizeHost(new URL(customSiteUrl).host) === normalizedHost;
        } catch {
            return false;
        }
    }

    return false;
}

function isAllowedOrigin(origin) {
    if (!origin || origin === "null") {
        return false;
    }

    if (STATIC_ALLOWED_ORIGINS.has(origin)) {
        return true;
    }

    if (VERCEL_ORIGIN_PATTERN.test(origin)) {
        return true;
    }

    try {
        return isAllowedHost(new URL(origin).host);
    } catch {
        return false;
    }
}

function originFromHost(host) {
    const normalizedHost = normalizeHost(host);
    if (!isAllowedHost(normalizedHost)) {
        return null;
    }

    if (normalizedHost === "localhost" || normalizedHost === "127.0.0.1") {
        return `http://${normalizedHost}:8000`;
    }

    return `https://${normalizedHost}`;
}

function getAllowedOrigin(req) {
    const origin = req.headers.origin;
    if (isAllowedOrigin(origin)) {
        return origin;
    }

    const referer = req.headers.referer;
    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (isAllowedOrigin(refererOrigin)) {
                return refererOrigin;
            }
        } catch {
            // Ignore invalid referer values.
        }
    }

    const host = req.headers["x-forwarded-host"] || req.headers.host;
    return originFromHost(host);
}

function readRequestBody(req) {
    if (req.body == null) {
        return {};
    }

    if (typeof req.body === "string") {
        try {
            return JSON.parse(req.body);
        } catch {
            return null;
        }
    }

    return req.body;
}

function sanitizeMessages(messages) {
    if (!Array.isArray(messages)) {
        return null;
    }

    const sanitized = messages
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .map((item) => ({
            role: item.role,
            content: String(item.content ?? "").trim().slice(0, MAX_MESSAGE_LENGTH),
        }))
        .filter((item) => item.content.length > 0)
        .slice(-MAX_MESSAGES);

    if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== "user") {
        return null;
    }

    return sanitized;
}

function extractReply(data) {
    const message = data?.choices?.[0]?.message;
    if (!message) {
        return "";
    }

    if (typeof message.content === "string" && message.content.trim()) {
        return message.content.trim();
    }

    if (Array.isArray(message.content)) {
        const text = message.content
            .map((part) => {
                if (typeof part === "string") {
                    return part;
                }
                return part?.text || part?.content || "";
            })
            .join("")
            .trim();
        if (text) {
            return text;
        }
    }

    return "";
}

async function callDeepSeek(apiKey, messages) {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model: "deepseek-v4-flash",
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
            max_tokens: 500,
            temperature: 0.7,
            // V4 defaults to thinking mode; disable it for faster, cheaper chat replies.
            thinking: { type: "disabled" },
        }),
    });

    const rawText = await response.text();
    let data = {};
    try {
        data = rawText ? JSON.parse(rawText) : {};
    } catch {
        data = {};
    }

    return { response, data, rawText };
}

export default async function handler(req, res) {
    const allowedOrigin = getAllowedOrigin(req);

    if (req.method === "OPTIONS") {
        if (!allowedOrigin) {
            return res.status(403).end();
        }

        res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
        res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type");
        return res.status(204).end();
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    if (!allowedOrigin) {
        return res.status(403).json({
            error: "请求来源未授权，请通过官网页面使用助手。",
        });
    }

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Cache-Control", "no-store");

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: "助手尚未配置完成，请稍后再试，或直接发邮件联系 Coco。",
        });
    }

    const body = readRequestBody(req);
    if (body == null) {
        return res.status(400).json({ error: "消息格式无效" });
    }

    const messages = sanitizeMessages(body.messages);
    if (!messages) {
        return res.status(400).json({ error: "消息格式无效" });
    }

    try {
        let result = await callDeepSeek(apiKey, messages);

        // One retry for transient upstream failures.
        if (!result.response.ok && [429, 500, 502, 503, 504].includes(result.response.status)) {
            await new Promise((resolve) => setTimeout(resolve, 600));
            result = await callDeepSeek(apiKey, messages);
        }

        if (!result.response.ok) {
            console.error("DeepSeek API error:", result.response.status, result.rawText.slice(0, 500));
            return res.status(502).json({
                error: "AI 服务暂时繁忙，请稍后再试一次。",
                status: result.response.status,
            });
        }

        const reply = extractReply(result.data);

        if (!reply) {
            console.error("DeepSeek empty reply:", JSON.stringify(result.data).slice(0, 500));
            return res.status(502).json({
                error: "AI 没有返回有效回复，请再试一次。",
            });
        }

        return res.status(200).json({ reply });
    } catch (error) {
        console.error("Chat handler error:", error);
        return res.status(500).json({
            error: "服务暂时不可用，请稍后再试。",
        });
    }
}
