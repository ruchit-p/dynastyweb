#!/bin/bash
# Script to deploy all Edge Functions to Supabase

# Set your Supabase project reference
# Replace with your actual project reference or set as environment variable
PROJECT_REF=${SUPABASE_PROJECT_REF:-"your-project-ref"}

# Ensure Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "Not logged in to Supabase. Please run 'supabase login' first."
    exit 1
fi

echo "Deploying Edge Functions to Supabase project: $PROJECT_REF"
echo "===================================================="

# Deploy each function
function deploy_function() {
    local function_name=$1
    echo "Deploying $function_name..."
    
    # Run from the supabase directory
    cd ../supabase
    
    # Deploy the function
    supabase functions deploy $function_name --project-ref $PROJECT_REF
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully deployed $function_name"
    else
        echo "❌ Failed to deploy $function_name"
        exit 1
    fi
    
    # Return to the scripts directory
    cd ../dynastyweb/scripts
}

# Deploy shared resources first
echo "Copying shared resources..."
cd ../supabase
supabase functions deploy --project-ref $PROJECT_REF --no-verify-jwt

# Deploy individual functions
deploy_function "get-family-tree"
deploy_function "update-family-relationships" 
deploy_function "create-family-member"
deploy_function "delete-family-member"

echo "===================================================="
echo "All Edge Functions deployed successfully!"
echo "You can test them with:"
echo "supabase functions serve --no-verify-jwt"