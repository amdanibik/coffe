/**
 * BizCopilot Connector Endpoints - Node.js Version
 * 
 * Endpoints yang kompatibel dengan format BizCopilot Connector Service
 * Memanfaatkan routes database yang sudah ada
 */

const express = require('express');
const router = express.Router();
const dbConnector = require('./dbConnector');
const mysqlConnector = require('./mysqlConnector');
const mongoConnector = require('./mongoConnector');

// Helper untuk verifikasi API Key
const verifyApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.headers['x-api-key'] || req.query.apiKey;
  const configKey = (process.env.CONNECTOR_API_KEY || '').trim();
  
  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key is required',
      error_code: 'MISSING_API_KEY'
    });
  }
  
  if (apiKey.trim() !== configKey) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API key',
      error_code: 'INVALID_API_KEY'
    });
  }
  
  next();
};

// ==========================================
// PostgreSQL BizCopilot Connector
// ==========================================

// Health check
router.get('/postgresql/health', verifyApiKey, async (req, res) => {
  try {
    const result = await dbConnector.testConnection();
    res.json({
      status: result.success ? 'healthy' : 'unhealthy',
      database_type: 'postgresql',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Execute query - BizCopilot format
router.post('/postgresql/execute', verifyApiKey, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, query_type, database_type, request_id, timeout_ms, params } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required in request body',
        error_code: 'MISSING_QUERY',
        request_id
      });
    }
    
    if (database_type && database_type !== 'postgresql') {
      return res.status(400).json({
        success: false,
        error: `Database type mismatch. Expected postgresql, got ${database_type}`,
        error_code: 'DATABASE_TYPE_MISMATCH',
        request_id
      });
    }
    
    // Check for read-only
    const queryUpper = query.trim().toUpperCase();
    const isSelect = queryUpper.startsWith('SELECT') || 
                     queryUpper.startsWith('WITH') || 
                     queryUpper.startsWith('EXPLAIN');
    
    if (!isSelect) {
      return res.status(400).json({
        success: false,
        error: 'Only SELECT/WITH/EXPLAIN queries are allowed',
        error_code: 'INVALID_QUERY_TYPE',
        request_id
      });
    }
    
    const result = await dbConnector.executeQuery(query, params || []);
    const executionTimeMs = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        rows_affected: result.rowCount,
        execution_time_ms: executionTimeMs,
        request_id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        error_code: 'QUERY_EXECUTION_ERROR',
        execution_time_ms: executionTimeMs,
        request_id
      });
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'INTERNAL_ERROR',
      execution_time_ms: executionTimeMs,
      request_id: req.body?.request_id
    });
  }
});

// ==========================================
// MySQL BizCopilot Connector
// ==========================================

// Health check
router.get('/mysql/health', verifyApiKey, async (req, res) => {
  try {
    const result = await mysqlConnector.testConnection();
    res.json({
      status: result.success ? 'healthy' : 'unhealthy',
      database_type: 'mysql',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Execute query - BizCopilot format
router.post('/mysql/execute', verifyApiKey, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, query_type, database_type, request_id, timeout_ms, params } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required in request body',
        error_code: 'MISSING_QUERY',
        request_id
      });
    }
    
    if (database_type && database_type !== 'mysql') {
      return res.status(400).json({
        success: false,
        error: `Database type mismatch. Expected mysql, got ${database_type}`,
        error_code: 'DATABASE_TYPE_MISMATCH',
        request_id
      });
    }
    
    // Check for read-only
    const queryUpper = query.trim().toUpperCase();
    const isSelect = queryUpper.startsWith('SELECT') || 
                     queryUpper.startsWith('WITH') || 
                     queryUpper.startsWith('EXPLAIN');
    
    if (!isSelect) {
      return res.status(400).json({
        success: false,
        error: 'Only SELECT/WITH/EXPLAIN queries are allowed',
        error_code: 'INVALID_QUERY_TYPE',
        request_id
      });
    }
    
    const result = await mysqlConnector.executeQuery(query, params || []);
    const executionTimeMs = Date.now() - startTime;
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.rows,
        rows_affected: result.data.rowCount,
        execution_time_ms: executionTimeMs,
        request_id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        error_code: 'QUERY_EXECUTION_ERROR',
        execution_time_ms: executionTimeMs,
        request_id
      });
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'INTERNAL_ERROR',
      execution_time_ms: executionTimeMs,
      request_id: req.body?.request_id
    });
  }
});

// ==========================================
// MongoDB BizCopilot Connector
// ==========================================

// Health check
router.get('/mongodb/health', verifyApiKey, async (req, res) => {
  try {
    const result = await mongoConnector.testConnection();
    res.json({
      status: result.success ? 'healthy' : 'unhealthy',
      database_type: 'mongodb',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Execute query - BizCopilot format
router.post('/mongodb/execute', verifyApiKey, async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { query, query_type, database_type, request_id, timeout_ms } = req.body;
    
    if (database_type && database_type !== 'mongodb') {
      return res.status(400).json({
        success: false,
        error: `Database type mismatch. Expected mongodb, got ${database_type}`,
        error_code: 'DATABASE_TYPE_MISMATCH',
        request_id
      });
    }
    
    // Parse query - could be JSON string or object
    let queryData;
    if (typeof query === 'string') {
      try {
        queryData = JSON.parse(query);
      } catch {
        return res.status(400).json({
          success: false,
          error: 'Invalid query format. Expected JSON with collection and operation',
          error_code: 'INVALID_QUERY_FORMAT',
          request_id
        });
      }
    } else {
      queryData = query || {};
    }
    
    // Support direct format from request body
    const collection = queryData.collection || req.body.collection;
    const operation = queryData.operation || req.body.operation || 'find';
    const filter = queryData.filter || queryData.query || req.body.filter || {};
    const options = queryData.options || req.body.options || {};
    
    if (!collection) {
      return res.status(400).json({
        success: false,
        error: 'Collection name is required',
        error_code: 'MISSING_COLLECTION',
        request_id
      });
    }
    
    // Only allow read operations
    const allowedOps = ['find', 'findone', 'count', 'countdocuments', 'aggregate'];
    if (!allowedOps.includes(operation.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: `Only read operations are allowed: ${allowedOps.join(', ')}`,
        error_code: 'INVALID_OPERATION',
        request_id
      });
    }
    
    const result = await mongoConnector.executeQuery(collection, operation, filter, options);
    const executionTimeMs = Date.now() - startTime;
    
    if (result.success) {
      // Format data consistently
      let data;
      if (operation.toLowerCase() === 'count' || operation.toLowerCase() === 'countdocuments') {
        data = [{ count: result.data.result }];
      } else if (Array.isArray(result.data.result)) {
        data = result.data.result;
      } else {
        data = result.data.result ? [result.data.result] : [];
      }
      
      res.json({
        success: true,
        data: data,
        rows_affected: data.length,
        execution_time_ms: executionTimeMs,
        request_id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        error_code: 'QUERY_EXECUTION_ERROR',
        execution_time_ms: executionTimeMs,
        request_id
      });
    }
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;
    res.status(500).json({
      success: false,
      error: error.message,
      error_code: 'INTERNAL_ERROR',
      execution_time_ms: executionTimeMs,
      request_id: req.body?.request_id
    });
  }
});

// ==========================================
// Connector Info Endpoints
// ==========================================

router.get('/info', (req, res) => {
  res.json({
    service: 'BizCopilot Database Connectors',
    version: '1.0.0',
    connectors: {
      postgresql: {
        health: '/bizcopilot/postgresql/health',
        execute: '/bizcopilot/postgresql/execute'
      },
      mysql: {
        health: '/bizcopilot/mysql/health',
        execute: '/bizcopilot/mysql/execute'
      },
      mongodb: {
        health: '/bizcopilot/mongodb/health',
        execute: '/bizcopilot/mongodb/execute'
      }
    },
    authentication: {
      type: 'api-key',
      headerName: 'X-API-Key'
    },
    requestFormat: {
      postgresql: {
        query: 'SELECT * FROM table_name',
        query_type: 'sql',
        database_type: 'postgresql',
        request_id: 'unique-id',
        timeout_ms: 30000,
        params: []
      },
      mysql: {
        query: 'SELECT * FROM table_name',
        query_type: 'sql',
        database_type: 'mysql',
        request_id: 'unique-id',
        timeout_ms: 30000,
        params: []
      },
      mongodb: {
        query: '{"collection": "tenants", "operation": "find", "filter": {}}',
        query_type: 'find',
        database_type: 'mongodb',
        request_id: 'unique-id',
        timeout_ms: 30000
      }
    }
  });
});

module.exports = router;
