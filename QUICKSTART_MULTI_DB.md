# 🚀 Quick Start - Multi-Database Coffee Connector

## ✅ Sudah Live!
**URL**: https://coffee-sage-one.vercel.app

## 📌 3 Database Supported

| Database | Path | Execute Endpoint | Status |
|----------|------|------------------|--------|
| **PostgreSQL** | `/` | `POST /execute` | ✅ Aktif |
| **MySQL** | `/mysql` | `POST /mysql/execute` | 🔧 Perlu Config |
| **MongoDB** | `/mongo` | `POST /mongo/execute` | 🔧 Perlu Config |

## 🔥 Test Sekarang!

### 1. Test Service Info (No Auth)
```bash
curl https://coffee-sage-one.vercel.app/
```

### 2. Test MySQL Metadata (No Auth)
```bash
curl https://coffee-sage-one.vercel.app/mysql/connector/metadata
```

### 3. Test MongoDB Metadata (No Auth)
```bash
curl https://coffee-sage-one.vercel.app/mongo/connector/metadata
```

### 4. Query PostgreSQL (With Auth)
```bash
curl -X POST https://coffee-sage-one.vercel.app/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM tenants LIMIT 5"}'
```

### 5. Query MySQL (With Auth)
```bash
curl -X POST https://coffee-sage-one.vercel.app/mysql/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM tenants LIMIT 5"}'
```

### 6. Query MongoDB (With Auth)
```bash
curl -X POST https://coffee-sage-one.vercel.app/mongo/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "find",
    "query": {},
    "options": {"limit": 5}
  }'
```

## ⚙️ Aktifkan MySQL & MongoDB

### Di Vercel Dashboard
1. Buka: https://vercel.com/amdanibiks-projects/coffee/settings/environment-variables
2. Tambahkan:
   ```
   MYSQL_DATABASE_URL=mysql://user:pass@host:3306/coffee_db
   MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/
   MONGODB_DATABASE=coffee_db
   ```
3. Redeploy otomatis

### Lokal (.env file)
```bash
# Copy example
cp .env.example .env

# Edit .env dengan credentials Anda
# Lalu jalankan:
npm start
```

## 🔄 Migrasi Data

### MySQL
```bash
export MYSQL_HOST=your-host.com
export MYSQL_DATABASE=coffee_db
export MYSQL_USER=your_user
export MYSQL_PASSWORD=your_pass
./migrate-mysql.sh
```

### MongoDB
```bash
export MONGODB_URL=mongodb://localhost:27017
export MONGODB_DATABASE=coffee_db
node migrate-mongodb.js
```

## 🎯 BizCopilot Integration

### Setup di BizCopilot

**PostgreSQL:**
- Connector URL: `https://coffee-sage-one.vercel.app`
- Execute Path: `/execute`

**MySQL:**
- Connector URL: `https://coffee-sage-one.vercel.app`
- Execute Path: `/mysql/execute`

**MongoDB:**
- Connector URL: `https://coffee-sage-one.vercel.app`
- Execute Path: `/mongo/execute`

## 📖 Files Penting

| File | Deskripsi |
|------|-----------|
| `FINAL_SUMMARY.md` | Summary lengkap semua fitur |
| `MULTI_DATABASE_SETUP.md` | Setup guide detail |
| `test-multi-db.sh` | Script test all endpoints |
| `migrate-mysql.sh` | MySQL migration script |
| `migrate-mongodb.js` | MongoDB migration script |

## 🧪 Run All Tests

```bash
export CONNECTOR_API_KEY=your_api_key
./test-multi-db.sh
```

## 📊 Endpoint List

### Public (No Auth)
- `GET /` - Info
- `GET /health` - Health
- `GET /mysql/connector/metadata` - MySQL info
- `GET /mongo/connector/metadata` - MongoDB info

### Authenticated (Need API Key)
- PostgreSQL: All `/execute`, `/api/*` endpoints
- MySQL: All `/mysql/execute`, `/mysql/api/*` endpoints
- MongoDB: All `/mongo/execute`, `/mongo/api/*` endpoints

## 🎉 Done!

Connector sudah live dengan support 3 database. Tinggal tambahkan environment variables untuk MySQL & MongoDB!

---
📚 Full Docs: [FINAL_SUMMARY.md](FINAL_SUMMARY.md)
