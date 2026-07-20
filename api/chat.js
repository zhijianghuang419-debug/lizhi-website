const ALLOWED_ORIGINS = new Set([
    "https://lizhi-website.vercel.app",
    "http://localhost:8000",
    "http://localhost:3000",
    "http://127.0.0.1:8000",
]);

const MAX_MESSAGES = 12;
const MAX_MESSAGE_LENGTH = 500;

const SYSTEM_PROMPT = `你是 Coco AI，Coco 个人网站上的智能助手。

关于 Coco：
- AI 实践者，专注于用 AI 提升个人和企业的工作效率
- 能力方向：AI 工作流、网站开发、SEO/GEO、自动化、内容创作
- 服务方向：AI 咨询、企业官网搭建、SEO/GEO 优化（咨询服务即将开放）
- 联系邮箱：zhijianghuang419@gmail.com
- GitHub：github.com/zhijianghuang419-debug

回答要求：
- 用简洁、友好的中文回答，每次回复控制在 150 字以内
- 不确定的事情诚实说不知道，不要编造
- 涉及合作、报价或定制开发，引导访客发邮件联系
- 你是网站助手，聚焦 Coco 的服务和 AI 实践话题，避免无关闲聊`;

function getAllowedOrigin(req) {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
        return origin;
    }

    const referer = req.headers.referer;
    if (referer) {
        for (const allowed of ALLOWED_ORIGINS) {
            if (referer.startsWith(allowed)) {
                return allowed;
            }
        }
    }

    return null;
}

function sanitizeMessages(messages) {
    if (!Array.isArray(messages)) {
        return null;
    }

    const sanitized = messages
        .filter((item) => item && (item.role === "user" || item.role === "assistant"))
        .map((item) => ({
            role: item.role,
            content: String(item.content).trim().slice(0, MAX_MESSAGE_LENGTH),
        }))
        .filter((item) => item.content.length > 0)
        .slice(-MAX_MESSAGES);

    if (sanitized.length === 0 || sanitized[sanitized.length - 1].role !== "user") {
        return null;
    }

    return sanitized;
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
        return res.status(403).json({ error: "Forbidden" });
    }

    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(503).json({
            error: "助手尚未配置完成，请稍后再试，或直接发邮件联系 Coco。",
        });
    }

    const messages = sanitizeMessages(req.body?.messages);
    if (!messages) {
        return res.status(400).json({ error: "消息格式无效" });
    }

    try {
        const response = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
                max_tokens: 300,
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            console.error("DeepSeek API error:", response.status, await response.text());
            return res.status(502).json({
                error: "AI 服务暂时不可用，请稍后再试。",
            });
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content?.trim();

        if (!reply) {
            return res.status(502).json({
                error: "AI 没有返回有效回复，请重试。",
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
