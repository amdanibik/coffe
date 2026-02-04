#!/bin/bash

# Database Setup Script for Coffee Multitenant System

echo "=================================="
echo "Coffee Database Setup"
echo "=================================="
echo ""

# Configuration
DB_NAME="coffee_db"
DB_USER="postgres"
SQL_FILE="coffee_multitenant_seed.sql"

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo -e "${RED}PostgreSQL is not installed. Please install PostgreSQL first.${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Creating database '$DB_NAME'...${NC}"
# Drop database if exists and create new one
psql -U $DB_USER -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null
psql -U $DB_USER -c "CREATE DATABASE $DB_NAME;"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create database${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 2: Creating tables...${NC}"

# Create tables
psql -U $DB_USER -d $DB_NAME << EOF
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    order_date DATE NOT NULL,
    total NUMERIC(15,2) NOT NULL DEFAULT 0,
    payment_method VARCHAR(50),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS order_details (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    price NUMERIC(15,2) NOT NULL,
    subtotal NUMERIC(15,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_order_details_order_id ON order_details(order_id);
CREATE INDEX idx_order_details_product_name ON order_details(product_name);
EOF

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Tables created successfully${NC}"
else
    echo -e "${RED}✗ Failed to create tables${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 3: Importing data from $SQL_FILE...${NC}"
echo "This may take a while for large files..."

if [ -f "$SQL_FILE" ]; then
    psql -U $DB_USER -d $DB_NAME -f $SQL_FILE > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Data imported successfully${NC}"
    else
        echo -e "${RED}✗ Failed to import data${NC}"
        exit 1
    fi
else
    echo -e "${RED}✗ SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Step 4: Verifying data...${NC}"

# Get counts
TENANT_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM tenants;")
ORDER_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM orders;")
DETAIL_COUNT=$(psql -U $DB_USER -d $DB_NAME -t -c "SELECT COUNT(*) FROM order_details;")

echo ""
echo "Database Statistics:"
echo "  - Tenants: $TENANT_COUNT"
echo "  - Orders: $ORDER_COUNT"
echo "  - Order Details: $DETAIL_COUNT"

echo ""
echo -e "${GREEN}=================================="
echo "✓ Database setup completed!"
echo "==================================${NC}"
echo ""
echo "Database Information:"
echo "  - Database Name: $DB_NAME"
echo "  - User: $DB_USER"
echo "  - Host: localhost"
echo "  - Port: 5432"
echo ""
echo "You can now run the application with: npm start"
