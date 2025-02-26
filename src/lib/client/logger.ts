/**
 * Client-side logger for use in browser environments.
 * Since Pino only works on the server, this logger sends logs to the server via fetch.
 */

// Log levels matching Pino
export enum LogLevel {
  TRACE = 10,
  DEBUG = 20,
  INFO = 30,
  WARN = 40,
  ERROR = 50,
  FATAL = 60
}

// Basic context interface
interface LogContext {
  [key: string]: unknown;
}

/**
 * Create a component-specific logger with pre-defined context
 * 
 * @param component The name of the component or area using the logger
 * @param defaultContext Default context to include with every log
 * @returns An object with logging methods
 */
export function createLogger(component: string, defaultContext: LogContext = {}) {
  // Set up the default context object
  const baseContext = {
    component,
    clientTime: new Date().toISOString(),
    ...defaultContext
  };
  
  /**
   * Send log to server
   */
  const log = async (level: LogLevel, message: string, context: LogContext = {}) => {
    try {
      // Skip DEBUG logs in production to reduce traffic
      if (process.env.NODE_ENV === 'production' && level === LogLevel.DEBUG) {
        return;
      }
      
      // Always show client logs in the browser console in development
      if (process.env.NODE_ENV !== 'production') {
        const method = level >= LogLevel.ERROR ? 'error' : 
                      level >= LogLevel.WARN ? 'warn' :
                      level >= LogLevel.INFO ? 'info' : 'debug';
                      
        console[method](`[${component}] ${message}`, { ...baseContext, ...context });
      }
      
      // Don't make actual API calls during development to reduce noise
      if (process.env.NODE_ENV !== 'production') {
        return;
      }
      
      // In production, send to server logging endpoint
      await fetch('/api/log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          level,
          message,
          context: {
            ...baseContext,
            ...context
          }
        }),
        // Use keepalive to ensure logs are sent even during page navigation
        keepalive: true
      });
    } catch (error) {
      // If logging fails, at least show in console
      console.error('Failed to send log to server:', error);
    }
  };
  
  return {
    trace: (message: string, context?: LogContext) => log(LogLevel.TRACE, message, context),
    debug: (message: string, context?: LogContext) => log(LogLevel.DEBUG, message, context),
    info: (message: string, context?: LogContext) => log(LogLevel.INFO, message, context),
    warn: (message: string, context?: LogContext) => log(LogLevel.WARN, message, context),
    error: (message: string, context?: LogContext) => log(LogLevel.ERROR, message, context),
    fatal: (message: string, context?: LogContext) => log(LogLevel.FATAL, message, context),
  };
}

// Default instance
export default createLogger('client'); 