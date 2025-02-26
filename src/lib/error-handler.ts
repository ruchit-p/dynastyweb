import { trackError, logErrorToMCPServer } from './logger';

interface ErrorWithCode extends Error {
  code?: string;
  statusCode?: number;
}

class AppError extends Error {
  code: string;
  statusCode: number;
  
  constructor(message: string, code = 'APP_ERROR', statusCode = 500) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

// Database connection error
class DatabaseError extends AppError {
  constructor(message: string) {
    super(message, 'DATABASE_ERROR', 503);
    this.name = 'DatabaseError';
  }
}

// Authentication errors
class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

// Not found errors
class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 'NOT_FOUND', 404);
    this.name = 'NotFoundError';
  }
}

// Handle errors and log them appropriately
const handleError = async (error: ErrorWithCode, context?: Record<string, unknown>) => {
  // Track all errors
  trackError(error, context);
  
  // Send critical errors to MCP
  const isCritical = error.code === 'DATABASE_ERROR' || 
                    error.statusCode === 500 ||
                    error instanceof DatabaseError;
  
  if (isCritical) {
    await logErrorToMCPServer(error, context);
  }
  
  // Return formatted error for API responses
  return {
    message: error.message,
    code: error.code || 'UNKNOWN_ERROR',
    statusCode: error.statusCode || 500
  };
};

export {
  AppError,
  DatabaseError,
  AuthError,
  NotFoundError,
  handleError
}; 