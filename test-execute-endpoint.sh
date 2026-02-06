#!/bin/bash

# Test script for /execute endpoint
# Tests the new BizCopilot-compatible endpoint

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app}"
API_KEY="${API_KEY:-}"

echo "=================================="
echo "Coffee /execute Endpoint Test"
echo "=================================="
echo ""

# Check if API key is set
if [ -z "$API_KEY" ]; then
    echo -e "${YELLOW}Warning: API_KEY not set. Reading from .env file...${NC}"
    if [ -f .env ]; then
        export $(grep -v '^#' .env | xargs)
        API_KEY="${CONNECTOR_API_KEY}"
    fi
    
    if [ -z "$API_KEY" ]; then
        echo -e "${RED}Error: API_KEY is required${NC}"
        echo "Usage: API_KEY=your-key ./test-execute-endpoint.sh"
        echo "Or set CONNECTOR_API_KEY in .env file"
        exit 1
    fi
fi

echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test 1: Simple SELECT query
echo -e "${YELLOW}Test 1: Simple SELECT query${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "query": "SELECT 1 as test, '\''Hello BizCopilot'\'' as message",
    "query_type": "sql",
    "database_type": "postgresql",
    "request_id": "test-001"
  }')

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 1 passed${NC}"
else
    echo -e "${RED}✗ Test 1 failed${NC}"
    exit 1
fi
echo ""

# Test 2: Query with tenants table
echo -e "${YELLOW}Test 2: Query tenants table${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 3",
    "query_type": "sql",
    "database_type": "postgresql",
    "request_id": "test-002"
  }')

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 2 passed${NC}"
    TENANT_COUNT=$(echo "$RESPONSE" | jq '.data | length')
    echo "  Retrieved $TENANT_COUNT tenants"
else
    echo -e "${RED}✗ Test 2 failed${NC}"
    exit 1
fi
echo ""

# Test 3: Query with JOIN
echo -e "${YELLOW}Test 3: Query with JOIN${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "query": "SELECT o.id, o.order_number, t.tenant_name FROM orders o JOIN tenants t ON o.tenant_id = t.id LIMIT 5",
    "query_type": "sql",
    "database_type": "postgresql",
    "request_id": "test-003"
  }')

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 3 passed${NC}"
    ORDER_COUNT=$(echo "$RESPONSE" | jq '.data | length')
    echo "  Retrieved $ORDER_COUNT orders with tenant names"
else
    echo -e "${RED}✗ Test 3 failed${NC}"
    exit 1
fi
echo ""

# Test 4: Without API key (should fail)
echo -e "${YELLOW}Test 4: Without API key (should fail)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/execute" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT 1",
    "query_type": "sql"
  }')

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ Test 4 passed (correctly rejected)${NC}"
    echo "  HTTP Status: $HTTP_CODE"
else
    echo -e "${RED}✗ Test 4 failed (should return 401/403)${NC}"
    echo "  HTTP Status: $HTTP_CODE"
    exit 1
fi
echo ""

# Test 5: Missing query parameter (should fail)
echo -e "${YELLOW}Test 5: Missing query parameter (should fail)${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "query_type": "sql",
    "database_type": "postgresql"
  }')

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    echo -e "${GREEN}✓ Test 5 passed (correctly rejected missing query)${NC}"
else
    echo -e "${RED}✗ Test 5 failed${NC}"
    exit 1
fi
echo ""

# Test 6: Check metadata endpoint
echo -e "${YELLOW}Test 6: Check metadata endpoint${NC}"
RESPONSE=$(curl -s "$BASE_URL/api/connector/metadata")

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.connector.endpoints.execute == "/execute"' > /dev/null; then
    echo -e "${GREEN}✓ Test 6 passed (metadata shows /execute endpoint)${NC}"
else
    echo -e "${RED}✗ Test 6 failed${NC}"
    exit 1
fi
echo ""

# Test 7: Check execution time is returned
echo -e "${YELLOW}Test 7: Check execution time in response${NC}"
RESPONSE=$(curl -s -X POST "$BASE_URL/execute" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -d '{
    "query": "SELECT pg_sleep(0.1), 1 as test",
    "query_type": "sql"
  }')

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.execution_time_ms' > /dev/null; then
    EXEC_TIME=$(echo "$RESPONSE" | jq '.execution_time_ms')
    echo -e "${GREEN}✓ Test 7 passed${NC}"
    echo "  Execution time: ${EXEC_TIME}ms"
else
    echo -e "${RED}✗ Test 7 failed (no execution_time_ms)${NC}"
    exit 1
fi
echo ""

echo "=================================="
echo -e "${GREEN}All tests passed! ✓${NC}"
echo "=================================="
echo ""
echo "The /execute endpoint is working correctly and is ready for BizCopilot integration."
echo ""
echo "Next steps:"
echo "1. Configure in BizCopilot admin panel"
echo "2. Set connector URL: $BASE_URL"
echo "3. Set API key: [your CONNECTOR_API_KEY]"
echo "4. Test connection in BizCopilot"
