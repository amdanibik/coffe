#!/bin/bash

# Test script untuk Direct Database Connection API
# Usage: ./test-db-direct.sh [API_KEY] [BASE_URL]

API_KEY="${1:-your_api_key_here}"
BASE_URL="${2:-http://localhost:3000}"

echo "╔═══════════════════════════════════════════════════════╗"
echo "║   Testing Direct Database Connection API              ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "API Key: $API_KEY"
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
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

# Test 1: Connect to database
print_test "1. Testing POST /api/db/connect"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/connect" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Database connection successful"
else
    print_error "Database connection failed"
fi

# Test 2: Execute SELECT query
print_test "2. Testing POST /api/db/execute (SELECT)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 3"
  }')

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "SELECT query executed successfully"
    ROW_COUNT=$(echo "$RESPONSE" | jq -r '.rowCount')
    print_success "Rows returned: $ROW_COUNT"
else
    print_error "SELECT query failed"
fi

# Test 3: Execute query with parameters
print_test "3. Testing POST /api/db/execute (with parameters)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants WHERE id = $1",
    "params": [1]
  }')

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Parameterized query executed successfully"
else
    print_error "Parameterized query failed"
fi

# Test 4: Test destructive query without flag (should fail)
print_test "4. Testing POST /api/db/execute (destructive without flag)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "DELETE FROM tenants WHERE id = 999"
  }')

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    print_success "Destructive query correctly blocked"
else
    print_error "Destructive query should have been blocked!"
fi

# Test 5: Get pool status
print_test "5. Testing GET /api/db/pool-status"
RESPONSE=$(curl -s -X GET "$BASE_URL/api/db/pool-status" \
  -H "X-API-Key: $API_KEY")

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Pool status retrieved successfully"
    TOTAL=$(echo "$RESPONSE" | jq -r '.pool.totalCount')
    IDLE=$(echo "$RESPONSE" | jq -r '.pool.idleCount')
    print_success "Pool: $TOTAL total, $IDLE idle"
else
    print_error "Failed to get pool status"
fi

# Test 6: Execute batch queries
print_test "6. Testing POST /api/db/batch"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/batch" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {
        "query": "SELECT COUNT(*) as tenant_count FROM tenants",
        "params": []
      },
      {
        "query": "SELECT COUNT(*) as order_count FROM orders",
        "params": []
      },
      {
        "query": "SELECT name FROM tenants LIMIT 1",
        "params": []
      }
    ]
  }')

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == true' > /dev/null; then
    print_success "Batch queries executed successfully"
    SUCCESS_COUNT=$(echo "$RESPONSE" | jq -r '.successCount')
    FAILURE_COUNT=$(echo "$RESPONSE" | jq -r '.failureCount')
    print_success "Success: $SUCCESS_COUNT, Failures: $FAILURE_COUNT"
else
    print_error "Batch queries failed"
fi

# Test 7: Test without API Key (should fail)
print_test "7. Testing without API Key (should fail)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/connect" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    print_success "Request correctly rejected without API Key"
else
    print_error "Request should have been rejected!"
fi

# Test 8: Test with invalid API Key (should fail)
print_test "8. Testing with invalid API Key (should fail)"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/db/connect" \
  -H "X-API-Key: invalid_key_12345" \
  -H "Content-Type: application/json")

echo "$RESPONSE" | jq .

if echo "$RESPONSE" | jq -e '.success == false' > /dev/null; then
    print_success "Request correctly rejected with invalid API Key"
else
    print_error "Request should have been rejected!"
fi

# Summary
echo ""
echo "╔═══════════════════════════════════════════════════════╗"
echo "║                  Test Summary                         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""
echo "All tests completed!"
echo ""
echo "To run specific tests:"
echo "  ./test-db-direct.sh YOUR_API_KEY http://localhost:3000"
echo ""
echo "For production:"
echo "  ./test-db-direct.sh YOUR_API_KEY https://your-domain.vercel.app"
