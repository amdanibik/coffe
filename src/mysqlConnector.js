const mysql = require('mysql2/promise');

class MySQLConnector {
  constructor() {
    this.pool = null;
    
    // Support both individual credentials and MYSQL_DATABASE_URL
    const databaseUrl = process.env.MYSQL_DATABASE_URL;
    
    if (databaseUrl) {
      // Use connection string
      this.config = {
        uri: databaseUrl,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      };
    } else {
      // Use individual credentials
      this.config = {
        host: process.env.MYSQL_HOST || 'localhost',
        port: process.env.MYSQL_PORT || 3306,
        database: process.env.MYSQL_DATABASE || 'coffee_db',
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD || '',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        connectTimeout: 5000,
        enableKeepAlive: true,
        keepAliveInitialDelay: 0
      };
    }
  }

  // Initialize connection pool
  initialize() {
    if (!this.pool) {
      this.pool = mysql.createPool(this.config);
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
      const connection = await pool.getConnection();
      const [rows] = await connection.query('SELECT NOW() as current_time, VERSION() as version');
      connection.release();
      
      return {
        success: true,
        message: 'MySQL connection successful',
        data: {
          connected: true,
          timestamp: rows[0].current_time,
          version: rows[0].version,
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
        message: 'MySQL connection failed',
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
    try {
      const pool = this.getPool();
      const startTime = Date.now();
      const [rows] = await pool.query(query, params);
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          rows: rows,
          rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows || 0,
          executionTime: executionTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code,
        query: query
      };
    }
  }

  // Execute batch queries
  async executeBatch(queries) {
    const results = [];
    const connection = await this.getPool().getConnection();
    
    try {
      await connection.beginTransaction();
      
      for (const queryObj of queries) {
        try {
          const startTime = Date.now();
          const [rows] = await connection.query(queryObj.query, queryObj.params || []);
          const executionTime = Date.now() - startTime;
          
          results.push({
            success: true,
            query: queryObj.query,
            data: {
              rows: rows,
              rowCount: Array.isArray(rows) ? rows.length : rows.affectedRows || 0,
              executionTime: executionTime
            }
          });
        } catch (error) {
          results.push({
            success: false,
            query: queryObj.query,
            error: error.message,
            code: error.code
          });
          throw error; // Rollback transaction
        }
      }
      
      await connection.commit();
      
      return {
        success: true,
        results: results
      };
    } catch (error) {
      await connection.rollback();
      
      return {
        success: false,
        error: error.message,
        results: results
      };
    } finally {
      connection.release();
    }
  }

  // Introspect schema
  async introspectSchema() {
    try {
      const pool = this.getPool();
      const database = this.config.database;
      
      // Get all tables
      const [tables] = await pool.query(`
        SELECT TABLE_NAME as table_name
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ?
        ORDER BY TABLE_NAME
      `, [database]);
      
      const schemaInfo = [];
      
      for (const table of tables) {
        const tableName = table.table_name;
        
        // Get columns info
        const [columns] = await pool.query(`
          SELECT 
            COLUMN_NAME as column_name,
            DATA_TYPE as data_type,
            IS_NULLABLE as is_nullable,
            COLUMN_KEY as column_key,
            EXTRA as extra
          FROM information_schema.COLUMNS
          WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
          ORDER BY ORDINAL_POSITION
        `, [database, tableName]);
        
        schemaInfo.push({
          table: tableName,
          columns: columns
        });
      }
      
      // Generate schema text
      let schemaText = `MySQL Database Schema\n\n`;
      schemaInfo.forEach(table => {
        schemaText += `Table: ${table.table}\n`;
        table.columns.forEach(col => {
          const nullable = col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
          const key = col.column_key === 'PRI' ? ' PRIMARY KEY' : '';
          const extra = col.extra ? ` ${col.extra}` : '';
          schemaText += `  - ${col.column_name}: ${col.data_type} ${nullable}${key}${extra}\n`;
        });
        schemaText += `\n`;
      });
      
      return {
        success: true,
        tables: schemaInfo,
        schemaText: schemaText,
        tableCount: tables.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get sample data from a table
  async getSampleData(tableName, limit = 5) {
    try {
      const query = `SELECT * FROM ?? LIMIT ?`;
      const [rows] = await this.getPool().query(query, [tableName, limit]);
      
      return {
        success: true,
        data: {
          table: tableName,
          rows: rows,
          count: rows.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get pool status
  async getPoolStatus() {
    try {
      const pool = this.getPool();
      
      return {
        success: true,
        data: {
          type: 'MySQL',
          connectionLimit: this.config.connectionLimit,
          database: this.config.database,
          host: this.config.host,
          port: this.config.port
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Close all connections
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }
}

// Export singleton instance
const mysqlConnector = new MySQLConnector();
module.exports = mysqlConnector;
