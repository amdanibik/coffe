#!/bin/bash

# Fast import with progress - split into chunks
set -e

POSTGRES_URL="$1"

if [ -z "$POSTGRES_URL" ]; then
    echo "Usage: ./import-fast.sh 'postgres://...'"
    exit 1
fi

echo "🚀 Fast Import Mode - With Progress"
echo "===================================="
echo ""

# Create schema
echo "📋 Creating schema..."
psql "$POSTGRES_URL" -f schema.sql > /dev/null 2>&1 || {
    echo "✓ Schema already exists or created"
}

echo ""
echo "📊 Importing data in chunks..."
echo ""

# Count total lines
TOTAL_LINES=$(wc -l < coffee_multitenant_seed.sql)
echo "Total lines to import: $TOTAL_LINES"
echo ""

# Import with progress (remove BEGIN/COMMIT since we want autocommit)
grep -v "^BEGIN\|^COMMIT" coffee_multitenant_seed.sql | \
psql "$POSTGRES_URL" \
    -v ON_ERROR_STOP=0 \
    --echo-errors \
    2>&1 | \
while IFS= read -r line; do
    if [[ "$line" == INSERT* ]]; then
        COUNT=$((COUNT + 1))
        if [ $((COUNT % 1000)) -eq 0 ]; then
            PERCENT=$((COUNT * 100 / TOTAL_LINES))
            echo "Progress: $COUNT rows ($PERCENT%)"
        fi
    elif [[ "$line" == ERROR* ]]; then
        echo "⚠️  $line"
    fi
done

echo ""
echo "✓ Import completed!"
echo ""

# Verify
echo "📊 Verifying data..."
psql "$POSTGRES_URL" -c "
SELECT 
  'Tenants' as table_name, COUNT(*) as count FROM tenants
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Details', COUNT(*) FROM order_details
ORDER BY table_name;
"

echo ""
echo "✅ Done!"
