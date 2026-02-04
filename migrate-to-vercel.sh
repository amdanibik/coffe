#!/bin/bash

# Migration Script: Local PostgreSQL → Vercel Postgres
# This script migrates your coffee database to Vercel Postgres

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Coffee Database Migration to Vercel Postgres     ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if POSTGRES_URL is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: POSTGRES_URL not provided!${NC}"
    echo ""
    echo "Usage:"
    echo "  ./migrate-to-vercel.sh \"postgres://default:xxx@xxx.neon.tech:5432/verceldb\""
    echo ""
    echo "Get your POSTGRES_URL from:"
    echo "  1. Vercel Dashboard → Storage → coffee-db"
    echo "  2. Tab '.env.local'"
    echo "  3. Copy POSTGRES_URL value"
    echo ""
    exit 1
fi

VERCEL_POSTGRES_URL="$1"

echo -e "${BLUE}Step 1: Testing connection to Vercel Postgres...${NC}"
if psql "$VERCEL_POSTGRES_URL" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful!${NC}"
else
    echo -e "${RED}✗ Connection failed!${NC}"
    echo "Please check your POSTGRES_URL"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Creating tables in Vercel Postgres...${NC}"

psql "$VERCEL_POSTGRES_URL" << 'EOF'
-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    order_date DATE NOT NULL,
    total NUMERIC(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Create order_details table
CREATE TABLE IF NOT EXISTS order_details (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_product_name ON order_details(product_name);
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tables created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create tables${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Migrating data to Vercel Postgres...${NC}"
echo -e "${YELLOW}⚠ This may take several minutes for large datasets (52MB)${NC}"
echo ""

# Check if local database exists
if psql -U postgres -lqt 2>/dev/null | cut -d \| -f 1 | grep -qw coffee_db; then
    echo "Exporting data from local database..."
    
    # Export only data (no schema)
    pg_dump -U postgres -d coffee_db --data-only --no-owner --no-privileges > /tmp/coffee_data_only.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Data exported${NC}"
        
        echo "Importing data to Vercel Postgres..."
        psql "$VERCEL_POSTGRES_URL" < /tmp/coffee_data_only.sql > /tmp/import.log 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Data imported successfully${NC}"
            rm /tmp/coffee_data_only.sql
        else
            echo -e "${RED}✗ Import failed. Check /tmp/import.log for details${NC}"
            echo "File might be too large. Try splitting or importing via chunks."
            exit 1
        fi
    else
        echo -e "${RED}✗ Export failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}Local database 'coffee_db' not found.${NC}"
    echo "Importing from SQL file..."
    
    if [ -f coffee_multitenant_seed.sql ]; then
        echo "⚠ File is very large (52MB). This may take 10-15 minutes..."
        psql "$VERCEL_POSTGRES_URL" < coffee_multitenant_seed.sql > /tmp/import.log 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Data imported from SQL file${NC}"
        else
            echo -e "${RED}✗ Import failed.${NC}"
            echo "File might be too large for single import."
            echo ""
            echo "Alternative methods:"
            echo "1. Split the file into chunks:"
            echo "   split -l 10000 coffee_multitenant_seed.sql chunk_"
            echo "   for file in chunk_*; do psql \"$VERCEL_POSTGRES_URL\" < \$file; done"
            echo ""
            echo "2. Import sample data first:"
            echo "   head -n 1000 coffee_multitenant_seed.sql > sample.sql"
            echo "   psql \"$VERCEL_POSTGRES_URL\" < sample.sql"
            exit 1
        fi
    else
        echo -e "${RED}✗ SQL file not found${NC}"
        exit 1
    fi
fi

echo ""
echo -e "${BLUE}Step 4: Verifying data...${NC}"

# Count records
TENANT_COUNT=$(psql "$VERCEL_POSTGRES_URL" -t -c "SELECT COUNT(*) FROM tenants;" 2>/dev/null)
ORDER_COUNT=$(psql "$VERCEL_POSTGRES_URL" -t -c "SELECT COUNT(*) FROM orders;" 2>/dev/null)
DETAIL_COUNT=$(psql "$VERCEL_POSTGRES_URL" -t -c "SELECT COUNT(*) FROM order_details;" 2>/dev/null)

echo ""
echo "Data in Vercel Postgres:"
echo "  - Tenants:        $TENANT_COUNT"
echo "  - Orders:         $ORDER_COUNT"
echo "  - Order Details:  $DETAIL_COUNT"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Migration Completed Successfully!          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Verify data di Vercel Dashboard:"
echo "   Storage → coffee-db → Query tab"
echo ""
echo "2. Environment variables sudah auto-set by Vercel:"
echo "   POSTGRES_URL, POSTGRES_HOST, dll"
echo ""
echo "3. Deploy akan otomatis connect ke database"
echo ""
echo "4. Test production API:"
echo "   https://coffe-xxx.vercel.app/api/tenants"
echo ""
