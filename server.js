const express = require('express');
const cors = require('cors');
require('dotenv').config();
const dbConnector = require('./src/dbConnector');
const routes = require('./src/routes');

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

// API Key Authentication Middleware
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key is required. Please provide it in X-API-Key header or apiKey query parameter'
    });
  }
  
  if (apiKey !== process.env.CONNECTOR_API_KEY) {
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
    endpoints: {
      testConnection: 'POST /api/test-connection',
      configuration: 'GET /api/configuration',
      query: 'POST /api/query',
      tenants: 'GET /api/tenants',
      orders: 'GET /api/orders',
      orderDetails: 'GET /api/orders/:orderId/details'
    },
    authentication: 'Use X-API-Key header or apiKey query parameter',
    note: 'All /api/* endpoints require API key authentication'
  });
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Protected routes
app.use('/api', authenticateApiKey, routes);

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
