#!/bin/bash

# Script untuk set environment variables di Vercel
# Run: ./setup-vercel-env.sh

echo "Setting up Vercel Environment Variables..."
echo ""

# Database URL (Neon)
vercel env add DATABASE_URL production <<EOF
postgresql://neondb_owner:npg_bmUMJVGZ0l3e@ep-dawn-cloud-a1fqnvgi-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
EOF

# Connector API Key
vercel env add CONNECTOR_API_KEY production <<EOF
test-api-key-12345
EOF

# Query Timeout
vercel env add QUERY_TIMEOUT production <<EOF
30000
EOF

echo ""
echo "✓ Environment variables set!"
echo ""
echo "Now redeploy:"
echo "  vercel --prod"
