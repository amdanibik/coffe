const express = require('express');
const cors = require('cors');
require('dotenv').config();
const dbConnector = require('./src/dbConnector');
const routes = require('./src/routes');
const mysqlRoutes = require('./src/mysqlRoutes');
const mongoRoutes = require('./src/mongoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins for connector
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key', 'Authorization'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from public directory
app.use(express.static('public'));

// Request logging middleware for debugging
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers, null, 2));
  next();
});

// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key is required. Please provide it in X-API-Key header or apiKey query parameter'
    });
  }
  
  // Clean both API keys to handle whitespace and newline characters
  const cleanInputKey = apiKey.toString().trim();
  const cleanConfigKey = (process.env.CONNECTOR_API_KEY || '').toString().trim();
  
  if (cleanInputKey !== cleanConfigKey) {
    return res.status(403).json({
      success: false,
      error: 'Invalid API Key'
    });
  }
  
  next();
};

// Public routes (no authentication required)
app.get('/', (req, res) => {
  res.json({
    service: 'Coffee Database Connector',
    version: '1.0.0',
    status: 'running',
    deployed: 'vercel',
    connectorUrl: `${req.protocol}://${req.get('host')}`,
    endpoints: {
      // Connector metadata (no auth required)
      metadata: 'GET /api/connector/metadata - Connector information',
      health: 'GET /api/connector/health - Health check',
      
      // PRIMARY endpoint for BizCopilot integration (auth required)
      execute: 'POST /execute - Main query execution endpoint (PostgreSQL)',
      
      // MySQL endpoints (auth required)
      mysqlExecute: 'POST /mysql/execute - MySQL query execution endpoint',
      mysqlIntrospect: 'GET /mysql/introspect - Get MySQL database schema',
      mysqlTenants: 'GET /mysql/api/tenants - Get tenants from MySQL',
      mysqlOrders: 'GET /mysql/api/orders - Get orders from MySQL',
      
      // MongoDB endpoints (auth required)
      mongoExecute: 'POST /mongo/execute - MongoDB query execution endpoint',
      mongoIntrospect: 'GET /mongo/introspect - Get MongoDB database schema',
      mongoTenants: 'GET /mongo/api/tenants - Get tenants from MongoDB',
      mongoOrders: 'GET /mongo/api/orders - Get orders from MongoDB',
      
      // PostgreSQL Database introspection endpoints (auth required)
      introspect: 'GET /introspect or /api/introspect - Get PostgreSQL database schema',
      schema: 'GET /schema or /api/schema - Get database schema (alias)',
      sampleData: 'GET /sample-data or /api/sample-data - Get sample data from tables',
      
      // Core endpoints (auth required)
      testConnection: 'POST /api/test-connection',
      configuration: 'GET /api/configuration',
      query: 'POST /api/query',
      
      // Direct database connection endpoints (auth required)
      dbConnect: 'POST /api/db/connect - Establish direct database connection',
      dbExecute: 'POST /api/db/execute - Execute secure query with safety checks',
      dbPoolStatus: 'GET /api/db/pool-status - Get connection pool status',
      dbBatch: 'POST /api/db/batch - Execute batch queries',
      
      // Data endpoints (auth required)
      tenants: 'GET /api/tenants',
      orders: 'GET /api/orders',
      orderDetails: 'GET /api/orders/:orderId/details'
    },
    databases: {
      postgresql: 'Default - /execute, /introspect, /api/*',
      mysql: 'MySQL - /mysql/execute, /mysql/introspect, /mysql/api/*',
      mongodb: 'MongoDB - /mongo/execute, /mongo/introspect, /mongo/api/*'
    },
    authentication: 'Use X-API-Key header or apiKey query parameter',
    note: 'All /api/* endpoints require API key authentication (except /api/connector/*)',
    security: {
      apiKey: 'Required in X-API-Key header or apiKey query parameter',
      destructiveQueries: 'Require allowDestructive: true flag in request body'
    },
    compatible: {
      bizcopilot: true,
      services: ['bizcopilot.app', 'custom-integrations']
    }
  });
});

// POST to root - Test connection (with auth)
app.post('/', authenticateApiKey, async (req, res) => {
  try {
    const result = await dbConnector.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Direct database connection established',
        connection: {
          status: 'connected',
          timestamp: result.data.timestamp,
          poolInfo: dbConnector.getPoolInfo()
        },
        connector: {
          name: 'Coffee Database Connector',
          version: '1.0.0',
          type: 'PostgreSQL'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to establish database connection',
        details: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test connection endpoint - accessible both with and without /api prefix
app.post('/test-connection', authenticateApiKey, async (req, res) => {
  try {
    const result = await dbConnector.testConnection();
    const statusCode = result.success ? 200 : 500;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Additional endpoint that BizCopilot might call
app.get('/connect', authenticateApiKey, async (req, res) => {
  try {
    const result = await dbConnector.testConnection();
    res.json({
      success: result.success,
      message: 'Database connector is ready',
      connection: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/connect', authenticateApiKey, async (req, res) => {
  try {
    const result = await dbConnector.testConnection();
    res.json({
      success: result.success,
      message: 'Database connector is ready',
      connection: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Ping endpoint for basic connectivity test
app.get('/ping', (req, res) => {
  res.json({ status: 'ok', pong: true, timestamp: new Date().toISOString() });
});

app.post('/ping', (req, res) => {
  res.json({ status: 'ok', pong: true, timestamp: new Date().toISOString() });
});

// PRIMARY EXECUTE Endpoint - mounted at root for BizCopilot compatibility
// This is the main endpoint that BizCopilot connector service will call
app.post('/execute', authenticateApiKey, async (req, res) => {
  try {
    const startTime = Date.now();
    const dbConnector = require('./src/dbConnector');
    
    // Extract request parameters (BizCopilot format)
    const { 
      query, 
      query_type = 'sql', 
      database_type = 'postgresql',
      request_id,
      timeout_ms = 30000,
      params = []
    } = req.body;
    
    // Validate required parameters
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required in request body',
        error_code: 'MISSING_QUERY'
      });
    }
    
    // Log the request for debugging
    console.log(`[${new Date().toISOString()}] Execute request:`, {
      request_id,
      query_type,
      database_type,
      query_preview: query.substring(0, 100),
      timeout_ms
    });
    
    // Execute the query
    const result = await dbConnector.executeQuery(query, params);
    const executionTime = Date.now() - startTime;
    
    // Return response in BizCopilot expected format
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        execution_time_ms: executionTime,
        rows_affected: result.rowCount,
        request_id: request_id,
        query_type: query_type
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Query execution failed',
        error_code: 'EXECUTION_FAILED',
        execution_time_ms: executionTime,
        request_id: request_id
      });
    }
    
  } catch (error) {
    console.error('Execute endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'INTERNAL_ERROR'
    });
  }
});

// Introspect endpoint (root level, with auth)
app.get('/introspect', authenticateApiKey, async (req, res) => {
  try {
    const dbConnector = require('./src/dbConnector');
    const result = await dbConnector.introspectSchema();
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          tables: result.tables,
          schemaText: result.schemaText,
          tableCount: result.tableCount
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Schema endpoint (root level, with auth) - alias for introspect
app.get('/schema', authenticateApiKey, async (req, res) => {
  try {
    const dbConnector = require('./src/dbConnector');
    const result = await dbConnector.introspectSchema();
    
    if (result.success) {
      res.json({
        success: true,
        schema: result.schemaText,
        tables: result.tables,
        tableCount: result.tableCount
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Sample data endpoint (root level, with auth)
app.get('/sample-data', authenticateApiKey, async (req, res) => {
  try {
    const dbConnector = require('./src/dbConnector');
    const limit = parseInt(req.query.limit) || 3;
    const result = await dbConnector.getSampleData(limit);
    
    if (result.success) {
      res.json({
        success: true,
        samples: result.samples
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// API Key Authentication Middleware (for selective routes)
const optionalAuth = (req, res, next) => {
  // Skip auth for connector metadata endpoints
  const path = req.path || req.url;
  if (path.startsWith('/connector/') || path.includes('/connector/')) {
    return next();
  }
  return authenticateApiKey(req, res, next);
};

// Custom middleware for MySQL/MongoDB routes - skip auth for /connector paths
const dbRouteAuth = (req, res, next) => {
  const path = req.path || req.url;
  // Skip authentication for public endpoints
  if (path === '/connector/metadata' || 
      path.startsWith('/connector/') || 
      path === '/health' || 
      path === '/ping') {
    return next();
  }
  // Require authentication for all other paths
  return authenticateApiKey(req, res, next);
};

// All API routes with selective authentication
app.use('/api', optionalAuth, routes);

// MySQL routes - use custom auth middleware
app.use('/mysql', dbRouteAuth, mysqlRoutes);

// MongoDB routes - use custom auth middleware
app.use('/mongo', dbRouteAuth, mongoRoutes);

// Test MongoDB connection endpoint (no auth required)
app.get('/test-mongo', async (req, res) => {
  const { MongoClient, ServerApiVersion } = require("mongodb");
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return res.status(500).json({
      success: false,
      error: "MONGODB_URI is not defined in environment variables"
    });
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    // Get database stats
    const db = client.db("coffee_db");
    const collections = await db.listCollections().toArray();
    const stats = await db.stats();

    return res.status(200).json({
      success: true,
      message: "MongoDB connection successful from Vercel!",
      connection: {
        database: "coffee_db",
        collections: collections.map(c => c.name),
        stats: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      code: err.code
    });
  } finally {
    await client.close();
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║     Coffee Database Connector Server                  ║
╚═══════════════════════════════════════════════════════╝

Server running on: http://localhost:${PORT}
API Key: ${process.env.CONNECTOR_API_KEY}

Database Configuration:
- Type: PostgreSQL
- Host: ${process.env.DB_HOST}
- Port: ${process.env.DB_PORT}
- Database: ${process.env.DB_NAME}
- Query Timeout: ${process.env.QUERY_TIMEOUT}ms

Available Endpoints:
- GET  /                               → Service info
- POST /api/test-connection            → Test database connection
- GET  /api/configuration              → Get connector configuration
- POST /api/query                      → Execute custom SQL query
- GET  /api/tenants                    → Get all tenants
- GET  /api/orders?tenant_id=<id>      → Get orders by tenant
- GET  /api/orders/:orderId/details    → Get order details

Authentication: Use X-API-Key header with value: ${process.env.CONNECTOR_API_KEY}
  `);
});

module.exports = app;
