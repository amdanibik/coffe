#!/bin/bash

# Test MySQL Connector Endpoint
# This script tests the MySQL database connector after deployment

BASE_URL="https://coffee-git-main-amdanibiks-projects.vercel.app"
API_KEY="test-api-key-12345"

echo "=================================================="
echo "  Testing MySQL Database Connector              "
echo "=================================================="
echo ""
echo "Base URL: $BASE_URL"
echo "Testing MySQL endpoint: $BASE_URL/mysql"
echo ""

# Test 1: GET /mysql - Connector Info
echo "---------------------------------------------------"
echo "Test 1: GET /mysql (Connector Info)"
echo "---------------------------------------------------"
curl -s -X GET "$BASE_URL/mysql?apiKey=$API_KEY" | jq . || curl -s -X GET "$BASE_URL/mysql?apiKey=$API_KEY"
echo ""
echo ""

# Test 2: POST /mysql - Test Connection
echo "---------------------------------------------------"
echo "Test 2: POST /mysql (Test Connection)"
echo "---------------------------------------------------"
curl -s -X POST "$BASE_URL/mysql" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq . || \
curl -s -X POST "$BASE_URL/mysql" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo ""
echo ""

# Test 3: GET /mysql/connector/metadata
echo "---------------------------------------------------"
echo "Test 3: GET /mysql/connector/metadata"
echo "---------------------------------------------------"
curl -s -X GET "$BASE_URL/mysql/connector/metadata" | jq . || curl -s -X GET "$BASE_URL/mysql/connector/metadata"
echo ""
echo ""

# Test 4: POST /mysql/execute - Execute Query
echo "---------------------------------------------------"
echo "Test 4: POST /mysql/execute (Execute Query)"
echo "---------------------------------------------------"
curl -s -X POST "$BASE_URL/mysql/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT 1 as test, NOW() as timestamp"
  }' | jq . || \
curl -s -X POST "$BASE_URL/mysql/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT 1 as test, NOW() as timestamp"
  }'
echo ""
echo ""

# Test 5: GET /mysql/introspect - Database Schema
echo "---------------------------------------------------"
echo "Test 5: GET /mysql/introspect (Database Schema)"
echo "---------------------------------------------------"
curl -s -X GET "$BASE_URL/mysql/introspect?apiKey=$API_KEY" | jq '.data.tables[] | {name: .name, columns: .columns | length}' || \
curl -s -X GET "$BASE_URL/mysql/introspect?apiKey=$API_KEY"
echo ""
echo ""

echo "=================================================="
echo "  Testing MongoDB Database Connector            "
echo "=================================================="
echo ""

# Test 6: POST /mongo - Test Connection
echo "---------------------------------------------------"
echo "Test 6: POST /mongo (Test Connection)"
echo "---------------------------------------------------"
curl -s -X POST "$BASE_URL/mongo" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" | jq . || \
curl -s -X POST "$BASE_URL/mongo" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"
echo ""
echo ""

echo "=================================================="
echo "  Test Complete                                  "
echo "=================================================="
echo ""
echo "Expected Results:"
echo "✅ Test 1-2: Should return connector info and connection status"
echo "✅ Test 3: Should return metadata"
echo "✅ Test 4: Should execute simple SELECT query"
echo "✅ Test 5: Should return database schema"
echo "✅ Test 6: Should test MongoDB connection"
echo ""
echo "If you see errors, check:"
echo "1. Environment variables are set in Vercel"
echo "2. MySQL/MongoDB credentials are correct"
echo "3. Database server allows connections from Vercel IPs"
echo ""
