-- Coffee Multitenant Database Schema
-- Created for Vercel Postgres deployment
-- Based on actual data structure from coffee_multitenant_seed.sql

-- Drop tables if exist (cascade to handle dependencies)
DROP TABLE IF EXISTS order_details CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Create tenants table
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL
);

-- Create orders table
-- Columns: id, tenant_id, order_date, total, payment_method
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    order_date DATE NOT NULL,
    total DECIMAL(12,2) DEFAULT 0,
    payment_method VARCHAR(50)
);

-- Create order_details table
-- Columns: id, order_id, product_name, qty, price, subtotal
CREATE TABLE order_details (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    qty INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL
);

-- Create indexes for better query performance
CREATE INDEX idx_orders_tenant ON orders(tenant_id);
CREATE INDEX idx_orders_date ON orders(order_date);
CREATE INDEX idx_order_details_order ON order_details(order_id);
CREATE INDEX idx_order_details_product_name ON order_details(product_name);

-- Add comments
COMMENT ON TABLE tenants IS 'Multi-tenant configuration - different branches/locations';
COMMENT ON TABLE orders IS 'Orders per tenant with payment info';
COMMENT ON TABLE order_details IS 'Line items for each order with product name';
