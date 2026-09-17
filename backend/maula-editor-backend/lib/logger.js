/**
 * Structured Logger for Maula Editor Backend
 * Replaces raw console.log/warn/error with level-aware, tagged logging.
 * - In production: JSON output (machine-parseable for CloudWatch / log aggregators)
 * - In development: colored human-readable output
 */

const isProduction = process.env.NODE_ENV === 'production';

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const MIN_LEVEL = LEVELS[process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug')];

const COLORS = {
  debug: '\x1b[36m',  // cyan
  info:  '\x1b[32m',  // green
  warn:  '\x1b[33m',  // yellow
  error: '\x1b[31m',  // red
  reset: '\x1b[0m',
};

function formatMessage(level, tag, message, meta) {
  if (isProduction) {
    const entry = { level, tag, message, timestamp: new Date().toISOString() };
    if (meta !== undefined) entry.meta = meta;
    return JSON.stringify(entry);
  }
  const ts = new Date().toISOString().slice(11, 23);
  const color = COLORS[level] || '';
  const prefix = tag ? `[${tag}]` : '';
  const metaStr = meta !== undefined ? ` ${typeof meta === 'object' ? JSON.stringify(meta) : meta}` : '';
  return `${color}${ts} ${level.toUpperCase().padEnd(5)} ${prefix} ${message}${metaStr}${COLORS.reset}`;
}

function shouldLog(level) {
  return (LEVELS[level] ?? 1) >= MIN_LEVEL;
}

function createLogger(tag) {
  return {
    debug(msg, meta) { if (shouldLog('debug')) console.debug(formatMessage('debug', tag, msg, meta)); },
    info(msg, meta)  { if (shouldLog('info'))  console.log(formatMessage('info', tag, msg, meta)); },
    warn(msg, meta)  { if (shouldLog('warn'))  console.warn(formatMessage('warn', tag, msg, meta)); },
    error(msg, meta) { if (shouldLog('error')) console.error(formatMessage('error', tag, msg, meta)); },
    child(childTag) { return createLogger(tag ? `${tag}:${childTag}` : childTag); },
  };
}

// Root logger (no tag)
export const logger = createLogger('');

// Named export for tagged loggers
export { createLogger };

export default logger;
