# Direct Database Connection API

Route untuk koneksi langsung ke database dengan keamanan API Key.

## Endpoint yang Tersedia

### 1. POST /api/db/connect
Membuat koneksi langsung ke database dan mengembalikan status koneksi.

**Request:**
```bash
curl -X POST https://your-domain.vercel.app/api/db/connect \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "success": true,
  "message": "Direct database connection established",
  "connection": {
    "status": "connected",
    "timestamp": "2026-02-06T10:30:00.000Z",
    "database": "coffee_db",
    "poolInfo": {
      "initialized": true,
      "totalCount": 2,
      "idleCount": 1,
      "waitingCount": 0,
      "maxConnections": 10
    }
  }
}
```

---

### 2. POST /api/db/execute
Eksekusi query dengan validasi keamanan.

**Request untuk SELECT:**
```bash
curl -X POST https://your-domain.vercel.app/api/db/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 10",
    "params": []
  }'
```

**Request untuk UPDATE/DELETE (memerlukan flag allowDestructive):**
```bash
curl -X POST https://your-domain.vercel.app/api/db/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "UPDATE tenants SET active = true WHERE id = $1",
    "params": [1],
    "allowDestructive": true
  }'
```

**Request dengan Transaction:**
```bash
curl -X POST https://your-domain.vercel.app/api/db/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "INSERT INTO tenants (name, code) VALUES ($1, $2)",
    "params": ["New Tenant", "NT001"],
    "transaction": true
  }'
```

**Response Success:**
```json
{
  "success": true,
  "data": [...],
  "rowCount": 10,
  "executionTime": "23ms",
  "query": "SELECT * FROM tenants LIMIT 10"
}
```

**Response Error (query berbahaya tanpa flag):**
```json
{
  "success": false,
  "error": "Potentially destructive query detected. Set \"allowDestructive\": true to execute",
  "query": "DELETE FROM tenants WHERE..."
}
```

---

### 3. GET /api/db/pool-status
Mendapatkan status connection pool database.

**Request:**
```bash
curl -X GET https://your-domain.vercel.app/api/db/pool-status \
  -H "X-API-Key: YOUR_API_KEY"
```

**Response:**
```json
{
  "success": true,
  "pool": {
    "initialized": true,
    "totalCount": 3,
    "idleCount": 2,
    "waitingCount": 0,
    "maxConnections": 10
  },
  "timestamp": "2026-02-06T10:30:00.000Z"
}
```

---

### 4. POST /api/db/batch
Eksekusi multiple queries sekaligus (maksimal 50 queries).

**Request:**
```bash
curl -X POST https://your-domain.vercel.app/api/db/batch \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {
        "query": "SELECT COUNT(*) FROM tenants",
        "params": []
      },
      {
        "query": "SELECT COUNT(*) FROM orders",
        "params": []
      },
      {
        "query": "SELECT name FROM tenants WHERE id = $1",
        "params": [1]
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "query": "SELECT COUNT(*) FROM tenants",
      "success": true,
      "data": [{"count": "5"}],
      "rowCount": 1,
      "executionTime": "5ms"
    },
    {
      "query": "SELECT COUNT(*) FROM orders",
      "success": true,
      "data": [{"count": "1250"}],
      "rowCount": 1,
      "executionTime": "8ms"
    },
    {
      "query": "SELECT name FROM tenants WHERE id = $1",
      "success": true,
      "data": [{"name": "Cafe A"}],
      "rowCount": 1,
      "executionTime": "3ms"
    }
  ],
  "totalQueries": 3,
  "successCount": 3,
  "failureCount": 0
}
```

---

## Keamanan

### API Key Authentication
Semua endpoint memerlukan API Key yang valid. API Key dapat dikirim melalui:

1. **Header (Recommended):**
   ```
   X-API-Key: YOUR_API_KEY
   ```

2. **Query Parameter:**
   ```
   ?apiKey=YOUR_API_KEY
   ```

### Query Validation
Sistem secara otomatis mendeteksi query yang berpotensi berbahaya:
- `DELETE`
- `DROP`
- `TRUNCATE`
- `UPDATE`

Query tersebut memerlukan flag `allowDestructive: true` untuk dieksekusi.

### Transaction Support
Gunakan `transaction: true` untuk menjalankan query dalam transaction:
- Auto BEGIN sebelum query
- Auto COMMIT jika berhasil
- Auto ROLLBACK jika error

### Batch Query Limits
- Maksimal 50 queries per batch request
- Setiap query dieksekusi secara sequential
- Jika satu query gagal, yang lain tetap dieksekusi

---

## Environment Variables

Pastikan environment variables berikut sudah di-set:

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database
# atau
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_db
DB_USER=postgres
DB_PASSWORD=your_password

# API Security
CONNECTOR_API_KEY=your_secure_api_key_here

# Optional
QUERY_TIMEOUT=30000
```

---

## Contoh Penggunaan dengan JavaScript

```javascript
const API_KEY = 'your_api_key';
const BASE_URL = 'https://your-domain.vercel.app';

// Connect ke database
async function connectDatabase() {
  const response = await fetch(`${BASE_URL}/api/db/connect`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
}

// Execute query
async function executeQuery(query, params = []) {
  const response = await fetch(`${BASE_URL}/api/db/execute`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query, params })
  });
  return await response.json();
}

// Get pool status
async function getPoolStatus() {
  const response = await fetch(`${BASE_URL}/api/db/pool-status`, {
    headers: {
      'X-API-Key': API_KEY
    }
  });
  return await response.json();
}

// Execute batch queries
async function executeBatch(queries) {
  const response = await fetch(`${BASE_URL}/api/db/batch`, {
    method: 'POST',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ queries })
  });
  return await response.json();
}

// Contoh penggunaan
(async () => {
  // Connect
  const conn = await connectDatabase();
  console.log('Connection:', conn);
  
  // Query data
  const tenants = await executeQuery('SELECT * FROM tenants LIMIT 5');
  console.log('Tenants:', tenants);
  
  // Check pool
  const pool = await getPoolStatus();
  console.log('Pool Status:', pool);
})();
```

---

## Testing

Gunakan file [test-api.sh](test-api.sh) yang sudah ada, atau buat test baru:

```bash
#!/bin/bash

API_KEY="your_api_key"
BASE_URL="https://your-domain.vercel.app"

# Test connect
echo "Testing /api/db/connect..."
curl -X POST "$BASE_URL/api/db/connect" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json"

echo -e "\n\nTesting /api/db/execute..."
curl -X POST "$BASE_URL/api/db/execute" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 3"
  }'

echo -e "\n\nTesting /api/db/pool-status..."
curl -X GET "$BASE_URL/api/db/pool-status" \
  -H "X-API-Key: $API_KEY"
```

---

## Error Handling

### Common Errors

1. **401 Unauthorized** - API Key tidak ada
2. **403 Forbidden** - API Key tidak valid atau query berbahaya tanpa flag
3. **400 Bad Request** - Parameter tidak valid
4. **500 Internal Server Error** - Database error

### Error Response Format
```json
{
  "success": false,
  "error": "Error message here",
  "code": "ERROR_CODE",
  "detail": "Detailed error information"
}
```

---

## Best Practices

1. **Gunakan Parameterized Queries** untuk mencegah SQL injection
2. **Selalu set API Key di header**, bukan query parameter untuk production
3. **Gunakan transaction** untuk operasi yang memerlukan konsistensi data
4. **Monitor pool status** untuk memastikan koneksi tidak habis
5. **Limit result set** dengan LIMIT untuk mencegah response terlalu besar
6. **Rotate API Key** secara berkala untuk keamanan

---

## Troubleshooting

### Connection Pool Exhausted
Jika `waitingCount > 0` di pool status, tunggu beberapa saat atau tingkatkan max connections.

### Query Timeout
Jika query memakan waktu > 30s, set `QUERY_TIMEOUT` lebih tinggi di environment variables.

### SSL Certificate Error
Pastikan `ssl: { rejectUnauthorized: false }` di config untuk Supabase/hosted databases.
