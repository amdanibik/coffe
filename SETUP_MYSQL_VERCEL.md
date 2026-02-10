# 🚀 Cara Menambahkan MySQL Environment Variables ke Vercel

## Pilihan 1: Menggunakan Vercel Dashboard (PALING MUDAH) ⭐

### Langkah-langkah:

1. **Buka Vercel Dashboard:**
   ```
   https://vercel.com/amdanibiks-projects/coffee/settings/environment-variables
   ```

2. **Tambahkan Environment Variables berikut:**

   Klik tombol "Add New" untuk setiap variable:

   | Key | Value | Environment |
   |-----|-------|-------------|
   | `MYSQL_HOST` | `your-mysql-host.com` | ✅ Production, ✅ Preview, ✅ Development |
   | `MYSQL_PORT` | `3306` | ✅ Production, ✅ Preview, ✅ Development |
   | `MYSQL_DATABASE` | `coffee_db` | ✅ Production, ✅ Preview, ✅ Development |
   | `MYSQL_USER` | `your-username` | ✅ Production, ✅ Preview, ✅ Development |
   | `MYSQL_PASSWORD` | `your-password` | ✅ Production, ✅ Preview, ✅ Development |
   | `MYSQL_DATABASE_URL` | `mysql://user:pass@host:3306/db` | ✅ Production, ✅ Preview, ✅ Development |

3. **Redeploy Project:**
   
   Setelah menambahkan semua variables, deploy ulang dengan cara:
   - Klik "Deployments" tab
   - Klik titik tiga (...) pada deployment terakhir
   - Pilih "Redeploy"

---

## Pilihan 2: Menggunakan Vercel CLI

### Cara Cepat (Copy-Paste):

Buka terminal baru dan jalankan satu per satu:

```bash
# 1. MYSQL_HOST
vercel env add MYSQL_HOST
# Paste: your-mysql-host.com
# Select: Production, Preview, Development [tekan 'a' untuk select all]

# 2. MYSQL_PORT
vercel env add MYSQL_PORT
# Paste: 3306
# Select: Production, Preview, Development

# 3. MYSQL_DATABASE
vercel env add MYSQL_DATABASE
# Paste: coffee_db
# Select: Production, Preview, Development

# 4. MYSQL_USER
vercel env add MYSQL_USER
# Paste: your-username
# Select: Production, Preview, Development

# 5. MYSQL_PASSWORD
vercel env add MYSQL_PASSWORD
# Paste: your-password
# Select: Production, Preview, Development

# 6. MYSQL_DATABASE_URL (connection string)
vercel env add MYSQL_DATABASE_URL
# Paste: mysql://user:password@host:3306/database
# Select: Production, Preview, Development
```

---

## Pilihan 3: Menggunakan Script Otomatis

Jalankan script yang sudah dibuat:

```bash
./add-mysql-to-vercel.sh
```

Script ini akan memandu Anda step-by-step untuk:
- Memilih provider MySQL (Railway, PlanetScale, AWS RDS, dll)
- Input credentials
- Otomatis menambahkan ke Vercel

---

## 🗄️ Opsi MySQL Service (Pilih Salah Satu)

### Opsi A: Railway (RECOMMENDED untuk Development) 🚂

**Free tier:** 500 MB storage, $5 credit/bulan

1. Buka https://railway.app/new
2. Klik "New Project" → "Provision MySQL"
3. Klik MySQL service → "Connect" tab
4. Copy credentials:
   ```
   Host: xxx.railway.app
   Port: 3306
   Database: railway
   User: root
   Password: (akan ditampilkan)
   ```

### Opsi B: PlanetScale (RECOMMENDED untuk Production) 🌐

**Free tier:** 5 GB storage, 1 billion row reads/bulan

1. Buka https://planetscale.com/
2. Create new database
3. Get connection credentials dari dashboard
4. Format:
   ```
   Host: xxx.psdb.cloud
   Port: 3306
   Database: your-db-name
   User: xxx
   Password: pscale_pw_xxx
   ```

### Opsi C: Neon PostgreSQL + MySQL Proxy

Jika Anda sudah punya Neon (PostgreSQL), bisa tambah MySQL via:
1. Railway untuk MySQL
2. Atau pakai multi-database setup

### Opsi D: Local MySQL (untuk testing saja)

⚠️ **WARNING:** Localhost tidak bisa diakses dari Vercel!

```bash
# Install MySQL via Docker
docker run -d \
  --name mysql-coffee \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=coffee_db \
  -p 3306:3306 \
  mysql:8.0

# Credentials:
Host: localhost (tapi tidak bisa dari Vercel!)
Port: 3306
Database: coffee_db
User: root
Password: password
```

---

## 🔍 Verify Environment Variables

### Cek dari CLI:

```bash
vercel env ls
```

### Cek dari Dashboard:

```
https://vercel.com/amdanibiks-projects/coffee/settings/environment-variables
```

Pastikan terlihat:
- ✅ MYSQL_HOST
- ✅ MYSQL_PORT
- ✅ MYSQL_DATABASE
- ✅ MYSQL_USER
- ✅ MYSQL_PASSWORD
- ✅ MYSQL_DATABASE_URL

---

## 🚀 Deploy dan Test

### 1. Deploy Ulang:

```bash
# Commit perubahan code terlebih dahulu
git add .
git commit -m "Add MySQL connection support"
git push origin main

# Atau deploy langsung
vercel --prod
```

### 2. Test Koneksi MySQL:

```bash
# Menggunakan script
./test-mysql-connector.sh

# Atau manual
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mysql \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json"
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "MySQL database connection established",
  "connection": {
    "status": "connected",
    "timestamp": "2026-02-10T...",
    "version": "8.0.x",
    "database": "coffee_db"
  },
  "connector": {
    "name": "Coffee MySQL Database Connector",
    "version": "1.0.0",
    "type": "MySQL"
  }
}
```

### 3. Test dari BizCopilot:

1. Buka BizCopilot Database Connector settings
2. **Connector URL:** `https://coffee-git-main-amdanibiks-projects.vercel.app/mysql`
3. **API Key:** `test-api-key-12345`
4. Klik **Test Connection**
5. Seharusnya menampilkan: ✅ **"Connected"**

---

## 🎯 Quick Setup Commands (Copy All)

Jika Anda sudah punya MySQL credentials, copy dan jalankan ini di terminal BARU:

```bash
# Set your MySQL credentials here
export MYSQL_HOST="your-host.com"
export MYSQL_PORT="3306"
export MYSQL_DB="coffee_db"
export MYSQL_USER="your-user"
export MYSQL_PASS="your-password"

# Add to Vercel (run each command)
echo "$MYSQL_HOST" | vercel env add MYSQL_HOST production preview development
echo "$MYSQL_PORT" | vercel env add MYSQL_PORT production preview development
echo "$MYSQL_DB" | vercel env add MYSQL_DATABASE production preview development
echo "$MYSQL_USER" | vercel env add MYSQL_USER production preview development
echo "$MYSQL_PASS" | vercel env add MYSQL_PASSWORD production preview development

# Create and add connection URL
MYSQL_URL="mysql://$MYSQL_USER:$MYSQL_PASS@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DB"
echo "$MYSQL_URL" | vercel env add MYSQL_DATABASE_URL production preview development

# Deploy
vercel --prod
```

---

## ❓ Troubleshooting

### Error: "Connection failed"

**Penyebab dan Solusi:**

1. ✅ **Environment variables belum di-sync:**
   ```bash
   vercel env pull .env.local
   vercel --prod
   ```

2. ✅ **MySQL host tidak bisa diakses dari Vercel:**
   - Pastikan bukan localhost
   - Check firewall settings
   - Whitelist IP Vercel (0.0.0.0/0 untuk all)

3. ✅ **Credentials salah:**
   - Verify user/password benar
   - Test koneksi manual:
     ```bash
     mysql -h host -u user -p database
     ```

4. ✅ **Database belum dibuat:**
   ```sql
   CREATE DATABASE coffee_db;
   ```

### Error: "Invalid API Key"

```bash
# Check API key di environment variables
vercel env ls | grep CONNECTOR_API_KEY

# Seharusnya: test-api-key-12345
```

---

## 📊 Import Sample Data (Opsional)

Setelah koneksi berhasil, import data sample:

```bash
# Download sample data
curl https://coffee-git-main-amdanibiks-projects.vercel.app/api/sample-data > sample.json

# Atau gunakan SQL file
mysql -h $MYSQL_HOST -u $MYSQL_USER -p$MYSQL_PASSWORD $MYSQL_DATABASE < coffee_multitenant_seed.sql
```

---

## ✅ Checklist

Sebelum selesai, pastikan:

- [ ] MySQL service sudah running (Railway/PlanetScale/dll)
- [ ] Environment variables sudah ditambahkan di Vercel
- [ ] Project sudah di-redeploy
- [ ] Test connection berhasil (status 200, success: true)
- [ ] BizCopilot bisa connect ke `/mysql` endpoint

---

**Status:** Ready to configure MySQL! 🎉

Pilih metode setup yang paling mudah untuk Anda:
- 🟢 **TERMUDAH:** Vercel Dashboard (browser)
- 🟡 **CEPAT:** Vercel CLI commands
- 🔵 **OTOMATIS:** Script `./add-mysql-to-vercel.sh`
