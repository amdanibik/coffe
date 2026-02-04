# 🎯 PANDUAN LENGKAP: Buat Database & Migrate Data

## ✅ Status Progress

- [x] Vercel CLI installed
- [x] Login ke Vercel
- [x] Environment variables set:
  - ✓ CONNECTOR_API_KEY = test-api-key-12345
  - ✓ QUERY_TIMEOUT = 30000
- [ ] **CREATE DATABASE** ← ANDA DI SINI
- [ ] Migrate data (52MB)
- [ ] Test dari Bizcopilot

---

## 📋 Langkah 1: Buat Vercel Postgres Database

### Via Web Dashboard (RECOMMENDED)

1. **Buka Vercel Dashboard:**
   ```
   https://vercel.com/amdanibiks-projects/coffee
   ```

2. **Navigasi ke Storage:**
   - Klik tab **"Storage"** di navigation bar
   - Atau direct link: https://vercel.com/amdanibiks-projects/coffee/stores

3. **Create Database:**
   - Klik button **"Create Database"**
   - Pilih **"Postgres"** (powered by Neon)

4. **Configure Database:**
   ```
   Database Name: coffee-db
   Region: Singapore (sin1)  ← Pilih yang terdekat dengan user
   ```

5. **Create & Connect:**
   - Klik **"Create"**
   - Tunggu ~30 detik hingga database ready
   - Klik **"Connect to Project"**
   - Select project: **coffee**
   - Environment: **All** (Production, Preview, Development)
   - Klik **"Connect"**

6. **Vercel akan auto-set environment variables:**
   ```
   POSTGRES_URL
   POSTGRES_PRISMA_URL
   POSTGRES_URL_NO_SSL
   POSTGRES_URL_NON_POOLING
   POSTGRES_USER
   POSTGRES_HOST
   POSTGRES_PASSWORD
   POSTGRES_DATABASE
   ```

7. **Copy POSTGRES_URL:**
   - Setelah connect, akan muncul tab **".env.local"**
   - Copy value dari `POSTGRES_URL`
   - Format: `postgres://default:xxxxx@xxxxx-pooler.sin1.postgres.vercel-storage.com/verceldb`

---

## 📋 Langkah 2: Migrate Data (52MB)

### Otomatis via Script

Setelah dapat POSTGRES_URL, jalankan:

```bash
./setup-vercel-complete.sh 'postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb'
```

Script akan:
- ✓ Test koneksi database
- ✓ Drop tables jika sudah ada (konfirmasi dulu)
- ✓ Import 52MB SQL file (~334K rows)
- ✓ Verifikasi data (tenants, products, customers, orders, order_details)
- ✓ Test sample queries

**Estimasi waktu:** 5-10 menit

---

## 📋 Langkah 3: Redeploy & Test

### Redeploy Production

```bash
vercel --prod
```

Atau tunggu auto-deploy dari GitHub (1-2 menit).

### Test API Endpoints

```bash
# Test 1: Health Check (no auth)
curl https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app/health

# Test 2: Tenants (dengan auth)
curl -H "X-API-Key: test-api-key-12345" \
  https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app/api/tenants

# Test 3: Statistics
curl -H "X-API-Key: test-api-key-12345" \
  https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app/api/statistics

# Test 4: Popular Products
curl -H "X-API-Key: test-api-key-12345" \
  https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app/api/products/popular
```

### Test dari Bizcopilot

1. Buka: https://staging-ok.bizcopilot.app/settings/database
2. Isi form:
   ```
   Connector URL: https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app
   API Key: test-api-key-12345
   Database Type: PostgreSQL
   Query Timeout: 30000
   ```
3. Klik **"Test Connection"**
4. Expected response:
   ```json
   {
     "success": true,
     "message": "Database connection successful",
     "data": {
       "connected": true,
       "config": {...}
     }
   }
   ```

---

## 🔧 Manual Migration (Alternatif)

Jika script gagal, migrate manual via psql:

```bash
# 1. Install psql (jika belum ada)
sudo apt-get install postgresql-client

# 2. Test connection
psql "postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb" -c "SELECT version();"

# 3. Import data
psql "postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb" \
  -f coffee_multitenant_seed.sql

# 4. Verify
psql "postgres://default:xxxxx@xxxxx.postgres.vercel-storage.com/verceldb" -c "
SELECT 
  (SELECT COUNT(*) FROM tenants) as tenants,
  (SELECT COUNT(*) FROM products) as products,
  (SELECT COUNT(*) FROM customers) as customers,
  (SELECT COUNT(*) FROM orders) as orders,
  (SELECT COUNT(*) FROM order_details) as order_details;
"
```

---

## 🚨 Troubleshooting

### Error: "psql: command not found"

**Solution:**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

### Error: "FATAL: password authentication failed"

**Solution:**
- POSTGRES_URL salah
- Copy ulang dari Vercel Dashboard
- Pastikan menggunakan URL dengan `-pooler` untuk connection pooling

### Error: "relation 'tenants' already exists"

**Solution:**
Script akan tanya konfirmasi untuk drop tables. Jawab `yes` untuk re-import.

### Import Timeout

**Solution:**
- Vercel Postgres ada limit timeout
- Import via chunks jika perlu:
  ```bash
  # Split SQL file
  split -l 50000 coffee_multitenant_seed.sql chunk_
  
  # Import per chunk
  for file in chunk_*; do
    psql "$POSTGRES_URL" -f "$file"
  done
  ```

### Connection Pooling Issues

**Solution:**
Gunakan `POSTGRES_URL` (dengan pooler), bukan `POSTGRES_URL_NON_POOLING`.

---

## ✅ Checklist Lengkap

- [x] Vercel CLI installed & logged in
- [x] Environment variables set (CONNECTOR_API_KEY, QUERY_TIMEOUT)
- [ ] **Create Vercel Postgres database** ← LAKUKAN INI
- [ ] Copy POSTGRES_URL dari dashboard
- [ ] Run migration script
- [ ] Verify data imported (334K rows)
- [ ] Test API endpoints
- [ ] Test dari Bizcopilot
- [ ] DONE! 🎉

---

## 🎯 Quick Commands

```bash
# Check environment variables
vercel env ls

# Pull environment variables locally
vercel env pull .env.vercel.local

# Check deployment status
vercel ls

# View logs
vercel logs https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app

# Redeploy
vercel --prod
```

---

## 📞 Links Penting

- **Vercel Dashboard:** https://vercel.com/amdanibiks-projects/coffee
- **Storage Tab:** https://vercel.com/amdanibiks-projects/coffee/stores
- **Production URL:** https://coffe-uk5i-git-main-amdanibiks-projects.vercel.app
- **Bizcopilot:** https://staging-ok.bizcopilot.app/settings/database
- **GitHub Repo:** https://github.com/amdanibik/coffe

---

## 🚀 Setelah Selesai

Database Anda akan berisi:
- **3 Tenants** (HQ, Branch A, Branch B)
- **40 Products** (berbagai jenis kopi)
- **1000+ Customers**
- **~100K Orders**
- **~220K Order Details**
- **Total: 334K rows, 52MB data**

Siap dipakai untuk testing Bizcopilot! ☕️
