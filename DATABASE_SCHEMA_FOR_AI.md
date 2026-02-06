# Coffee Multitenant Database Schema (For AI/LLM)

**Format:** PostgreSQL  
**Purpose:** Database connector untuk BizCopilot AI  
**Deployment:** Vercel Postgres / Supabase

---

## TABLES:

### 1. tenants (id, code, name)
Contains all coffee shop branches/locations (multitenant configuration)

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique identifier for tenant
- `code` (VARCHAR(50), NOT NULL) - Short code (HQ, BR1, BR2, etc.)
- `name` (VARCHAR(255), NOT NULL) - Full branch name

**Example Data:**
```
id: '11111111-1111-1111-1111-111111111111'
code: 'HQ'
name: 'Kopi Nusantara HQ'
```

**Typical Tenants:**
- HQ = Head Quarter / Main Branch
- BR1, BR2, BR3 = Branch 1, 2, 3
- Each tenant represents a different coffee shop location

---

### 2. orders (id, tenant_id, order_date, total, payment_method)
Customer orders for each tenant/branch

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique order identifier
- `tenant_id` (UUID, FOREIGN KEY → tenants.id, NOT NULL) - Which branch this order belongs to
- `order_date` (DATE, NOT NULL) - Date of order (YYYY-MM-DD format)
- `total` (DECIMAL(12,2), DEFAULT 0) - Total order amount in rupiah
- `payment_method` (VARCHAR(50)) - Payment type

**Payment Methods:**
- `'cash'` - Cash payment
- `'card'` - Credit/debit card
- `'e-wallet'` - Digital wallet (GoPay, OVO, Dana, etc.)
- `'qris'` - QR code payment

**Example Data:**
```
id: '8e3bd336-18b2-4e2d-a9e7-1266a2b85437'
tenant_id: '11111111-1111-1111-1111-111111111111'
order_date: '2025-11-04'
total: 349860
payment_method: 'cash'
```

---

### 3. order_details (id, order_id, product_name, qty, price, subtotal)
Line items for each order (what products were purchased)

**Columns:**
- `id` (UUID, PRIMARY KEY) - Unique identifier for order detail
- `order_id` (UUID, FOREIGN KEY → orders.id, NOT NULL) - Which order this item belongs to
- `product_name` (VARCHAR(255), NOT NULL) - Name of the product
- `qty` (INTEGER, NOT NULL) - Quantity purchased
- `price` (DECIMAL(10,2), NOT NULL) - Unit price per item
- `subtotal` (DECIMAL(12,2), NOT NULL) - qty × price

**Product Categories:**
1. **Coffee Drinks:**
   - Espresso
   - Latte
   - Cappuccino
   - Americano
   - Matcha

2. **Food/Pastries:**
   - Croissant
   - Brownies

**Example Data:**
```
id: 'ed81e04b-3b76-464e-9efe-6f2de6a95d89'
order_id: '8e3bd336-18b2-4e2d-a9e7-1266a2b85437'
product_name: 'Matcha'
qty: 3
price: 35101
subtotal: 105303
```

---

## RELATIONSHIPS:

```
tenants (1) ─────< orders (many)
   │
   └─ One tenant can have many orders

orders (1) ─────< order_details (many)
   │
   └─ One order can have many line items
```

**Foreign Keys:**
- `orders.tenant_id` → `tenants.id` (CASCADE DELETE)
- `order_details.order_id` → `orders.id` (CASCADE DELETE)

---

## INDEXES (for performance):

```sql
idx_orders_tenant             ON orders(tenant_id)
idx_orders_date               ON orders(order_date)
idx_order_details_order       ON order_details(order_id)
idx_order_details_product_name ON order_details(product_name)
```

---

## COMMON QUERIES:

### 1. Get all tenants/branches
```sql
SELECT id, code, name FROM tenants ORDER BY code;
```

### 2. Find orders by tenant
```sql
SELECT * FROM orders 
WHERE tenant_id = '11111111-1111-1111-1111-111111111111'
ORDER BY order_date DESC;
```

### 3. Get order details with full information
```sql
SELECT 
    o.id as order_id,
    o.order_date,
    o.total,
    o.payment_method,
    t.name as tenant_name,
    od.product_name,
    od.qty,
    od.price,
    od.subtotal
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
JOIN order_details od ON o.order_id = od.id
WHERE o.id = 'YOUR_ORDER_ID';
```

### 4. Daily sales by tenant
```sql
SELECT 
    t.name as tenant_name,
    o.order_date,
    COUNT(o.id) as total_orders,
    SUM(o.total) as daily_revenue
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
WHERE o.order_date = '2025-11-04'
GROUP BY t.name, o.order_date
ORDER BY daily_revenue DESC;
```

### 5. Best selling products
```sql
SELECT 
    product_name,
    SUM(qty) as total_sold,
    COUNT(DISTINCT order_id) as times_ordered,
    AVG(price) as avg_price
FROM order_details
GROUP BY product_name
ORDER BY total_sold DESC;
```

### 6. Get orders by date range
```sql
SELECT * FROM orders 
WHERE order_date BETWEEN '2025-11-01' AND '2025-11-30'
  AND tenant_id = 'YOUR_TENANT_ID'
ORDER BY order_date, id;
```

### 7. Revenue by payment method
```sql
SELECT 
    payment_method,
    COUNT(*) as order_count,
    SUM(total) as total_revenue
FROM orders
WHERE order_date >= '2025-11-01'
GROUP BY payment_method
ORDER BY total_revenue DESC;
```

### 8. Find specific product sales
```sql
SELECT 
    od.product_name,
    o.order_date,
    t.name as tenant_name,
    SUM(od.qty) as quantity,
    SUM(od.subtotal) as revenue
FROM order_details od
JOIN orders o ON od.order_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE LOWER(od.product_name) LIKE '%latte%'
GROUP BY od.product_name, o.order_date, t.name
ORDER BY o.order_date DESC;
```

---

## SPECIAL NOTES FOR LLM/AI:

### 1. Semantic Search for Products
Product names should be searched **SEMANTICALLY**, not just exact match.

**Product Name Variations:**
Users might ask in different ways:
- "kopi" → search for: Espresso, Latte, Cappuccino, Americano
- "makanan" / "food" → search for: Croissant, Brownies
- "minuman" / "drink" → search for all coffee drinks + Matcha
- "teh" / "tea" → Matcha
- "roti" / "bread" / "pastry" → Croissant, Brownies

### 2. Semantic Mappings (Indonesian ↔ English):

**Coffee Terms:**
- "kopi espresso" / "kopi hitam" → "Espresso"
- "kopi susu" / "coffee with milk" → "Latte" or "Cappuccino"
- "kopi americano" → "Americano"
- "teh hijau" / "green tea" → "Matcha"

**Food Terms:**
- "roti croissant" / "croissant" → "Croissant"
- "brownies" / "kue coklat" / "chocolate cake" → "Brownies"

**Payment Terms:**
- "tunai" / "cash" / "uang cash" → payment_method = 'cash'
- "kartu" / "card" / "debit" / "kredit" → payment_method = 'card'
- "e-wallet" / "dompet digital" / "gopay" / "ovo" → payment_method = 'e-wallet'
- "qr" / "qris" / "barcode" → payment_method = 'qris'

**Tenant/Branch Terms:**
- "cabang" / "branch" / "outlet" / "toko" → tenants table
- "kantor pusat" / "head office" / "HQ" → tenant with code 'HQ'
- "cabang 1" / "branch 1" → tenant with code 'BR1'

### 3. Semantic Query Rules:

#### Rule 1: Use ILIKE for fuzzy/partial matching
```sql
-- Good: Find products containing "latte"
SELECT * FROM order_details 
WHERE LOWER(product_name) LIKE '%latte%';

-- Good: Case-insensitive search
SELECT * FROM tenants 
WHERE name ILIKE '%kopi%';
```

#### Rule 2: When user mentions category, expand to multiple products
```sql
-- User asks: "berapa penjualan kopi?"
-- Expand to all coffee types:
SELECT * FROM order_details 
WHERE LOWER(product_name) IN ('espresso', 'latte', 'cappuccino', 'americano', 'matcha');
```

#### Rule 3: Date queries should be flexible
```sql
-- User says "hari ini" / "today"
WHERE order_date = CURRENT_DATE

-- User says "kemarin" / "yesterday"
WHERE order_date = CURRENT_DATE - INTERVAL '1 day'

-- User says "minggu ini" / "this week"
WHERE order_date >= DATE_TRUNC('week', CURRENT_DATE)

-- User says "bulan ini" / "this month"
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE)
```

#### Rule 4: Handle aggregation questions intelligently
```sql
-- "Berapa total penjualan?"
SELECT SUM(total) FROM orders;

-- "Berapa rata-rata per order?"
SELECT AVG(total) FROM orders;

-- "Produk terlaris?"
SELECT product_name, SUM(qty) as total 
FROM order_details 
GROUP BY product_name 
ORDER BY total DESC 
LIMIT 5;
```

### 4. Common User Question Patterns:

| User Question (ID) | English | SQL Strategy |
|--------------------|---------|--------------|
| "Ada berapa cabang?" | "How many branches?" | `SELECT COUNT(*) FROM tenants` |
| "Cabang mana saja?" | "What branches?" | `SELECT code, name FROM tenants` |
| "Penjualan hari ini?" | "Today's sales?" | `WHERE order_date = CURRENT_DATE` |
| "Produk terlaris?" | "Best sellers?" | `GROUP BY product_name ORDER BY SUM(qty) DESC` |
| "Total omzet?" | "Total revenue?" | `SELECT SUM(total) FROM orders` |
| "Order pakai cash?" | "Cash orders?" | `WHERE payment_method = 'cash'` |
| "Berapa harga latte?" | "Latte price?" | `SELECT AVG(price) FROM order_details WHERE product_name ILIKE '%latte%'` |

### 5. Multi-step Query Strategy:

**Example: "Tampilkan detail order terakhir dari cabang HQ"**

Step 1: Get tenant_id for 'HQ'
```sql
SELECT id FROM tenants WHERE code = 'HQ';
```

Step 2: Get latest order
```sql
SELECT * FROM orders 
WHERE tenant_id = 'TENANT_ID_FROM_STEP1'
ORDER BY order_date DESC, id DESC
LIMIT 1;
```

Step 3: Get order details
```sql
SELECT * FROM order_details 
WHERE order_id = 'ORDER_ID_FROM_STEP2';
```

**Or use JOIN (better):**
```sql
SELECT 
    t.name as branch,
    o.*,
    json_agg(json_build_object(
        'product', od.product_name,
        'qty', od.qty,
        'price', od.price,
        'subtotal', od.subtotal
    )) as items
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
JOIN order_details od ON o.order_id = od.id
WHERE t.code = 'HQ'
GROUP BY t.name, o.id
ORDER BY o.order_date DESC, o.id DESC
LIMIT 1;
```

---

## DATA TYPES & CONSTRAINTS:

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| id (all tables) | UUID | PRIMARY KEY | Use `gen_random_uuid()` if auto-generating |
| tenant_id | UUID | FOREIGN KEY, NOT NULL | Must exist in tenants |
| order_id | UUID | FOREIGN KEY, NOT NULL | Must exist in orders |
| code | VARCHAR(50) | NOT NULL | Unique per tenant |
| name | VARCHAR(255) | NOT NULL | Full descriptive name |
| order_date | DATE | NOT NULL | Format: YYYY-MM-DD |
| total | DECIMAL(12,2) | DEFAULT 0 | In rupiah, up to 999,999,999,999.99 |
| payment_method | VARCHAR(50) | NULL allowed | Default NULL = unknown |
| product_name | VARCHAR(255) | NOT NULL | Case-sensitive stored, case-insensitive search |
| qty | INTEGER | NOT NULL | Must be > 0 |
| price | DECIMAL(10,2) | NOT NULL | Unit price in rupiah |
| subtotal | DECIMAL(12,2) | NOT NULL | Calculated: qty * price |

---

## SAMPLE REALISTIC QUERIES:

### Analytics Query: Top 5 products by revenue
```sql
SELECT 
    product_name,
    SUM(qty) as total_quantity,
    SUM(subtotal) as total_revenue,
    AVG(price) as average_price,
    COUNT(DISTINCT order_id) as order_count
FROM order_details
GROUP BY product_name
ORDER BY total_revenue DESC
LIMIT 5;
```

### Business Query: Compare branches performance
```sql
SELECT 
    t.name as branch_name,
    COUNT(DISTINCT o.id) as total_orders,
    SUM(o.total) as total_revenue,
    AVG(o.total) as average_order_value,
    COUNT(DISTINCT DATE(o.order_date)) as days_active
FROM tenants t
LEFT JOIN orders o ON t.id = o.tenant_id
GROUP BY t.id, t.name
ORDER BY total_revenue DESC;
```

### Trend Query: Daily revenue trend
```sql
SELECT 
    order_date,
    COUNT(*) as order_count,
    SUM(total) as daily_revenue,
    AVG(total) as avg_order_value
FROM orders
WHERE order_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY order_date
ORDER BY order_date DESC;
```

---

## IMPORTANT AI BEHAVIOR GUIDELINES:

### ✅ DO:
1. **Use ILIKE or LOWER() for case-insensitive searches**
2. **Handle Indonesian and English terms interchangeably**
3. **Aggregate data when user asks about totals/averages**
4. **Join tables to provide complete information**
5. **Use date functions for relative dates (today, yesterday, this month)**
6. **Group by product_name when analyzing product performance**
7. **Include tenant_name in results for better context**
8. **Format currency amounts clearly (add "Rp" prefix)**

### ❌ DON'T:
1. **Don't use exact match on product_name unless specifically requested**
2. **Don't assume case sensitivity - always use LOWER() or ILIKE**
3. **Don't forget to JOIN when showing related data**
4. **Don't return raw UUIDs without context**
5. **Don't ignore NULL values in payment_method**
6. **Don't use SELECT * in production queries - specify columns**
7. **Don't forget ON DELETE CASCADE behavior**

---

## EXAMPLE AI CONVERSATION FLOWS:

### Q1: "Berapa total penjualan bulan ini?"
**AI Understanding:** User wants total revenue for current month  
**SQL Query:**
```sql
SELECT 
    SUM(total) as total_revenue,
    COUNT(*) as order_count,
    AVG(total) as average_order
FROM orders
WHERE order_date >= DATE_TRUNC('month', CURRENT_DATE);
```
**Response Format:** "Total penjualan bulan ini adalah Rp X dari Y orders, dengan rata-rata Rp Z per order."

---

### Q2: "Produk apa yang paling laris di cabang HQ?"
**AI Understanding:** Need to find best-selling products at HQ branch  
**SQL Query:**
```sql
SELECT 
    od.product_name,
    SUM(od.qty) as total_sold,
    SUM(od.subtotal) as total_revenue,
    COUNT(DISTINCT od.order_id) as times_ordered
FROM order_details od
JOIN orders o ON od.order_id = o.id
JOIN tenants t ON o.tenant_id = t.id
WHERE t.code = 'HQ'
GROUP BY od.product_name
ORDER BY total_sold DESC
LIMIT 5;
```
**Response Format:** "Produk terlaris di HQ:\n1. [Product] - [qty] terjual, revenue Rp [amount]\n..."

---

### Q3: "Tampilkan order yang pakai e-wallet minggu ini"
**AI Understanding:** Filter orders by payment method and date range  
**SQL Query:**
```sql
SELECT 
    o.id,
    t.name as branch,
    o.order_date,
    o.total,
    o.payment_method
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
WHERE o.payment_method = 'e-wallet'
  AND o.order_date >= DATE_TRUNC('week', CURRENT_DATE)
ORDER BY o.order_date DESC;
```

---

## CURRENCY FORMATTING:

All amounts are in **Indonesian Rupiah (IDR)**:
- Display: "Rp 349.860" (with thousand separators)
- Storage: 349860 (DECIMAL without separators)

**Formatting Examples:**
- 35000 → "Rp 35.000"
- 349860 → "Rp 349.860"
- 1250000 → "Rp 1.250.000"

---

## VERSION INFO:

- Schema Version: 1.0
- Last Updated: 2026-02-06
- Compatible with: PostgreSQL 13+, Supabase, Vercel Postgres
- Connector Type: BizCopilot Database Connector
- Multitenant: Yes (tenant_id based)

---

**END OF SCHEMA DOCUMENTATION**

This schema is optimized for AI/LLM understanding and semantic query generation.
For technical deployment, see: schema.sql
For sample data, see: coffee_multitenant_seed.sql
