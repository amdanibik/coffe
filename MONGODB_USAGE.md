# MongoDB API Usage Guide

## ✅ Status: WORKING
MongoDB endpoint sudah terkoneksi dan berfungsi dengan baik!

- **Database**: coffee_db
- **Collections**: tenants, employees, managers, orders, order_details, dll
- **Total Tenants**: 3 documents

## 🔑 Authentication
Semua endpoint memerlukan API key:
- Header: `X-API-Key: test-api-key-12345`
- Atau query param: `?apiKey=test-api-key-12345`

## 📍 Endpoints

### Base URL
```
https://coffee-git-main-amdanibiks-projects.vercel.app/mongo
```

### Connection Test
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mongo/ \
  -H "X-API-Key: test-api-key-12345"
```

## 📋 Execute Query Format

**PENTING**: MongoDB menggunakan document-based queries, BUKAN SQL!

### Request Format
```json
{
  "collection": "nama_collection",
  "operation": "operation_name",
  "query": { /* filter */ },
  "options": { /* options */ }
}
```

## 🔍 Supported Operations

### 1. COUNT - Menghitung Jumlah Documents
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mongo/execute \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "count",
    "query": {}
  }'
```
**Response:**
```json
{
  "success": true,
  "data": {
    "result": 3,
    "rowCount": 3,
    "executionTime": 260
  }
}
```

### 2. FIND - Mencari Documents
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mongo/execute \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "find",
    "query": {},
    "options": {"limit": 10}
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "result": [
      {
        "_id": "698aff81ed70c02fe4303438",
        "id": "11111111-1111-1111-1111-111111111111",
        "code": "HQ",
        "name": "Kopi Nusantara – Cabang Utama"
      }
    ],
    "rowCount": 2,
    "executionTime": 156
  }
}
```

### 3. FIND ONE - Mencari 1 Document
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.  vercel.app/mongo/execute \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "findOne",
    "query": {"code": "HQ"}
  }'
```

### 4. AGGREGATE - Aggregation Pipeline
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mongo/execute \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "orders",
    "operation": "aggregate",
    "query": [
      {"$group": {"_id": "$tenant_id", "total": {"$sum": 1}}},
      {"$sort": {"total": -1}}
    ]
  }'
```

### 5. INSERT ONE - Menambah 1 Document
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mongo/execute \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "insertOne",
    "query": {
      "code": "TEST",
      "name": "Test Tenant"
    }
  }'
```

### 6. UPDATE ONE - Update 1 Document
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mongo/execute \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "updateOne",
    "query": {"code": "TEST"},
    "options": {"$set": {"name": "Updated Name"}}
  }'
```

### 7. DELETE ONE - Hapus 1 Document (Destructive)
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mongo/execute \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "deleteOne",
    "query": {"code": "TEST"},
    "allowDestructive": true
  }'
```

## 🗂️ Available Collections
- `tenants` - Data cabang/tenant (3 docs)
- `employees` - Data karyawan
- `managers` - Data manager
- `attendance` - Data absensi
- `salaries` - Data gaji
- `orders` - Data pesanan
- `order_details` - Detail pesanan
- `order_history` - Riwayat pesanan

## 🔐 Destructive Operations
Operations yang mengubah/menghapus data memerlukan flag `allowDestructive: true`:
- deleteOne
- deleteMany
- drop

## ❌ Common Errors

### Error: "Collection and operation are required"
**Penyebab**: Format request salah (menggunakan SQL syntax)
**Solusi**: Gunakan format MongoDB:
```json
{
  "collection": "tenants",
  "operation": "count",
  "query": {}
}
```

### Error: "Unsupported operation"
**Penyebab**: Operation name salah
**Solusi**: Gunakan operation yang supported:
- find, findOne, count, aggregate
- insertOne, insertMany
- updateOne, updateMany
- deleteOne, deleteMany

### Error: "Destructive operation detected"
**Penyebab**: Coba delete/drop tanpa allowDestructive
**Solusi**: Tambahkan `"allowDestructive": true` di request body

## 📊 Query Filters

MongoDB menggunakan query operators:
- `{field: value}` - Exact match
- `{field: {$gt: 100}}` - Greater than
- `{field: {$lt: 100}}` - Less than
- `{field: {$in: [val1, val2]}}` - In array
- `{field: {$regex: "pattern"}}` - Regex match
- `{$or: [{}, {}]}` - OR condition
- `{$and: [{}, {}]}` - AND condition

### Contoh Filter
```json
{
  "collection": "orders",
  "operation": "find",
  "query": {
    "tenant_id": "11111111-1111-1111-1111-111111111111",
    "total": {"$gt": 50000}
  },
  "options": {
    "limit": 10,
    "sort": {"order_date": -1}
  }
}
```

## 🚀 Next Steps
1. Import data penuh dengan `/api/import-mongo` (setelah Network Access dikonfigurasi)
2. Test aggregation queries
3. Implement business logic menggunakan MongoDB queries

## 📝 Notes
- MongoDB menggunakan document-based model, bukan relational (SQL)
- Tidak ada JOIN - gunakan aggregation dengan $lookup
- _id otomatis dibuat sebagai primary key
- Semua query case-sensitive untuk field names
