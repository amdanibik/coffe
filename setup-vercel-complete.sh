#!/bin/bash

# Script untuk setup lengkap Vercel Postgres dan migrate data
# Setelah database dibuat di dashboard Vercel

set -e

echo "🚀 Vercel Postgres Setup & Data Migration"
echo "=========================================="
echo ""

# Check if POSTGRES_URL is provided
if [ -z "$1" ]; then
    echo "❌ ERROR: POSTGRES_URL required!"
    echo ""
    echo "📋 Langkah-langkah:"
    echo ""
    echo "1. Buka Vercel Dashboard: https://vercel.com/amdanibiks-projects/coffee"
    echo "2. Klik 'Storage' tab"
    echo "3. Klik 'Create Database'"
    echo "4. Pilih 'Postgres'"
    echo "5. Database name: coffee-db"
    echo "6. Region: Singapore (sin1)"
    echo "7. Klik 'Create'"
    echo "8. Klik 'Connect' → pilih project 'coffee' → 'All' environments"
    echo "9. Copy POSTGRES_URL dari .env.local tab"
    echo ""
    echo "Usage:"
    echo "  ./setup-vercel-complete.sh 'postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb'"
    echo ""
    exit 1
fi

POSTGRES_URL="$1"

echo "✓ POSTGRES_URL provided"
echo ""

# Test connection
echo "🔍 Testing database connection..."
if psql "$POSTGRES_URL" -c "SELECT version();" > /dev/null 2>&1; then
    echo "✓ Database connection successful"
else
    echo "❌ Cannot connect to database. Check your POSTGRES_URL!"
    exit 1
fi

echo ""
echo "📊 Database Info:"
psql "$POSTGRES_URL" -c "SELECT version();" -t | head -1
echo ""

# Check if data already exists
echo "🔍 Checking existing data..."
TENANT_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name='tenants';" 2>/dev/null || echo "0")

if [ "$TENANT_COUNT" != "0" ]; then
    echo "⚠️  Tables already exist!"
    read -p "Do you want to DROP all tables and re-import? (yes/no): " CONFIRM
    if [ "$CONFIRM" != "yes" ]; then
        echo "❌ Cancelled"
        exit 1
    fi
fi

echo ""
echo "📋 Creating database schema..."
if psql "$POSTGRES_URL" -f schema.sql > schema.log 2>&1; then
    echo "✓ Schema created successfully"
else
    echo "❌ Schema creation failed! Check schema.log"
    tail -20 schema.log
    exit 1
fi

echo ""
echo "📦 Importing data (52MB, ~334K rows)..."
echo "⏱️  This may take 5-10 minutes..."
echo "💡 Tip: The file is large, so it might take longer on slower connections"
echo ""

# Import the SQL file with better error handling
if timeout 600 psql "$POSTGRES_URL" -v ON_ERROR_STOP=0 -f coffee_multitenant_seed.sql > import.log 2>&1; then
    echo "✓ Data import completed!"
else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 124 ]; then
        echo "⏱️  Import timeout after 10 minutes!"
        echo "💡 Try splitting the import or use faster connection"
    else
        echo "❌ Import failed! Check import.log for details"
        tail -30 import.log
    fi
    exit 1
fi

echo ""
echo "🔍 Verifying imported data..."
echo ""

# Verify data
TENANT_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM tenants;")
PRODUCT_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM products;")
CUSTOMER_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM customers;")
ORDER_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM orders;")
ORDER_DETAIL_COUNT=$(psql "$POSTGRES_URL" -t -c "SELECT COUNT(*) FROM order_details;")

echo "📊 Data Summary:"
echo "  Tenants:        $TENANT_COUNT"
echo "  Products:       $PRODUCT_COUNT"
echo "  Customers:      $CUSTOMER_COUNT"
echo "  Orders:         $ORDER_COUNT"
echo "  Order Details:  $ORDER_DETAIL_COUNT"
echo ""

# Test queries
echo "🧪 Testing sample queries..."
echo ""

echo "1. Top 5 Products:"
psql "$POSTGRES_URL" -c "
SELECT p.name, COUNT(od.order_id) as total_orders, SUM(od.quantity) as total_sold
FROM products p
JOIN order_details od ON p.id = od.product_id
GROUP BY p.id, p.name
ORDER BY total_sold DESC
LIMIT 5;
"

echo ""
echo "2. Sales by Tenant:"
psql "$POSTGRES_URL" -c "
SELECT t.name, COUNT(o.id) as total_orders, SUM(o.total_amount) as total_revenue
FROM tenants t
JOIN orders o ON t.id = o.tenant_id
GROUP BY t.id, t.name
ORDER BY total_revenue DESC;
"

echo ""
echo "✅ SETUP COMPLETE!"
echo ""
echo "🎯 Next Steps:"
echo ""
echo "1. Redeploy your app:"
echo "   vercel --prod"
echo ""
echo "2. Test API endpoints:"
echo "   curl -H 'X-API-Key: test-api-key-12345' https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app/api/tenants"
echo ""
echo "3. Test from Bizcopilot:"
echo "   Connector URL: https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app"
echo "   API Key: test-api-key-12345"
echo ""
echo "🚀 Your database is ready!"
