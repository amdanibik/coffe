/**
 * Coffee Database Connector - JavaScript/Node.js Client
 * 
 * Contoh penggunaan Direct Database Connection API
 */

class CoffeeDatabaseClient {
  constructor(apiKey, baseUrl = 'http://localhost:3000') {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.headers = {
      'X-API-Key': apiKey,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Establish database connection
   */
  async connect() {
    try {
      const response = await fetch(`${this.baseUrl}/api/db/connect`, {
        method: 'POST',
        headers: this.headers
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute a query
   * @param {string} query - SQL query
   * @param {array} params - Query parameters
   * @param {boolean} transaction - Use transaction
   * @param {boolean} allowDestructive - Allow destructive queries
   */
  async execute(query, params = [], options = {}) {
    try {
      const body = {
        query,
        params,
        transaction: options.transaction || false,
        allowDestructive: options.allowDestructive || false
      };

      const response = await fetch(`${this.baseUrl}/api/db/execute`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body)
      });

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get connection pool status
   */
  async getPoolStatus() {
    try {
      const response = await fetch(`${this.baseUrl}/api/db/pool-status`, {
        headers: this.headers
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Execute batch queries
   * @param {array} queries - Array of query objects [{query, params}, ...]
   */
  async executeBatch(queries) {
    try {
      const response = await fetch(`${this.baseUrl}/api/db/batch`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ queries })
      });
      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Convenience methods

  /**
   * Get all tenants
   */
  async getTenants(limit = 100) {
    return this.execute(
      'SELECT * FROM tenants ORDER BY name LIMIT $1',
      [limit]
    );
  }

  /**
   * Get tenant by ID
   */
  async getTenant(id) {
    const result = await this.execute(
      'SELECT * FROM tenants WHERE id = $1',
      [id]
    );
    return result.success && result.data.length > 0 
      ? { ...result, data: result.data[0] } 
      : result;
  }

  /**
   * Get orders with filters
   */
  async getOrders(filters = {}) {
    let query = 'SELECT * FROM orders WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.tenant_id) {
      query += ` AND tenant_id = $${paramCount}`;
      params.push(filters.tenant_id);
      paramCount++;
    }

    if (filters.start_date) {
      query += ` AND order_date >= $${paramCount}`;
      params.push(filters.start_date);
      paramCount++;
    }

    if (filters.end_date) {
      query += ` AND order_date <= $${paramCount}`;
      params.push(filters.end_date);
      paramCount++;
    }

    query += ` ORDER BY order_date DESC LIMIT ${filters.limit || 100}`;

    return this.execute(query, params);
  }

  /**
   * Create new tenant
   */
  async createTenant(tenant) {
    return this.execute(
      `INSERT INTO tenants (name, code, address, phone, email, active) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        tenant.name,
        tenant.code,
        tenant.address || null,
        tenant.phone || null,
        tenant.email || null,
        tenant.active !== false
      ],
      { transaction: true }
    );
  }

  /**
   * Update tenant
   */
  async updateTenant(id, updates) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      fields.push(`${key} = $${paramCount}`);
      params.push(updates[key]);
      paramCount++;
    });

    params.push(id);

    return this.execute(
      `UPDATE tenants SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params,
      { transaction: true, allowDestructive: true }
    );
  }

  /**
   * Delete tenant (soft delete - set active = false)
   */
  async deleteTenant(id, hard = false) {
    if (hard) {
      return this.execute(
        'DELETE FROM tenants WHERE id = $1 RETURNING *',
        [id],
        { transaction: true, allowDestructive: true }
      );
    } else {
      return this.execute(
        'UPDATE tenants SET active = false WHERE id = $1 RETURNING *',
        [id],
        { transaction: true, allowDestructive: true }
      );
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics() {
    return this.executeBatch([
      {
        query: 'SELECT COUNT(*) as count FROM tenants WHERE active = true',
        params: []
      },
      {
        query: 'SELECT COUNT(*) as count FROM orders',
        params: []
      },
      {
        query: 'SELECT COUNT(*) as count FROM order_details',
        params: []
      },
      {
        query: 'SELECT COUNT(*) as count FROM products',
        params: []
      },
      {
        query: 'SELECT SUM(total) as total_revenue FROM orders',
        params: []
      }
    ]);
  }
}

// ============================================
// EXAMPLE USAGE
// ============================================

async function main() {
  // Initialize client
  const client = new CoffeeDatabaseClient(
    process.env.CONNECTOR_API_KEY || 'your_api_key',
    process.env.BASE_URL || 'http://localhost:3000'
  );

  console.log('Coffee Database Client - Example Usage\n');

  // 1. Test connection
  console.log('1. Testing connection...');
  const conn = await client.connect();
  console.log(conn);
  console.log('');

  // 2. Get pool status
  console.log('2. Getting pool status...');
  const pool = await client.getPoolStatus();
  console.log(pool);
  console.log('');

  // 3. Get tenants
  console.log('3. Getting tenants...');
  const tenants = await client.getTenants(5);
  console.log(tenants);
  console.log('');

  // 4. Get specific tenant
  console.log('4. Getting tenant by ID...');
  const tenant = await client.getTenant(1);
  console.log(tenant);
  console.log('');

  // 5. Get orders with filters
  console.log('5. Getting orders...');
  const orders = await client.getOrders({
    limit: 10
  });
  console.log(orders);
  console.log('');

  // 6. Get statistics
  console.log('6. Getting statistics...');
  const stats = await client.getStatistics();
  console.log(stats);
  console.log('');

  // 7. Execute custom query
  console.log('7. Executing custom query...');
  const custom = await client.execute(`
    SELECT 
      t.name as tenant_name,
      COUNT(o.id) as order_count,
      SUM(o.total) as total_revenue
    FROM tenants t
    LEFT JOIN orders o ON t.id = o.tenant_id
    GROUP BY t.id, t.name
    ORDER BY total_revenue DESC
    LIMIT 5
  `);
  console.log(custom);
  console.log('');

  // 8. Create new tenant (commented out - will modify database)
  /*
  console.log('8. Creating new tenant...');
  const newTenant = await client.createTenant({
    name: 'Test Cafe',
    code: 'TEST001',
    email: 'test@example.com',
    phone: '08123456789'
  });
  console.log(newTenant);
  console.log('');
  */

  console.log('All examples completed!');
}

// Run examples
if (require.main === module) {
  main().catch(console.error);
}

// Export for use in other modules
module.exports = CoffeeDatabaseClient;
