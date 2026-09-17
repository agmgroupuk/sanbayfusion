import { createLogger } from './logger.js';
const log = createLogger('contentSafety');
/**
 * Azure Content Safety Middleware
 * Uses Azure AI Content Safety API to screen user inputs for harmful content.
 * Categories: Hate, SelfHarm, Sexual, Violence (severity 0-6, blocked at ≥4)
 */

const AZURE_ENDPOINT = process.env.AZURE_CONTENT_SAFETY_ENDPOINT;
const AZURE_KEY = process.env.AZURE_CONTENT_SAFETY_KEY;

// Severity threshold (0-6). Messages at or above this level are blocked.
const BLOCK_THRESHOLD = 4;

/**
 * Analyze text with Azure Content Safety API
 * @param {string} text - Text to analyze
 * @returns {{ safe: boolean, categories?: object, blockedCategories?: string[] }}
 */
async function analyzeText(text) {
    if (!AZURE_ENDPOINT || !AZURE_KEY) {
        log.warn('[ContentSafety] Azure Content Safety not configured — skipping');
        return { safe: true };
    }

    // Truncate to 10,000 chars (API limit)
    const truncated = text.slice(0, 10000);

    try {
        const url = `${AZURE_ENDPOINT.replace(/\/$/, '')}/contentsafety/text:analyze?api-version=2024-09-01`;

        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': AZURE_KEY,
            },
            body: JSON.stringify({
                text: truncated,
                categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
                outputType: 'FourSeverityLevels',
            }),
        });

        if (!res.ok) {
            log.error(`[ContentSafety] API error ${res.status}: ${await res.text()}`);
            // Fail-open: don't block requests if the safety API is down
            return { safe: true };
        }

        const data = await res.json();
        const categories = {};
        const blockedCategories = [];

        for (const item of data.categoriesAnalysis || []) {
            categories[item.category] = item.severity;
            if (item.severity >= BLOCK_THRESHOLD) {
                blockedCategories.push(item.category);
            }
        }

        return {
            safe: blockedCategories.length === 0,
            categories,
            blockedCategories: blockedCategories.length > 0 ? blockedCategories : undefined,
        };
    } catch (err) {
        log.error('[ContentSafety] Request failed:', err.message);
        // Fail-open
        return { safe: true };
    }
}

/**
 * Express middleware — extracts user text from common body fields and screens it.
 * Checks: message, messages[last].content, prompt, code, promptText, text
 * Blocks with 400 if content is flagged.
 */
function contentSafetyMiddleware(req, res, next) {
    if (!AZURE_ENDPOINT || !AZURE_KEY) return next();

    // Only check POST/PUT/PATCH with a body
    if (!['POST', 'PUT', 'PATCH'].includes(req.method) || !req.body) return next();

    // Extract user text from common request body fields
    let textToCheck = '';

    if (typeof req.body.message === 'string') {
        textToCheck = req.body.message;
    } else if (Array.isArray(req.body.messages) && req.body.messages.length > 0) {
        // Get the last user message
        const last = req.body.messages[req.body.messages.length - 1];
        textToCheck = typeof last === 'string' ? last : (last?.content || '');
    } else if (typeof req.body.prompt === 'string') {
        textToCheck = req.body.prompt;
    } else if (typeof req.body.promptText === 'string') {
        textToCheck = req.body.promptText;
    } else if (typeof req.body.text === 'string') {
        textToCheck = req.body.text;
    }

    // Also check code if present (secondary)
    if (typeof req.body.code === 'string') {
        textToCheck += '\n' + req.body.code.slice(0, 2000);
    }

    if (!textToCheck || textToCheck.trim().length === 0) return next();

    analyzeText(textToCheck)
        .then(result => {
            if (!result.safe) {
                log.warn(`[ContentSafety] BLOCKED request from ${req.ip} — categories: ${result.blockedCategories.join(', ')}`);
                return res.status(400).json({
                    error: 'Content flagged by safety filter',
                    message: 'Your message was flagged for potentially harmful content. Please revise and try again.',
                    flaggedCategories: result.blockedCategories,
                });
            }
            // Attach result for downstream use
            req.contentSafety = result;
            next();
        })
        .catch(() => next()); // Fail-open on unexpected errors
}

export { analyzeText, contentSafetyMiddleware };
