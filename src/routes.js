const express = require('express');
const router = express.Router();
const dbConnector = require('./dbConnector');
const crypto = require('crypto');
const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require('fs');
const path = require('path');

// Helper function to verify HMAC signature (optional - for enhanced security)
function verifyHmacSignature(apiKey, payload, signature) {
  if (!signature) {
    return true; // Allow requests without signature for backward compatibility
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

// Connector metadata endpoint (for external services like bizcopilot.app)
router.get('/connector/metadata', (req, res) => {
  res.json({
    success: true,
    connector: {
      name: 'Coffee Database Connector',
      version: '1.0.0',
      type: 'PostgreSQL',
      capabilities: {
        directQuery: true,
        batchQuery: true,
        transactions: true,
        parameterizedQueries: true,
        connectionPooling: true
      },
      endpoints: {
        execute: '/execute',  // PRIMARY endpoint for BizCopilot
        introspect: '/api/introspect',  // Get database schema
        schema: '/api/schema',  // Alias for introspect
        sampleData: '/api/sample-data',  // Get sample data from tables
        testConnection: '/api/test-connection',
        configuration: '/api/configuration',
        query: '/api/query',  // Legacy endpoint
        directConnect: '/api/db/connect',
        directExecute: '/api/db/execute',
        poolStatus: '/api/db/pool-status',
        batch: '/api/db/batch'
      },
      authentication: {
        type: 'api-key',
        headerName: 'X-API-Key',
        queryParamName: 'apiKey',
        hmacSignature: {
          supported: true,
          headerName: 'X-Request-Signature',
          algorithm: 'HMAC-SHA256',
          optional: true
        }
      }
    }
  });
});

// Database introspection endpoint - Get database schema
router.get('/introspect', async (req, res) => {
  try {
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

// Database schema endpoint (alias for introspect)
router.get('/schema', async (req, res) => {
  try {
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

// Get sample data from tables 
router.get('/sample-data', async (req, res) => {
  try {
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

// Health check endpoint for connector validation
router.get('/connector/health', async (req, res) => {
  try {
    const result = await dbConnector.testConnection();
    const poolInfo = dbConnector.getPoolInfo();
    
    res.json({
      success: result.success,
      status: result.success ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      database: {
        connected: result.success,
        type: 'PostgreSQL',
        poolStatus: poolInfo
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

// Direct database connection endpoint with enhanced security
router.post('/db/connect', async (req, res) => {
  try {
    const result = await dbConnector.testConnection();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Direct database connection established',
        connection: {
          status: 'connected',
          timestamp: result.data.timestamp,
          database: result.data.config.database,
          poolInfo: dbConnector.getPoolInfo()
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

// Execute secure query with connection info
router.post('/db/execute', async (req, res) => {
  try {
    const { query, params, transaction } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required in request body'
      });
    }

    // Validate query for safety (prevent destructive operations without explicit flag)
    const isDangerous = /drop|truncate|delete|update/i.test(query);
    const allowDangerous = req.body.allowDestructive === true;

    if (isDangerous && !allowDangerous) {
      return res.status(403).json({
        success: false,
        error: 'Potentially destructive query detected. Set "allowDestructive": true to execute',
        query: query.substring(0, 100)
      });
    }

    const result = transaction 
      ? await dbConnector.executeTransaction(query, params || [])
      : await dbConnector.executeQuery(query, params || []);
    
    res.json({
      success: result.success,
      data: result.data,
      rowCount: result.rowCount,
      executionTime: result.executionTime,
      query: query.substring(0, 100) + (query.length > 100 ? '...' : '')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get connection pool status
router.get('/db/pool-status', (req, res) => {
  try {
    const poolInfo = dbConnector.getPoolInfo();
    res.json({
      success: true,
      pool: poolInfo,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute batch queries
router.post('/db/batch', async (req, res) => {
  try {
    const { queries } = req.body;
    
    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Queries array is required in request body'
      });
    }

    if (queries.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 queries allowed per batch'
      });
    }

    const results = await dbConnector.executeBatch(queries);
    
    res.json({
      success: true,
      results: results,
      totalQueries: queries.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// MAIN EXECUTE ENDPOINT - Used by BizCopilot Connector Service
// This is the primary endpoint that BizCopilot.app will call
router.post('/execute', async (req, res) => {
  try {
    const startTime = Date.now();
    
    // Extract request parameters (BizCopilot format)
    const { 
      query, 
      query_type = 'sql', 
      database_type = 'postgresql',
      request_id,
      timeout_ms = 30000,
      params = []
    } = req.body;
    
    // Optional: Verify HMAC signature for enhanced security
    const signature = req.headers['x-request-signature'];
    const apiKey = req.headers['x-api-key'];
    
    if (signature && apiKey) {
      const isValid = verifyHmacSignature(apiKey, req.body, signature);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Invalid request signature',
          error_code: 'INVALID_SIGNATURE'
        });
      }
    }
    
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

// Test connection endpoint
router.post('/test-connection', async (req, res) => {
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

// Get configuration
router.get('/configuration', (req, res) => {
  try {
    const config = dbConnector.getConfiguration();
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Execute custom query
router.post('/query', async (req, res) => {
  try {
    const { query, params } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required in request body'
      });
    }

    const result = await dbConnector.executeQuery(query, params || []);
    const statusCode = result.success ? 200 : 400;
    res.status(statusCode).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get all tenants
router.get('/tenants', async (req, res) => {
  try {
    const query = 'SELECT * FROM tenants ORDER BY name';
    const result = await dbConnector.executeQuery(query);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.rowCount
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

// Get orders (with optional tenant filter)
router.get('/orders', async (req, res) => {
  try {
    const { tenant_id, start_date, end_date, limit = 100, offset = 0 } = req.query;
    
    let query = `
      SELECT 
        o.id,
        o.tenant_id,
        t.name as tenant_name,
        t.code as tenant_code,
        o.order_date,
        o.total,
        o.payment_method,
        COUNT(od.id) as item_count
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      LEFT JOIN order_details od ON o.id = od.order_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (tenant_id) {
      query += ` AND o.tenant_id = $${paramIndex}`;
      params.push(tenant_id);
      paramIndex++;
    }
    
    if (start_date) {
      query += ` AND o.order_date >= $${paramIndex}`;
      params.push(start_date);
      paramIndex++;
    }
    
    if (end_date) {
      query += ` AND o.order_date <= $${paramIndex}`;
      params.push(end_date);
      paramIndex++;
    }
    
    query += `
      GROUP BY o.id, o.tenant_id, t.name, t.code, o.order_date, o.total, o.payment_method
      ORDER BY o.order_date DESC, o.id
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(parseInt(limit), parseInt(offset));
    
    const result = await dbConnector.executeQuery(query, params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.rowCount,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset)
        }
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

// Get order details
router.get('/orders/:orderId/details', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    // Get order header
    const orderQuery = `
      SELECT 
        o.id,
        o.tenant_id,
        t.name as tenant_name,
        t.code as tenant_code,
        o.order_date,
        o.total,
        o.payment_method
      FROM orders o
      JOIN tenants t ON o.tenant_id = t.id
      WHERE o.id = $1
    `;
    
    const orderResult = await dbConnector.executeQuery(orderQuery, [orderId]);
    
    if (!orderResult.success || orderResult.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Order not found'
      });
    }
    
    // Get order details
    const detailsQuery = `
      SELECT 
        id,
        order_id,
        product_name,
        qty,
        price,
        subtotal
      FROM order_details
      WHERE order_id = $1
      ORDER BY product_name
    `;
    
    const detailsResult = await dbConnector.executeQuery(detailsQuery, [orderId]);
    
    if (detailsResult.success) {
      res.json({
        success: true,
        data: {
          order: orderResult.data[0],
          items: detailsResult.data,
          itemCount: detailsResult.rowCount
        }
      });
    } else {
      res.status(500).json(detailsResult);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get statistics
router.get('/statistics', async (req, res) => {
  try {
    const { tenant_id } = req.query;
    
    let query = `
      SELECT 
        t.name as tenant_name,
        t.code as tenant_code,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(o.total) as total_revenue,
        AVG(o.total) as average_order_value,
        COUNT(DISTINCT DATE(o.order_date)) as active_days,
        MIN(o.order_date) as first_order_date,
        MAX(o.order_date) as last_order_date
      FROM tenants t
      LEFT JOIN orders o ON t.id = o.tenant_id
    `;
    
    const params = [];
    if (tenant_id) {
      query += ' WHERE t.id = $1';
      params.push(tenant_id);
    }
    
    query += ' GROUP BY t.id, t.name, t.code ORDER BY total_revenue DESC';
    
    const result = await dbConnector.executeQuery(query, params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.rowCount
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

// Get popular products
router.get('/products/popular', async (req, res) => {
  try {
    const { tenant_id, limit = 10 } = req.query;
    
    let query = `
      SELECT 
        od.product_name,
        COUNT(*) as order_count,
        SUM(od.qty) as total_quantity,
        SUM(od.subtotal) as total_revenue,
        AVG(od.price) as average_price
      FROM order_details od
      JOIN orders o ON od.order_id = o.id
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (tenant_id) {
      query += ` WHERE o.tenant_id = $${paramIndex}`;
      params.push(tenant_id);
      paramIndex++;
    }
    
    query += `
      GROUP BY od.product_name
      ORDER BY total_quantity DESC
      LIMIT $${paramIndex}
    `;
    
    params.push(parseInt(limit));
    
    const result = await dbConnector.executeQuery(query, params);
    
    if (result.success) {
      res.json({
        success: true,
        data: result.data,
        count: result.rowCount
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

// MongoDB Import endpoint
router.post('/import-mongo', async (req, res) => {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return res.status(500).json({
      success: false,
      error: "MONGODB_URI is not defined in environment variables"
    });
  }

  console.log('Starting MongoDB import process...');

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    serverSelectionTimeoutMS: 10000, // 10 second timeout
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');

    const db = client.db("coffee_db");
    
    // Drop existing collections
    console.log('Dropping existing collections...');
    const existingCollections = await db.listCollections().toArray();
    for (const coll of existingCollections) {
      await db.collection(coll.name).drop();
      console.log(`Dropped: ${coll.name}`);
    }

    // Define collections to import
    const collections = [
      'tenants',
      'employees', 
      'managers',
      'attendance',
      'salaries',
      'orders',
      'order_details',
      'order_history'
    ];

    const results = [];
    let totalInserted = 0;

    // Import each collection
    for (const collectionName of collections) {
      try {
        const filePath = path.join(process.cwd(), 'mongo_export', `${collectionName}.json`);
        
        if (!fs.existsSync(filePath)) {
          results.push({
            collection: collectionName,
            status: 'skipped',
            reason: 'File not found'
          });
          continue;
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const documents = JSON.parse(fileContent);

        if (documents.length === 0) {
          results.push({
            collection: collectionName,
            status: 'skipped',
            count: 0
          });
          continue;
        }

        const collection = db.collection(collectionName);
        const result = await collection.insertMany(documents, { ordered: false });
        
        const insertedCount = result.insertedCount;
        totalInserted += insertedCount;

        results.push({
          collection: collectionName,
          status: 'success',
          count: insertedCount
        });

        console.log(`✅ ${collectionName}: ${insertedCount} documents`);

      } catch (err) {
        results.push({
          collection: collectionName,
          status: 'error',
          error: err.message
        });
        console.error(`❌ Error importing ${collectionName}:`, err.message);
      }
    }

    // Create indexes
    console.log('Creating indexes...');
    try {
      await db.collection('tenants').createIndex({ code: 1 }, { unique: true });
      await db.collection('employees').createIndex({ tenant_id: 1 });
      await db.collection('orders').createIndex({ tenant_id: 1 });
      await db.collection('orders').createIndex({ order_date: 1 });
      await db.collection('order_details').createIndex({ order_id: 1 });
      console.log('✅ Indexes created');
    } catch (err) {
      console.error('⚠️  Index creation warning:', err.message);
    }

    // Get final stats
    const stats = await db.stats();

    await client.close();
    console.log('🔌 MongoDB connection closed');

    return res.status(200).json({
      success: true,
      message: 'MongoDB import completed successfully',
      summary: {
        totalCollections: results.filter(r => r.status === 'success').length,
        totalDocuments: totalInserted,
        results: results
      },
      database: {
        dataSize: Math.round(stats.dataSize / 1024 / 1024 * 100) / 100 + ' MB',
        storageSize: Math.round(stats.storageSize / 1024 / 1024 * 100) / 100 + ' MB',
        indexes: stats.indexes,
        collections: stats.collections
      }
    });

  } catch (err) {
    console.error('❌ Import failed:', err);
    try {
      await client.close();
    } catch (closeErr) {
      console.error('Error closing connection:', closeErr.message);
    }
    
    // Provide helpful error messages for common issues
    let errorMessage = err.message;
    if (err.message.includes('timeout') || err.message.includes('ETIMEDOUT') || err.message.includes('ENOTFOUND')) {
      errorMessage = 'MongoDB connection timeout. Please configure Network Access in MongoDB Atlas:\n' +
        '1. Go to Security → Network Access\n' +
        '2. Add IP Address → Allow access from anywhere (0.0.0.0/0)\n' +
        '3. Wait 1-2 minutes for propagation\n\n' +
        'Original error: ' + err.message;
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage,
      code: err.code
    });
  }
});

module.exports = router;
