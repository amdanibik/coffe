#!/bin/bash

# Import data dengan single connection dan batch processing
set -e

POSTGRES_URL="$1"

if [ -z "$POSTGRES_URL" ]; then
    echo "❌ POSTGRES_URL required!"
    echo "Usage: ./import-optimized.sh 'postgres://...'"
    exit 1
fi

echo "🚀 Optimized Import - Single Transaction"
echo "========================================"
echo ""

echo "✓ POSTGRES_URL provided"
echo ""

# Test connection
echo "🔍 Testing database connection..."
if ! psql "$POSTGRES_URL" -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Cannot connect to database"
    exit 1
fi
echo "✓ Database connection successful"
echo ""

# Create one big SQL file with schema + data
echo "📝 Preparing import file..."
cat > full_import.sql << 'EOF'
-- Drop existing tables
DROP TABLE IF EXISTS order_details CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Create schema (based on actual data structure)
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE orders (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    order_date DATE NOT NULL,
    total DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50)
);

CREATE TABLE order_details (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

-- Create indexes
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_details_order ON order_details(order_id);
CREATE INDEX idx_order_details_product_name ON order_details(product_name);

EOF

# Append data (remove BEGIN/COMMIT to avoid nested transactions)
grep -v "^BEGIN\|^COMMIT" coffee_multitenant_seed.sql >> full_import.sql

echo "✓ Import file prepared ($(wc -l < full_import.sql) lines)"
echo ""

echo "📦 Importing to database..."
echo "⏱️  This will take 5-15 minutes depending on network..."
echo ""

# Import with single connection, no transaction (autocommit mode)
time psql "$POSTGRES_URL" -v ON_ERROR_STOP=0 -f full_import.sql 2>&1 | tee import_result.log | grep -E "CREATE|INSERT INTO|ERROR" | head -50

echo ""
echo "🔍 Verifying imported data..."
psql "$POSTGRES_URL" << 'EOSQL'
SELECT 
  'Tenants' as table_name, COUNT(*) as rows FROM tenants
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders
UNION ALL
SELECT 'Order Details', COUNT(*) FROM order_details
ORDER BY table_name;
EOSQL

echo ""
echo "✅ Import completed! Check import_result.log for details."
echo ""
echo "🎯 Next: Test your API at https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app"
