# ✅ Setup Cepat untuk BizCopilot.app

**Status:** ✅ READY - Endpoint `/execute` telah diimplementasikan!  
**Last Updated:** February 6, 2026

---

## 🎯 Important Update

Aplikasi Coffee sekarang memiliki endpoint `/execute` yang **fully compatible** dengan BizCopilot connector service. Endpoint ini menangani semua query yang dikirim dari BizCopilot.

**Primary Endpoint:** `POST /execute`

---

## 🔗 Konfigurasi yang Anda Butuhkan

Buka: https://staging-ok.bizcopilot.app/settings/database

### 1. Connector URL
```
https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app
```

### 2. Connector API Key
```
[Masukkan API key dari environment variable CONNECTOR_API_KEY]
```

### 3. Database Type
```
PostgreSQL
```

### 4. Query Timeout (ms)
```
30000
```

---

## 🧪 Test Sebelum Setup di BizCopilot

### Test 0: Execute Endpoint (NEW!)
```bash
curl -X POST https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app/execute \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY" \
  -d '{
    "query": "SELECT 1 as test",
    "query_type": "sql",
    "database_type": "postgresql"
  }'
```

**Expected Result:**
```json
{
  "success": true,
  "data": [{"test": 1}],
  "execution_time_ms": 50,
  "rows_affected": 1
}
```

### Test 1: Metadata (Public - No Auth)
```bash
curl https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app/api/connector/metadata
```

**Expected Result:**
```json
{
  "success": true,
  "connector": {
    "name": "Coffee Database Connector",
    "type": "PostgreSQL",
    "capabilities": { ... },
    "endpoints": {
      "execute": "/execute"
    }
  }
}
```

### Test 2: Health Check (Public - No Auth)
```bash
curl https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app/api/connector/health
```

**Expected Result:**
```json
{
  "success": true,
  "status": "healthy",
  "database": {
    "connected": true,
    "type": "PostgreSQL"
  }
}
```

### Test 3: Test Connection (Protected - Needs Auth)
```bash
curl -X POST https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app/api/test-connection \
  -H "X-API-Key: YOUR_API_KEY"
```

**Expected Result:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "data": { ... }
}
```

---

## 🚀 Langkah-Langkah Setup

### Step 1: Buka BizCopilot Settings
1. Login ke https://staging-ok.bizcopilot.app
2. Klik **Settings** (atau ikon ⚙️)
3. Pilih **Database** dari menu

### Step 2: Isi Konfigurasi
Copy-paste nilai berikut:

| Field | Value |
|-------|-------|
| **Connector URL** | `https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app` |
| **Connector API Key** | `[Your API Key]` |
| **Database Type** | `PostgreSQL` |
| **Query Timeout** | `30000` |

### Step 3: Test Connection
1. Klik tombol **"Test Connection"** (tombol dengan icon 🔗)
2. Tunggu beberapa detik
3. Jika berhasil, akan muncul pesan success ✅

### Step 4: Save Configuration
1. Klik **"Save"** atau **"Save Configuration"**
2. Configuration tersimpan dan siap digunakan

---

## ✅ Endpoint yang Tersedia untuk BizCopilot

### Public Endpoints (No Auth)
- `GET /api/connector/metadata` - Info connector
- `GET /api/connector/health` - Health check

### Protected Endpoints (Needs API Key)
- `POST /api/test-connection` - Test database connection
- `GET /api/configuration` - Get configuration
- `POST /api/query` - Execute SQL query
- `POST /api/db/execute` - Direct query execution
- `GET /api/db/pool-status` - Pool status
- `POST /api/db/batch` - Batch queries
- `GET /api/tenants` - Get tenants data
- `GET /api/orders` - Get orders data

---

## 🔐 Mendapatkan API Key

API Key adalah value dari environment variable `CONNECTOR_API_KEY`.

### Cek di Vercel:
1. Buka https://vercel.com/dashboard
2. Pilih project `coffee-ifuplp8rq-amdanibiks-projects`
3. Go to **Settings** → **Environment Variables**
4. Copy value dari `CONNECTOR_API_KEY`

### Atau Generate Baru:
```bash
# Generate secure API key
openssl rand -hex 32

# Contoh output:
# 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08
```

Lalu set di Vercel environment variables.

---

## ❌ Troubleshooting

### Problem: "Connection Failed"
**Penyebab:**
- API Key salah
- Database tidak accessible
- Timeout terlalu pendek

**Solusi:**
```bash
# Test manual
curl -X POST https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app/api/test-connection \
  -H "X-API-Key: YOUR_API_KEY"

# Cek response, jika error lihat message nya
```

### Problem: "401 Unauthorized"
**Penyebab:** API Key tidak valid atau kosong

**Solusi:**
- Pastikan API Key ter-copy dengan benar (no spaces)
- Cek value di Vercel environment variables
- Test API key dengan curl command di atas

### Problem: "Timeout"
**Penyebab:** Query terlalu lama atau database lambat

**Solusi:**
- Increase Query Timeout dari 30000 ke 60000
- Check database performance
- Check connection string valid

---

## 📱 Testing dengan Script

Gunakan script yang sudah disediakan:

```bash
./test-bizcopilot.sh https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app YOUR_API_KEY
```

Script ini akan test semua endpoint dan memberikan hasil lengkap.

---

## 📞 Bantuan

Jika ada masalah:

1. **Check Status:**
   ```
   https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app/api/connector/health
   ```

2. **Check Logs:** Vercel Dashboard → Project → Logs

3. **Manual Test:** Gunakan curl commands di atas

4. **Full Documentation:** Lihat `BIZCOPILOT_INTEGRATION.md`

---

## ✨ Setelah Setup Berhasil

Anda bisa:
- ✅ Execute SQL queries dari BizCopilot
- ✅ Akses data tenants
- ✅ Akses data orders
- ✅ Run custom queries
- ✅ Monitor connection status

**Selamat! Connector Anda siap digunakan! 🎉**
