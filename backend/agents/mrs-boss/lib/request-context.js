/**
 * REQUEST CONTEXT
 * Uses AsyncLocalStorage to make SSE response and request metadata
 * available to deeply nested tool functions without passing through every signature.
 *
 * Usage:
 *   import { runWithContext, getContext } from './request-context.js';
 *
 *   // In route handler / tool loop:
 *   await runWithContext({ res, userId, agentId, sessionId }, async () => {
 *       await executeToolCall(...);
 *   });
 *
 *   // In any tool function:
 *   const { res } = getContext();
 *   if (res) res.write(`data: ${JSON.stringify({ type: 'agent_ui', ... })}\n\n`);
 */

import { AsyncLocalStorage } from 'node:async_hooks';

const store = new AsyncLocalStorage();

/**
 * Run a function with request context available to all nested calls.
 * @param {Object} ctx - { res, userId, agentId, sessionId }
 * @param {Function} fn - async function to run within context
 */
export function runWithContext(ctx, fn) {
    return store.run(ctx, fn);
}

/**
 * Get the current request context (SSE res, userId, etc.).
 * Returns empty object if called outside a context.
 */
export function getContext() {
    return store.getStore() || {};
}

/**
 * Write an SSE event to the current request's response stream.
 * Safe to call even if no context or response exists.
 * @param {Object} event - The event data to send
 */
export function emitSSE(event) {
    const { res } = getContext();
    if (res && !res.writableEnded) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
}

export default store;
