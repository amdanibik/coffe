# Coffee Database Connector - API Routes Documentation

## Overview

Coffee Database Connector adalah layanan API yang mendukung multi-database (PostgreSQL, MySQL, MongoDB) dengan autentikasi via API Key.

**Base URL:** `https://your-domain.com`

**Authentication:**
- Header: `X-API-Key: your-api-key`
- Query Parameter: `?apiKey=your-api-key`

---

## Root Routes (`/`)

### GET /
**Description:** Menampilkan informasi service dan daftar semua endpoint yang tersedia.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/
```

**Response:**
```json
{
  "service": "Coffee Database Connector",
  "version": "1.0.0",
  "status": "running",
  "deployed": "vercel",
  "connectorUrl": "https://your-domain.com",
  "endpoints": {
    "metadata": "GET /api/connector/metadata - Connector information",
    "health": "GET /api/connector/health - Health check",
    "execute": "POST /execute - Main query execution endpoint (PostgreSQL)",
    "mysqlExecute": "POST /mysql/execute - MySQL query execution endpoint",
    "mysqlIntrospect": "GET /mysql/introspect - Get MySQL database schema",
    "mysqlTenants": "GET /mysql/api/tenants - Get tenants from MySQL",
    "mysqlOrders": "GET /mysql/api/orders - Get orders from MySQL",
    "mongoExecute": "POST /mongo/execute - MongoDB query execution endpoint",
    "mongoIntrospect": "GET /mongo/introspect - Get MongoDB database schema",
    "mongoTenants": "GET /mongo/api/tenants - Get tenants from MongoDB",
    "mongoOrders": "GET /mongo/api/orders - Get orders from MongoDB",
    "introspect": "GET /introspect or /api/introspect - Get PostgreSQL database schema",
    "schema": "GET /schema or /api/schema - Get database schema (alias)",
    "sampleData": "GET /sample-data or /api/sample-data - Get sample data from tables",
    "testConnection": "POST /api/test-connection",
    "configuration": "GET /api/configuration",
    "query": "POST /api/query",
    "dbConnect": "POST /api/db/connect - Establish direct database connection",
    "dbExecute": "POST /api/db/execute - Execute secure query with safety checks",
    "dbPoolStatus": "GET /api/db/pool-status - Get connection pool status",
    "dbBatch": "POST /api/db/batch - Execute batch queries",
    "tenants": "GET /api/tenants",
    "orders": "GET /api/orders",
    "orderDetails": "GET /api/orders/:orderId/details"
  },
  "databases": {
    "postgresql": "Default - /execute, /introspect, /api/*",
    "mysql": "MySQL - /mysql/execute, /mysql/introspect, /mysql/api/*",
    "mongodb": "MongoDB - /mongo/execute, /mongo/introspect, /mongo/api/*"
  },
  "authentication": "Use X-API-Key header or apiKey query parameter",
  "note": "All /api/* endpoints require API key authentication (except /api/connector/*)",
  "security": {
    "apiKey": "Required in X-API-Key header or apiKey query parameter",
    "destructiveQueries": "Require allowDestructive: true flag in request body"
  },
  "compatible": {
    "bizcopilot": true,
    "services": ["bizcopilot.app", "custom-integrations"]
  }
}
```

---

### POST /
**Description:** Test koneksi database PostgreSQL.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X POST https://your-domain.com/ \
  -H "X-API-Key: your-api-key"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Direct database connection established",
  "connection": {
    "status": "connected",
    "timestamp": "2026-02-11T10:30:00.000Z",
    "poolInfo": {
      "totalConnections": 10,
      "idleConnections": 8,
      "waitingCount": 0
    }
  },
  "connector": {
    "name": "Coffee Database Connector",
    "version": "1.0.0",
    "type": "PostgreSQL"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to establish database connection",
  "details": "Connection refused"
}
```

---

### GET /health
**Description:** Health check endpoint.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-11T10:30:00.000Z",
  "uptime": 3600
}
```

---

### GET /ping | POST /ping
**Description:** Test konektivitas dasar.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/ping
```

**Response:**
```json
{
  "status": "ok",
  "pong": true,
  "timestamp": "2026-02-11T10:30:00.000Z"
}
```

---

### POST /execute
**Description:** Endpoint utama untuk eksekusi query SQL di PostgreSQL (digunakan oleh BizCopilot).

**Authentication:** Diperlukan

**Request:**
```bash
curl -X POST https://your-domain.com/execute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 10",
    "query_type": "sql",
    "database_type": "postgresql",
    "request_id": "req-123",
    "timeout_ms": 30000,
    "params": []
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | SQL query yang akan dieksekusi |
| query_type | string | No | Tipe query (default: "sql") |
| database_type | string | No | Tipe database (default: "postgresql") |
| request_id | string | No | ID untuk tracking request |
| timeout_ms | number | No | Timeout dalam milliseconds (default: 30000) |
| params | array | No | Parameter untuk prepared statement |

**Response (Success):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "Tenant A",
      "code": "TA001",
      "address": "Jakarta"
    }
  ],
  "execution_time_ms": 45,
  "rows_affected": 1,
  "request_id": "req-123",
  "query_type": "sql"
}
```

**Response (Error - Missing Query):**
```json
{
  "success": false,
  "error": "Query is required in request body",
  "error_code": "MISSING_QUERY"
}
```

---

## MySQL Routes (`/mysql`)

### POST /mysql
**Description:** Test koneksi database MySQL.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X POST https://your-domain.com/mysql \
  -H "X-API-Key: your-api-key"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "MySQL database connection established",
  "connection": {
    "status": "connected",
    "timestamp": "2026-02-11T10:30:00.000Z",
    "version": "8.0.0",
    "database": "coffee_db"
  },
  "connector": {
    "name": "Coffee MySQL Database Connector",
    "version": "1.0.0",
    "type": "MySQL"
  }
}
```

---

### GET /mysql/health
**Description:** Health check untuk MySQL connector.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mysql/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "MySQL Connector",
  "timestamp": "2026-02-11T10:30:00.000Z",
  "uptime": 3600
}
```

---

### GET /mysql/ping | POST /mysql/ping
**Description:** Test konektivitas MySQL.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mysql/ping
```

**Response:**
```json
{
  "status": "ok",
  "pong": true,
  "service": "MySQL Connector",
  "timestamp": "2026-02-11T10:30:00.000Z"
}
```

---

### GET /mysql/connector/metadata
**Description:** Metadata informasi connector MySQL.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mysql/connector/metadata
```

**Response:**
```json
{
  "success": true,
  "connector": {
    "name": "Coffee MySQL Database Connector",
    "version": "1.0.0",
    "type": "MySQL",
    "capabilities": {
      "directQuery": true,
      "batchQuery": true,
      "transactions": true,
      "parameterizedQueries": true,
      "connectionPooling": true
    },
    "endpoints": {
      "execute": "/mysql/execute",
      "introspect": "/mysql/api/introspect",
      "schema": "/mysql/api/schema",
      "sampleData": "/mysql/api/sample-data",
      "testConnection": "/mysql/api/test-connection",
      "query": "/mysql/api/query",
      "poolStatus": "/mysql/api/pool-status",
      "batch": "/mysql/api/batch"
    },
    "authentication": {
      "type": "api-key",
      "headerName": "X-API-Key",
      "queryParamName": "apiKey"
    }
  }
}
```

---

### GET /mysql/introspect
**Description:** Mendapatkan skema database MySQL.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mysql/introspect \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tables": [
      {
        "table": "tenants",
        "columns": [
          { "name": "id", "type": "int", "nullable": false },
          { "name": "name", "type": "varchar(255)", "nullable": false },
          { "name": "code", "type": "varchar(50)", "nullable": false }
        ]
      },
      {
        "table": "orders",
        "columns": [
          { "name": "id", "type": "int", "nullable": false },
          { "name": "tenant_id", "type": "int", "nullable": false },
          { "name": "order_date", "type": "datetime", "nullable": false },
          { "name": "total", "type": "decimal(10,2)", "nullable": false }
        ]
      }
    ],
    "schemaText": "Table: tenants\n- id (int, NOT NULL)\n- name (varchar(255), NOT NULL)\n...",
    "tableCount": 8
  }
}
```

---

### GET /mysql/schema
**Description:** Alias untuk `/mysql/introspect`.

---

### GET /mysql/sample-data
**Description:** Mendapatkan sample data dari semua tabel MySQL.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mysql/sample-data \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenants": [
      { "id": 1, "name": "Cabang Jakarta", "code": "JKT001" },
      { "id": 2, "name": "Cabang Bandung", "code": "BDG001" }
    ],
    "orders": [
      { "id": 1, "tenant_id": 1, "order_date": "2026-02-11", "total": 50000 },
      { "id": 2, "tenant_id": 1, "order_date": "2026-02-10", "total": 75000 }
    ]
  }
}
```

---

### POST /mysql/execute
**Description:** Eksekusi query SQL di MySQL (endpoint utama untuk BizCopilot).

**Authentication:** Diperlukan

**Request:**
```bash
curl -X POST https://your-domain.com/mysql/execute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants WHERE code = ?",
    "params": ["JKT001"],
    "allowDestructive": false
  }'
```

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| query | string | Yes | SQL query yang akan dieksekusi |
| params | array | No | Parameter untuk prepared statement |
| allowDestructive | boolean | No | Set true untuk query DROP/DELETE/TRUNCATE/ALTER |

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "rows": [
      { "id": 1, "name": "Cabang Jakarta", "code": "JKT001" }
    ],
    "rowCount": 1,
    "executionTime": 12
  }
}
```

**Response (Error - Destructive Query):**
```json
{
  "success": false,
  "error": "Destructive query detected. Set allowDestructive: true to execute."
}
```

---

### POST /mysql/query
**Description:** Alias untuk `/mysql/execute`.

---

### POST /mysql/batch
**Description:** Eksekusi multiple query sekaligus.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X POST https://your-domain.com/mysql/batch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      { "query": "SELECT COUNT(*) as count FROM tenants" },
      { "query": "SELECT COUNT(*) as count FROM orders" }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "success": true, "data": { "rows": [{ "count": 5 }] } },
    { "success": true, "data": { "rows": [{ "count": 150 }] } }
  ],
  "totalQueries": 2,
  "successCount": 2,
  "failureCount": 0
}
```

---

### GET /mysql/pool-status
**Description:** Mendapatkan status connection pool MySQL.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mysql/pool-status \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "pool": {
    "totalConnections": 10,
    "idleConnections": 8,
    "waitingCount": 0
  }
}
```

---

### GET /mysql/tenants
**Description:** Mendapatkan daftar semua tenants.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mysql/tenants \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "data": [
    { "id": 1, "name": "Cabang Jakarta", "code": "JKT001", "address": "Jl. Sudirman No. 1" },
    { "id": 2, "name": "Cabang Bandung", "code": "BDG001", "address": "Jl. Asia Afrika No. 10" }
  ]
}
```

---

### GET /mysql/orders
**Description:** Mendapatkan daftar orders dengan filter opsional.

**Authentication:** Diperlukan

**Request:**
```bash
# Semua orders
curl -X GET https://your-domain.com/mysql/orders \
  -H "X-API-Key: your-api-key"

# Filter by tenant
curl -X GET "https://your-domain.com/mysql/orders?tenantId=1" \
  -H "X-API-Key: your-api-key"
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenantId | number | No | Filter orders berdasarkan tenant_id |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 100,
      "tenant_id": 1,
      "order_date": "2026-02-11T08:30:00.000Z",
      "total": 125000,
      "payment_method": "cash"
    },
    {
      "id": 99,
      "tenant_id": 1,
      "order_date": "2026-02-11T07:15:00.000Z",
      "total": 85000,
      "payment_method": "qris"
    }
  ]
}
```

---

## MongoDB Routes (`/mongo`)

### POST /mongo
**Description:** Test koneksi database MongoDB.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X POST https://your-domain.com/mongo \
  -H "X-API-Key: your-api-key"
```

**Response (Success):**
```json
{
  "success": true,
  "message": "MongoDB database connection established",
  "connection": {
    "status": "connected",
    "timestamp": "2026-02-11T10:30:00.000Z",
    "version": "6.0.0",
    "database": "coffee_db"
  },
  "connector": {
    "name": "Coffee MongoDB Database Connector",
    "version": "1.0.0",
    "type": "MongoDB"
  }
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Failed to establish MongoDB database connection",
  "hint": "Check MONGODB_URI environment variable and MongoDB Atlas Network Access"
}
```

---

### GET /mongo/health
**Description:** Health check untuk MongoDB connector.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mongo/health
```

**Response:**
```json
{
  "status": "ok",
  "service": "MongoDB Connector",
  "timestamp": "2026-02-11T10:30:00.000Z",
  "uptime": 3600
}
```

---

### GET /mongo/ping | POST /mongo/ping
**Description:** Test konektivitas MongoDB.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mongo/ping
```

**Response:**
```json
{
  "status": "ok",
  "pong": true,
  "service": "MongoDB Connector",
  "timestamp": "2026-02-11T10:30:00.000Z"
}
```

---

### GET /mongo/connector/metadata
**Description:** Metadata informasi connector MongoDB.

**Authentication:** Tidak diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mongo/connector/metadata
```

**Response:**
```json
{
  "success": true,
  "connector": {
    "name": "Coffee MongoDB Database Connector",
    "version": "1.0.0",
    "type": "MongoDB",
    "capabilities": {
      "directQuery": true,
      "batchQuery": true,
      "transactions": true,
      "aggregation": true,
      "documentDatabase": true
    },
    "endpoints": {
      "execute": "/mongo/execute",
      "introspect": "/mongo/api/introspect",
      "schema": "/mongo/api/schema",
      "sampleData": "/mongo/api/sample-data",
      "testConnection": "/mongo/api/test-connection",
      "query": "/mongo/api/query",
      "connectionStatus": "/mongo/api/connection-status",
      "batch": "/mongo/api/batch"
    },
    "authentication": {
      "type": "api-key",
      "headerName": "X-API-Key",
      "queryParamName": "apiKey"
    }
  }
}
```

---

### GET /mongo/introspect
**Description:** Mendapatkan skema database MongoDB (collections dan fields).

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mongo/introspect \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "collections": [
      {
        "collection": "tenants",
        "fields": ["_id", "name", "code", "address", "phone"],
        "documentCount": 5
      },
      {
        "collection": "orders",
        "fields": ["_id", "tenant_id", "order_date", "total", "items"],
        "documentCount": 150
      }
    ],
    "schemaText": "Collection: tenants\nFields: _id, name, code, address, phone\nDocument Count: 5\n...",
    "collectionCount": 8
  }
}
```

---

### GET /mongo/schema
**Description:** Alias untuk `/mongo/introspect`.

---

### GET /mongo/sample-data
**Description:** Mendapatkan sample data dari semua collections MongoDB.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mongo/sample-data \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenants": [
      { "_id": "65abc123...", "name": "Cabang Jakarta", "code": "JKT001" },
      { "_id": "65abc124...", "name": "Cabang Bandung", "code": "BDG001" }
    ],
    "orders": [
      { "_id": "65def789...", "tenant_id": "65abc123...", "order_date": "2026-02-11", "total": 50000 }
    ]
  }
}
```

---

### POST /mongo/execute
**Description:** Eksekusi query MongoDB (endpoint utama untuk BizCopilot).

**Authentication:** Diperlukan

#### Format 1: MongoDB Native Query
```bash
curl -X POST https://your-domain.com/mongo/execute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "find",
    "query": { "code": "JKT001" },
    "options": { "limit": 10 }
  }'
```

**Request Body (MongoDB Format):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| collection | string | Yes | Nama collection |
| operation | string | Yes | Operasi MongoDB (find, findOne, count, aggregate, insertOne, updateOne, deleteOne, dll) |
| query | object | No | Query filter atau dokumen |
| options | object | No | Options seperti limit, sort, projection |
| allowDestructive | boolean | No | Set true untuk operasi deleteOne/deleteMany/drop |

#### Format 2: SQL Query (Parsed ke MongoDB)
```bash
curl -X POST https://your-domain.com/mongo/execute \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants WHERE code = '\''JKT001'\'' LIMIT 10"
  }'
```

**Supported SQL Operations:**
- `SELECT * FROM collection` → find
- `SELECT COUNT(*) FROM collection` → count
- `SELECT ... WHERE field = 'value'` → find dengan filter
- `SELECT ... LIMIT n` → find dengan limit

**Response (Success - find):**
```json
{
  "success": true,
  "data": {
    "rows": [
      { "_id": "65abc123...", "name": "Cabang Jakarta", "code": "JKT001" }
    ],
    "rowCount": 1,
    "executionTime": 15
  },
  "query": {
    "type": "mongodb",
    "collection": "tenants",
    "operation": "find"
  }
}
```

**Response (Success - count):**
```json
{
  "success": true,
  "data": {
    "rows": [{ "count": 5 }],
    "rowCount": 1,
    "executionTime": 8
  },
  "query": {
    "type": "mongodb",
    "collection": "tenants",
    "operation": "count"
  }
}
```

**Response (Error - Missing Parameters):**
```json
{
  "success": false,
  "error": "Collection and operation are required",
  "hint": "MongoDB uses document-based queries, not SQL",
  "examples": {
    "count": {
      "collection": "tenants",
      "operation": "count",
      "query": {}
    },
    "find": {
      "collection": "tenants",
      "operation": "find",
      "query": {},
      "options": { "limit": 10 }
    },
    "findOne": {
      "collection": "tenants",
      "operation": "findOne",
      "query": { "code": "T001" }
    },
    "aggregate": {
      "collection": "orders",
      "operation": "aggregate",
      "query": [
        { "$group": { "_id": "$tenant_id", "total": { "$sum": 1 } } }
      ]
    }
  },
  "supportedOperations": [
    "find", "findOne", "count", "aggregate",
    "insertOne", "insertMany", "updateOne",
    "updateMany", "deleteOne", "deleteMany"
  ]
}
```

---

### POST /mongo/query
**Description:** Alias untuk `/mongo/execute`.

---

### POST /mongo/batch
**Description:** Eksekusi multiple operasi MongoDB sekaligus.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X POST https://your-domain.com/mongo/batch \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "operations": [
      { "collection": "tenants", "operation": "count", "query": {} },
      { "collection": "orders", "operation": "count", "query": {} }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [
    { "success": true, "collection": "tenants", "result": 5 },
    { "success": true, "collection": "orders", "result": 150 }
  ]
}
```

---

### GET /mongo/connection-status
**Description:** Mendapatkan status koneksi MongoDB.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mongo/connection-status \
  -H "X-API-Key: your-api-key"
```

**Response:**
```json
{
  "success": true,
  "status": "connected",
  "database": "coffee_db",
  "serverVersion": "6.0.0",
  "timestamp": "2026-02-11T10:30:00.000Z"
}
```

---

### GET /mongo/tenants
**Description:** Mendapatkan daftar semua tenants dari MongoDB.

**Authentication:** Diperlukan

**Request:**
```bash
curl -X GET https://your-domain.com/mongo/tenants \
  -H "X-API-Key: your-api-key"

# Dengan limit
curl -X GET "https://your-domain.com/mongo/tenants?limit=10" \
  -H "X-API-Key: your-api-key"
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| limit | number | No | Limit jumlah hasil (default: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "rows": [
      { "_id": "65abc123...", "name": "Cabang Jakarta", "code": "JKT001", "address": "Jl. Sudirman No. 1" },
      { "_id": "65abc124...", "name": "Cabang Bandung", "code": "BDG001", "address": "Jl. Asia Afrika No. 10" }
    ],
    "rowCount": 2,
    "executionTime": 12
  },
  "query": {
    "type": "mongodb",
    "collection": "tenants",
    "operation": "find"
  }
}
```

---

### GET /mongo/orders
**Description:** Mendapatkan daftar orders dari MongoDB dengan filter opsional.

**Authentication:** Diperlukan

**Request:**
```bash
# Semua orders
curl -X GET https://your-domain.com/mongo/orders \
  -H "X-API-Key: your-api-key"

# Filter by tenant
curl -X GET "https://your-domain.com/mongo/orders?tenantId=65abc123" \
  -H "X-API-Key: your-api-key"

# Dengan limit
curl -X GET "https://your-domain.com/mongo/orders?limit=50" \
  -H "X-API-Key: your-api-key"
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| tenantId | string | No | Filter orders berdasarkan tenant_id |
| limit | number | No | Limit jumlah hasil (default: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "_id": "65def789...",
        "tenant_id": "65abc123...",
        "order_date": "2026-02-11T08:30:00.000Z",
        "total": 125000,
        "items": [
          { "product": "Kopi Latte", "qty": 2, "price": 35000 },
          { "product": "Roti Bakar", "qty": 1, "price": 25000 }
        ]
      }
    ],
    "rowCount": 1,
    "executionTime": 18
  },
  "query": {
    "type": "mongodb",
    "collection": "orders",
    "operation": "find",
    "filters": { "tenant_id": "65abc123..." }
  }
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "success": false,
  "error": "API Key is required. Please provide it in X-API-Key header or apiKey query parameter"
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": "Invalid API Key"
}
```

### 403 Destructive Query Blocked
```json
{
  "success": false,
  "error": "Destructive query detected. Set allowDestructive: true to execute."
}
```

### 400 Bad Request
```json
{
  "success": false,
  "error": "Query is required"
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Database connection failed",
  "details": "Connection timeout"
}
```

---

## Security Notes

1. **API Key Authentication:** Semua endpoint yang memerlukan autentikasi harus menyertakan API key via header `X-API-Key` atau query parameter `apiKey`.

2. **Destructive Queries:** Query yang mengandung `DROP`, `DELETE`, `TRUNCATE`, `ALTER` memerlukan flag `allowDestructive: true` dalam request body.

3. **HMAC Signature (Optional):** Untuk keamanan tambahan, request dapat menyertakan signature HMAC-SHA256 di header `X-Request-Signature`.

---

## Compatible Services

- **BizCopilot.app** - Fully compatible
- **Custom integrations** - REST API compatible
