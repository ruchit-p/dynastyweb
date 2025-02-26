import type { NextRequest } from 'next/server';

// Create a custom logger for Next.js RSC compatibility
// This avoids the worker thread issues with pino in React Server Components
const createSimpleLogger = (level: string) => {
  const logLevels: Record<string, number> = {
    trace: 10,
    debug: 20,
    info: 30,
    warn: 40,
    error: 50,
    fatal: 60
  };

  const shouldLog = (msgLevel: string): boolean => {
    return logLevels[msgLevel] >= logLevels[level];
  };

  const formatLog = (obj: Record<string, unknown>, msg?: string): Record<string, unknown> => {
    const timestamp = new Date().toISOString();
    return {
      time: timestamp,
      ...obj,
      msg: msg || (obj.msg as string) || ''
    };
  };

  return {
    trace: (obj: Record<string, unknown>, msg?: string) => shouldLog('trace') && console.debug(formatLog(obj, msg)),
    debug: (obj: Record<string, unknown>, msg?: string) => shouldLog('debug') && console.debug(formatLog(obj, msg)),
    info: (obj: Record<string, unknown>, msg?: string) => shouldLog('info') && console.info(formatLog(obj, msg)),
    warn: (obj: Record<string, unknown>, msg?: string) => shouldLog('warn') && console.warn(formatLog(obj, msg)),
    error: (obj: Record<string, unknown>, msg?: string) => shouldLog('error') && console.error(formatLog(obj, msg)),
    fatal: (obj: Record<string, unknown>, msg?: string) => shouldLog('fatal') && console.error(formatLog(obj, msg)),
    child: (bindings: Record<string, unknown>) => {
      const childLogger = createSimpleLogger(level);
      const originalMethods = { ...childLogger };
      
      // Override methods to include bindings
      for (const method of ['trace', 'debug', 'info', 'warn', 'error', 'fatal'] as const) {
        childLogger[method] = (obj: Record<string, unknown>, msg?: string) => {
          return originalMethods[method]({ ...bindings, ...obj }, msg);
        };
      }
      
      return childLogger;
    }
  };
};

// Set the default log level
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Create the base logger instance
const baseLogger = createSimpleLogger(logLevel);

/**
 * Creates a context-aware logger instance for server-side code
 * Automatically adds request information to the logs
 */
export function createServerLogger(name: string) {
  return baseLogger.child({ component: name, side: 'server' });
}

/**
 * Creates a request-scoped logger with request metadata
 */
export function createRequestLogger(req: NextRequest) {
  return baseLogger.child({
    req: {
      method: req.method,
      url: req.url,
      headers: {
        'user-agent': req.headers.get('user-agent'),
        'content-type': req.headers.get('content-type'),
        'accept': req.headers.get('accept'),
      }
    }
  });
}

/**
 * Main server logger with common server-side context
 */
export const logger = baseLogger.child({
  side: 'server',
  runtime: 'node',
});