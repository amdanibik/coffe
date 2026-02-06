const express = require('express');
const router = express.Router();
const mysqlConnector = require('./mysqlConnector');
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

// Connector metadata endpoint
router.get('/connector/metadata', (req, res) => {
  res.json({
    success: true,
    connector: {
      name: 'Coffee MySQL Database Connector',
      version: '1.0.0',
      type: 'MySQL',
      capabilities: {
        directQuery: true,
        batchQuery: true,
        transactions: true,
        parameterizedQueries: true,
        connectionPooling: true
      },
      endpoints: {
        execute: '/mysql/execute',
        introspect: '/mysql/api/introspect',
        schema: '/mysql/api/schema',
        sampleData: '/mysql/api/sample-data',
        testConnection: '/mysql/api/test-connection',
        query: '/mysql/api/query',
        poolStatus: '/mysql/api/pool-status',
        batch: '/mysql/api/batch'
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
    const result = await mysqlConnector.introspectSchema();
    
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

// Database schema endpoint (alias for introspect)
router.get('/schema', async (req, res) => {
  try {
    const result = await mysqlConnector.introspectSchema();
    
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

// Get sample data from tables
router.get('/sample-data', async (req, res) => {
  try {
    const schemaResult = await mysqlConnector.introspectSchema();
    
    if (!schemaResult.success) {
      return res.status(500).json({
        success: false,
        error: schemaResult.error
      });
    }
    
    const sampleData = {};
    
    for (const table of schemaResult.tables) {
      const dataResult = await mysqlConnector.getSampleData(table.table, 3);
      if (dataResult.success) {
        sampleData[table.table] = dataResult.data.rows;
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
    const result = await mysqlConnector.testConnection();
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
    const { query, params, allowDestructive } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    // Check for destructive queries
    const destructiveKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
    const isDestructive = destructiveKeywords.some(keyword => 
      query.toUpperCase().includes(keyword)
    );
    
    if (isDestructive && !allowDestructive) {
      return res.status(403).json({
        success: false,
        error: 'Destructive query detected. Set allowDestructive: true to execute.'
      });
    }
    
    const result = await mysqlConnector.executeQuery(query, params || []);
    
    if (result.success) {
      res.json({
        success: true,
        data: {
          rows: result.data.rows,
          rowCount: result.data.rowCount,
          executionTime: result.data.executionTime
        }
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
        code: result.code
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
    const { query, params, allowDestructive } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }
    
    const destructiveKeywords = ['DROP', 'DELETE', 'TRUNCATE', 'ALTER'];
    const isDestructive = destructiveKeywords.some(keyword => 
      query.toUpperCase().includes(keyword)
    );
    
    if (isDestructive && !allowDestructive) {
      return res.status(403).json({
        success: false,
        error: 'Destructive query detected. Set allowDestructive: true to execute.'
      });
    }
    
    const result = await mysqlConnector.executeQuery(query, params || []);
    
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
    const { queries } = req.body;
    
    if (!queries || !Array.isArray(queries)) {
      return res.status(400).json({
        success: false,
        error: 'Queries array is required'
      });
    }
    
    const result = await mysqlConnector.executeBatch(queries);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Pool status endpoint
router.get('/pool-status', async (req, res) => {
  try {
    const result = await mysqlConnector.getPoolStatus();
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
    const result = await mysqlConnector.executeQuery('SELECT * FROM tenants');
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.rows
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
    
    let query = 'SELECT * FROM orders';
    const params = [];
    
    if (tenantId) {
      query += ' WHERE tenant_id = ?';
      params.push(tenantId);
    }
    
    query += ' ORDER BY order_date DESC LIMIT 100';
    
    const result = await mysqlConnector.executeQuery(query, params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data.rows
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
