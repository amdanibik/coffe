const express = require('express');
const router = express.Router();
const dbConnector = require('./dbConnector');

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
