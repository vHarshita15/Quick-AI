import { OpenAI } from "openai";
import sql from "../configs/db.js";
import axios from "axios";
import { cloudinary } from "../configs/cloudinary.js";
import fs from "fs";
import pdf from "pdf-parse/lib/pdf-parse.js";
const AI = new OpenAI({
    apiKey: process.env.GEMINI_API_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});
const GEMINI_MODEL = "gemini-3-flash-preview";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRateLimitedError = (error) => {
    const status = error?.status || error?.response?.status;
    const message = error?.message || "";
    return status === 429 || message.toLowerCase().includes("429") || message.toLowerCase().includes("rate limit");
};

const rateLimitMessage = "Rate limit high. Please try again in a few seconds.";

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
    }

    try {
        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
            return parsed.map((item) => String(item).trim()).filter((item) => item.length > 0);
        }
    } catch (err) {
        // ignore parse error and fallback to lines
    }

    const lines = cleaned
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*\d+\.?\s*/, '').trim())
        .filter((line) => line.length > 0);
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

            if (!isRateLimitedError(error)) {
                throw error;
            }

            // If caller wants retries, only do so up to `retries` attempts.
            if (attempt > retries) {
                throw error;
            }

            console.warn(`[withRateLimitRetry] rate limited, retrying attempt ${attempt} of ${retries}`);

            // Respect Retry-After if present (seconds or HTTP-date).
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
                // Fallback to exponential backoff with jitter.
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
            return res.json({
                success: false,
                message: "Prompt is required"
            });
        }

        const response = await withRateLimitRetry(
            () =>
                AI.chat.completions.create({
                    model: GEMINI_MODEL,
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_tokens: length || 800,
                }),
            { retries: 0, baseDelayMs: 1000 }
        );

        const content = response.choices?.[0]?.message?.content;

        if (!content) {
            return res.json({
                success: false,
                message: "No content returned from AI"
            });
        }

        if (userId) {
            await sql`INSERT INTO creations (user_id, prompt, content, type)
                VALUES (${userId}, ${prompt}, ${content}, 'article')`;
        }

        res.json({
            success: true,
            content
        });
    } catch (error) {
        console.log(error);

        if (isRateLimitedError(error)) {
            return res.json({
                success: false,
                message: rateLimitMessage
            });
        }

        const message = error?.message || "Unknown error";
        return res.json({
            success: false,
            message
        });
    }
};
export const generateBlogTitles = async (req, res) => {
    try {
        const userId = req.userId;
        const { prompt, length } = req.body;

        const systemMessage = `You are an expert blog title generator. Produce catchy, engaging, and SEO-friendly blog post titles. Return exactly 5 titles in a JSON array of strings and nothing else.`;

        const response = await withRateLimitRetry(
            () =>
                AI.chat.completions.create({
                    model: GEMINI_MODEL,
                    messages: [
                        { role: "system", content: systemMessage },
                        { role: "user", content: prompt },
                    ],
                    temperature: 0.35,
                    top_p: 0.9,
                    max_tokens: length || 300,
                }),
            { retries: 3, baseDelayMs: 1000 }
        );

        const raw = response.choices[0].message.content;
        const titles = parseAiTitleArray(raw);

        if (!titles.length) {
            return res.json({ success: false, message: "Unable to parse title output from AI. Please try again." });
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

        res.json({ success: false, message: error.message });
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
            return res.json({
                success: false,
                message: "Image is required"
            });
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
            return res.status(400).json({
                success: false,
                message: "Resume file is required"
            });
        }

        if (resume.size > 10 * 1024 * 1024) {
            return res.status(400).json({
                success: false,
                message: "Resume file size exceeds 10MB limit"
            });
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

        const response = await withRateLimitRetry(
            () =>
                AI.chat.completions.create({
                    model: GEMINI_MODEL,
                    messages,
                    temperature: 0.1,
                    top_p: 0.9,
                    max_tokens: 2200,
                }),
            { retries: 3, baseDelayMs: 1000 }
        );

        let content = response.choices[0].message.content || '';

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

            const continueResponse = await withRateLimitRetry(
                () =>
                    AI.chat.completions.create({
                        model: GEMINI_MODEL,
                        messages: continueMessages,
                        temperature: 0.1,
                        top_p: 0.9,
                        max_tokens: 1200,
                    }),
                { retries: 2, baseDelayMs: 1000 }
            );

            const continuation = continueResponse.choices[0].message.content || '';
            content = `${content.trim()}

${continuation.trim()}`.trim();
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
