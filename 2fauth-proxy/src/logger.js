// Simple logger with timestamps
// Does not log sensitive information like passwords, tokens, or secrets

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel = LOG_LEVELS[process.env.LOG_LEVEL || 'info'];

function formatTimestamp() {
  return new Date().toISOString();
}

function sanitize(message) {
  // Remove any potential sensitive data from log messages
  if (typeof message !== 'string') {
    message = String(message);
  }

  // Patterns to redact
  const patterns = [
    // Passwords
    /(password["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi,
    // Tokens
    /(token["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi,
    // Secrets
    /(secret["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi,
    // Authorization headers
    /(authorization["']?\s*[:=]\s*["']?bearer\s+)[^"'\s,}]+/gi,
    // API keys
    /(api[-_]?key["']?\s*[:=]\s*["']?)[^"'\s,}]+/gi,
  ];

  let sanitized = message;
  for (const pattern of patterns) {
    sanitized = sanitized.replace(pattern, '$1[REDACTED]');
  }

  return sanitized;
}

function log(level, message, ...args) {
  if (LOG_LEVELS[level] >= currentLevel) {
    const timestamp = formatTimestamp();
    const levelUpper = level.toUpperCase().padEnd(5);
    const sanitizedMessage = sanitize(message);
    const sanitizedArgs = args.map((arg) => {
      if (typeof arg === 'object') {
        try {
          return sanitize(JSON.stringify(arg));
        } catch {
          return '[Object]';
        }
      }
      return sanitize(String(arg));
    });

    console.log(`[${timestamp}] [${levelUpper}] ${sanitizedMessage}`, ...sanitizedArgs);
  }
}

module.exports = {
  debug: (message, ...args) => log('debug', message, ...args),
  info: (message, ...args) => log('info', message, ...args),
  warn: (message, ...args) => log('warn', message, ...args),
  error: (message, ...args) => log('error', message, ...args),

  // Log HTTP request (sanitized)
  request: (method, path, status, duration) => {
    const statusEmoji = status >= 400 ? '❌' : status >= 300 ? '↪️' : '✅';
    log('info', `${statusEmoji} ${method} ${path} - ${status} (${duration}ms)`);
  },
};
