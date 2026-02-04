# Ekstrak Data dari coffee_multitenant_seed.sql

## Informasi File
- **Total Baris**: 334,294 baris
- **Database**: PostgreSQL
- **Sistem**: Coffee Shop Multitenant

## Struktur Database

### 1. Tabel: tenants
Tabel untuk menyimpan informasi tenant (cabang coffee shop)

**Kolom:**
- `id` (UUID) - Primary Key
- `code` (VARCHAR) - Kode tenant
- `name` (VARCHAR) - Nama tenant

**Sample Data:**
```sql
INSERT INTO tenants(id,code,name) VALUES('11111111-1111-1111-1111-111111111111','HQ','Kopi Nusantara HQ');
INSERT INTO tenants(id,code,name) VALUES('22222222-2222-2222-2222-222222222222','BR1','Kopi Nusantara BR1');
INSERT INTO tenants(id,code,name) VALUES('33333333-3333-3333-3333-333333333333','BR2','Kopi Nusantara BR2');
```

**Total Tenants:** 3 tenant
- HQ: Kopi Nusantara HQ
- BR1: Kopi Nusantara BR1
- BR2: Kopi Nusantara BR2

---

### 2. Tabel: orders
Tabel untuk menyimpan header order/transaksi

**Kolom:**
- `id` (UUID) - Primary Key
- `tenant_id` (UUID) - Foreign Key ke tabel tenants
- `order_date` (DATE) - Tanggal order
- `total` (NUMERIC) - Total harga order
- `payment_method` (VARCHAR) - Metode pembayaran

**Sample Data:**
```sql
INSERT INTO orders(id,tenant_id,order_date,total,payment_method) 
VALUES('8e3bd336-18b2-4e2d-a9e7-1266a2b85437','11111111-1111-1111-1111-111111111111','2025-11-04',349860,'cash');

INSERT INTO orders(id,tenant_id,order_date,total,payment_method) 
VALUES('b8b747c5-f96e-45b3-9c16-7ea01a5a06da','11111111-1111-1111-1111-111111111111','2025-11-04',31068,'cash');
```

**Catatan:** 
- Semua transaksi menggunakan payment method 'cash'
- Tanggal order: 2025-11-04
- Total dihitung dari sum subtotal order_details

---

### 3. Tabel: order_details
Tabel untuk menyimpan detail item dalam order

**Kolom:**
- `id` (UUID) - Primary Key
- `order_id` (UUID) - Foreign Key ke tabel orders
- `product_name` (VARCHAR) - Nama produk
- `qty` (INTEGER) - Jumlah/kuantitas
- `price` (NUMERIC) - Harga per unit
- `subtotal` (NUMERIC) - Total harga (qty × price)

**Sample Data:**
```sql
-- Order detail untuk order_id: 8e3bd336-18b2-4e2d-a9e7-1266a2b85437
INSERT INTO order_details(id,order_id,product_name,qty,price,subtotal) 
VALUES('ed81e04b-3b76-464e-9efe-6f2de6a95d89','8e3bd336-18b2-4e2d-a9e7-1266a2b85437','Matcha',3,35101,105303);

INSERT INTO order_details(id,order_id,product_name,qty,price,subtotal) 
VALUES('e686d96e-79b0-451e-8ac3-f94cd2692614','8e3bd336-18b2-4e2d-a9e7-1266a2b85437','Brownies',3,38044,114132);

INSERT INTO order_details(id,order_id,product_name,qty,price,subtotal) 
VALUES('f63c0f02-3f5d-478e-93e2-d5ab26a2e4c7','8e3bd336-18b2-4e2d-a9e7-1266a2b85437','Matcha',1,38698,38698);

-- Update total order
UPDATE orders SET total=349860 WHERE id='8e3bd336-18b2-4e2d-a9e7-1266a2b85437';
```

---

## Produk yang Tersedia

Berdasarkan sample data, produk-produk yang dijual:
1. **Matcha** - Minuman teh hijau Jepang
2. **Brownies** - Kue coklat
3. **Latte** - Kopi susu
4. **Espresso** - Kopi hitam pekat
5. **Cappuccino** - Kopi dengan foam susu
6. **Croissant** - Roti pastry
7. **Americano** - Espresso dengan air panas

---

## Relasi Antar Tabel

```
tenants (1) ----< orders (1) ----< order_details (*)
   |                |                    |
   id            tenant_id             order_id
                    id
```

- Satu tenant bisa memiliki banyak orders
- Satu order bisa memiliki banyak order_details
- Order_details menyimpan item-item yang dibeli dalam satu order

---

## Contoh Query Berguna

### 1. Mendapatkan total penjualan per tenant
```sql
SELECT 
    t.name as tenant_name,
    COUNT(o.id) as total_orders,
    SUM(o.total) as total_revenue
FROM tenants t
LEFT JOIN orders o ON t.id = o.tenant_id
GROUP BY t.id, t.name;
```

### 2. Mendapatkan produk terlaris
```sql
SELECT 
    product_name,
    SUM(qty) as total_quantity,
    SUM(subtotal) as total_revenue
FROM order_details
GROUP BY product_name
ORDER BY total_quantity DESC;
```

### 3. Mendapatkan detail order lengkap
```sql
SELECT 
    t.name as tenant,
    o.order_date,
    o.total,
    od.product_name,
    od.qty,
    od.price,
    od.subtotal
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
JOIN order_details od ON o.id = od.order_id
WHERE o.id = '8e3bd336-18b2-4e2d-a9e7-1266a2b85437';
```

### 4. Statistik penjualan harian per tenant
```sql
SELECT 
    t.name as tenant,
    o.order_date,
    COUNT(o.id) as orders_count,
    SUM(o.total) as daily_revenue
FROM orders o
JOIN tenants t ON o.tenant_id = t.id
GROUP BY t.name, o.order_date
ORDER BY o.order_date DESC, daily_revenue DESC;
```

---

## Estimasi Volume Data

Berdasarkan ukuran file (334,294 baris):
- **Estimasi Orders**: ~100,000 - 110,000 orders
- **Estimasi Order Details**: ~220,000 - 230,000 items
- **Periode Data**: November 2025
- **Rata-rata Item per Order**: 2-3 item

---

## Cara Menggunakan Data

### 1. Membuat Database
```bash
createdb coffee_db
```

### 2. Import Data
```bash
psql coffee_db < coffee_multitenant_seed.sql
```

Atau gunakan script yang sudah disediakan:
```bash
./setup-database.sh
```

### 3. Verifikasi Data
```bash
psql coffee_db -c "SELECT COUNT(*) FROM orders;"
psql coffee_db -c "SELECT * FROM tenants;"
```

---

## Notes
- File SQL ini sangat besar (334,294 baris), import mungkin memakan waktu beberapa menit
- Pastikan PostgreSQL sudah terinstall dan berjalan
- Gunakan user dengan privilege CREATE DATABASE dan INSERT
- Recommended: PostgreSQL versi 12 atau lebih tinggi
