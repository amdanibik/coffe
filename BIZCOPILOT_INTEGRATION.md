# 🔌 Integrasi dengan BizCopilot.app

Dokumentasi untuk mengintegrasikan Coffee Database Connector dengan BizCopilot.app atau layanan serupa.

## 📋 Konfigurasi di BizCopilot

### 1. Connector URL
Masukkan URL lengkap dari deployed connector Anda:

```
https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app
```

Atau jika menggunakan custom domain:
```
https://your-domain.com
```

### 2. Connector API Key
Masukkan API key yang sudah di-set di environment variables:

```
YOUR_CONNECTOR_API_KEY
```

💡 **Tips**: Pastikan API key sama dengan value dari `CONNECTOR_API_KEY` di environment variables Vercel/Railway.

### 3. Database Type
Pilih: **PostgreSQL**

### 4. Query Timeout
Atur timeout sesuai kebutuhan (dalam milliseconds):
- Recommended: `30000` (30 detik)
- Minimum: `5000` (5 detik)
- Maximum: `120000` (2 menit)

---

## ✅ Testing Connection

Setelah konfigurasi, klik tombol **"Test Connection"** di web bizcopilot.app.

Expected response jika berhasil:
```json
{
  "success": true,
  "message": "Database connection successful",
  "data": {
    "connected": true,
    "timestamp": "2026-02-06T10:00:00.000Z",
    "version": "PostgreSQL 15.x...",
    "config": {
      "database": "coffee_db",
      "host": "xxx.supabase.co"
    }
  }
}
```

---

## 🔗 Endpoint yang Digunakan BizCopilot

### 1. Metadata Endpoint (Public)
```
GET /api/connector/metadata
```

Digunakan untuk mendapatkan informasi connector dan capabilities.

**Response:**
```json
{
  "success": true,
  "connector": {
    "name": "Coffee Database Connector",
    "version": "1.0.0",
    "type": "PostgreSQL",
    "capabilities": {
      "directQuery": true,
      "batchQuery": true,
      "transactions": true,
      "parameterizedQueries": true,
      "connectionPooling": true
    },
    "endpoints": {
      "testConnection": "/api/test-connection",
      "execute": "/api/query",
      "configuration": "/api/configuration"
    }
  }
}
```

### 2. Health Check (Public)
```
GET /api/connector/health
```

Digunakan untuk validasi status connector.

**Response:**
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2026-02-06T10:00:00.000Z",
  "database": {
    "connected": true,
    "type": "PostgreSQL",
    "poolStatus": {
      "totalCount": 3,
      "idleCount": 2
    }
  }
}
```

### 3. Test Connection (Protected)
```
POST /api/test-connection
Headers: X-API-Key: YOUR_API_KEY
```

### 4. Execute Query (Protected)
```
POST /api/query
Headers: 
  X-API-Key: YOUR_API_KEY
  Content-Type: application/json

Body:
{
  "query": "SELECT * FROM tenants",
  "params": []
}
```

### 5. Get Configuration (Protected)
```
GET /api/configuration
Headers: X-API-Key: YOUR_API_KEY
```

---

## 🔐 Authentication

BizCopilot akan menggunakan API key yang Anda masukkan dengan cara:

**Header:**
```
X-API-Key: YOUR_API_KEY
```

Semua request dari BizCopilot akan menyertakan header ini.

---

## 🚀 Step-by-Step Setup

### Langkah 1: Deploy Connector
```bash
# Deploy ke Vercel
vercel --prod

# Atau deploy ke Railway
railway up
```

### Langkah 2: Set Environment Variables
Di dashboard Vercel/Railway, set:

```env
DATABASE_URL=postgresql://user:password@host:port/database
CONNECTOR_API_KEY=your_secure_api_key_here
QUERY_TIMEOUT=30000
PORT=3000
```

### Langkah 3: Test Locally
```bash
# Test metadata endpoint (no auth)
curl https://your-domain.vercel.app/api/connector/metadata

# Test health endpoint (no auth)
curl https://your-domain.vercel.app/api/connector/health

# Test connection (with auth)
curl -X POST https://your-domain.vercel.app/api/test-connection \
  -H "X-API-Key: YOUR_API_KEY"
```

### Langkah 4: Configure in BizCopilot
1. Login ke https://staging-ok.bizcopilot.app
2. Go to Settings → Database
3. Masukkan:
   - **Connector URL**: `https://your-domain.vercel.app`
   - **Connector API Key**: `your_secure_api_key_here`
   - **Database Type**: `PostgreSQL`
   - **Query Timeout**: `30000`
4. Click **"Test Connection"**
5. Save configuration

---

## 🧪 Testing dengan cURL

### Test semua endpoint yang digunakan BizCopilot:

```bash
BASE_URL="https://coffee-ifuplp8rq-amdanibiks-projects.vercel.app"
API_KEY="your_api_key"

# 1. Test metadata (public)
echo "Testing metadata..."
curl "$BASE_URL/api/connector/metadata"

# 2. Test health (public)
echo -e "\n\nTesting health..."
curl "$BASE_URL/api/connector/health"

# 3. Test connection (protected)
echo -e "\n\nTesting connection..."
curl -X POST "$BASE_URL/api/test-connection" \
  -H "X-API-Key: $API_KEY"

# 4. Test configuration (protected)
echo -e "\n\nTesting configuration..."
curl "$BASE_URL/api/configuration" \
  -H "X-API-Key: $API_KEY"

# 5. Test query execution (protected)
echo -e "\n\nTesting query..."
curl -X POST "$BASE_URL/api/query" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM tenants LIMIT 3"}'
```

---

## 📊 Monitoring

Setelah terintegrasi, Anda bisa monitor:

### 1. Connection Pool Status
```bash
curl https://your-domain.vercel.app/api/db/pool-status \
  -H "X-API-Key: YOUR_API_KEY"
```

### 2. Logs di Vercel/Railway
- Check logs untuk melihat request dari BizCopilot
- Monitor error dan response time

### 3. Health Endpoint
```bash
# Regular health check
curl https://your-domain.vercel.app/api/connector/health
```

---

## ❌ Troubleshooting

### Problem: "401 Unauthorized"
**Solution:** 
- Pastikan API Key di BizCopilot sama dengan `CONNECTOR_API_KEY` di environment
- Check API key tidak ada spasi di awal/akhir

### Problem: "Connection timeout"
**Solution:**
- Increase Query Timeout di BizCopilot settings
- Check DATABASE_URL masih valid
- Verify database host accessible dari internet

### Problem: "Invalid connector URL"
**Solution:**
- URL harus lengkap dengan protocol: `https://...`
- Jangan tambahkan `/api` atau endpoint lain
- Pastikan URL bisa diakses (not localhost)

### Problem: "Test Connection failed"
**Solution:**
```bash
# Test manual dari terminal
curl -X POST https://your-domain.vercel.app/api/test-connection \
  -H "X-API-Key: YOUR_API_KEY" \
  -v

# Check database connection
curl https://your-domain.vercel.app/api/connector/health
```

---

## 🔄 Update Connector

Jika ada perubahan pada connector:

1. **Deploy update**:
```bash
git push origin main
# Vercel akan auto-deploy
```

2. **Re-test di BizCopilot**:
- Klik "Test Connection" lagi
- Verify semua endpoint masih berfungsi

3. **No need to reconfigure**: 
URL dan API Key tetap sama, tidak perlu setting ulang.

---

## 📱 Mobile App Integration

Jika BizCopilot memiliki mobile app, gunakan URL yang sama:

```
Connector URL: https://your-domain.vercel.app
API Key: your_secure_api_key_here
```

Mobile app akan menggunakan endpoint yang sama dengan web.

---

## 🔒 Security Best Practices

1. **Use strong API Key**:
```bash
# Generate secure API key
openssl rand -hex 32
```

2. **Rotate API key regularly**:
- Update di environment variables
- Update di BizCopilot settings
- Test connection setelah update

3. **Use HTTPS only**:
- Vercel/Railway sudah provide SSL otomatis
- Never use HTTP for production

4. **Monitor access**:
- Check logs regularly
- Look for suspicious activity
- Set up alerts untuk error rate tinggi

---

## 📞 Support

Jika ada masalah dengan integrasi:

1. **Check connector status**:
   ```
   https://your-domain.vercel.app/api/connector/health
   ```

2. **Check logs**: Vercel/Railway dashboard

3. **Test endpoints manually**: Gunakan cURL atau Postman

4. **Verify environment variables**: Pastikan semua variable ter-set

---

## ✨ Features Available in BizCopilot

Dengan connector ini, BizCopilot bisa:

- ✅ Execute SQL queries
- ✅ Get tenant data
- ✅ Get orders data
- ✅ Execute custom queries
- ✅ Batch operations
- ✅ Transaction support
- ✅ Connection pooling
- ✅ Query timeout management

---

**Ready to use!** 🎉

Connector Anda sekarang fully compatible dengan BizCopilot.app dan layanan serupa.
