# Coffee Multi-Tenant Database Schema

## What is Database Schema?

This is a description of your database structure. The AI agent uses this to understand your data and generate accurate SQL queries. The more detailed, the better the agent performs.

## What to Include

- **Table names** — List all business-relevant tables
- **Column descriptions** — What each column represents
- **Data types** — UUID, VARCHAR, DATE, DECIMAL, INTEGER, BOOLEAN, etc.
- **Relationships** — Foreign keys, joins between tables
- **Business logic** — Rules, defaults, calculations

---

## Coffee Multi-Tenant Database Schema

### TABLES:

#### 1. **tenants** (id, code, name)
- Contains all tenants (branches/locations) in the system
- **id**: UUID PRIMARY KEY - Unique tenant identifier
- **code**: VARCHAR(50) NOT NULL - Short tenant code (e.g., "BRANCH01", "OUTLET-A")
- **name**: VARCHAR(255) NOT NULL - Full tenant name (e.g., "Coffee Shop Downtown", "Outlet Kemang")
- Multi-tenant configuration for different branches/locations
- Each tenant operates independently with isolated data

#### 2. **orders** (id, tenant_id, order_date, total, payment_method)
- Contains all customer orders per tenant
- **id**: UUID PRIMARY KEY - Unique order identifier
- **tenant_id**: UUID NOT NULL - Foreign key to tenants.id (CASCADE DELETE)
- **order_date**: DATE NOT NULL - Transaction date (YYYY-MM-DD format)
- **total**: DECIMAL(12,2) DEFAULT 0 - Total order amount in currency
- **payment_method**: VARCHAR(50) - Payment type (cash, card, qris, gopay, ovo, etc.)
- Represents the order header/master data
- Indexed by tenant_id and order_date for performance

#### 3. **order_details** (id, order_id, product_name, qty, price, subtotal)
- Line items for each order - details of products purchased
- **id**: UUID PRIMARY KEY - Unique detail line identifier
- **order_id**: UUID NOT NULL - Foreign key to orders.id (CASCADE DELETE)
- **product_name**: VARCHAR(255) NOT NULL - Name of product/item sold
- **qty**: INTEGER NOT NULL - Quantity of items ordered
- **price**: DECIMAL(10,2) NOT NULL - Unit price per item
- **subtotal**: DECIMAL(12,2) NOT NULL - Calculated as qty × price
- Product names are stored directly (denormalized for flexibility)
- Indexed by order_id and product_name for fast lookups

---

### COMMON QUERIES:

#### Get All Tenants:
```sql
SELECT * FROM tenants ORDER BY name;
```

#### Get Orders for a Specific Tenant:
```sql
SELECT 
  o.id, o.order_date, o.total, o.payment_method,
  t.name as tenant_name
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
WHERE o.tenant_id = 'tenant-uuid-here'
ORDER BY o.order_date DESC;
```

#### Get Orders Within Date Range:
```sql
SELECT * FROM orders 
WHERE order_date >= '2025-01-01' 
  AND order_date <= '2025-01-31'
ORDER BY order_date DESC;
```

#### Get Complete Order with Details:
```sql
SELECT 
  o.id as order_id,
  o.order_date,
  o.total,
  o.payment_method,
  t.name as tenant_name,
  t.code as tenant_code,
  od.product_name,
  od.qty,
  od.price,
  od.subtotal
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
LEFT JOIN order_details od ON o.id = od.order_id
WHERE o.id = 'order-uuid-here';
```

#### Get Popular Products by Sales:
```sql
SELECT 
  od.product_name,
  COUNT(*) as order_count,
  SUM(od.qty) as total_quantity,
  SUM(od.subtotal) as total_revenue,
  AVG(od.price) as average_price
FROM order_details od
GROUP BY od.product_name
ORDER BY total_quantity DESC
LIMIT 10;
```

#### Get Sales Statistics per Tenant:
```sql
SELECT 
  t.name as tenant_name,
  t.code as tenant_code,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total) as total_revenue,
  AVG(o.total) as average_order_value,
  MIN(o.order_date) as first_order_date,
  MAX(o.order_date) as last_order_date
FROM tenants t
LEFT JOIN orders o ON t.id = o.tenant_id
GROUP BY t.id, t.name, t.code
ORDER BY total_revenue DESC;
```

#### Search Products by Name:
```sql
SELECT DISTINCT product_name 
FROM order_details 
WHERE LOWER(product_name) LIKE LOWER('%coffee%')
ORDER BY product_name;
```

#### Get Daily Sales Report:
```sql
SELECT 
  DATE(o.order_date) as sales_date,
  COUNT(*) as total_orders,
  SUM(o.total) as daily_revenue,
  AVG(o.total) as avg_order_value
FROM orders o
WHERE o.order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(o.order_date)
ORDER BY sales_date DESC;
```

#### Get Payment Method Distribution:
```sql
SELECT 
  payment_method,
  COUNT(*) as transaction_count,
  SUM(total) as total_amount
FROM orders
WHERE payment_method IS NOT NULL
GROUP BY payment_method
ORDER BY total_amount DESC;
```

---

### RELATIONSHIPS:

```
tenants (1) ──────< (N) orders
                    │
                    └──────< (N) order_details
```

- **tenants.id** → **orders.tenant_id** (ONE-TO-MANY)
  - One tenant can have many orders
  - CASCADE DELETE: Deleting a tenant removes all their orders

- **orders.id** → **order_details.order_id** (ONE-TO-MANY)
  - One order can have many line items (order details)
  - CASCADE DELETE: Deleting an order removes all its details

---

### INDEXES FOR PERFORMANCE:

- `idx_orders_tenant` on orders(tenant_id) - Fast tenant filtering
- `idx_orders_date` on orders(order_date) - Fast date range queries
- `idx_order_details_order` on order_details(order_id) - Fast detail lookup
- `idx_order_details_product_name` on order_details(product_name) - Fast product search

---

### BUSINESS RULES:

1. **Multi-Tenant Isolation**: Each tenant's data is isolated via tenant_id foreign key
2. **Subtotal Calculation**: order_details.subtotal = qty × price (must be consistent)
3. **Order Total**: orders.total should equal SUM(order_details.subtotal) for that order
4. **Date Format**: order_date uses DATE type (YYYY-MM-DD)
5. **Currency**: All amounts use DECIMAL(12,2) for precision
6. **Payment Methods**: Common values include "cash", "card", "qris", "gopay", "ovo", "dana"
7. **Product Names**: Stored as VARCHAR(255), case-sensitive in database but should search case-insensitive

---

### SPECIAL NOTES FOR LLM:

- Field **product_name** should be searched **SEMANTICALLY**, not exact match
- Many product names may have variations, typos, or different formats
- If user's search term differs from database, perform fuzzy/flexible search
- Use **ILIKE** (PostgreSQL) or **LOWER() + LIKE** for case-insensitive searches
- Support Indonesian and English product name queries

---

### SEMANTIC MAPPINGS (Examples):

Product name variations to handle:
- "kopi" → "coffee" | "kopi susu" → "milk coffee"
- "cappuccino" ≈ "capuccino" ≈ "capucino" (handle typos)
- "es kopi" → "iced coffee" | "kopi panas" → "hot coffee"
- "teh" → "tea" | "teh tarik" → "pulled tea"
- "susu" → "milk" | "coklat" → "chocolate"
- "roti" → "bread" | "kue" → "cake"

Payment method variations:
- "tunai" → "cash" | "kartu" → "card"
- "e-wallet" → "gopay" | "ovo" | "dana" | "shopeepay"
- "transfer" → "bank transfer" | "qr" → "qris"

---

### SEMANTIC QUERY RULES:

#### When searching products, use flexible queries:
```sql
-- Flexible product search (handles typos and variations)
SELECT DISTINCT product_name 
FROM order_details 
WHERE LOWER(product_name) LIKE LOWER('%cappuccino%')
OR LOWER(product_name) LIKE LOWER('%capuccino%');

-- Search with multiple keywords
SELECT * FROM order_details 
WHERE LOWER(product_name) LIKE '%coffee%' 
   OR LOWER(product_name) LIKE '%kopi%';
```

#### When user asks in Indonesian, translate to database values:
```sql
-- User: "Cari pesanan yang bayar pakai QRIS"
-- Translation: Search orders paid with QRIS
SELECT * FROM orders 
WHERE LOWER(payment_method) LIKE '%qris%';

-- User: "Produk paling laku apa?"
-- Translation: What are the most popular products?
SELECT product_name, SUM(qty) as total_sold
FROM order_details
GROUP BY product_name
ORDER BY total_sold DESC
LIMIT 10;
```

#### Handle ambiguous date requests intelligently:
```sql
-- "hari ini" / "today"
WHERE order_date = CURRENT_DATE

-- "minggu ini" / "this week"
WHERE order_date >= DATE_TRUNC('week', CURRENT_DATE)

-- "bulan ini" / "this month"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)

-- "bulan lalu" / "last month"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  AND order_date < DATE_TRUNC('month', CURRENT_DATE)
```

---

### DATA VALIDATION RULES:

- **qty** must be > 0
- **price** must be >= 0
- **subtotal** should equal qty × price
- **order_date** cannot be in the future
- **tenant_id** must exist in tenants table
- **order_id** in order_details must exist in orders table

---

### AGGREGATION & ANALYTICS TIPS:

1. **Revenue Calculations**: Always use SUM(total) or SUM(subtotal)
2. **Average Order Value**: AVG(total) or SUM(total)/COUNT(DISTINCT order_id)
3. **Product Performance**: GROUP BY product_name with SUM(qty), SUM(subtotal)
4. **Tenant Comparison**: GROUP BY tenant_id with appropriate aggregates
5. **Time Series**: GROUP BY DATE(order_date) for daily trends
6. **Payment Analysis**: GROUP BY payment_method for payment preferences

---

### API INTEGRATION NOTES:

This database is accessed via REST API endpoints:
- `GET /api/tenants` - List all tenants
- `GET /api/orders` - List orders (with filters: tenant_id, start_date, end_date)
- `GET /api/orders/:orderId/details` - Get order details
- `GET /api/statistics` - Get tenant statistics
- `GET /api/products/popular` - Get popular products
- `POST /api/db/execute` - Execute custom SQL queries
- `POST /api/db/batch` - Execute batch queries

Use parameterized queries ($1, $2, etc.) for security and performance.

---

## Example Use Cases:

### 1. Find top-selling products for a specific tenant:
```sql
SELECT 
  od.product_name,
  SUM(od.qty) as total_sold,
  SUM(od.subtotal) as revenue
FROM order_details od
JOIN orders o ON od.order_id = o.id
WHERE o.tenant_id = 'tenant-uuid-here'
GROUP BY od.product_name
ORDER BY total_sold DESC
LIMIT 5;
```

### 2. Compare tenant performance:
```sql
SELECT 
  t.name,
  COUNT(o.id) as order_count,
  SUM(o.total) as revenue,
  AVG(o.total) as avg_order
FROM tenants t
LEFT JOIN orders o ON t.id = o.tenant_id
GROUP BY t.id, t.name
ORDER BY revenue DESC;
```

### 3. Analyze payment method trends:
```sql
SELECT 
  payment_method,
  DATE_TRUNC('month', order_date) as month,
  COUNT(*) as transactions,
  SUM(total) as amount
FROM orders
GROUP BY payment_method, DATE_TRUNC('month', order_date)
ORDER BY month DESC, amount DESC;
```

---

**Last Updated**: 2026-02-06  
**Database Type**: PostgreSQL  
**Schema Version**: 1.0
