# Coffee Database Connector

Aplikasi Node.js sederhana untuk mengakses database PostgreSQL dengan data coffee shop multitenant.

## Fitur

- ✅ Database Connector untuk PostgreSQL
- ✅ API Key Authentication
- ✅ **Database Schema Introspection** (NEW! 🔍)
- ✅ **Direct Database Connection API**
- ✅ **BizCopilot.app Integration Ready** 🚀
- ✅ Query Timeout Configuration
- ✅ Test Connection Endpoint
- ✅ RESTful API untuk akses data
- ✅ Support untuk multitenant data
- ✅ Transaction Support
- ✅ Batch Query Execution
- ✅ Connection Pool Management
- ✅ Query Safety Validation

## 🆕 What's New (Feb 6, 2026)

### Database Schema Introspection
Connector sekarang bisa secara otomatis mengintrospeksi struktur database:
- ✅ Mendapatkan daftar tabel dan kolom
- ✅ Mendeteksi tipe data dan constraint
- ✅ Format schema yang mudah dibaca AI
- ✅ Sample data dari setiap tabel

**Manfaat untuk BizCopilot AI:**
- AI sekarang bisa "melihat" struktur database Anda
- Bisa menjawab pertanyaan tentang data yang tersedia
- Generate SQL query lebih akurat dengan konteks lengkap

👉 **Lihat:** [SCHEMA_INTROSPECTION.md](SCHEMA_INTROSPECTION.md) untuk detail lengkap

## 🔌 Quick Start untuk BizCopilot

Jika Anda ingin menggunakan connector ini dengan BizCopilot.app:

**👉 Lihat:** [SETUP_BIZCOPILOT.md](SETUP_BIZCOPILOT.md) untuk panduan lengkap

**Connector URL:**
```
https://coffee-git-main-amdanibiks-projects.vercel.app
```

**Endpoint Public (No Auth):**
- `GET /api/connector/metadata` - Connector information
- `GET /api/connector/health` - Health check

## Prerequisites

- Node.js (v14 atau lebih tinggi)
- PostgreSQL database
- npm atau yarn

## Instalasi

1. Install dependencies:
```bash
npm install
```

2. Setup database PostgreSQL dan import data:
```bash
# Buat database
createdb coffee_db

# Import data SQL
psql coffee_db < coffee_multitenant_seed.sql
```

3. Konfigurasi environment variables:
```bash
# Copy file .env.example
cp .env.example .env

# Edit .env sesuai dengan konfigurasi database Anda
```

## Konfigurasi

Edit file `.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_db
DB_USER=postgres
DB_PASSWORD=your_password

# Connector Configuration
CONNECTOR_API_KEY=your-secure-api-key-here
QUERY_TIMEOUT=30000

# Server Configuration
PORT=3000
```

## Menjalankan Aplikasi

### Development mode (dengan auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

Server akan berjalan di `http://localhost:3000`

## API Endpoints

### 1. Service Info
```
GET /
```
Menampilkan informasi service dan daftar endpoint yang tersedia.

### 2. Test Connection
```
POST /api/test-connection
Headers: X-API-Key: your-api-key
```
Menguji koneksi ke database PostgreSQL.

**Response:**
```json
{
  "success": true,
  "message": "Database connection successful",
  "data": {
    "connected": true,
    "timestamp": "2026-02-04T10:00:00.000Z",
    "version": "PostgreSQL 14.0...",
    "config": {
      "host": "localhost",
      "port": 5432,
      "database": "coffee_db",
      "user": "postgres"
    }
  }
}
```

### 3. Get Configuration
```
GET /api/configuration
Headers: X-API-Key: your-api-key
```
Mendapatkan konfigurasi connector saat ini.

### 4. Execute Custom Query
```
POST /api/query
Headers: X-API-Key: your-api-key
Content-Type: application/json

{
  "query": "SELECT * FROM tenants",
  "params": []
}
```

### 5. Get All Tenants
```
GET /api/tenants
Headers: X-API-Key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "11111111-1111-1111-1111-111111111111",
      "code": "HQ",
      "name": "Kopi Nusantara HQ"
    },
    {
      "id": "22222222-2222-2222-2222-222222222222",
      "code": "BR1",
      "name": "Kopi Nusantara BR1"
    },
    {
      "id": "33333333-3333-3333-3333-333333333333",
      "code": "BR2",
      "name": "Kopi Nusantara BR2"
    }
  ],
  "count": 3
}
```

### 6. Get Orders
```
GET /api/orders?tenant_id=<uuid>&limit=100&offset=0
Headers: X-API-Key: your-api-key
```

Query Parameters:
- `tenant_id` (optional): Filter berdasarkan tenant ID
- `start_date` (optional): Filter order dari tanggal tertentu
- `end_date` (optional): Filter order sampai tanggal tertentu
- `limit` (optional, default: 100): Jumlah data per halaman
- `offset` (optional, default: 0): Offset untuk pagination

### 7. Get Order Details
```
GET /api/orders/:orderId/details
Headers: X-API-Key: your-api-key
```

**Response:**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "8e3bd336-18b2-4e2d-a9e7-1266a2b85437",
      "tenant_id": "11111111-1111-1111-1111-111111111111",
      "tenant_name": "Kopi Nusantara HQ",
      "tenant_code": "HQ",
      "order_date": "2025-11-04",
      "total": 349860,
      "payment_method": "cash"
    },
    "items": [
      {
        "id": "ed81e04b-3b76-464e-9efe-6f2de6a95d89",
        "order_id": "8e3bd336-18b2-4e2d-a9e7-1266a2b85437",
        "product_name": "Matcha",
        "qty": 3,
        "price": 35101,
        "subtotal": 105303
      }
    ],
    "itemCount": 5
  }
}
```

### 8. Get Statistics
```
GET /api/statistics?tenant_id=<uuid>
Headers: X-API-Key: your-api-key
```

Mendapatkan statistik penjualan per tenant.

### 9. Get Popular Products
```
GET /api/products/popular?tenant_id=<uuid>&limit=10
Headers: X-API-Key: your-api-key
```

Mendapatkan daftar produk paling populer.

## Authentication

Semua endpoint API (kecuali `/`) memerlukan API Key authentication. Gunakan salah satu cara berikut:

1. **Via Header** (Recommended):
```bash
curl -H "X-API-Key: your-api-key" http://localhost:3000/api/tenants
```

2. **Via Query Parameter**:
```bash
curl http://localhost:3000/api/tenants?apiKey=your-api-key
```

## Testing dengan cURL

Gunakan script test yang sudah disediakan:
```bash
# Test API reguler
./test-api.sh

# Test Direct Database Connection API
./test-db-direct.sh YOUR_API_KEY http://localhost:3000
```

### Test Connection:
```bash
curl -X POST \
  -H "X-API-Key: test-api-key-12345" \
  http://localhost:3000/api/test-connection
```

### Test Direct Database Connection:
```bash
# Connect ke database
curl -X POST \
  -H "X-API-Key: test-api-key-12345" \
  http://localhost:3000/api/db/connect

# Execute query
curl -X POST \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT * FROM tenants LIMIT 5"}' \
  http://localhost:3000/api/db/execute

# Get pool status
curl -H "X-API-Key: test-api-key-12345" \
  http://localhost:3000/api/db/pool-status
```

### Get Tenants:
```bash
curl -H "X-API-Key: test-api-key-12345" \
  http://localhost:3000/api/tenants
```

### Get Orders by Tenant:
```bash
curl -H "X-API-Key: test-api-key-12345" \
  "http://localhost:3000/api/orders?tenant_id=11111111-1111-1111-1111-111111111111&limit=10"
```

### Execute Custom Query:
```bash
curl -X POST \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT COUNT(*) as total FROM orders"}' \
  http://localhost:3000/api/query
```

## Struktur Database

### Tabel `tenants`
- `id`: UUID (Primary Key)
- `code`: VARCHAR - Kode tenant (HQ, BR1, BR2)
- `name`: VARCHAR - Nama tenant

### Tabel `orders`
- `id`: UUID (Primary Key)
- `tenant_id`: UUID (Foreign Key ke tenants)
- `order_date`: DATE
- `total`: NUMERIC
- `payment_method`: VARCHAR

### Tabel `order_details`
- `id`: UUID (Primary Key)
- `order_id`: UUID (Foreign Key ke orders)
- `product_name`: VARCHAR
- `qty`: INTEGER
- `price`: NUMERIC
- `subtotal`: NUMERIC

## Error Handling

API akan mengembalikan error dalam format:

```json
{
  "success": false,
  "error": "Error message description"
}
```

## Dokumentasi Lengkap

Untuk dokumentasi lebih lengkap tentang fitur-fitur API, silakan lihat:

- **[API_DATABASE_DIRECT.md](API_DATABASE_DIRECT.md)** - Direct Database Connection API
- **[client-example.js](client-example.js)** - Contoh client JavaScript/Node.js
- **[client_example.py](client_example.py)** - Contoh client Python
- **[test-db-direct.sh](test-db-direct.sh)** - Script testing lengkap

### Quick Start dengan Client

**JavaScript/Node.js:**
```javascript
const CoffeeDatabaseClient = require('./client-example.js');

const client = new CoffeeDatabaseClient(
  'your-api-key',
  'https://your-domain.vercel.app'
);

// Get data
const tenants = await client.getTenants();
console.log(tenants);
```

**Python:**
```python
from client_example import CoffeeDatabaseClient

client = CoffeeDatabaseClient(
  api_key='your-api-key',
  base_url='https://your-domain.vercel.app'
)

# Get data
tenants = client.get_tenants()
print(tenants)
```

HTTP Status Codes:
- `200`: Success
- `400`: Bad Request
- `401`: Unauthorized (Missing API Key)
- `403`: Forbidden (Invalid API Key)
- `404`: Not Found
- `500`: Internal Server Error

## Development

### Struktur Folder:
```
coffee/
├── src/
│   ├── dbConnector.js    # Database connection handler
│   └── routes.js         # API routes definition
├── .env                  # Environment variables
├── .env.example          # Example environment variables
├── package.json          # Dependencies
├── server.js             # Main application entry point
└── README.md             # Documentation
```

## Lisensi

ISC
