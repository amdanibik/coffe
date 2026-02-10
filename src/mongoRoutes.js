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

// Helper function to parse SQL queries and convert to MongoDB operations
function parseSqlToMongo(sqlQuery) {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    return null;
  }
  
  const sql = sqlQuery.trim().toUpperCase();
  const originalSql = sqlQuery.trim();
  
  try {
    // SELECT queries
    if (sql.startsWith('SELECT')) {
      // Check if it's a COUNT query
      if (sql.includes('COUNT(')) {
        // Extract table name from FROM clause
        const fromMatch = originalSql.match(/FROM\s+(\w+)/i);
        if (!fromMatch) return null;
        
        const collection = fromMatch[1];
        
        // Extract WHERE conditions if any
        const whereMatch = originalSql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|GROUP BY|$)/i);
        let query = {};
        
        if (whereMatch) {
          // Simple WHERE parsing (supports basic equality)
          const whereClause = whereMatch[1].trim();
          const conditions = whereClause.split(/\s+AND\s+/i);
          
          conditions.forEach(condition => {
            const eqMatch = condition.match(/(\w+)\s*=\s*['"](.+?)['"]/);
            if (eqMatch) {
              query[eqMatch[1]] = eqMatch[2];
            }
          });
        }
        
        return {
          collection,
          operation: 'count',
          query,
          options: {}
        };
      }
      
      // Regular SELECT query -> find
      const fromMatch = originalSql.match(/FROM\s+(\w+)/i);
      if (!fromMatch) return null;
      
      const collection = fromMatch[1];
      
      // Extract WHERE conditions
      const whereMatch = originalSql.match(/WHERE\s+(.+?)(?:ORDER BY|LIMIT|GROUP BY|$)/i);
      let query = {};
      
      if (whereMatch) {
        const whereClause = whereMatch[1].trim();
        const conditions = whereClause.split(/\s+AND\s+/i);
        
        conditions.forEach(condition => {
          const eqMatch = condition.match(/(\w+)\s*=\s*['"](.+?)['"]/);
          if (eqMatch) {
            query[eqMatch[1]] = eqMatch[2];
          }
        });
      }
      
      // Extract LIMIT
      const limitMatch = originalSql.match(/LIMIT\s+(\d+)/i);
      const options = {};
      if (limitMatch) {
        options.limit = parseInt(limitMatch[1], 10);
      }
      
      return {
        collection,
        operation: 'find',
        query,
        options
      };
    }
    
    // INSERT queries
    if (sql.startsWith('INSERT INTO')) {
      const tableMatch = originalSql.match(/INSERT INTO\s+(\w+)/i);
      if (!tableMatch) return null;
      
      return {
        collection: tableMatch[1],
        operation: 'insertOne',
        query: {}, // Would need more complex parsing for actual data
        options: {},
        note: 'INSERT parsing not fully implemented'
      };
    }
    
    // UPDATE queries
    if (sql.startsWith('UPDATE')) {
      const tableMatch = originalSql.match(/UPDATE\s+(\w+)/i);
      if (!tableMatch) return null;
      
      return {
        collection: tableMatch[1],
        operation: 'updateOne',
        query: {},
        options: {},
        note: 'UPDATE parsing not fully implemented'
      };
    }
    
    // DELETE queries
    if (sql.startsWith('DELETE FROM')) {
      const tableMatch = originalSql.match(/DELETE FROM\s+(\w+)/i);
      if (!tableMatch) return null;
      
      return {
        collection: tableMatch[1],
        operation: 'deleteOne',
        query: {},
        options: {},
        note: 'DELETE parsing not fully implemented'
      };
    }
    
    return null;
  } catch (error) {
    console.error('[SQL Parser] Error:', error.message);
    return null;
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
    let collection, operation, query, options, allowDestructive;
    
    // Check if this is a SQL query or MongoDB format
    if (req.body.query && typeof req.body.query === 'string' && !req.body.collection) {
      // This looks like a SQL query, try to parse it
      console.log('[MongoDB /execute] Received SQL query, attempting to parse:', req.body.query);
      const parsed = parseSqlToMongo(req.body.query);
      
      if (parsed) {
        collection = parsed.collection;
        operation = parsed.operation;
        query = parsed.query;
        options = parsed.options;
        console.log('[MongoDB /execute] Parsed SQL to MongoDB:', { collection, operation, query, options });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Could not parse SQL query',
          sqlQuery: req.body.query,
          hint: 'SQL parsing supports basic SELECT, COUNT, FROM, WHERE, and LIMIT clauses',
          examples: {
            validSql: [
              'SELECT COUNT(*) as count FROM tenants',
              'SELECT * FROM orders LIMIT 10',
              'SELECT * FROM tenants WHERE code = \'HQ\''
            ]
          }
        });
      }
    } else {
      // MongoDB format
      collection = req.body.collection;
      operation = req.body.operation;
      query = req.body.query;
      options = req.body.options;
      allowDestructive = req.body.allowDestructive;
    }
    
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
    let collection, operation, query, options, allowDestructive;
    
    // Check if this is a SQL query or MongoDB format
    if (req.body.query && typeof req.body.query === 'string' && !req.body.collection) {
      // This looks like a SQL query, try to parse it
      console.log('[MongoDB /query] Received SQL query, attempting to parse:', req.body.query);
      const parsed = parseSqlToMongo(req.body.query);
      
      if (parsed) {
        collection = parsed.collection;
        operation = parsed.operation;
        query = parsed.query;
        options = parsed.options;
        console.log('[MongoDB /query] Parsed SQL to MongoDB:', { collection, operation, query, options });
      } else {
        return res.status(400).json({
          success: false,
          error: 'Could not parse SQL query',
          sqlQuery: req.body.query,
          hint: 'SQL parsing supports basic SELECT, COUNT, FROM, WHERE, and LIMIT clauses',
          examples: {
            validSql: [
              'SELECT COUNT(*) as count FROM tenants',
              'SELECT * FROM orders LIMIT 10',
              'SELECT * FROM tenants WHERE code = \'HQ\''
            ]
          }
        });
      }
    } else {
      // MongoDB format
      collection = req.body.collection;
      operation = req.body.operation;
      query = req.body.query;
      options = req.body.options;
      allowDestructive = req.body.allowDestructive;
    }
    
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
