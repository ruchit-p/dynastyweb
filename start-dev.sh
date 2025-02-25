#!/bin/bash

# Start the development server for the DynastyWeb application
echo "Starting DynastyWeb development server..."

# Make sure we're in the project root directory
cd "$(dirname "$0")"

# Start the Next.js development server
npm run dev 