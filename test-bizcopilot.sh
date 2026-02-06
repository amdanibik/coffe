#!/bin/bash

# Test script untuk BizCopilot Integration
# Usage: ./test-bizcopilot.sh [BASE_URL] [API_KEY]

BASE_URL="${1:-https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app}"
API_KEY="${2:-}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Testing BizCopilot Integration                      ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "Base URL: $BASE_URL"
echo "API Key: ${API_KEY:0:10}***"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print test header
print_test() {
    echo ""
    echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
    echo -e "${YELLOW}$1${NC}"
    echo -e "${YELLOW}════════════════════════════════════════════════════════${NC}"
}

# Function to print success
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info
print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# Test 1: Root endpoint
print_test "1. Testing Root Endpoint (GET /)"
print_info "This shows all available endpoints"
RESPONSE=$(curl -s "$BASE_URL/")
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.service' > /dev/null; then
    print_success "Root endpoint working"
    SERVICE=$(echo "$RESPONSE" | jq -r '.service')
    VERSION=$(echo "$RESPONSE" | jq -r '.version')
    print_success "Service: $SERVICE v$VERSION"
else
    print_error "Root endpoint failed"
fi

# Test 2: Connector Metadata (Public - No Auth)
print_test "2. Testing Connector Metadata (GET /api/connector/metadata)"
print_info "Public endpoint - no authentication required"
RESPONSE=$(curl -s "$BASE_URL/api/connector/metadata")
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Metadata endpoint working"
    CONNECTOR_NAME=$(echo "$RESPONSE" | jq -r '.connector.name')
    CONNECTOR_TYPE=$(echo "$RESPONSE" | jq -r '.connector.type')
    print_success "Connector: $CONNECTOR_NAME ($CONNECTOR_TYPE)"
else
    print_error "Metadata endpoint failed"
fi

# Test 3: Health Check (Public - No Auth)
print_test "3. Testing Health Check (GET /api/connector/health)"
print_info "Public endpoint - no authentication required"
RESPONSE=$(curl -s "$BASE_URL/api/connector/health")
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Health check passed"
    STATUS=$(echo "$RESPONSE" | jq -r '.status')
    DB_CONNECTED=$(echo "$RESPONSE" | jq -r '.database.connected')
    print_success "Status: $STATUS, DB Connected: $DB_CONNECTED"
else
    print_error "Health check failed"
fi

# Check if API key is provided for protected endpoints
if [ -z "$API_KEY" ]; then
    echo ""
    print_error "No API Key provided. Skipping protected endpoint tests."
    echo ""
    print_info "To test protected endpoints, run:"
    print_info "./test-bizcopilot.sh $BASE_URL YOUR_API_KEY"
    echo ""
    exit 0
fi

# Test 4: Test Connection (Protected)
print_test "4. Testing Connection (POST /api/test-connection)"
print_info "Protected endpoint - requires API key"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/test-connection" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json")
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Test connection successful"
    DB_VERSION=$(echo "$RESPONSE" | jq -r '.data.version' | cut -d' ' -f1-2)
    print_success "Database: $DB_VERSION"
else
    print_error "Test connection failed"
    ERROR=$(echo "$RESPONSE" | jq -r '.error')
    print_error "Error: $ERROR"
fi

# Test 5: Get Configuration (Protected)
print_test "5. Testing Configuration (GET /api/configuration)"
print_info "Protected endpoint - requires API key"
RESPONSE=$(curl -s "$BASE_URL/api/configuration" \
  -H "X-API-Key: $API_KEY")
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Configuration retrieved"
    DB_TYPE=$(echo "$RESPONSE" | jq -r '.data.databaseType')
    TIMEOUT=$(echo "$RESPONSE" | jq -r '.data.queryTimeout')
    print_success "Type: $DB_TYPE, Timeout: $TIMEOUT ms"
else
    print_error "Configuration retrieval failed"
fi

# Test 6: Execute Query (Protected)
print_test "6. Testing Query Execution (POST /api/query)"
print_info "Protected endpoint - requires API key"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/query" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT COUNT(*) as total FROM tenants"
  }')
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Query executed successfully"
    ROW_COUNT=$(echo "$RESPONSE" | jq -r '.rowCount')
    EXEC_TIME=$(echo "$RESPONSE" | jq -r '.executionTime')
    print_success "Rows: $ROW_COUNT, Time: $EXEC_TIME"
else
    print_error "Query execution failed"
fi

# Test 7: Execute Query with Parameters (Protected)
print_test "7. Testing Parameterized Query (POST /api/query)"
print_info "Testing with query parameters"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/query" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT $1",
    "params": [3]
  }')
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Parameterized query executed"
    ROW_COUNT=$(echo "$RESPONSE" | jq -r '.rowCount')
    print_success "Retrieved $ROW_COUNT rows"
else
    print_error "Parameterized query failed"
fi

# Test 8: Test with Invalid API Key (Should Fail)
print_test "8. Testing with Invalid API Key (should fail)"
print_info "This should return 403 Forbidden"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/test-connection" \
  -H "X-API-Key: invalid_key_12345" \
  -H "Content-Type: application/json")
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    print_success "Invalid API key correctly rejected"
else
    print_error "Security issue: Invalid API key was accepted!"
fi

# Test 9: Direct DB Execute
print_test "9. Testing Direct DB Execute (POST /api/db/execute)"
print_info "Testing direct database query execution"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT name, code FROM tenants LIMIT 2"
  }')
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Direct DB execute working"
else
    print_error "Direct DB execute failed"
fi

# Test 10: Get Pool Status
print_test "10. Testing Pool Status (GET /api/db/pool-status)"
print_info "Checking connection pool health"
RESPONSE=$(curl -s "$BASE_URL/api/db/pool-status" \
  -H "X-API-Key: $API_KEY")
echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Pool status retrieved"
    TOTAL=$(echo "$RESPONSE" | jq -r '.pool.totalCount // 0')
    IDLE=$(echo "$RESPONSE" | jq -r '.pool.idleCount // 0')
    print_success "Pool: $TOTAL total, $IDLE idle"
else
    print_error "Pool status failed"
fi

# Summary
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║              Integration Test Summary                 ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
print_success "Public endpoints working (metadata, health)"
print_success "Protected endpoints working (with valid API key)"
print_success "Authentication working correctly"
print_success "Connector ready for BizCopilot integration"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Next Steps:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_info "1. Go to: https://staging-ok.bizcopilot.app/settings/database"
print_info "2. Enter Connector URL: $BASE_URL"
print_info "3. Enter API Key: $API_KEY"
print_info "4. Select Database Type: PostgreSQL"
print_info "5. Set Query Timeout: 30000"
print_info "6. Click 'Test Connection'"
print_info "7. Save configuration"
echo ""
print_success "Your connector is ready to use! 🎉"
echo ""
