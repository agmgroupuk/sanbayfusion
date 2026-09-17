/**
 * Cross-database connection to Universal Chat backend DB
 * Used by the admin dashboard to pull real chat analytics
 */
import { Pool } from 'pg';

const globalForChatDb = globalThis as unknown as {
  chatDbPool: Pool | undefined;
};

function getChatDbPool(): Pool {
  if (!globalForChatDb.chatDbPool) {
    const url = process.env.UNIVERSAL_CHAT_DATABASE_URL;
    if (!url) {
      throw new Error('UNIVERSAL_CHAT_DATABASE_URL is not set');
    }
    globalForChatDb.chatDbPool = new Pool({
      connectionString: url,
      max: 3,
      idleTimeoutMillis: 30000,
      ssl: { rejectUnauthorized: false },
    });
  }
  return globalForChatDb.chatDbPool;
}

export async function queryChatDb<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getChatDbPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}
