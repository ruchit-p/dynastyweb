# Production Logging Setup Guide

This guide covers how to set up log rotation, storage, and analysis for DynastyWeb in production environments.

## Table of Contents

1. [Overview](#overview)
2. [Log Rotation with Pino-roll](#log-rotation-with-pino-roll) 
3. [Centralized Log Storage](#centralized-log-storage)
4. [Log Analysis Tools](#log-analysis-tools)
5. [Security and Compliance](#security-and-compliance)
6. [Backup Strategies](#backup-strategies)

## Overview

In a production environment, proper log management is essential for:

- **Performance monitoring**: Track API response times and application bottlenecks
- **Error detection**: Identify and fix issues quickly
- **Security**: Detect unauthorized access attempts
- **User behavior analysis**: Understand how users interact with the application
- **Audit trails**: Maintain records for compliance and troubleshooting

This guide provides step-by-step instructions for setting up a robust logging infrastructure.

## Log Rotation with Pino-roll

For production, we'll use `pino-roll` for log rotation to prevent log files from growing indefinitely.

### Installation

```bash
npm install pino-roll --save-prod
```

### Configuration

Create a new file `src/lib/production-logger.ts`:

```typescript
import pino from 'pino';
import { join } from 'path';

// Define log directory - ensure this path exists and is writable
const LOG_DIR = process.env.LOG_DIR || join(process.cwd(), 'logs');

// Configure production transport
const transport = pino.transport({
  targets: [
    // Console output for immediate visibility
    {
      target: 'pino-pretty',
      level: 'info',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
      },
    },
    // File output with rotation
    {
      target: 'pino-roll',
      level: 'debug',
      options: {
        dir: LOG_DIR,
        file: 'dynasty-app.log',
        size: '10m',          // Rotate at 10 MB
        interval: '1d',       // Also rotate daily
        maxFiles: 7,          // Keep 7 days of logs
        mkdir: true,          // Create directory if it doesn't exist
        compress: 'gzip',     // Compress rotated files
      },
    },
    // Critical errors to a separate file
    {
      target: 'pino-roll',
      level: 'error',
      options: {
        dir: LOG_DIR,
        file: 'dynasty-errors.log',
        size: '10m',
        interval: '1d',
        maxFiles: 30,         // Keep 30 days of error logs
        mkdir: true,
        compress: 'gzip',
      },
    },
  ],
});

// Create the logger
const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    redact: {
      paths: [
        'password',
        'email',
        '*.password',
        '*.email',
        'req.headers.authorization',
        'req.headers.cookie',
      ],
      censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => {
        return { level: label };
      },
    },
    base: {
      env: process.env.NODE_ENV,
      app: 'dynastyweb',
    },
  },
  transport
);

export default logger;
```

### Update Script

Update the start script in `package.json`:

```json
{
  "scripts": {
    "start": "next start",
    "start:prod": "NODE_ENV=production next start"
  }
}
```

### Environment Variables

Add to your `.env.production`:

```
LOG_LEVEL=info
LOG_DIR=/path/to/logs
```

## Centralized Log Storage

For a more scalable solution, you can send logs to a centralized log management service.

### Option 1: AWS CloudWatch

1. Install AWS SDK:

```bash
npm install @aws-sdk/client-cloudwatch-logs pino-cloudwatch-transport --save-prod
```

2. Create `src/lib/cloudwatch-logger.ts`:

```typescript
import pino from 'pino';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';

const cloudwatchClient = new CloudWatchLogsClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      level: 'info',
      options: {
        colorize: true,
      },
    },
    {
      target: 'pino-cloudwatch-transport',
      level: 'debug',
      options: {
        cloudWatchClient,
        logGroupName: process.env.AWS_CLOUDWATCH_GROUP || '/dynastyweb/app',
        logStreamName: `${process.env.NODE_ENV}-${new Date().toISOString().substring(0, 10)}`,
        awsRegion: process.env.AWS_REGION || 'us-east-1',
        batchSize: 10,
        interval: 2000,
      },
    },
  ],
});

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: [/* sensitive fields */],
}, transport);

export default logger;
```

### Option 2: Elasticsearch + Kibana (ELK Stack)

1. Install dependencies:

```bash
npm install pino-elasticsearch --save-prod
```

2. Create `src/lib/elk-logger.ts`:

```typescript
import pino from 'pino';

const transport = pino.transport({
  targets: [
    {
      target: 'pino-pretty',
      level: 'info',
      options: {
        colorize: true,
      },
    },
    {
      target: 'pino-elasticsearch',
      level: 'debug',
      options: {
        node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
        index: 'dynastyweb-logs',
        flushBytes: 1000,
        flushInterval: 5000,
        mappingTemplate: {
          index_patterns: ['dynastyweb-*'],
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1,
          },
        },
      },
    },
  ],
});

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: [/* sensitive fields */],
}, transport);

export default logger;
```

## Log Analysis Tools

### Kibana Dashboard

If using the ELK stack, create a Kibana dashboard:

1. Log into Kibana
2. Create index pattern for `dynastyweb-*`
3. Create visualizations for:
   - Error rates over time
   - API performance metrics
   - Auth success/failure rates
   - User activity patterns

### Custom Log Analysis Script

Create a script for analyzing logs stored on the server:

```javascript
// scripts/analyze-logs.js
const fs = require('fs');
const readline = require('readline');
const path = require('path');

async function analyzeLogFile(logFile) {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const stats = {
    totalLines: 0,
    errorCount: 0,
    apiCalls: 0,
    slowRequests: 0, // requests taking over 1000ms
    authFails: 0
  };

  for await (const line of rl) {
    stats.totalLines++;
    try {
      const logEntry = JSON.parse(line);
      
      // Count errors
      if (logEntry.level >= 50) {
        stats.errorCount++;
      }
      
      // Count API calls
      if (logEntry.msg && logEntry.msg.startsWith('GET /api/') || 
          logEntry.msg.startsWith('POST /api/')) {
        stats.apiCalls++;
        
        // Count slow requests
        if (logEntry.executionTime && parseInt(logEntry.executionTime) > 1000) {
          stats.slowRequests++;
        }
      }
      
      // Count auth failures
      if (logEntry.msg && (
          logEntry.msg.includes('Authentication failed') || 
          logEntry.msg.includes('auth_error') ||
          logEntry.msg.includes('Unauthorized')
      )) {
        stats.authFails++;
      }
    } catch (e) {
      // Skip non-JSON lines
    }
  }

  return stats;
}

async function main() {
  const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs');
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  const logFile = path.join(logDir, `dynasty-app.log.${dateStr}.gz`);
  
  if (fs.existsSync(logFile)) {
    console.log(`Analyzing logs for ${dateStr}...`);
    const stats = await analyzeLogFile(logFile);
    console.log(stats);
  } else {
    console.log(`No log file found for ${dateStr}`);
  }
}

main().catch(console.error);
```

## Security and Compliance

### Log Retention Policy

Implement a log retention policy based on your organization's requirements:

```bash
# Remove logs older than X days
find /path/to/logs -name "*.gz" -type f -mtime +90 -delete
```

### PII Handling

Ensure that all Personally Identifiable Information (PII) is redacted in logs:

```typescript
// src/lib/logger.ts - Update the redact configuration
redact: {
  paths: [
    'password',
    'email', 
    'phoneNumber',
    'address',
    'creditCard',
    'socialSecurityNumber',
    // Add any other PII fields
  ],
  censor: '[REDACTED]'
}
```

## Backup Strategies

### Log Backup Script

Create a script to backup logs to a secure storage:

```bash
#!/bin/bash
# scripts/backup-logs.sh

LOG_DIR=${LOG_DIR:-"./logs"}
BACKUP_DIR=${BACKUP_DIR:-"./backups/logs"}
DATE=$(date +"%Y-%m-%d")

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Archive logs
tar -czf "$BACKUP_DIR/logs-$DATE.tar.gz" "$LOG_DIR"

# Optional: Upload to S3 or other storage
if [ -n "$S3_BUCKET" ]; then
  aws s3 cp "$BACKUP_DIR/logs-$DATE.tar.gz" "s3://$S3_BUCKET/logs/"
fi

# Cleanup old backups (keep last 30 days)
find "$BACKUP_DIR" -name "logs-*.tar.gz" -type f -mtime +30 -delete
```

Make the script executable:

```bash
chmod +x scripts/backup-logs.sh
```

Add it to crontab to run daily:

```
0 1 * * * /path/to/app/scripts/backup-logs.sh
```

## Conclusion

With these configurations in place, your production logging system will be able to handle the volume of logs generated by the DynastyWeb application while providing effective tools for monitoring, troubleshooting, and analysis.

The combination of log rotation, centralized storage, analysis tools, and security measures creates a robust logging infrastructure that scales with your application and meets standard compliance requirements. 