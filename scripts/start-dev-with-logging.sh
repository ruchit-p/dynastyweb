#!/bin/bash

# Create logs directory if it doesn't exist
mkdir -p logs

# Start Next.js with error logging
echo "Starting Next.js development server with error tracking..."
next dev | pino-pretty | tee -a logs/app.log &
NEXT_PID=$!

# Start error viewer in a new terminal window
echo "Starting error viewer..."
osascript -e 'tell app "Terminal" to do script "cd '$PWD' && node scripts/error-viewer.js"'

# Wait for Next.js to exit
wait $NEXT_PID 