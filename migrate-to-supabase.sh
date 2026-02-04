#!/bin/bash

# Migration Script: Local PostgreSQL → Supabase
# This script migrates your coffee database to Supabase

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Coffee Database Migration to Supabase            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load Supabase credentials from .env.supabase
if [ ! -f .env.supabase ]; then
    echo -e "${RED}Error: .env.supabase file not found!${NC}"
    echo "Please create .env.supabase with your Supabase credentials"
    echo "Template available in the file."
    exit 1
fi

source .env.supabase

# Check if required variables are set
if [ -z "$DB_HOST" ] || [ "$DB_HOST" == "db.xxxxxxxxxxxxx.supabase.co" ]; then
    echo -e "${RED}Error: Please update .env.supabase with your Supabase credentials!${NC}"
    echo ""
    echo "Steps:"
    echo "1. Buka https://supabase.com"
    echo "2. Create new project"
    echo "3. Go to Settings > Database"
    echo "4. Copy connection string"
    echo "5. Update .env.supabase file"
    exit 1
fi

# Build connection string
SUPABASE_CONN="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

echo -e "${BLUE}Step 1: Testing connection to Supabase...${NC}"
if psql "$SUPABASE_CONN" -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Connection successful!${NC}"
else
    echo -e "${RED}✗ Connection failed!${NC}"
    echo "Please check your credentials in .env.supabase"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Creating tables in Supabase...${NC}"

psql "$SUPABASE_CONN" << 'EOF'
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
echo -e "${BLUE}Step 3: Migrating data to Supabase...${NC}"
echo -e "${YELLOW}⚠ This may take several minutes for large datasets (52MB)${NC}"
echo ""

# Check if local database exists
if psql -U postgres -lqt | cut -d \| -f 1 | grep -qw coffee_db; then
    echo "Exporting data from local database..."
    
    # Export only data (no schema)
    pg_dump -U postgres -d coffee_db --data-only --no-owner --no-privileges > /tmp/coffee_data_only.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Data exported${NC}"
        
        echo "Importing data to Supabase..."
        psql "$SUPABASE_CONN" < /tmp/coffee_data_only.sql > /tmp/import.log 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Data imported successfully${NC}"
            rm /tmp/coffee_data_only.sql
        else
            echo -e "${RED}✗ Import failed. Check /tmp/import.log for details${NC}"
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
        psql "$SUPABASE_CONN" < coffee_multitenant_seed.sql > /tmp/import.log 2>&1
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✓ Data imported from SQL file${NC}"
        else
            echo -e "${RED}✗ Import failed. File might be too large.${NC}"
            echo "Try splitting the file or importing via Supabase dashboard"
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
TENANT_COUNT=$(psql "$SUPABASE_CONN" -t -c "SELECT COUNT(*) FROM tenants;")
ORDER_COUNT=$(psql "$SUPABASE_CONN" -t -c "SELECT COUNT(*) FROM orders;")
DETAIL_COUNT=$(psql "$SUPABASE_CONN" -t -c "SELECT COUNT(*) FROM order_details;")

echo ""
echo "Data in Supabase:"
echo "  - Tenants:        $TENANT_COUNT"
echo "  - Orders:         $ORDER_COUNT"
echo "  - Order Details:  $DETAIL_COUNT"

echo ""
echo -e "${GREEN}╔═══════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           Migration Completed Successfully!          ║${NC}"
echo -e "${GREEN}╚═══════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "1. Update your .env file:"
echo "   cp .env.supabase .env"
echo ""
echo "2. Test the connection:"
echo "   npm start"
echo ""
echo "3. Test API endpoint:"
echo "   curl -X POST -H \"X-API-Key: $CONNECTOR_API_KEY\" \\"
echo "     http://localhost:3000/api/test-connection"
echo ""
echo -e "${BLUE}Database connection string:${NC}"
echo "$SUPABASE_CONN"
echo ""
