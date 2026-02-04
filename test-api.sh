#!/bin/bash

# Coffee Database Connector API Test Script
# Make sure the server is running before executing this script

API_KEY="test-api-key-12345"
BASE_URL="http://localhost:3000"

echo "=================================="
echo "Coffee Database Connector API Test"
echo "=================================="
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test 1: Service Info
echo -e "${BLUE}Test 1: Service Info${NC}"
curl -s "$BASE_URL/" | jq '.'
echo ""
echo ""

# Test 2: Test Connection
echo -e "${BLUE}Test 2: Test Database Connection${NC}"
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  "$BASE_URL/api/test-connection" | jq '.'
echo ""
echo ""

# Test 3: Get Configuration
echo -e "${BLUE}Test 3: Get Configuration${NC}"
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/api/configuration" | jq '.'
echo ""
echo ""

# Test 4: Get All Tenants
echo -e "${BLUE}Test 4: Get All Tenants${NC}"
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/api/tenants" | jq '.'
echo ""
echo ""

# Test 5: Get Orders (first 5)
echo -e "${BLUE}Test 5: Get Orders (First 5)${NC}"
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/api/orders?limit=5" | jq '.'
echo ""
echo ""

# Test 6: Get Orders by Tenant HQ
echo -e "${BLUE}Test 6: Get Orders by Tenant HQ${NC}"
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/api/orders?tenant_id=11111111-1111-1111-1111-111111111111&limit=3" | jq '.'
echo ""
echo ""

# Test 7: Get Statistics
echo -e "${BLUE}Test 7: Get Statistics${NC}"
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/api/statistics" | jq '.'
echo ""
echo ""

# Test 8: Get Popular Products
echo -e "${BLUE}Test 8: Get Popular Products (Top 5)${NC}"
curl -s -H "X-API-Key: $API_KEY" \
  "$BASE_URL/api/products/popular?limit=5" | jq '.'
echo ""
echo ""

# Test 9: Execute Custom Query
echo -e "${BLUE}Test 9: Execute Custom Query${NC}"
curl -s -X POST \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) as total_orders, SUM(total) as total_revenue FROM orders"}' \
  "$BASE_URL/api/query" | jq '.'
echo ""
echo ""

# Test 10: Error - Missing API Key
echo -e "${BLUE}Test 10: Error Handling - Missing API Key${NC}"
curl -s "$BASE_URL/api/tenants" | jq '.'
echo ""
echo ""

echo -e "${GREEN}All tests completed!${NC}"
