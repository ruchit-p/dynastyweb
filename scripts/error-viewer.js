#!/usr/bin/env node

/**
 * This is a simple error log viewer that can be connected to 
 * the MCP server for monitoring errors in your Next.js application.
 * 
 * Run with: node scripts/error-viewer.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const LOG_DIR = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'error.log');
const MCP_TAG = 'MCP Error Report';

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Create log file if it doesn't exist
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(LOG_FILE, '', 'utf8');
}

// Setup log watcher
console.log('Error viewer started. Watching for errors...');
console.log('Press Ctrl+C to exit');
console.log('---------------------------------------------');

// Find errors in logs periodically
let lastPosition = 0;

function checkForNewErrors() {
  try {
    const stats = fs.statSync(LOG_FILE);
    
    if (stats.size > lastPosition) {
      // There's new content in the log file
      const stream = fs.createReadStream(LOG_FILE, {
        start: lastPosition,
        end: stats.size
      });
      
      const lineReader = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
      });
      
      lineReader.on('line', (line) => {
        try {
          const logEntry = JSON.parse(line);
          
          // Check if this is an error and if it's tagged for MCP
          if (logEntry.level >= 50) { // 50 is the "error" level in Pino
            displayError(logEntry);
          }
        } catch (err) {
          // Not JSON or not parseable, ignore
        }
      });
      
      lineReader.on('close', () => {
        lastPosition = stats.size;
      });
    }
  } catch (error) {
    console.error('Error reading log file:', error.message);
  }
}

function displayError(logEntry) {
  const timestamp = new Date().toISOString();
  
  console.log('\n\x1b[31m=== ERROR DETECTED ===\x1b[0m');
  console.log(`Time: ${timestamp}`);
  
  if (logEntry.msg) {
    console.log(`Message: ${logEntry.msg}`);
  }
  
  if (logEntry.error) {
    console.log(`Name: ${logEntry.error.name || 'Error'}`);
    console.log(`Message: ${logEntry.error.message}`);
    
    if (logEntry.error.stack) {
      console.log('\nStack Trace:');
      console.log(logEntry.error.stack);
    }
  }
  
  // Additional context
  if (logEntry.mcp) {
    console.log('\n\x1b[33m[MCP TAGGED ERROR]\x1b[0m');
  }
  
  // Remove error and standard fields to show remaining context
  const context = { ...logEntry };
  delete context.error;
  delete context.level;
  delete context.time;
  delete context.msg;
  delete context.mcp;
  
  if (Object.keys(context).length > 0) {
    console.log('\nAdditional Context:');
    console.log(JSON.stringify(context, null, 2));
  }
  
  console.log('\x1b[31m======================\x1b[0m\n');
}

// Start checking every second
setInterval(checkForNewErrors, 1000);

// Route the logs to the error log file
process.on('SIGINT', () => {
  console.log('\nError viewer stopped');
  process.exit(0);
}); 