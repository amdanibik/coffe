#!/bin/bash

# Test Multi-Database Connector Endpoints
VERCEL_URL="https://coffee-sage-one.vercel.app"
API_KEY="${CONNECTOR_API_KEY}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Testing Multi-Database Coffee Connector          ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "🌐 URL: $VERCEL_URL"
echo ""

if [ -z "$API_KEY" ]; then
  echo "⚠️  Warning: CONNECTOR_API_KEY not set in environment"
  read -p "Enter API Key: " API_KEY
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Testing Service Info (No Auth)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$VERCEL_URL/" | jq '.' || curl -s "$VERCEL_URL/"

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Testing Health Endpoint"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$VERCEL_URL/health" | jq '.' || curl -s "$VERCEL_URL/health"

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing PostgreSQL Connection"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$VERCEL_URL/api/test-connection" \
  -H "X-API-Key: $API_KEY" | jq '.' || curl -s -X POST "$VERCEL_URL/api/test-connection" -H "X-API-Key: $API_KEY"

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Testing PostgreSQL Query Execution"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$VERCEL_URL/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 3"
  }' | jq '.' || curl -s -X POST "$VERCEL_URL/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM tenants LIMIT 3"}'

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Testing MySQL Connector Metadata"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$VERCEL_URL/mysql/connector/metadata" | jq '.' || curl -s "$VERCEL_URL/mysql/connector/metadata"

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Testing MySQL Connection (if configured)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$VERCEL_URL/mysql/api/test-connection" \
  -H "X-API-Key: $API_KEY" | jq '.' || curl -s -X POST "$VERCEL_URL/mysql/api/test-connection" -H "X-API-Key: $API_KEY"

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Testing MongoDB Connector Metadata"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s "$VERCEL_URL/mongo/connector/metadata" | jq '.' || curl -s "$VERCEL_URL/mongo/connector/metadata"

echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  Testing MongoDB Connection (if configured)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
curl -s -X POST "$VERCEL_URL/mongo/api/test-connection" \
  -H "X-API-Key: $API_KEY" | jq '.' || curl -s -X POST "$VERCEL_URL/mongo/api/test-connection" -H "X-API-Key: $API_KEY"

echo ""
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                   Tests Complete                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "📝 Note:"
echo "   - PostgreSQL should work if DATABASE_URL is configured"
echo "   - MySQL tests will fail if MYSQL_DATABASE_URL is not configured"
echo "   - MongoDB tests will fail if MONGODB_URL is not configured"
echo ""
echo "🔧 To configure databases in Vercel:"
echo "   1. Go to: https://vercel.com/amdanibiks-projects/coffee/settings/environment-variables"
echo "   2. Add the following environment variables:"
echo "      - MYSQL_DATABASE_URL (for MySQL)"
echo "      - MONGODB_URL (for MongoDB)"
echo "      - MONGODB_DATABASE (for MongoDB)"
echo ""
echo "🚀 Vercel URL: $VERCEL_URL"
echo ""
