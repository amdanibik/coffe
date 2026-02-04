# 🚀 Deploy Aplikasi ke Vercel (Backend + Database)

## 📋 Overview

Panduan ini akan deploy:
- ✅ **Backend API** ke Vercel (Serverless)
- ✅ **PostgreSQL Database** ke Vercel Postgres (powered by Neon)
- ✅ **100% GRATIS** untuk tier hobby!

Repository GitHub Anda: `amdanibik/coffe`

---

## 🎯 Arsitektur Deployment

```
┌─────────────────┐
│  GitHub Repo    │  amdanibik/coffe
│  (Source Code)  │
└────────┬────────┘
         │ Auto Deploy
         ▼
┌─────────────────┐
│  Vercel         │  Serverless Functions
│  (Backend API)  │  https://coffe-xxx.vercel.app
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Vercel Postgres │  PostgreSQL (Neon)
│  (Database)     │  Connection pooling
└─────────────────┘
```

---

## 1️⃣ Persiapan Project

### Update package.json

Tambahkan script build untuk Vercel:

```bash
# Edit package.json, tambahkan:
"scripts": {
  "start": "node server.js",
  "dev": "nodemon server.js",
  "build": "echo 'Build complete'",
  "vercel-build": "echo 'Vercel build complete'"
}
```

### Update .gitignore

Pastikan file sensitif tidak ter-push:
```
node_modules/
.env
.env.local
.env.supabase
.vercel
```

### Commit & Push ke GitHub

```bash
# Pastikan semua perubahan sudah di-commit
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

---

## 2️⃣ Deploy Backend ke Vercel

### A. Via Vercel Dashboard (MUDAH - Recommended)

1. **Buka** [https://vercel.com](https://vercel.com)
2. **Login/Sign up** dengan GitHub
3. **Klik "Add New..."** → **"Project"**
4. **Import** repository `amdanibik/coffe`
5. **Configure Project:**
   ```
   Framework Preset: Other
   Build Command: (leave default)
   Output Directory: (leave blank)
   Install Command: (leave default)
   Root Directory: ./
   ```
   
   **PENTING:** Jangan set Environment Variables dulu!
   Environment variables akan di-set setelah database dibuat.

6. **Klik "Deploy"**
7. Tunggu ~1-2 menit
8. ✅ Backend API deployed!

URL: `https://coffe-xxx.vercel.app`

### B. Via Vercel CLI (Alternative)

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: coffee-connector
# - Directory: ./
# - Override settings? No
```

---

## 3️⃣ Setup Vercel Postgres Database

### A. Create Database via Dashboard

1. Di **Vercel Dashboard**, pilih project `coffe`
2. Klik tab **"Storage"**
3. Klik **"Create Database"**
4. Pilih **"Postgres"** (powered by Neon)
5. Database name: `coffee-db`
6. Region: **Singapore** atau terdekat
7. Klik **"Create"**
8. Tunggu ~30 detik database ready

### B. Connect Database ke Project

1. Setelah database dibuat, klik **"Connect"**
2. Select project: **coffe**
3. Environment: **Production, Preview, Development** (pilih semua)
4. Klik **"Connect"**

✅ **Vercel otomatis menambahkan environment variables berikut:**
```
POSTGRES_URL
POSTGRES_PRISMA_URL
POSTGRES_URL_NON_POOLING
POSTGRES_USER
POSTGRES_HOST
POSTGRES_PASSWORD
POSTGRES_DATABASE
```

---

## 4️⃣ Update Code untuk Vercel Postgres

### Edit src/dbConnector.js

File sudah support Vercel Postgres! Pastikan code ini ada:

```javascript
// Support DATABASE_URL or POSTGRES_URL (Vercel)
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (databaseUrl) {
  this.config = {
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false
    }
  };
}
```

### Commit Update

```bash
git add .
git commit -m "Add Vercel Postgres support"
git push origin main
```

Vercel akan auto-deploy ulang! 🚀

---

## 5️⃣ Migrate Data ke Vercel Postgres

### Opsi A: Via Vercel Postgres Dashboard

1. Di Vercel Dashboard → **Storage** → **coffee-db**
2. Klik tab **"Query"**
3. Buat tables:

```sql
-- Create tables
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

-- Create indexes
CREATE INDEX idx_orders_tenant_id ON orders(tenant_id);
CREATE INDEX idx_orders_order_date ON orders(order_date);
CREATE INDEX idx_order_details_order_id ON order_details(order_id);
CREATE INDEX idx_order_details_product_name ON order_details(product_name);
```

4. Klik **"Run Query"**

### Opsi B: Via Command Line (psql)

```bash
# 1. Get connection string dari Vercel Dashboard
# Storage → coffee-db → .env.local tab → Copy POSTGRES_URL

# 2. Migrate dengan psql
psql "postgres://default:xxx@xxx.neon.tech:5432/verceldb?sslmode=require" < coffee_multitenant_seed.sql
```

### Opsi C: Via Script (Gunakan migrate script)

Buat file `migrate-to-vercel.sh`:

```bash
#!/bin/bash

# Load Vercel Postgres URL
VERCEL_POSTGRES_URL="your-postgres-url-from-vercel"

# Create tables
psql "$VERCEL_POSTGRES_URL" << 'EOF'
-- Create tables here
EOF

# Import data
psql "$VERCEL_POSTGRES_URL" < coffee_multitenant_seed.sql
```

**CATATAN:** File SQL sangat besar (52MB), upload via dashboard bisa timeout. Gunakan psql command line.

---

## 6️⃣ Environment Variables

### Auto-set by Vercel (sudah ada):

```
POSTGRES_URL          → Full connection string
POSTGRES_HOST         → Database host
POSTGRES_USER         → Database user
POSTGRES_PASSWORD     → Database password
POSTGRES_DATABASE     → Database name
```

### Manual set (perlu ditambahkan):

**SETELAH database connected**, tambahkan environment variables tambahan:

1. Di Vercel Dashboard → Project → **Settings** → **Environment Variables**
2. Klik **"Add New"**
3. Tambahkan satu per satu:

| Key | Value |
|-----|-------|
| `CONNECTOR_API_KEY` | `your-production-api-key-12345` |
| `QUERY_TIMEOUT` | `30000` |
| `NODE_ENV` | `production` |

4. Untuk setiap variable:
   - Pilih Environment: **Production, Preview, Development** (all)
   - Klik **"Save"**

5. Setelah semua tersimpan, klik **"Redeploy"** di tab Deployments

---

## 7️⃣ Test Production API

### Get Production URL

URL production Anda: `https://coffe-xxx.vercel.app`

(Lihat di Vercel Dashboard → Domains)

### Test Endpoints

```bash
# Test connection
curl -X POST \
  -H "X-API-Key: your-api-key" \
  https://coffe-xxx.vercel.app/api/test-connection

# Get tenants
curl -H "X-API-Key: your-api-key" \
  https://coffe-xxx.vercel.app/api/tenants

# Get orders
curl -H "X-API-Key: your-api-key" \
  https://coffe-xxx.vercel.app/api/orders?limit=10
```

### Test di Browser

Buka: `https://coffe-xxx.vercel.app`

Web UI akan muncul. Update:
- Connector URL: `https://coffe-xxx.vercel.app`
- API Key: (API key Anda)
- Klik "Test Connection"

---

## 8️⃣ Custom Domain (Optional)

### Tambah Custom Domain

1. Di Vercel Dashboard → Project → **Settings** → **Domains**
2. Add domain: `coffee-connector.yourdomain.com`
3. Update DNS di domain provider:
   ```
   Type: CNAME
   Name: coffee-connector
   Value: cname.vercel-dns.com
   ```
4. Tunggu DNS propagation (~5-60 menit)
5. ✅ SSL otomatis dari Vercel!

---

## 9️⃣ Monitoring & Logs

### View Logs

1. Vercel Dashboard → Project → **Deployments**
2. Klik deployment terakhir
3. Tab **"Logs"** untuk melihat runtime logs
4. Tab **"Functions"** untuk melihat serverless function calls

### Monitor Database

1. Vercel Dashboard → **Storage** → **coffee-db**
2. Tab **"Usage"** untuk melihat:
   - Storage used
   - Queries executed
   - Connection count

---

## 🔟 Auto Deploy (CI/CD)

### GitHub Integration (Sudah Aktif)

Setiap push ke GitHub akan auto-deploy:

```bash
git add .
git commit -m "Update feature"
git push origin main
# ✓ Vercel auto-deploy dalam 1-2 menit!
```

### Branch Previews

Setiap branch otomatis dapat preview URL:

```bash
git checkout -b feature/new-endpoint
git push origin feature/new-endpoint
# ✓ Preview URL: https://coffe-xxx-git-feature-xxx.vercel.app
```

---

## 💰 Pricing & Limits

### Vercel Hobby (FREE):

✅ **Deployment:**
- Unlimited deployments
- 100 GB bandwidth/month
- Serverless Functions: 100 GB-hours/month
- Fast refresh & HMR

✅ **Vercel Postgres (FREE tier):**
- 256 MB storage (cukup untuk 52MB data!)
- 60 hours compute time/month
- 256 MB RAM per query

**Total: 100% GRATIS untuk aplikasi ini!** ✅

### Vercel Pro ($20/month):

- 1 TB bandwidth
- 1000 GB-hours functions
- Team collaboration
- Advanced analytics

---

## 🎯 Optimization Tips

### 1. Connection Pooling

Vercel Serverless butuh connection pooling:

```javascript
// src/dbConnector.js sudah optimal
max: 10, // Jangan terlalu banyak
connectionTimeoutMillis: 5000
```

### 2. Environment Variables

Gunakan `POSTGRES_URL` dari Vercel (sudah include pooling):

```javascript
const databaseUrl = process.env.POSTGRES_URL;
```

### 3. Cold Start

Serverless functions bisa cold start. Tambahkan:

```javascript
// Warm-up endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

### 4. Caching

Tambahkan cache headers:

```javascript
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=60');
  next();
});
```

---

## 🛠 Troubleshooting

### Error: Database Connection Failed

1. Check environment variables di Vercel:
   - Settings → Environment Variables
   - Pastikan `POSTGRES_URL` ada

2. Redeploy:
   - Deployments → Latest → "..." → Redeploy

### Error: Module Not Found

```bash
# Pastikan dependencies di package.json
npm install --save pg express cors dotenv

# Commit dan push
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Error: Function Timeout

Vercel free tier: 10 second timeout

Update code untuk query besar:
```javascript
// Tambahkan pagination
const limit = Math.min(req.query.limit || 100, 1000);
```

### Database Storage Full (256MB)

**Upgrade to Pro** atau gunakan Neon.tech langsung (free tier lebih besar)

---

## 📊 Architecture Best Practices

### Current Setup (Serverless):

```javascript
// ✅ GOOD: Efficient connection handling
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  max: 10,
  ssl: { rejectUnauthorized: false }
});
```

### Connection Reuse:

```javascript
// ✅ Singleton pattern sudah diimplementasi
// di src/dbConnector.js
```

---

## 🚀 Deployment Checklist

- [x] Code di-push ke GitHub (`amdanibik/coffe`)
- [ ] Deploy project ke Vercel (via dashboard/CLI)
- [ ] Create Vercel Postgres database
- [ ] Connect database to project
- [ ] Migrate tables (via Query editor)
- [ ] Import data (via psql atau split file)
- [ ] Set environment variables (API_KEY, etc)
- [ ] Test production endpoints
- [ ] Verify data di database
- [ ] Setup custom domain (optional)
- [ ] Monitor logs & usage
- [ ] DONE! ✅

---

## 📞 Resources

- **Vercel Docs**: https://vercel.com/docs
- **Vercel Postgres**: https://vercel.com/docs/storage/vercel-postgres
- **GitHub Repo**: https://github.com/amdanibik/coffe
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## 🎉 Summary

### Langkah Singkat:

1. **Deploy**: Import GitHub repo ke Vercel
2. **Database**: Create Vercel Postgres di Storage
3. **Connect**: Connect database to project
4. **Migrate**: Upload tables & data via Query editor atau psql
5. **Config**: Set environment variables (API_KEY)
6. **Test**: Test production API
7. **Done**: Aplikasi live! ✅

### URLs:

- **Production**: `https://coffe-xxx.vercel.app`
- **Dashboard**: `https://vercel.com/amdanibik/coffe`
- **Database**: Vercel Dashboard → Storage → coffee-db

---

**Ready to Deploy! 🚀**

Mulai dengan: https://vercel.com → Import GitHub repo `amdanibik/coffe`
