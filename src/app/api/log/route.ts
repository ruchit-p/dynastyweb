import { NextRequest, NextResponse } from 'next/server';
import logger from '@/lib/logger';
import { apiPerformanceHandler } from '@/lib/performance';

// Define allowed log levels
const ALLOWED_LOG_LEVELS = [10, 20, 30, 40, 50, 60]; // trace, debug, info, warn, error, fatal

// Map numeric levels to Pino log method names
const LOG_LEVEL_METHODS: Record<number, keyof typeof logger> = {
  10: 'trace',
  20: 'debug',
  30: 'info',
  40: 'warn',
  50: 'error',
  60: 'fatal'
};

export async function POST(request: NextRequest) {
  const perfHandler = apiPerformanceHandler('POST /api/log');

  try {
    // Parse the log data from the request
    const logData = await request.json();
    
    if (!logData || typeof logData !== 'object') {
      perfHandler.end('error', { error: 'invalid_request' });
      return NextResponse.json(
        { error: 'Invalid log format' },
        { status: 400 }
      );
    }
    
    const { level, message, context } = logData;
    
    // Validate log level
    if (!ALLOWED_LOG_LEVELS.includes(level)) {
      perfHandler.end('error', { error: 'invalid_log_level' });
      return NextResponse.json(
        { error: 'Invalid log level' },
        { status: 400 }
      );
    }
    
    // Validate message
    if (typeof message !== 'string' || message.trim() === '') {
      perfHandler.end('error', { error: 'invalid_message' });
      return NextResponse.json(
        { error: 'Invalid log message' },
        { status: 400 }
      );
    }
    
    // Validate context
    if (context && typeof context !== 'object') {
      perfHandler.end('error', { error: 'invalid_context' });
      return NextResponse.json(
        { error: 'Invalid log context' },
        { status: 400 }
      );
    }
    
    // Log using Pino with the appropriate level
    const logMethod = LOG_LEVEL_METHODS[level];
    if (!logMethod) {
      // Fallback to info if level mapping not found (shouldn't happen)
      logger.info({ 
        msg: message,
        clientLog: true,
        ...context
      });
    } else {
      // Call the appropriate level method
      logger[logMethod]({
        msg: message,
        clientLog: true,
        ...context
      });
    }
    
    perfHandler.end('success');
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log internal error using Pino
    logger.error({
      msg: 'Error processing client log',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/api/log'
    });
    
    perfHandler.end('error', { error: 'server_error' });
    return NextResponse.json(
      { error: 'Failed to process log' },
      { status: 500 }
    );
  }
} 