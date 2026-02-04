# 🚀 Deploy Aplikasi ke Supabase

## 📋 Overview

Panduan ini akan membantu Anda:
1. Setup project di Supabase
2. Migrate database ke Supabase PostgreSQL
3. Update konfigurasi aplikasi
4. Deploy backend API

---

## 1️⃣ Setup Supabase Project

### Langkah A: Buat Project di Supabase

1. Buka [https://supabase.com](https://supabase.com)
2. Login atau Sign up (gratis)
3. Klik **"New Project"**
4. Isi form:
   - **Name**: `coffee-multitenant`
   - **Database Password**: (buat password yang kuat, simpan!)
   - **Region**: Pilih yang terdekat (contoh: Singapore)
5. Tunggu project selesai dibuat (~2 menit)

### Langkah B: Dapatkan Database Credentials

1. Di dashboard Supabase, klik **Settings** (⚙️)
2. Klik **Database**
3. Scroll ke bagian **Connection string**
4. Copy **Connection string** dalam format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres
   ```

---

## 2️⃣ Migrate Database ke Supabase

### Opsi A: Via Supabase SQL Editor (Recommended)

1. Di dashboard Supabase, buka **SQL Editor**
2. Klik **"New Query"**
3. Buat tabel dengan query berikut:

```sql
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_date ON orders(order_date);
CREATE INDEX IF NOT EXISTS idx_order_details_order_id ON order_details(order_id);
CREATE INDEX IF NOT EXISTS idx_order_details_product_name ON order_details(product_name);
```

4. Klik **"Run"** atau tekan `Ctrl+Enter`

### Opsi B: Via psql Command Line

```bash
# Gunakan connection string dari Supabase
psql "postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres" < coffee_multitenant_seed.sql
```

**CATATAN:** File SQL sangat besar (52MB), upload via SQL Editor bisa timeout. Gunakan script migrate yang sudah disediakan.

---

## 3️⃣ Update Konfigurasi Aplikasi

### Edit file `.env.supabase`

File ini sudah dibuat untuk Anda. Edit dengan credentials Supabase:

```env
# Supabase Database Configuration
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-supabase-database-password

# Atau gunakan connection string langsung:
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# Connector Configuration
CONNECTOR_API_KEY=your-secure-api-key-production
QUERY_TIMEOUT=30000

# Server Configuration
PORT=3000
```

### Cara mendapatkan info:
- **DB_HOST**: Dari connection string, bagian `@db.xxxxx.supabase.co`
- **DB_PASSWORD**: Password yang Anda buat saat setup project
- **DATABASE_URL**: Copy langsung dari Supabase Dashboard

---

## 4️⃣ Migrate Data ke Supabase

### Menggunakan Script Migrate

```bash
# Pastikan sudah edit .env.supabase dengan credentials Supabase
./migrate-to-supabase.sh
```

Script ini akan:
1. ✓ Create tables di Supabase
2. ✓ Migrate data dari local ke Supabase
3. ✓ Verify data berhasil di-upload
4. ✓ Create indexes

### Manual Migration (Jika script gagal)

```bash
# 1. Export data dari local
pg_dump -U postgres -d coffee_db --data-only > data_only.sql

# 2. Import ke Supabase
psql "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres" < data_only.sql
```

---

## 5️⃣ Test Koneksi ke Supabase

### Update .env untuk testing

```bash
# Backup .env lama
cp .env .env.local

# Gunakan config Supabase
cp .env.supabase .env
```

### Test aplikasi

```bash
# Start server
npm start

# Test connection
curl -X POST \
  -H "X-API-Key: your-api-key" \
  http://localhost:3000/api/test-connection
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "data": {
    "connected": true,
    "config": {
      "host": "db.xxxxx.supabase.co",
      "database": "postgres"
    }
  }
}
```

---

## 6️⃣ Deploy Backend API

### Opsi A: Vercel (Recommended - Free)

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login:
```bash
vercel login
```

3. Deploy:
```bash
vercel
```

4. Set Environment Variables di Vercel Dashboard:
   - `DB_HOST`
   - `DB_PASSWORD`
   - `CONNECTOR_API_KEY`
   - dll (semua dari .env.supabase)

### Opsi B: Railway (Easy - Free tier)

1. Buka [https://railway.app](https://railway.app)
2. Login dengan GitHub
3. Klik **"New Project"** → **"Deploy from GitHub repo"**
4. Select repository Anda
5. Add Environment Variables dari `.env.supabase`
6. Deploy otomatis!

### Opsi C: Heroku

```bash
# Install Heroku CLI
heroku create coffee-connector

# Set env variables
heroku config:set DB_HOST=db.xxxxx.supabase.co
heroku config:set DB_PASSWORD=your-password
heroku config:set CONNECTOR_API_KEY=your-api-key

# Deploy
git push heroku main
```

### Opsi D: DigitalOcean App Platform

1. Buka [https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)
2. Create New App
3. Connect GitHub repository
4. Set environment variables
5. Deploy

---

## 7️⃣ Supabase Features (Optional)

### A. Row Level Security (RLS)

Tambahkan security policies di Supabase:

```sql
-- Enable RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_details ENABLE ROW LEVEL SECURITY;

-- Create policies (contoh: read-only untuk public)
CREATE POLICY "Allow public read access" ON tenants
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Allow public read access" ON order_details
    FOR SELECT USING (true);
```

### B. Supabase Auth (Optional)

Jika ingin gunakan Supabase Authentication:

```bash
npm install @supabase/supabase-js
```

Update `src/dbConnector.js`:
```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
```

### C. Supabase Storage (Optional)

Untuk menyimpan files/images:
1. Buka **Storage** di Supabase Dashboard
2. Create bucket
3. Upload files via UI atau API

---

## 8️⃣ Monitoring & Maintenance

### Supabase Dashboard

Monitor di: `https://app.supabase.com/project/[PROJECT-ID]`

**Database:**
- Table Editor - Lihat & edit data
- SQL Editor - Run custom queries
- Database - Connection info & settings

**Monitoring:**
- API - Request logs
- Database - Query performance
- Auth - User activity (jika pakai)

### Backup Database

```bash
# Manual backup
pg_dump "postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres" > backup.sql
```

**Automated Backup:**
Supabase Pro plan menyediakan automated daily backups.

---

## 🔒 Security Checklist

- [ ] Ganti `CONNECTOR_API_KEY` dengan value yang kuat
- [ ] Jangan commit `.env` atau `.env.supabase` ke Git
- [ ] Set environment variables di hosting platform
- [ ] Enable RLS di Supabase untuk production
- [ ] Gunakan HTTPS untuk production API
- [ ] Rotate database password secara berkala
- [ ] Monitor API usage di Supabase Dashboard

---

## 📊 Supabase Free Tier Limits

✅ **Database:**
- 500 MB storage
- Unlimited API requests
- Up to 2 GB bandwidth/month
- Paused after 1 week of inactivity (auto-wake on request)

✅ **Auth:**
- 50,000 monthly active users

✅ **Storage:**
- 1 GB storage

**Untuk aplikasi ini (52MB data):** Free tier sudah cukup! ✓

---

## 🎯 Architecture Deployment

```
┌─────────────────────────────────────────────────┐
│  Client Browser                                 │
│  http://localhost:3000 atau                     │
│  https://your-app.vercel.app                    │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Node.js Backend API                            │
│  - Express.js Server                            │
│  - API Routes                                   │
│  - Authentication                               │
│  (Deployed on: Vercel/Railway/Heroku)          │
└───────────────┬─────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────┐
│  Supabase PostgreSQL Database                   │
│  - Hosted Database (db.xxxxx.supabase.co)      │
│  - 500MB Free Storage                           │
│  - Auto Backups (Pro plan)                      │
│  - Connection Pooling                           │
└─────────────────────────────────────────────────┘
```

---

## 🆘 Troubleshooting

### Error: Connection Timeout

```bash
# Check Supabase connection pooling
# Tambahkan ?pgbouncer=true ke connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:6543/postgres?pgbouncer=true
```

### Error: Too many connections

Update `src/dbConnector.js`:
```javascript
max: 5, // Reduce from 20 to 5 for Supabase
```

### Error: SSL required

Add to connection config:
```javascript
ssl: {
  rejectUnauthorized: false
}
```

### Migration timeout

Split SQL file:
```bash
# Split into smaller chunks
split -l 10000 coffee_multitenant_seed.sql chunk_
```

---

## 📞 Support

- **Supabase Docs**: https://supabase.com/docs
- **Supabase Discord**: https://discord.supabase.com
- **Supabase Support**: support@supabase.com

---

## ✅ Deployment Checklist

- [ ] Create Supabase project
- [ ] Get database credentials
- [ ] Create tables via SQL Editor
- [ ] Migrate data (use script)
- [ ] Update `.env.supabase` with credentials
- [ ] Test local connection
- [ ] Choose hosting platform (Vercel/Railway/etc)
- [ ] Deploy backend
- [ ] Set environment variables di hosting
- [ ] Test production API
- [ ] Enable RLS for security
- [ ] Setup monitoring
- [ ] Document production URLs

---

**Status: Ready to Deploy! 🚀**

Ikuti langkah-langkah di atas untuk deploy aplikasi Anda ke Supabase!
