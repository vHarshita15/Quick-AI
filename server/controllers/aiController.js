import { GoogleGenerativeAI } from "@google/generative-ai";
import { OpenAI } from "openai";
import sql from "../configs/db.js";
import axios from "axios";
import { cloudinary } from "../configs/cloudinary.js";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
    throw new Error('Missing AI API key. Set OPENAI_API_KEY or GEMINI_API_KEY in your environment.');
}

let AI = null;
let useGemini = false;

if (OPENAI_API_KEY) {
    AI = new OpenAI({
        apiKey: OPENAI_API_KEY,
        baseURL: "https://api.openai.com/v1",
    });
} else if (GEMINI_API_KEY) {
    AI = new GoogleGenerativeAI(GEMINI_API_KEY);
    useGemini = true;
}

// Model selection based on which provider is available
const AI_MODEL = process.env.AI_MODEL || (
    OPENAI_API_KEY
        ? "gpt-3.5-turbo"
        : "gemini-2.5-flash-lite"
);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const blogTitleFallback = () => JSON.stringify([
    "The Future of Artificial Intelligence in 2026",
    "How Machine Learning is Transforming Business",
    "Top 10 AI Tools Every Developer Should Know",
    "The Ethics of Artificial Intelligence",
    "Building Intelligent Applications with Modern AI"
]);

const isBlogTitlePrompt = (prompt) => typeof prompt === 'string' && (
    prompt.toLowerCase().includes('blog') ||
    prompt.toLowerCase().includes('title')
);

const callAI = async (prompt, systemMessage = "", maxTokens = 800) => {
    try {
        if (useGemini) {
            const model = AI.getGenerativeModel({ model: AI_MODEL });
            const fullPrompt = systemMessage ? `${systemMessage}\n\nUser request: ${prompt}` : prompt;
            const result = await model.generateContent(fullPrompt);
            const text = result.response.text();
            return text;
        } else {
            const response = await AI.chat.completions.create({
                model: AI_MODEL,
                messages: [
                    ...(systemMessage ? [{ role: "system", content: systemMessage }] : []),
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: maxTokens,
            });
            return response.choices[0].message.content;
        }
    } catch (error) {
        if (isBlogTitlePrompt(prompt)) {
            console.warn('[callAI] Falling back to local blog title content because the AI provider returned an error:', error.message);
            return blogTitleFallback();
        }
        console.error('[callAI] API error:', error.message);
        throw error;
    }
};

const callAIMultiTurn = async (messages, maxTokens = 800) => {
    if (useGemini) {
        const model = AI.getGenerativeModel({ model: AI_MODEL });
        const chat = model.startChat();
        let lastResponse = null;
        for (let i = 0; i < messages.length - 1; i++) {
            const msg = messages[i];
            if (msg.role === "user") {
                const result = await chat.sendMessage(msg.content);
                lastResponse = result.response.text();
            }
        }
        const lastMsg = messages[messages.length - 1];
        if (lastMsg.role === "user") {
            const result = await chat.sendMessage(lastMsg.content);
            return result.response.text();
        }
        return lastResponse;
    } else {
        const response = await AI.chat.completions.create({
            model: AI_MODEL,
            messages: messages,
            temperature: 0.1,
            top_p: 0.9,
            max_tokens: maxTokens,
        });
        return response.choices[0].message.content;
    }
};

const isRateLimitedError = (error) => {
    const status = error?.status || error?.response?.status;
    const message = error?.message || "";
    return (
        status === 429 ||
        status === 503 ||
        message.toLowerCase().includes("429") ||
        message.toLowerCase().includes("503") ||
        message.toLowerCase().includes("rate limit") ||
        message.toLowerCase().includes("high demand")
    );
};

const rateLimitMessage = "Rate limit high. Please try again in a few seconds.";

const formatAIError = (error) => {
    const status = error?.status || error?.response?.status;
    const body = error?.response?.data || error?.message || 'Unknown AI error';
    if (status === 403) {
        return `AI permission denied (403). Check your OpenAI/Gemini API key, model access, and cloud permissions. ${typeof body === 'string' ? body : JSON.stringify(body)}`;
    }
    return typeof body === 'string' ? body : JSON.stringify(body);
};

const cleanAIJson = (text) => {
    if (!text || typeof text !== 'string') return '';
    return text.replace(/```json|```/gi, '').trim();
};

const parseAiTitleArray = (text) => {
    const cleaned = cleanAIJson(text);
    let jsonText = cleaned;
    const arrayMatch = cleaned.match(/\[.*\]/s);
    if (arrayMatch) {
        jsonText = arrayMatch[0];
    } else if (cleaned.startsWith('[')) {
        jsonText = cleaned + ']';
    }
    try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter((item) => item.length > 0);
        }
    } catch (err) {
        console.log('[parseAiTitleArray] JSON parse failed, trying line split:', err.message);
    }
    const lines = cleaned
        .split(/\r?\n/)
        .map((line) => {
            let cleaned = line.replace(/^\s*[\[\,"]/, '').replace(/["]\s*$/, '').trim();
            cleaned = cleaned.replace(/^\s*\d+[\.\)]\s*/, '').trim();
            return cleaned;
        })
        .filter((line) => line.length > 0 && !line.match(/^[\[\]\{}\,]*$/));
    return lines;
};

const requiredResumeSections = [
    'Overall impression',
    'Best-fit roles and seniority level inferred from the resume',
    'Key strengths',
    'Major weaknesses or missing information',
    'ATS compatibility review',
    'Section-by-section feedback',
    'Specific rewrite suggestions',
    'Keyword recommendations',
    'Formatting and readability improvements',
    'Top 10 prioritized action items',
    'Final score out of 10 with a brief explanation'
];

const hasAllResumeSections = (text) => {
    if (!text || typeof text !== 'string') return false;
    const normalized = text.toLowerCase();
    return requiredResumeSections.every((section) => normalized.includes(section.toLowerCase()));
};

const withRateLimitRetry = async (fn, { retries = 3, baseDelayMs = 1000 } = {}) => {
    let attempt = 0;
    while (true) {
        try {
            return await fn();
        } catch (error) {
            attempt += 1;
            if (!isRateLimitedError(error)) throw error;
            if (attempt > retries) throw error;
            console.warn(`[withRateLimitRetry] rate limited, retrying attempt ${attempt} of ${retries}`);
            const retryAfter = error?.response?.headers?.['retry-after'] ?? error?.headers?.['retry-after'];
            let delayMs = null;
            if (retryAfter) {
                const asSeconds = Number(retryAfter);
                if (!Number.isNaN(asSeconds) && asSeconds > 0) {
                    delayMs = asSeconds * 1000;
                } else {
                    const date = Date.parse(retryAfter);
                    if (!Number.isNaN(date)) delayMs = Math.max(0, date - Date.now());
                }
            }
            if (delayMs === null) {
                const exponentialDelay = baseDelayMs * Math.pow(2, attempt - 1);
                const jitter = Math.floor(Math.random() * 250);
                delayMs = exponentialDelay + jitter;
            }
            await sleep(delayMs);
        }
    }
};

export const generateArticle = async (req, res) => {
    try {
        const userId = req.userId || "test-user";
        const { prompt, length } = req.body;
        if (!prompt) {
            return res.json({ success: false, message: "Prompt is required" });
        }
        const content = await withRateLimitRetry(
            () => callAI(prompt, "", length || 800),
            { retries: 0, baseDelayMs: 1000 }
        );
        if (!content) {
            return res.json({ success: false, message: "No content returned from AI" });
        }
        if (userId) {
            await sql`INSERT INTO creations (user_id, prompt, content, type)
                VALUES (${userId}, ${prompt}, ${content}, 'article')`;
        }
        res.json({ success: true, content });
    } catch (error) {
        console.log(error);
        if (isRateLimitedError(error)) {
            return res.json({ success: false, message: rateLimitMessage });
        }
        return res.json({ success: false, message: formatAIError(error) });
    }
};

export const generateBlogTitles = async (req, res) => {
    try {
        const userId = req.userId;
        const { prompt, length } = req.body;
        const systemMessage = `You are an expert blog title generator. Produce catchy, engaging, and SEO-friendly blog post titles. Return exactly 5 titles in a JSON array of strings and nothing else.`;
        let raw;
        try {
            raw = await withRateLimitRetry(
                () => callAI(prompt, systemMessage, length || 300),
                { retries: 3, baseDelayMs: 1000 }
            );
        } catch (error) {
            if (isBlogTitlePrompt(prompt)) {
                console.warn('[generateBlogTitles] Falling back to local blog title content after AI error:', error.message);
                raw = blogTitleFallback();
            } else {
                throw error;
            }
        }
        console.log('[generateBlogTitles] raw response:', raw);
        const titles = parseAiTitleArray(raw);
        console.log('[generateBlogTitles] parsed titles:', titles);
        if (!titles.length) {
            console.log('[generateBlogTitles] parsing failed, raw was:', JSON.stringify(raw));
            return res.json({ success: false, message: `Unable to parse title output from AI. Raw response: ${typeof raw === 'string' ? raw.substring(0, 200) : JSON.stringify(raw)}` });
        }
        const content = JSON.stringify(titles);
        if (userId) {
            await sql`INSERT INTO creations (user_id, prompt, content, type)
                VALUES (${userId}, ${prompt}, ${content}, 'blog_title')`;
        }
        res.json({ success: true, content });
    } catch (error) {
        console.log(error.message);
        if (isRateLimitedError(error)) {
            return res.json({ success: false, message: rateLimitMessage });
        }
        res.json({ success: false, message: formatAIError(error) });
    }
};

export const generateImage = async (req, res) => {
    try {
        const userId = req.userId;
        const { prompt, publish } = req.body;
        const form = new FormData();
        form.append("prompt", prompt);
        const { data } = await axios.post("https://clipdrop-api.co/text-to-image/v1", form, {
            headers: { "x-api-key": process.env.CLIPDROP_API_KEY },
            responseType: "arraybuffer",
        });
        const base64Image = `data:image/png;base64,${Buffer.from(data, "binary").toString("base64")}`;
        const { secure_url } = await cloudinary.uploader.upload(base64Image);
        if (userId) {
            await sql`INSERT INTO creations (user_id, prompt, content, type, publish)
                VALUES (${userId}, ${prompt}, ${secure_url}, 'image', ${publish ?? false})`;
        }
        res.json({ success: true, content: secure_url });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const removeImageBackground = async (req, res) => {
    try {
        const userId = req.userId;
        const image = req.file;
        if (!image) {
            return res.json({ success: false, message: "Image is required" });
        }
        const { secure_url } = await cloudinary.uploader.upload(image.path, {
            transformation: [{ effect: "background_removal" }]
        });
        if (userId) {
            await sql`INSERT INTO creations (user_id, prompt, content, type)
                VALUES (${userId}, ${"Remove background from image"}, ${secure_url}, 'image')`;
        }
        res.json({ success: true, content: secure_url });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const removeImageObject = async (req, res) => {
    try {
        const userId = req.userId;
        const { object } = req.body;
        const image = req.file;
        if (!image) {
            return res.json({ success: false, message: "Image is required" });
        }
        if (!object || !object.trim()) {
            return res.json({ success: false, message: "Object name is required" });
        }
        const objectLabel = object.trim();
        const uploadResult = await cloudinary.uploader.upload(image.path, {
            resource_type: "image",
        });
        const imageUrl = cloudinary.url(uploadResult.public_id, {
            secure: true,
            resource_type: "image",
            transformation: [{ effect: `gen_remove:${objectLabel}` }],
        });
        if (userId) {
            await sql`INSERT INTO creations (user_id, prompt, content, type)
                VALUES (${userId}, ${`Removed ${objectLabel} from image`}, ${imageUrl}, 'image')`;
        }
        res.json({ success: true, content: imageUrl });
    } catch (error) {
        console.log(error.message);
        res.json({ success: false, message: error.message });
    }
};

export const resumeReview = async (req, res) => {
    try {
        const userId = req.userId;
        const resume = req.file;
        console.log('[resumeReview] request start', {
            authHeaderPresent: Boolean(req.headers.authorization),
            fileProvided: Boolean(resume),
            fileName: resume?.originalname,
            fileSize: resume?.size,
        });
        if (!resume) {
            return res.status(400).json({ success: false, message: "Resume file is required" });
        }
        if (resume.size > 10 * 1024 * 1024) {
            return res.status(400).json({ success: false, message: "Resume file size exceeds 10MB limit" });
        }
        const dataBuffer = fs.readFileSync(resume.path);
        const pdfData = await pdf(dataBuffer);
        let resumeText = String(pdfData.text || '').trim();
        console.log('[resumeReview] extracted text length', resumeText.length);
        if (!resumeText) {
            return res.status(400).json({
                success: false,
                message: "Unable to extract text from the uploaded resume. Please upload a searchable PDF or ensure the document contains selectable text."
            });
        }
        const MAX_RESUME_CHARS = 17000;
        let truncatedNote = '';
        if (resumeText.length > MAX_RESUME_CHARS) {
            resumeText = resumeText.slice(0, MAX_RESUME_CHARS);
            truncatedNote = '\n\n[NOTE: The resume text has been truncated to fit model input limits. Review only the provided content.]';
        }
        const messages = [
            {
                role: "system",
                content: "You are an expert resume reviewer and recruiter with deep experience in ATS optimization and hiring decisions. Your output must be practical, objective, and based only on the resume text. Use markdown headings and bullet lists. Avoid vague career advice and generic writing tips."
            },
            {
                role: "user",
                content: `Review the resume text below and provide practical feedback in markdown. Use the following sections exactly, with clear bullets and resume-specific examples:

1. Overall impression
2. Best-fit roles and seniority level inferred from the resume
3. Key strengths
4. Major weaknesses or missing information
5. ATS compatibility review
6. Section-by-section feedback for summary, experience, projects, skills, education, and certifications if present
7. Specific rewrite suggestions for weak bullets using stronger action verbs and measurable impact
8. Keyword recommendations based on the target profile implied by the resume
9. Formatting and readability improvements
10. Top 10 prioritized action items
11. Final score out of 10 with a brief explanation

- Quote or reference actual resume lines when useful.
- If a section is not present, say what is missing and how to fix it.
- Do not invent job titles, experience, or skills that are not in the resume.
- Keep the review actionable and concise.

Resume Content:

${resumeText}${truncatedNote}`
            }
        ];
        let content = await withRateLimitRetry(
            () => callAIMultiTurn(messages, 2200),
            { retries: 3, baseDelayMs: 1000 }
        );
        if (!hasAllResumeSections(content)) {
            const continueMessages = [
                { role: 'system', content: messages[0].content },
                { role: 'user', content: messages[1].content },
                { role: 'assistant', content: content },
                {
                    role: 'user',
                    content: 'The previous review appears incomplete. Continue and complete any missing sections from the exact outline, finishing the resume review in markdown.'
                }
            ];
            const continuation = await withRateLimitRetry(
                () => callAIMultiTurn(continueMessages, 1200),
                { retries: 2, baseDelayMs: 1000 }
            );
            content = `${content.trim()}\n\n${continuation.trim()}`.trim();
        }
        if (userId) {
            await sql`INSERT INTO creations (user_id, prompt, content, type)
                VALUES (${userId}, ${"Review the uploaded resume"}, ${content}, 'resume-review')`;
        }
        res.json({ success: true, content });
    } catch (error) {
        console.error('[resumeReview] error', {
            message: error.message,
            stack: error.stack,
            response: error.response?.data,
            status: error.response?.status,
        });
        res.status(error.status || 500).json({ success: false, message: error.message });
    }
};