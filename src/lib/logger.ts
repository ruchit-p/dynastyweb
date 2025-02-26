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
    const formattedObj: Record<string, unknown> = { time: timestamp };
    
    // Process each property to ensure proper formatting
    for (const [key, value] of Object.entries(obj)) {
      // Special handling for error objects
      if (key === 'error' && value !== null && typeof value === 'object') {
        if (value instanceof Error) {
          formattedObj[key] = {
            message: value.message,
            stack: value.stack,
            name: value.name
          };
        } else if ('message' in value || 'code' in value) {
          // Handle error-like objects with message/code properties
          formattedObj[key] = value;
        } else {
          // For other objects, ensure they're stringified properly
          try {
            formattedObj[key] = JSON.stringify(value);
          } catch (e) {
            // Log the stringification error if debugging is needed
            formattedObj[key] = `[Object that cannot be stringified: ${e instanceof Error ? e.message : String(e)}]`;
          }
        }
      } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        // Safely stringify other complex objects
        try {
          formattedObj[key] = JSON.stringify(value);
        } catch (e) {
          // Log the stringification error if debugging is needed
          formattedObj[key] = `[Complex object that cannot be serialized: ${e instanceof Error ? e.message : String(e)}]`;
        }
      } else {
        formattedObj[key] = value;
      }
    }
    
    // Add message
    formattedObj.msg = msg || (obj.msg as string) || '';
    
    return formattedObj;
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

// Set default log level based on environment
const logLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info';

// Create base logger
const baseLogger = createSimpleLogger(logLevel);

/**
 * Track errors with structured information
 */
export function trackError(error: Error, metadata: Record<string, unknown> = {}) {
  const logger = baseLogger.child({ 
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...metadata
  });
  
  logger.error({}, 'Error tracked');
  return error;
}

/**
 * Log errors to MCP server
 */
export function logErrorToMCPServer(error: Error, metadata: Record<string, unknown> = {}) {
  console.error('Error logged to MCP server:', error, metadata);
}

// Export the base logger
export const logger = baseLogger.child({ side: 'client' });

// Add default export for backward compatibility
export default logger; 