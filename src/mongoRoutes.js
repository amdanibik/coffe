const express = require('express');
const router = express.Router();
const mongoConnector = require('./mongoConnector');
const crypto = require('crypto');

// Helper function to verify HMAC signature
function verifyHmacSignature(apiKey, payload, signature) {
  if (!signature) {
    return true;
  }
  
  try {
    const canonicalJson = JSON.stringify(payload, Object.keys(payload).sort(), null, 0);
    const expectedSignature = crypto
      .createHmac('sha256', apiKey)
      .update(canonicalJson)
      .digest('hex');
    
    return signature === expectedSignature;
  } catch (error) {
    console.error('HMAC verification error:', error);
    return false;
  }
}

// Root POST endpoint - test connection (PRIMARY endpoint for BizCopilot)
// Authentication handled by middleware - accepts API key via:
//   1. X-API-Key header
//   2. apiKey query parameter
router.post('/', async (req, res) => {
  try {
    // API key already validated by middleware (dbRouteAuth)
    const result = await mongoConnector.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'MongoDB database connection established',
        connection: {
          status: 'connected',
          timestamp: result.data.timestamp,
          version: result.data.version,
          database: result.data.config.database
        },
        connector: {
          name: 'Coffee MongoDB Database Connector',
          version: '1.0.0',
          type: 'MongoDB'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to establish MongoDB database connection',
        details: result.error || result.message
      });
    }
  } catch (error) {
    console.error('[MongoDB / POST] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check MONGODB_URI environment variable and MongoDB Atlas Network Access'
    });
  }
});

// Health check endpoint (no auth required)
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'MongoDB Connector',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Ping endpoints for basic connectivity test (no auth required)
router.get('/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    pong: true, 
    service: 'MongoDB Connector',
    timestamp: new Date().toISOString() 
  });
});

router.post('/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    pong: true, 
    service: 'MongoDB Connector',
    timestamp: new Date().toISOString() 
  });
});

// Connect endpoints - alternative connection test (with auth)
router.get('/connect', async (req, res) => {
  try {
    const result = await mongoConnector.testConnection();
    if (result.success) {
      res.json({
        success: true,
        message: 'MongoDB connector is ready',
        connection: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Connection test failed',
        details: result.message
      });
    }
  } catch (error) {
    console.error('[MongoDB /connect GET] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check MONGODB_URI environment variable'
    });
  }
});

router.post('/connect', async (req, res) => {
  try {
    const result = await mongoConnector.testConnection();
    if (result.success) {
      res.json({
        success: true,
        message: 'MongoDB connector is ready',
        connection: result
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Connection test failed',
        details: result.message
      });
    }
  } catch (error) {
    console.error('[MongoDB /connect POST] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check MONGODB_URI environment variable'
    });
  }
});

// Connector metadata endpoint
router.get('/connector/metadata', (req, res) => {
  res.json({
    success: true,
    connector: {
      name: 'Coffee MongoDB Database Connector',
      version: '1.0.0',
      type: 'MongoDB',
      capabilities: {
        directQuery: true,
        batchQuery: true,
        transactions: true,
        aggregation: true,
        documentDatabase: true
      },
      endpoints: {
        execute: '/mongo/execute',
        introspect: '/mongo/api/introspect',
        schema: '/mongo/api/schema',
        sampleData: '/mongo/api/sample-data',
        testConnection: '/mongo/api/test-connection',
        query: '/mongo/api/query',
        connectionStatus: '/mongo/api/connection-status',
        batch: '/mongo/api/batch'
      },
      authentication: {
        type: 'api-key',
        headerName: 'X-API-Key',
        queryParamName: 'apiKey'
      }
    }
  });
});

// Database introspection endpoint
router.get('/introspect', async (req, res) => {
  try {
    const result = await mongoConnector.introspectSchema();
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          collections: result.collections,
          schemaText: result.schemaText,
          collectionCount: result.collectionCount
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to introspect database schema'
      });
    }
  } catch (error) {
    console.error('[MongoDB /introspect] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Ensure MongoDB connection is established'
    });
  }
});

// Database schema endpoint (alias for introspect)
router.get('/schema', async (req, res) => {
  try {
    const result = await mongoConnector.introspectSchema();
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          collections: result.collections,
          schemaText: result.schemaText,
          collectionCount: result.collectionCount
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve database schema'
      });
    }
  } catch (error) {
    console.error('[MongoDB /schema] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Ensure MongoDB connection is established'
    });
  }
});

// Get sample data from collections
router.get('/sample-data', async (req, res) => {
  try {
    const schemaResult = await mongoConnector.introspectSchema();
    
    if (!schemaResult.success) {
      return res.status(500).json({
        success: false,
        error: schemaResult.error || 'Failed to retrieve schema for sample data'
      });
    }
    
    const sampleData = {};
    const errors = [];
    
    for (const collection of schemaResult.collections) {
      try {
        const dataResult = await mongoConnector.getSampleData(collection.collection, 3);
        if (dataResult.success) {
          sampleData[collection.collection] = dataResult.data.documents;
        } else {
          errors.push({ collection: collection.collection, error: dataResult.error });
        }
      } catch (err) {
        errors.push({ collection: collection.collection, error: err.message });
      }
    }
    
    res.json({
      success: true,
      data: sampleData,
      ...(errors.length > 0 && { warnings: errors })
    });
  } catch (error) {
    console.error('[MongoDB /sample-data] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Ensure MongoDB connection is established'
    });
  }
});

// Test connection endpoint
router.post('/test-connection', async (req, res) => {
  try {
    const result = await mongoConnector.testConnection();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Connection test failed',
        message: result.message
      });
    }
  } catch (error) {
    console.error('[MongoDB /test-connection] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check MONGODB_URI environment variable and MongoDB Atlas Network Access'
    });
  }
});

// Execute query endpoint (PRIMARY endpoint for BizCopilot compatibility)
router.post('/execute', async (req, res) => {
  try {
    const { collection, operation, query, options, allowDestructive } = req.body;
    
    if (!collection || !operation) {
      return res.status(400).json({
        success: false,
        error: 'Collection and operation are required',
        hint: 'MongoDB uses document-based queries, not SQL',
        examples: {
          count: {
            collection: 'tenants',
            operation: 'count',
            query: {}
          },
          find: {
            collection: 'tenants',
            operation: 'find',
            query: {},
            options: { limit: 10 }
          },
          findOne: {
            collection: 'tenants',
            operation: 'findOne',
            query: { code: 'T001' }
          },
          aggregate: {
            collection: 'orders',
            operation: 'aggregate',
            query: [
              { $group: { _id: '$tenant_id', total: { $sum: 1 } } }
            ]
          }
        },
        supportedOperations: [
          'find', 'findOne', 'count', 'aggregate', 
          'insertOne', 'insertMany', 'updateOne', 
          'updateMany', 'deleteOne', 'deleteMany'
        ]
      });
    }
    
    // Check for destructive operations
    const destructiveOps = ['deleteone', 'deletemany', 'drop'];
    const isDestructive = destructiveOps.includes(operation.toLowerCase());
    
    if (isDestructive && !allowDestructive) {
      return res.status(403).json({
        success: false,
        error: 'Destructive operation detected. Set allowDestructive: true to execute.'
      });
    }
    
    const result = await mongoConnector.executeQuery(collection, operation, query || {}, options || {});
    
    if (result.success) {
      // For count operations, wrap result in SQL-compatible format
      let rows;
      if (operation.toLowerCase() === 'count' || operation.toLowerCase() === 'countdocuments') {
        rows = [{ count: result.data.result }];
      } else if (Array.isArray(result.data.result)) {
        rows = result.data.result;
      } else {
        rows = result.data.result ? [result.data.result] : [];
      }
      
      res.json({
        success: true,
        data: {
          rows: rows,
          rowCount: result.data.rowCount,
          executionTime: result.data.executionTime
        },
        query: {
          type: 'mongodb',
          collection: collection,
          operation: operation
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Query execution failed',
        collection: result.collection,
        operation: result.operation
      });
    }
  } catch (error) {
    console.error('[MongoDB /execute] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Ensure MongoDB connection is established and query format is correct'
    });
  }
});

// Query endpoint (alias for execute)
router.post('/query', async (req, res) => {
  try {
    const { collection, operation, query, options, allowDestructive } = req.body;
    
    if (!collection || !operation) {
      return res.status(400).json({
        success: false,
        error: 'Collection and operation are required',
        hint: 'MongoDB uses document-based queries, not SQL',
        examples: {
          count: {
            collection: 'tenants',
            operation: 'count',
            query: {}
          },
          find: {
            collection: 'tenants',
            operation: 'find',
            query: {},
            options: { limit: 10 }
          }
        }
      });
    }
    
    const destructiveOps = ['deleteone', 'deletemany', 'drop'];
    const isDestructive = destructiveOps.includes(operation.toLowerCase());
    
    if (isDestructive && !allowDestructive) {
      return res.status(403).json({
        success: false,
        error: 'Destructive operation detected. Set allowDestructive: true to execute.'
      });
    }
    
    const result = await mongoConnector.executeQuery(collection, operation, query || {}, options || {});
    
    if (result.success) {
      // For count operations, wrap result in SQL-compatible format
      let rows;
      if (operation.toLowerCase() === 'count' || operation.toLowerCase() === 'countdocuments') {
        rows = [{ count: result.data.result }];
      } else if (Array.isArray(result.data.result)) {
        rows = result.data.result;
      } else {
        rows = result.data.result ? [result.data.result] : [];
      }
      
      res.json({
        success: true,
        data: {
          rows: rows,
          rowCount: result.data.rowCount,
          executionTime: result.data.executionTime
        },
        query: {
          type: 'mongodb',
          collection: collection,
          operation: operation
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Query execution failed',
        collection: result.collection,
        operation: result.operation
      });
    }
  } catch (error) {
    console.error('[MongoDB /query] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Ensure MongoDB connection is established and query format is correct'
    });
  }
});

// Batch execution endpoint
router.post('/batch', async (req, res) => {
  try {
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Operations array is required',
        hint: 'Expected format: {"operations": [{"collection": "tenants", "operation": "find", "query": {}}]}'
      });
    }
    
    if (operations.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Operations array cannot be empty'
      });
    }
    
    const result = await mongoConnector.executeBatch(operations);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Batch execution failed',
        details: result.results
      });
    }
  } catch (error) {
    console.error('[MongoDB /batch] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Check operation format and MongoDB connection'
    });
  }
});

// Connection status endpoint
router.get('/connection-status', async (req, res) => {
  try {
    const result = await mongoConnector.getConnectionStatus();
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to get connection status',
        message: result.message
      });
    }
  } catch (error) {
    console.error('[MongoDB /connection-status] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'MongoDB connection may not be initialized'
    });
  }
});

// Get tenants
router.get('/tenants', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const result = await mongoConnector.executeQuery('tenants', 'find', {}, { limit });
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          rows: result.data.result,
          rowCount: result.data.rowCount,
          executionTime: result.data.executionTime
        },
        query: {
          type: 'mongodb',
          collection: 'tenants',
          operation: 'find'
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve tenants',
        collection: result.collection
      });
    }
  } catch (error) {
    console.error('[MongoDB /tenants] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Ensure MongoDB connection is established and tenants collection exists'
    });
  }
});

// Get orders
router.get('/orders', async (req, res) => {
  try {
    const { tenantId, limit: queryLimit } = req.query;
    
    const query = tenantId ? { tenant_id: tenantId } : {};
    const limit = parseInt(queryLimit) || 100;
    const options = { sort: { order_date: -1 }, limit };
    
    const result = await mongoConnector.executeQuery('orders', 'find', query, options);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          rows: result.data.result,
          rowCount: result.data.rowCount,
          executionTime: result.data.executionTime
        },
        query: {
          type: 'mongodb',
          collection: 'orders',
          operation: 'find',
          filters: tenantId ? { tenant_id: tenantId } : {}
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve orders',
        collection: result.collection
      });
    }
  } catch (error) {
    console.error('[MongoDB /orders] Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      hint: 'Ensure MongoDB connection is established and orders collection exists'
    });
  }
});

module.exports = router;
