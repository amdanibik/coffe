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

// Root GET endpoint - return connector info
router.get('/', (req, res) => {
  res.json({
    success: true,
    connector: {
      name: 'Coffee MongoDB Database Connector',
      version: '1.0.0',
      type: 'MongoDB',
      status: 'running'
    },
    endpoints: {
      metadata: 'GET /mongo/connector/metadata',
      testConnection: 'POST /mongo/test-connection',
      execute: 'POST /mongo/execute',
      introspect: 'GET /mongo/introspect',
      schema: 'GET /mongo/schema',
      sampleData: 'GET /mongo/sample-data',
      tenants: 'GET /mongo/tenants',
      orders: 'GET /mongo/orders'
    },
    authentication: 'API Key required (X-API-Key header or apiKey query parameter)'
  });
});

// Root POST endpoint - test connection
router.post('/', async (req, res) => {
  try {
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

// Get sample data from collections
router.get('/sample-data', async (req, res) => {
  try {
    const schemaResult = await mongoConnector.introspectSchema();
    
    if (!schemaResult.success) {
      return res.status(500).json({
        success: false,
        error: schemaResult.error
      });
    }
    
    const sampleData = {};
    
    for (const collection of schemaResult.collections) {
      const dataResult = await mongoConnector.getSampleData(collection.collection, 3);
      if (dataResult.success) {
        sampleData[collection.collection] = dataResult.data.documents;
      }
    }
    
    res.json({
      success: true,
      data: sampleData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Test connection endpoint
router.post('/test-connection', async (req, res) => {
  try {
    const result = await mongoConnector.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
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
        error: 'Collection and operation are required'
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
      res.json({
        success: true,
        data: {
          result: result.data.result,
          rowCount: result.data.rowCount,
          executionTime: result.data.executionTime
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

// Query endpoint (alias for execute)
router.post('/query', async (req, res) => {
  try {
    const { collection, operation, query, options, allowDestructive } = req.body;
    
    if (!collection || !operation) {
      return res.status(400).json({
        success: false,
        error: 'Collection and operation are required'
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
      res.json({
        success: true,
        data: result.data
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

// Batch execution endpoint
router.post('/batch', async (req, res) => {
  try {
    const { operations } = req.body;
    
    if (!operations || !Array.isArray(operations)) {
      return res.status(400).json({
        success: false,
        error: 'Operations array is required'
      });
    }
    
    const result = await mongoConnector.executeBatch(operations);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Connection status endpoint
router.get('/connection-status', async (req, res) => {
  try {
    const result = await mongoConnector.getConnectionStatus();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get tenants
router.get('/tenants', async (req, res) => {
  try {
    const result = await mongoConnector.executeQuery('tenants', 'find', {});
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.result
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get orders
router.get('/orders', async (req, res) => {
  try {
    const { tenantId } = req.query;
    
    const query = tenantId ? { tenant_id: tenantId } : {};
    const options = { sort: { order_date: -1 }, limit: 100 };
    
    const result = await mongoConnector.executeQuery('orders', 'find', query, options);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.result
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
