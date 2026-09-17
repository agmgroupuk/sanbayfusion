/**
 * Azure Content Safety Service
 * 
 * Integrates with Azure AI Content Safety to analyze text and images
 * for harmful content across 4 categories: Hate, SelfHarm, Sexual, Violence.
 * 
 * Severity levels: 0 (safe) → 2 (low) → 4 (medium) → 6 (high)
 * Default threshold: 4 (blocks medium+ severity)
 * 
 * @see https://learn.microsoft.com/en-us/azure/ai-services/content-safety/
 */

const ENDPOINT = process.env.AZURE_CONTENT_SAFETY_ENDPOINT?.replace(/\/$/, '');
const API_KEY = process.env.AZURE_CONTENT_SAFETY_KEY;
const API_VERSION = '2024-09-01';

// Severity threshold — messages at or above this level are blocked
// 0 = block nothing, 2 = block low+, 4 = block medium+, 6 = block high only
const DEFAULT_THRESHOLD = 4;

// Category labels for human-readable output
const CATEGORY_LABELS = {
    Hate: 'Hate speech & discrimination',
    SelfHarm: 'Self-harm content',
    Sexual: 'Sexual content',
    Violence: 'Violent content',
};

/**
 * Check if the service is configured and available
 */
export function isConfigured() {
    return !!(ENDPOINT && API_KEY);
}

/**
 * Analyze text for harmful content using Azure Content Safety
 * 
 * @param {string} text - The text to analyze (max 10,000 chars)
 * @param {object} [options]
 * @param {number} [options.threshold=4] - Severity threshold (0/2/4/6)
 * @param {string[]} [options.categories] - Categories to check (default: all 4)
 * @param {string[]} [options.blocklistNames] - Custom blocklist names to check against
 * @returns {Promise<ContentSafetyResult>}
 */
export async function analyzeText(text, options = {}) {
    if (!isConfigured()) {
        console.warn('[ContentSafety] Not configured — blocking request (fail-closed)');
        return { safe: false, skipped: true, reason: 'not_configured' };
    }

    if (!text || typeof text !== 'string') {
        return { safe: true, skipped: true, reason: 'empty_input' };
    }

    // Azure Content Safety has a 10,000 character limit per call
    const truncated = text.length > 10000 ? text.slice(0, 10000) : text;

    const threshold = options.threshold ?? DEFAULT_THRESHOLD;
    const categories = options.categories || ['Hate', 'SelfHarm', 'Sexual', 'Violence'];

    try {
        const url = `${ENDPOINT}/contentsafety/text:analyze?api-version=${API_VERSION}`;

        const body = {
            text: truncated,
            categories,
            outputType: 'FourSeverityLevels',
        };

        if (options.blocklistNames?.length) {
            body.blocklistNames = options.blocklistNames;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': API_KEY,
            },
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(5000), // 5s timeout — don't block chat
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`[ContentSafety] API error ${response.status}: ${errText}`);
            // Fail closed — block if the safety API is down
            return { safe: false, skipped: true, reason: 'api_error', statusCode: response.status };
        }

        const result = await response.json();

        // Parse category results
        const flagged = [];
        let maxSeverity = 0;

        for (const cat of result.categoriesAnalysis || []) {
            if (cat.severity >= threshold) {
                flagged.push({
                    category: cat.category,
                    label: CATEGORY_LABELS[cat.category] || cat.category,
                    severity: cat.severity,
                });
            }
            if (cat.severity > maxSeverity) {
                maxSeverity = cat.severity;
            }
        }

        // Check blocklist matches
        const blocklistMatches = result.blocklistsMatch || [];
        if (blocklistMatches.length > 0) {
            flagged.push(...blocklistMatches.map(m => ({
                category: 'Blocklist',
                label: `Blocklist: ${m.blocklistName}`,
                severity: 6,
                blockItemId: m.blockItemId,
                blockItemText: m.blockItemText,
            })));
        }

        const safe = flagged.length === 0;

        if (!safe) {
            console.warn(`[ContentSafety] BLOCKED — categories: ${flagged.map(f => `${f.category}(${f.severity})`).join(', ')}`);
        }

        return {
            safe,
            flagged,
            maxSeverity,
            threshold,
            categoriesAnalysis: result.categoriesAnalysis,
        };
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            console.warn('[ContentSafety] Request timed out — blocking (fail-closed)');
            return { safe: false, skipped: true, reason: 'timeout' };
        }
        console.error('[ContentSafety] Error:', error.message);
        // Fail closed
        return { safe: false, skipped: true, reason: 'error', error: error.message };
    }
}

/**
 * Analyze an image for harmful content
 * 
 * @param {string} base64Content - Base64-encoded image data (no data: prefix)
 * @param {object} [options]
 * @param {number} [options.threshold=4] - Severity threshold
 * @returns {Promise<ContentSafetyResult>}
 */
export async function analyzeImage(base64Content, options = {}) {
    if (!isConfigured()) {
        return { safe: false, skipped: true, reason: 'not_configured' };
    }

    if (!base64Content) {
        return { safe: true, skipped: true, reason: 'empty_input' };
    }

    const threshold = options.threshold ?? DEFAULT_THRESHOLD;

    try {
        const url = `${ENDPOINT}/contentsafety/image:analyze?api-version=${API_VERSION}`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Ocp-Apim-Subscription-Key': API_KEY,
            },
            body: JSON.stringify({
                image: { content: base64Content },
                categories: ['Hate', 'SelfHarm', 'Sexual', 'Violence'],
                outputType: 'FourSeverityLevels',
            }),
            signal: AbortSignal.timeout(8000), // Images take longer
        });

        if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`[ContentSafety] Image API error ${response.status}: ${errText}`);
            return { safe: false, skipped: true, reason: 'api_error', statusCode: response.status };
        }

        const result = await response.json();

        const flagged = [];
        let maxSeverity = 0;

        for (const cat of result.categoriesAnalysis || []) {
            if (cat.severity >= threshold) {
                flagged.push({
                    category: cat.category,
                    label: CATEGORY_LABELS[cat.category] || cat.category,
                    severity: cat.severity,
                });
            }
            if (cat.severity > maxSeverity) {
                maxSeverity = cat.severity;
            }
        }

        const safe = flagged.length === 0;
        if (!safe) {
            console.warn(`[ContentSafety] Image BLOCKED — ${flagged.map(f => `${f.category}(${f.severity})`).join(', ')}`);
        }

        return { safe, flagged, maxSeverity, threshold, categoriesAnalysis: result.categoriesAnalysis };
    } catch (error) {
        if (error.name === 'TimeoutError' || error.name === 'AbortError') {
            console.warn('[ContentSafety] Image analysis timed out — blocking (fail-closed)');
            return { safe: false, skipped: true, reason: 'timeout' };
        }
        console.error('[ContentSafety] Image error:', error.message);
        return { safe: false, skipped: true, reason: 'error', error: error.message };
    }
}

/**
 * Express middleware — checks req.body.message / req.body.content for safety.
 * Returns 451 (Unavailable For Legal Reasons) if content is flagged.
 * Attaches result to req.contentSafety for downstream use.
 * 
 * @param {object} [options]
 * @param {number} [options.threshold] - Severity threshold override
 * @param {boolean} [options.checkImages] - Also check imageData.base64 if present
 */
export function contentSafetyMiddleware(options = {}) {
    return async (req, res, next) => {
        // Extract text from common body shapes
        const text = req.body.message || req.body.content || req.body.query || req.body.text || '';

        if (!text) {
            req.contentSafety = { safe: true, skipped: true, reason: 'empty_input' };
            return next();
        }

        if (!isConfigured()) {
            console.warn('[ContentSafety] Not configured — blocking request (fail-closed)');
            return res.status(503).json({
                error: 'Content safety service is not configured. Please contact support.',
                code: 'CONTENT_SAFETY_UNAVAILABLE',
            });
        }

        const result = await analyzeText(text, options);
        req.contentSafety = result;

        if (!result.safe) {
            return res.status(451).json({
                error: 'Your message was flagged by our content safety system.',
                categories: result.flagged.map(f => f.label),
                code: 'CONTENT_SAFETY_VIOLATION',
            });
        }

        // Optionally check images
        if (options.checkImages && req.body.imageData?.base64) {
            const imgResult = await analyzeImage(req.body.imageData.base64, options);
            req.contentSafety.image = imgResult;

            if (!imgResult.safe) {
                return res.status(451).json({
                    error: 'The image you uploaded was flagged by our content safety system.',
                    categories: imgResult.flagged.map(f => f.label),
                    code: 'CONTENT_SAFETY_VIOLATION',
                });
            }
        }

        next();
    };
}

/**
 * Quick safety check — returns true if safe, false if flagged.
 * Useful for inline checks without middleware.
 * 
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function isSafe(text) {
    const result = await analyzeText(text);
    return result.safe;
}

export default {
    isConfigured,
    analyzeText,
    analyzeImage,
    contentSafetyMiddleware,
    isSafe,
};
