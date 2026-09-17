/**
 * MINIMAL DEMO TOOLS SERVICE
 * Only essential tools for ai-studio-demo free-tier chat app
 * - web_search: Basic web search via DuckDuckGo
 * - fetch_url: URL content fetching
 * - run_code: Basic code execution (JavaScript/Python)
 * - calculate: Math operations
 * - get_current_time: Date/time awareness
 */

import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * web_search — Basic web search via DuckDuckGo (no API key required)
 */
async function webSearch(params) {
    const { query, num_results = 5 } = params;

    try {
        const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 10000
        });

        if (!response.ok) throw new Error(`Search failed: ${response.status}`);

        const html = await response.text();
        const dom = new JSDOM(html);
        const results = [];

        // Extract search results from DuckDuckGo HTML
        const resultElements = dom.window.document.querySelectorAll('.result__title, .result__snippet');

        for (let i = 0; i < Math.min(resultElements.length, num_results * 2); i += 2) {
            const titleEl = resultElements[i];
            const snippetEl = resultElements[i + 1];

            if (titleEl && snippetEl) {
                const title = titleEl.textContent?.trim() || '';
                const snippet = snippetEl.textContent?.trim() || '';
                const link = titleEl.closest('a')?.href || '';

                if (title && snippet) {
                    results.push({
                        title,
                        snippet: snippet.substring(0, 200),
                        link
                    });
                }
            }
        }

        return {
            success: true,
            query,
            results: results.slice(0, num_results),
            total: results.length
        };

    } catch (error) {
        return {
            success: false,
            error: `Search failed: ${error.message}`,
            query
        };
    }
}

/**
 * fetch_url — Fetch and extract content from a URL
 */
async function fetchUrl(params) {
    const { url } = params;

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            timeout: 15000
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const contentType = response.headers.get('content-type') || '';
        const html = await response.text();

        // Extract text content from HTML
        const dom = new JSDOM(html);
        const textContent = dom.window.document.body?.textContent || '';
        const title = dom.window.document.title || '';

        return {
            success: true,
            url,
            title,
            content: textContent.substring(0, 5000), // Limit content length
            contentType
        };

    } catch (error) {
        return {
            success: false,
            error: `Fetch failed: ${error.message}`,
            url
        };
    }
}

/**
 * run_code — Execute code in JavaScript or Python
 */
async function runCode(params) {
    const { code, language = 'javascript', userId } = params;

    try {
        let result;

        if (language === 'javascript') {
            // Safe JavaScript execution (limited scope)
            const safeCode = `
        try {
          ${code}
        } catch (error) {
          error.message
        }
      `;

            // Use Node.js vm for safer execution
            const { VM } = await import('vm2');
            const vm = new VM({
                timeout: 5000,
                sandbox: {}
            });

            result = vm.run(safeCode);

        } else if (language === 'python') {
            // Execute Python code
            const { stdout, stderr } = await execAsync(`python3 -c "${code.replace(/"/g, '\\"')}"`, {
                timeout: 10000,
                maxBuffer: 1024 * 1024
            });

            result = stdout || stderr;

        } else {
            throw new Error(`Unsupported language: ${language}`);
        }

        return {
            success: true,
            language,
            code,
            result: String(result)
        };

    } catch (error) {
        return {
            success: false,
            error: `Code execution failed: ${error.message}`,
            language,
            code
        };
    }
}

/**
 * calculate — Simple math expression evaluation
 */
async function calculate(params) {
    const { expression } = params;

    try {
        // Basic security: only allow numbers, operators, and parentheses
        if (!/^[\d\s\+\-\*\/\(\)\.\s]+$/.test(expression)) {
            throw new Error('Invalid characters in expression');
        }

        // Use Function constructor for safe evaluation
        const result = new Function('return (' + expression + ')')();

        if (typeof result !== 'number' || !isFinite(result)) {
            throw new Error('Invalid mathematical result');
        }

        return {
            success: true,
            expression,
            result
        };

    } catch (error) {
        return {
            success: false,
            error: `Calculation failed: ${error.message}`,
            expression
        };
    }
}

/**
 * get_current_time — Get current date and time
 */
async function getCurrentTime(params) {
    const { timezone = 'UTC' } = params;

    try {
        const now = new Date();

        // Basic timezone support
        let timeString;
        if (timezone === 'UTC') {
            timeString = now.toISOString();
        } else {
            // Simple offset for common timezones (basic implementation)
            const offset = timezone === 'EST' ? -5 : timezone === 'PST' ? -8 : 0;
            const localTime = new Date(now.getTime() + (offset * 60 * 60 * 1000));
            timeString = localTime.toISOString();
        }

        return {
            success: true,
            timezone,
            iso: timeString,
            timestamp: now.getTime(),
            readable: now.toLocaleString()
        };

    } catch (error) {
        return {
            success: false,
            error: `Time lookup failed: ${error.message}`,
            timezone
        };
    }
}

// Tool registry
const tools = {
    web_search: webSearch,
    fetch_url: fetchUrl,
    run_code: runCode,
    calculate: calculate,
    get_current_time: getCurrentTime
};

/**
 * Execute a tool by name
 */
export async function executeTool(toolName, params = {}) {
    const tool = tools[toolName];

    if (!tool) {
        return {
            success: false,
            error: `Tool not found: ${toolName}`,
            availableTools: Object.keys(tools)
        };
    }

    try {
        return await tool(params);
    } catch (error) {
        return {
            success: false,
            error: `Tool execution failed: ${error.message}`,
            tool: toolName
        };
    }
}

export default {
    executeTool,
    tools: Object.keys(tools)
};