# Multi-Database Coffee Connector

Connector ini sekarang mendukung 3 database:
1. **PostgreSQL** (default) - path: `/`
2. **MySQL** - path: `/mysql`
3. **MongoDB** - path: `/mongo`

## 🚀 Setup Environment Variables

### PostgreSQL (Existing)
```bash
DATABASE_URL=postgresql://user:password@host:5432/dbname
# atau
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_db
DB_USER=postgres
DB_PASSWORD=your_password
```

### MySQL (New)
```bash
MYSQL_DATABASE_URL=mysql://user:password@host:3306/dbname
# atau
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=coffee_db
MYSQL_USER=root
MYSQL_PASSWORD=your_password
```

### MongoDB (New)
```bash
MONGODB_URL=mongodb://localhost:27017
# atau untuk MongoDB Atlas
MONGODB_URL=mongodb+srv://user:password@cluster.mongodb.net/
MONGODB_DATABASE=coffee_db
```

### API Key
```bash
CONNECTOR_API_KEY=your_secret_api_key
```

## 📦 Installation

```bash
# Install dependencies
npm install

# Make migration scripts executable
chmod +x migrate-mysql.sh
```

## 🔄 Database Migration

### Migrate to MySQL
```bash
# Set MySQL environment variables first
export MYSQL_HOST=your-mysql-host.com
export MYSQL_DATABASE=coffee_db
export MYSQL_USER=your_user
export MYSQL_PASSWORD=your_password

# Run migration script
./migrate-mysql.sh
```

### Migrate to MongoDB
```bash
# Set MongoDB environment variables first
export MONGODB_URL=mongodb://localhost:27017
export MONGODB_DATABASE=coffee_db

# Run migration script
node migrate-mongodb.js
```

## 🌐 API Endpoints

### PostgreSQL (Default)
```
POST /execute                     - Execute SQL query
GET  /introspect                  - Get database schema
GET  /api/tenants                 - Get all tenants
GET  /api/orders                  - Get all orders
POST /api/test-connection         - Test connection
```

### MySQL
```
POST /mysql/execute               - Execute MySQL query
GET  /mysql/introspect            - Get MySQL schema
GET  /mysql/api/tenants           - Get tenants from MySQL
GET  /mysql/api/orders            - Get orders from MySQL
POST /mysql/api/test-connection   - Test MySQL connection
GET  /mysql/api/pool-status       - Get connection pool status
```

### MongoDB
```
POST /mongo/execute               - Execute MongoDB query
GET  /mongo/introspect            - Get MongoDB schema
GET  /mongo/api/tenants           - Get tenants from MongoDB
GET  /mongo/api/orders            - Get orders from MongoDB
POST /mongo/api/test-connection   - Test MongoDB connection
GET  /mongo/api/connection-status - Get connection status
```

## 📝 Usage Examples

### PostgreSQL Query
```bash
curl -X POST http://localhost:3000/execute \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 5"
  }'
```

### MySQL Query
```bash
curl -X POST http://localhost:3000/mysql/execute \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "SELECT * FROM tenants LIMIT 5"
  }'
```

### MongoDB Query
```bash
curl -X POST http://localhost:3000/mongo/execute \
  -H "X-API-Key: your_api_key" \
  -H "Content-Type: application/json" \
  -d '{
    "collection": "tenants",
    "operation": "find",
    "query": {},
    "options": { "limit": 5 }
  }'
```

## 🚀 Deploy to Vercel

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Set environment variables in Vercel
vercel env add DATABASE_URL
vercel env add MYSQL_DATABASE_URL
vercel env add MONGODB_URL
vercel env add CONNECTOR_API_KEY

# Deploy
vercel --prod
```

## 🔧 Environment Variables for Vercel

Add these in Vercel Dashboard → Settings → Environment Variables:

```
DATABASE_URL=postgresql://...
MYSQL_DATABASE_URL=mysql://...
MONGODB_URL=mongodb+srv://...
MONGODB_DATABASE=coffee_db
CONNECTOR_API_KEY=your_secret_key
```

## 📊 Testing Endpoints

### Test PostgreSQL
```bash
curl -X POST http://localhost:3000/api/test-connection \
  -H "X-API-Key: your_api_key"
```

### Test MySQL
```bash
curl -X POST http://localhost:3000/mysql/api/test-connection \
  -H "X-API-Key: your_api_key"
```

### Test MongoDB
```bash
curl -X POST http://localhost:3000/mongo/api/test-connection \
  -H "X-API-Key: your_api_key"
```

## 🎯 BizCopilot Integration

All three databases are compatible with BizCopilot:
- PostgreSQL: Use base URL `/execute`
- MySQL: Use base URL `/mysql/execute`
- MongoDB: Use base URL `/mongo/execute`

## 📁 Project Structure

```
coffee/
├── src/
│   ├── dbConnector.js       # PostgreSQL connector
│   ├── mysqlConnector.js    # MySQL connector (NEW)
│   ├── mongoConnector.js    # MongoDB connector (NEW)
│   ├── routes.js            # PostgreSQL routes
│   ├── mysqlRoutes.js       # MySQL routes (NEW)
│   └── mongoRoutes.js       # MongoDB routes (NEW)
├── server.js                # Main server with all routes
├── migrate-mysql.sh         # MySQL migration script (NEW)
├── migrate-mongodb.js       # MongoDB migration script (NEW)
└── package.json             # Dependencies updated
```

## 🔥 Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Set environment variables
cp .env.example .env
# Edit .env with your credentials

# 3. Run migrations (optional)
./migrate-mysql.sh
node migrate-mongodb.js

# 4. Start server
npm start

# 5. Test
curl http://localhost:3000
```

## ✅ Features

- ✅ Multi-database support (PostgreSQL, MySQL, MongoDB)
- ✅ Connection pooling for PostgreSQL and MySQL
- ✅ MongoDB transaction support
- ✅ BizCopilot compatible
- ✅ Schema introspection for all databases
- ✅ Sample data endpoints
- ✅ API key authentication
- ✅ CORS enabled
- ✅ Migration scripts included
- ✅ Vercel deployment ready

## 🙏 Need Help?

Check the main [README.md](README.md) for more detailed documentation.
