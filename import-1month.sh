#!/bin/bash

# Fast import for coffee_full_1month.sql dengan progress tracking
set -e

POSTGRES_URL="$1"

if [ -z "$POSTGRES_URL" ]; then
    echo "Usage: ./import-1month.sh 'postgres://...'"
    exit 1
fi

echo "🚀 Importing coffee_full_1month.sql (16MB, 124K lines)"
echo "========================================="
echo ""

# Count total lines
TOTAL_LINES=124457
echo "Total lines: $TOTAL_LINES"
echo ""

echo "📦 Starting import with progress..."
echo ""

# Import with progress indicator
pv coffee_full_1month.sql | psql "$POSTGRES_URL" -v ON_ERROR_STOP=0 2>&1 | tee import_full.log | \
grep -E "CREATE|INSERT|ERROR" | head -100

echo ""
echo "✅ Import command finished!"
echo ""

# Wait a bit for last transactions to commit
echo "⏳ Waiting for transactions to complete..."
sleep 5

echo ""
echo "🔍 Verifying data..."
psql "$POSTGRES_URL" << 'EOSQL'
SELECT 
  'Tenants' as table_name, COUNT(*) as rows FROM tenants
UNION ALL
SELECT 'Employees', COUNT(*) FROM employees
UNION ALL
SELECT 'Attendance', COUNT(*) FROM attendance
UNION ALL
SELECT 'Salaries', COUNT(*) FROM salaries
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Details', COUNT(*) FROM order_details
ORDER BY table_name;
EOSQL

echo ""
echo "🎯 Sample Data:"
psql "$POSTGRES_URL" << 'EOSQL'
-- Tenants
SELECT 'TENANTS:' as info;
SELECT * FROM tenants LIMIT 3;

-- Top products
SELECT 'TOP PRODUCTS:' as info;
SELECT product_name, COUNT(*) as order_count, SUM(qty) as total_qty
FROM order_details
GROUP BY product_name
ORDER BY order_count DESC
LIMIT 5;

-- Recent orders
SELECT 'RECENT ORDERS:' as info;
SELECT DATE(order_date) as date, COUNT(*) as orders, SUM(total) as revenue
FROM orders
GROUP BY DATE(order_date)
ORDER BY date DESC
LIMIT 5;
EOSQL

echo ""
echo "✅ Import Complete!"
echo ""
echo "🎯 Next: Test API at https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app"
