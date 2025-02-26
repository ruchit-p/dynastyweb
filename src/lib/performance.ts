import logger from './logger';

/**
 * Utility function to measure and log the performance of operations.
 * 
 * @param operationName Name of the operation being measured
 * @param context Additional context to include in the log
 * @returns A function that, when called, will end the measurement and log the result
 */
export function measureOperation(operationName: string, context: Record<string, unknown> = {}) {
  const startTime = Date.now();
  
  return () => {
    const executionTime = Date.now() - startTime;
    
    logger.info({
      msg: `${operationName} completed`,
      executionTime: `${executionTime}ms`,
      operation: operationName,
      ...context,
    });
    
    return executionTime;
  };
}

/**
 * Async wrapper to measure the performance of an asynchronous function.
 * 
 * @param operationName Name of the operation being measured
 * @param fn Async function to measure
 * @param context Additional context to include in the log
 * @returns The result of the async function
 */
export async function measureAsync<T>(
  operationName: string, 
  fn: () => Promise<T>,
  context: Record<string, unknown> = {}
): Promise<T> {
  const endMeasurement = measureOperation(operationName, context);
  
  try {
    const result = await fn();
    endMeasurement();
    return result;
  } catch (error) {
    const executionTime = endMeasurement();
    
    logger.error({
      msg: `${operationName} failed`,
      executionTime: `${executionTime}ms`,
      operation: operationName,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      ...context,
    });
    
    throw error;
  }
}

/**
 * Handler function for API and server component measurements.
 * Logs performance metrics for API endpoints and server components.
 * 
 * @param operationName Name of the operation or endpoint
 * @param context Additional context such as request details
 * @returns Object with start and end functions
 */
export function apiPerformanceHandler(operationName: string, context: Record<string, unknown> = {}) {
  const startTime = Date.now();
  let finished = false;
  
  // Log start of operation
  logger.debug({
    msg: `${operationName} started`,
    operation: operationName,
    ...context,
  });
  
  return {
    end: (outcome: 'success' | 'error' = 'success', additionalContext: Record<string, unknown> = {}) => {
      if (finished) return;
      
      const executionTime = Date.now() - startTime;
      finished = true;
      
      logger.info({
        msg: `${operationName} ${outcome === 'success' ? 'completed' : 'failed'}`,
        executionTime: `${executionTime}ms`,
        operation: operationName,
        outcome,
        ...context,
        ...additionalContext,
      });
      
      return executionTime;
    }
  };
} 