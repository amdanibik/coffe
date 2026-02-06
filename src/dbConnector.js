const { Pool } = require('pg');

class DatabaseConnector {
  constructor() {
    this.pool = null;
    
    // Support both individual credentials and DATABASE_URL
    const databaseUrl = process.env.DATABASE_URL;
    
    if (databaseUrl) {
      // Use connection string (common for Supabase, Heroku, Railway)
      this.config = {
        connectionString: databaseUrl,
        max: 10, // Reduced for hosted databases
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: parseInt(process.env.QUERY_TIMEOUT) || 30000,
        ssl: {
          rejectUnauthorized: false // Required for Supabase
        }
      };
    } else {
      // Use individual credentials (local development)
      this.config = {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'coffee_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: 10, // Reduced for hosted databases
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
        statement_timeout: parseInt(process.env.QUERY_TIMEOUT) || 30000,
        ssl: process.env.DB_HOST && process.env.DB_HOST.includes('supabase.co') ? {
          rejectUnauthorized: false
        } : false
      };
    }
  }

  // Initialize connection pool
  initialize() {
    if (!this.pool) {
      this.pool = new Pool(this.config);
      
      this.pool.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
      });
    }
    return this.pool;
  }

  // Get pool instance
  getPool() {
    if (!this.pool) {
      this.initialize();
    }
    return this.pool;
  }

  // Test connection
  async testConnection() {
    try {
      const pool = this.getPool();
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as current_time, version() as version');
      client.release();
      
      return {
        success: true,
        message: 'Database connection successful',
        data: {
          connected: true,
          timestamp: result.rows[0].current_time,
          version: result.rows[0].version,
          config: {
            host: this.config.host,
            port: this.config.port,
            database: this.config.database,
            user: this.config.user
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Database connection failed',
        error: error.message,
        details: {
          code: error.code,
          host: this.config.host,
          port: this.config.port,
          database: this.config.database
        }
      };
    }
  }

  // Execute query
  async executeQuery(query, params = []) {
    const pool = this.getPool();
    try {
      const startTime = Date.now();
      const result = await pool.query(query, params);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount,
        executionTime: `${executionTime}ms`,
        fields: result.fields ? result.fields.map(f => ({
          name: f.name,
          dataType: f.dataTypeID
        })) : []
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint
      };
    }
  }

  // Execute query with transaction
  async executeTransaction(query, params = []) {
    const pool = this.getPool();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const startTime = Date.now();
      const result = await client.query(query, params);
      const executionTime = Date.now() - startTime;
      await client.query('COMMIT');
      
      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount,
        executionTime: `${executionTime}ms`,
        transaction: true
      };
    } catch (error) {
      await client.query('ROLLBACK');
      return {
        success: false,
        error: error.message,
        code: error.code,
        transaction: true,
        rolledBack: true
      };
    } finally {
      client.release();
    }
  }

  // Execute batch queries
  async executeBatch(queries) {
    const results = [];
    
    for (const queryObj of queries) {
      const { query, params = [] } = queryObj;
      const result = await this.executeQuery(query, params);
      results.push({
        query: query.substring(0, 100),
        ...result
      });
    }
    
    return results;
  }

  // Get pool information
  getPoolInfo() {
    if (!this.pool) {
      return {
        initialized: false
      };
    }
    
    return {
      initialized: true,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.config.max
    };
  }

  // Get configuration info
  getConfiguration() {
    return {
      databaseType: 'PostgreSQL',
      connectorUrl: `postgresql://${this.config.host}:${this.config.port}/${this.config.database}`,
      queryTimeout: this.config.statement_timeout,
      maxConnections: this.config.max,
      connectionTimeout: this.config.connectionTimeoutMillis,
      config: {
        host: this.config.host,
        port: this.config.port,
        database: this.config.database,
        user: this.config.user
      }
    };
  }

  // Close connection pool
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Create singleton instance
const dbConnector = new DatabaseConnector();

module.exports = dbConnector;
