#!/bin/bash

# Test script for database introspection endpoints
# Tests the new schema discovery features for BizCopilot AI

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-https://coffee-git-main-amdanibiks-projects.vercel.app}"
API_KEY="${API_KEY:-}"

echo "=========================================="
echo "Coffee Database Schema Introspection Test"
echo "=========================================="
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
        echo "Usage: API_KEY=your-key ./test-introspect.sh"
        echo "Or set CONNECTOR_API_KEY in .env file"
        exit 1
    fi
fi

echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:10}..."
echo ""

# Test 1: Get database schema via /introspect
echo -e "${YELLOW}Test 1: Database Introspection (/introspect)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/introspect" \
  -H "X-API-Key: $API_KEY")

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 1 passed${NC}"
    TABLE_COUNT=$(echo "$RESPONSE" | jq '.data.tableCount')
    echo "  Found $TABLE_COUNT tables"
else
    echo -e "${RED}✗ Test 1 failed${NC}"
    exit 1
fi
echo ""

# Test 2: Get database schema via /schema
echo -e "${YELLOW}Test 2: Database Schema (/schema)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/schema" \
  -H "X-API-Key: $API_KEY")

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 2 passed${NC}"
    
    # Save schema text to file for review
    echo "$RESPONSE" | jq -r '.schema' > /tmp/coffee_schema.txt
    echo "  Schema saved to: /tmp/coffee_schema.txt"
    
    # Show first few lines of schema
    echo ""
    echo -e "${BLUE}Schema Preview:${NC}"
    echo "$RESPONSE" | jq -r '.schema' | head -20
    echo "  ..."
else
    echo -e "${RED}✗ Test 2 failed${NC}"
    exit 1
fi
echo ""

# Test 3: Get schema via /api/introspect
echo -e "${YELLOW}Test 3: API Introspection (/api/introspect)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/introspect" \
  -H "X-API-Key: $API_KEY")

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 3 passed${NC}"
else
    echo -e "${RED}✗ Test 3 failed${NC}"
    exit 1
fi
echo ""

# Test 4: Get sample data
echo -e "${YELLOW}Test 4: Sample Data (/sample-data)${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/sample-data?limit=2" \
  -H "X-API-Key: $API_KEY")

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    echo -e "${GREEN}✓ Test 4 passed${NC}"
    
    # Count tables with samples
    SAMPLE_COUNT=$(echo "$RESPONSE" | jq '.samples | length')
    echo "  Retrieved samples from $SAMPLE_COUNT tables"
else
    echo -e "${RED}✗ Test 4 failed${NC}"
    exit 1
fi
echo ""

# Test 5: Connector metadata should list introspect endpoint
echo -e "${YELLOW}Test 5: Metadata includes introspect endpoint${NC}"
RESPONSE=$(curl -s "$BASE_URL/api/connector/metadata")

echo "$RESPONSE" | jq '.'
if echo "$RESPONSE" | jq -e '.connector.endpoints.introspect' > /dev/null; then
    echo -e "${GREEN}✓ Test 5 passed${NC}"
    echo "  Introspect endpoint: $(echo "$RESPONSE" | jq -r '.connector.endpoints.introspect')"
else
    echo -e "${RED}✗ Test 5 failed${NC}"
    exit 1
fi
echo ""

# Test 6: Check that schema text contains table information
echo -e "${YELLOW}Test 6: Verify schema contains table definitions${NC}"
RESPONSE=$(curl -s -X GET "$BASE_URL/schema" \
  -H "X-API-Key: $API_KEY")

SCHEMA_TEXT=$(echo "$RESPONSE" | jq -r '.schema')

if echo "$SCHEMA_TEXT" | grep -q "Table:"; then
    echo -e "${GREEN}✓ Test 6 passed${NC}"
    echo "  Schema contains table definitions"
    
    # Count how many tables are in the schema
    TABLE_COUNT=$(echo "$SCHEMA_TEXT" | grep -c "^Table:" || true)
    echo "  Number of tables in schema: $TABLE_COUNT"
else
    echo -e "${RED}✗ Test 6 failed${NC}"
    echo "  Schema does not contain expected table definitions"
    exit 1
fi
echo ""

# Test 7: Without API key (should fail)
echo -e "${YELLOW}Test 7: Introspect without API key (should fail)${NC}"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/introspect")

if [ "$HTTP_CODE" = "401" ] || [ "$HTTP_CODE" = "403" ]; then
    echo -e "${GREEN}✓ Test 7 passed (correctly rejected)${NC}"
    echo "  HTTP Status: $HTTP_CODE"
else
    echo -e "${RED}✗ Test 7 failed (should return 401/403)${NC}"
    echo "  HTTP Status: $HTTP_CODE"
    exit 1
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}All introspection tests passed! ✓${NC}"
echo "=========================================="
echo ""
echo -e "${BLUE}📊 Summary:${NC}"
echo "- Database schema introspection is working"
echo "- BizCopilot AI can now discover your database structure"
echo "- Schema text is properly formatted for AI understanding"
echo ""
echo -e "${BLUE}📁 Schema file saved to:${NC} /tmp/coffee_schema.txt"
echo ""
echo -e "${YELLOW}Next steps for BizCopilot integration:${NC}"
echo "1. Go to BizCopilot settings: $BASE_URL"
echo "2. Click 'Test Connection' to verify"
echo "3. The AI will automatically fetch schema using /introspect"
echo "4. Ask questions about your database!"
echo ""
echo -e "${BLUE}Example AI questions you can now ask:${NC}"
echo "  - \"What tables are in my database?\""
echo "  - \"What data do I have about tenants?\""
echo "  - \"Show me the orders structure\""
echo "  - \"What is the relationship between orders and tenants?\""
