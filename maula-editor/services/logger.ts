/**
 * Structured Logger for Maula Editor Frontend
 * Replaces raw console.log/warn/error with level-aware, tagged logging.
 * In production: suppresses debug/info. In dev: full colored output.
 */

const isDev = typeof window !== 'undefined' && window.location.hostname === 'localhost';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 } as const;
type LogLevel = keyof typeof LEVELS;
const MIN_LEVEL: number = isDev ? LEVELS.debug : LEVELS.warn;

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= MIN_LEVEL;
}

export interface Logger {
  debug(msg: string, ...args: unknown[]): void;
  info(msg: string, ...args: unknown[]): void;
  warn(msg: string, ...args: unknown[]): void;
  error(msg: string, ...args: unknown[]): void;
  child(childTag: string): Logger;
}

export function createLogger(tag: string): Logger {
  const prefix = tag ? `[${tag}]` : '';
  return {
    debug(msg, ...args) { if (shouldLog('debug')) console.debug(prefix, msg, ...args); },
    info(msg, ...args)  { if (shouldLog('info'))  console.log(prefix, msg, ...args); },
    warn(msg, ...args)  { if (shouldLog('warn'))  console.warn(prefix, msg, ...args); },
    error(msg, ...args) { if (shouldLog('error')) console.error(prefix, msg, ...args); },
    child(childTag) { return createLogger(tag ? `${tag}:${childTag}` : childTag); },
  };
}

export const logger = createLogger('');
export default logger;
