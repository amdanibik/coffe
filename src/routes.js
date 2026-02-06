const express = require('express');
const router = express.Router();
const dbConnector = require('./dbConnector');

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
        testConnection: '/api/test-connection',
        execute: '/api/query',
        directConnect: '/api/db/connect',
        directExecute: '/api/db/execute',
        poolStatus: '/api/db/pool-status',
        batch: '/api/db/batch',
        configuration: '/api/configuration'
      },
      authentication: {
        type: 'api-key',
        headerName: 'X-API-Key',
        queryParamName: 'apiKey'
      }
    }
  });
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

module.exports = router;
