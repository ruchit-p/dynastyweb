#!/bin/bash
# Script to switch between local and production Supabase environments

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

ENV_PATH="../.env.local"

print_usage() {
  echo -e "${YELLOW}Usage:${NC} ./switch-env.sh [local|prod]"
  echo "  local - Switch to local Supabase environment"
  echo "  prod  - Switch to production Supabase environment"
}

# Check if argument is provided
if [ $# -eq 0 ]; then
  echo -e "${RED}Error:${NC} No environment specified."
  print_usage
  exit 1
fi

case "$1" in
  local)
    echo -e "${GREEN}Switching to local Supabase environment...${NC}"
    
    # Local environment variables
    cat > $ENV_PATH << EOF
# Local Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
SUPABASE_DB_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres

# App URL for local development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Storage configuration
S3_STORAGE_URL=http://127.0.0.1:54321/storage/v1/s3
S3_ACCESS_KEY=625729a08b95bf1b7ff351a663f3a23c
S3_SECRET_KEY=850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907
S3_REGION=local

# JWT Secret for local development
JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long
EOF
    
    echo -e "${GREEN}Successfully switched to local environment!${NC}"
    echo -e "Make sure to restart your development server with: ${YELLOW}npm run dev${NC}"
    echo -e "And ensure your local Supabase instance is running with: ${YELLOW}npm run supabase:start${NC}"
    ;;
    
  prod)
    echo -e "${GREEN}Switching to production Supabase environment...${NC}"
    
    # Production environment variables
    cat > $ENV_PATH << EOF
# Production Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://rsudaifcxguxrekbczxz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJzdWRhaWZjeGd1eHJla2Jjenh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAzNDQ1OTQsImV4cCI6MjA1NTkyMDU5NH0.14InwGRgL-VBv2rw4ZCjCpVj_JOv79-u6_waGJ6Fa9Q

# App URL for production
NEXT_PUBLIC_APP_URL=https://mydynastyapp.com

# Development mode override
NODE_ENV=production
EOF
    
    echo -e "${GREEN}Successfully switched to production environment!${NC}"
    echo -e "Make sure to restart your development server with: ${YELLOW}npm run dev:prod${NC}"
    ;;
    
  *)
    echo -e "${RED}Error:${NC} Invalid environment '$1'."
    print_usage
    exit 1
    ;;
esac