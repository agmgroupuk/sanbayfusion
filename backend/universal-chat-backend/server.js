/**
 * Universal Chat Backend — Legacy stub
 * All agent logic has been moved to backend/agents/[agent-name]/
 * This file remains to preserve the Prisma schema and PM2 slot.
 * Port: 3400
 */

import 'dotenv/config';
import express from 'express';

const app = express();
const PORT = process.env.PORT || 3400;

app.get('/', (_req, res) => {
    res.json({ name: 'Universal Chat Backend', status: 'legacy-stub', note: 'Agent logic moved to dedicated backends.' });
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
    console.log(`Universal Chat Backend (stub) running on port ${PORT}`);
});
