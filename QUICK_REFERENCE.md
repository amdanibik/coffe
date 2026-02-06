# 🔐 Direct Database Connection API - Quick Reference

## 📋 Endpoint Overview

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/db/connect` | POST | Establish database connection |
| `/api/db/execute` | POST | Execute query with safety checks |
| `/api/db/pool-status` | GET | Get connection pool status |
| `/api/db/batch` | POST | Execute batch queries |

---

## 🔑 Authentication

### Header (Recommended)
```
X-API-Key: YOUR_API_KEY
```

### Query Parameter
```
?apiKey=YOUR_API_KEY
```

---

## 🚀 Quick Examples

### 1️⃣ Connect to Database
```bash
curl -X POST https://your-domain.vercel.app/api/db/connect \
  -H "X-API-Key: YOUR_API_KEY"
```

### 2️⃣ Execute SELECT Query
```bash
curl -X POST https://your-domain.vercel.app/api/db/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 10"
  }'
```

### 3️⃣ Execute with Parameters
```bash
curl -X POST https://your-domain.vercel.app/api/db/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM orders WHERE tenant_id = $1",
    "params": ["11111111-1111-1111-1111-111111111111"]
  }'
```

### 4️⃣ Execute with Transaction
```bash
curl -X POST https://your-domain.vercel.app/api/db/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "INSERT INTO tenants (name, code) VALUES ($1, $2) RETURNING *",
    "params": ["New Cafe", "NC001"],
    "transaction": true
  }'
```

### 5️⃣ Execute Destructive Query
```bash
curl -X POST https://your-domain.vercel.app/api/db/execute \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "UPDATE tenants SET active = false WHERE id = $1",
    "params": [123],
    "allowDestructive": true
  }'
```

### 6️⃣ Get Pool Status
```bash
curl -X GET https://your-domain.vercel.app/api/db/pool-status \
  -H "X-API-Key: YOUR_API_KEY"
```

### 7️⃣ Execute Batch Queries
```bash
curl -X POST https://your-domain.vercel.app/api/db/batch \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {"query": "SELECT COUNT(*) FROM tenants"},
      {"query": "SELECT COUNT(*) FROM orders"},
      {"query": "SELECT name FROM tenants WHERE id = $1", "params": [1]}
    ]
  }'
```

---

## 📦 Request Body Format

### /api/db/execute
```json
{
  "query": "SELECT * FROM table_name WHERE id = $1",
  "params": [value1, value2],              // Optional
  "transaction": true,                      // Optional (default: false)
  "allowDestructive": true                  // Required for UPDATE/DELETE/DROP
}
```

### /api/db/batch
```json
{
  "queries": [
    {
      "query": "SELECT ...",
      "params": []
    },
    {
      "query": "INSERT ...",
      "params": [val1, val2]
    }
  ]
}
```

---

## ✅ Response Format

### Success Response
```json
{
  "success": true,
  "data": [...],
  "rowCount": 10,
  "executionTime": "23ms",
  "query": "SELECT * FROM..."
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Pool Status Response
```json
{
  "success": true,
  "pool": {
    "initialized": true,
    "totalCount": 3,
    "idleCount": 2,
    "waitingCount": 0,
    "maxConnections": 10
  }
}
```

---

## 🛡️ Security Features

### Query Validation
Automatically detects dangerous queries:
- `DELETE` - Requires `allowDestructive: true`
- `DROP` - Requires `allowDestructive: true`
- `TRUNCATE` - Requires `allowDestructive: true`
- `UPDATE` - Requires `allowDestructive: true`

### Transaction Support
- Auto `BEGIN` before query
- Auto `COMMIT` on success
- Auto `ROLLBACK` on error

### Batch Limits
- Maximum 50 queries per batch
- Sequential execution
- Individual success/failure tracking

---

## 🔧 Environment Variables

```env
# Database Connection
DATABASE_URL=postgresql://user:password@host:port/database

# Or individual settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_db
DB_USER=postgres
DB_PASSWORD=password

# Security
CONNECTOR_API_KEY=your_secure_api_key

# Optional
QUERY_TIMEOUT=30000
PORT=3000
```

---

## 📊 Common Queries

### Get Statistics
```sql
SELECT 
  COUNT(DISTINCT tenant_id) as tenant_count,
  COUNT(*) as total_orders,
  SUM(total) as total_revenue
FROM orders
```

### Get Top Tenants by Revenue
```sql
SELECT 
  t.name,
  COUNT(o.id) as order_count,
  SUM(o.total) as revenue
FROM tenants t
LEFT JOIN orders o ON t.id = o.tenant_id
GROUP BY t.id, t.name
ORDER BY revenue DESC
LIMIT 10
```

### Get Orders by Date Range
```sql
SELECT * FROM orders 
WHERE order_date BETWEEN $1 AND $2
ORDER BY order_date DESC
```

---

## 💡 Best Practices

1. ✅ **Use parameterized queries** to prevent SQL injection
2. ✅ **Set API Key in headers** for security
3. ✅ **Use transactions** for data consistency
4. ✅ **Monitor pool status** regularly
5. ✅ **Limit result sets** with LIMIT clause
6. ✅ **Use batch API** for multiple queries
7. ✅ **Handle errors gracefully** in your code
8. ✅ **Rotate API keys** periodically

---

## ❌ Common Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| 401 | Unauthorized | Provide valid API key |
| 403 | Forbidden | Add `allowDestructive: true` |
| 400 | Bad Request | Check query syntax |
| 500 | Server Error | Check database connection |

---

## 📚 Resources

- Full Documentation: [API_DATABASE_DIRECT.md](API_DATABASE_DIRECT.md)
- JavaScript Client: [client-example.js](client-example.js)
- Python Client: [client_example.py](client_example.py)
- Test Script: [test-db-direct.sh](test-db-direct.sh)

---

## 🧪 Testing

Run the test script:
```bash
./test-db-direct.sh YOUR_API_KEY https://your-domain.vercel.app
```

Or test individual endpoints with curl as shown above.

---

**Made with ❤️ for Coffee Database Connector**
