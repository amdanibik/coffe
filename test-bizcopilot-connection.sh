#!/bin/bash

# BizCopilot Connection Tester
# Script untuk test koneksi ke Coffee Database Connector

echo "=========================================="
echo "  Coffee Database Connector - Test Tool"
echo "=========================================="
echo ""

# Warna untuk output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# URL Connector
CONNECTOR_URL="https://coffee-git-main-amdanibiks-projects.vercel.app"

# Fungsi untuk test endpoint
test_endpoint() {
    local url=$1
    local name=$2
    local method=${3:-GET}
    local api_key=$4
    
    echo -e "${YELLOW}Testing:${NC} $name"
    echo "URL: $url"
    
    if [ -z "$api_key" ]; then
        response=$(curl -s -X $method "$url")
    else
        response=$(curl -s -X $method "$url" \
            -H "Content-Type: application/json" \
            -H "X-API-Key: $api_key")
    fi
    
    echo "Response: $response"
    
    if echo "$response" | grep -q '"success":true'; then
        echo -e "${GREEN}✅ SUCCESS${NC}"
    else
        echo -e "${RED}❌ FAILED${NC}"
    fi
    echo ""
}

# Test 1: Health Check (no auth)
echo "=== Test 1: Health Check (No Authentication) ==="
test_endpoint "$CONNECTOR_URL/health" "Health Check" "GET"

# Test 2: Connector Metadata (no auth)
echo "=== Test 2: Connector Metadata (No Authentication) ==="
test_endpoint "$CONNECTOR_URL/api/connector/metadata" "Connector Metadata" "GET"

# Test 3: With API Key
echo "=== Test 3: Database Connection (With Authentication) ==="
echo ""
echo -e "${YELLOW}Masukkan API Key Anda:${NC}"
read -r API_KEY

if [ -z "$API_KEY" ]; then
    echo -e "${RED}API Key tidak boleh kosong!${NC}"
    exit 1
fi

echo ""
echo "Testing dengan API Key: ${API_KEY:0:10}..."
echo ""

# Test connection dengan API key
test_endpoint "$CONNECTOR_URL/api/db/connect" "Database Connection" "POST" "$API_KEY"

# Test get tenants
test_endpoint "$CONNECTOR_URL/api/tenants" "Get Tenants" "GET" "$API_KEY"

echo "=========================================="
echo "  Test Selesai"
echo "=========================================="
echo ""
echo -e "${YELLOW}Kesimpulan:${NC}"
echo "1. Jika semua test SUCCESS, API key Anda BENAR ✅"
echo "2. Jika ada FAILED, cek API key di Vercel Dashboard"
echo "3. API key harus sama dengan CONNECTOR_API_KEY di Vercel"
echo ""
echo -e "${YELLOW}Langkah selanjutnya:${NC}"
echo "1. Masukkan API key yang sama ke BizCopilot"
echo "2. URL: $CONNECTOR_URL/api/db/connect"
echo "3. Klik 'Test Connection' di BizCopilot"
echo ""
