/**
 * feedbackService — Studio message feedback (like/dislike)
 * Wraps /api/studio/feedback endpoint
 */

const API_BASE = '/api/studio/feedback';

export interface FeedbackData {
    liked?: string[];
    disliked?: string[];
    success: boolean;
}

export const feedbackService = {
    /** Load all feedback for a user */
    async load(userId: string): Promise<FeedbackData> {
        const res = await fetch(`${API_BASE}?userId=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error(`Failed to load feedback: ${res.statusText}`);
        return res.json();
    },

    /** Submit feedback (like, dislike, or remove) */
    async submit(userId: string, messageId: string, type: 'like' | 'dislike' | 'remove'): Promise<void> {
        await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messageId, userId, type }),
        });
    },
};

export default feedbackService;
