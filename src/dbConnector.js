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

  // Introspect database schema - Get all tables and their structures
  async introspectSchema() {
    const pool = this.getPool();
    try {
      // Query to get all tables with their columns
      const schemaQuery = `
        SELECT 
          t.table_schema,
          t.table_name,
          c.column_name,
          c.data_type,
          c.is_nullable,
          c.column_default,
          c.character_maximum_length,
          tc.constraint_type
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c 
          ON t.table_name = c.table_name 
          AND t.table_schema = c.table_schema
        LEFT JOIN information_schema.key_column_usage kcu 
          ON c.table_name = kcu.table_name 
          AND c.column_name = kcu.column_name
          AND c.table_schema = kcu.table_schema
        LEFT JOIN information_schema.table_constraints tc 
          ON kcu.constraint_name = tc.constraint_name
          AND kcu.table_schema = tc.table_schema
        WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
          AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_schema, t.table_name, c.ordinal_position;
      `;
      
      const result = await pool.query(schemaQuery);
      
      // Group by tables
      const tables = {};
      
      result.rows.forEach(row => {
        const tableName = row.table_name;
        
        if (!tables[tableName]) {
          tables[tableName] = {
            schema: row.table_schema,
            name: tableName,
            columns: []
          };
        }
        
        if (row.column_name) {
          // Check if column already exists (avoid duplicates due to JOINs)
          const existingColumn = tables[tableName].columns.find(
            col => col.name === row.column_name
          );
          
          if (!existingColumn) {
            tables[tableName].columns.push({
              name: row.column_name,
              type: row.data_type,
              nullable: row.is_nullable === 'YES',
              default: row.column_default,
              maxLength: row.character_maximum_length,
              constraint: row.constraint_type || null
            });
          } else if (row.constraint_type && !existingColumn.constraint) {
            // Update constraint if not set
            existingColumn.constraint = row.constraint_type;
          }
        }
      });
      
      // Convert to array and generate schema text
      const tablesList = Object.values(tables);
      const schemaText = this._generateSchemaText(tablesList);
      
      return {
        success: true,
        tables: tablesList,
        schemaText: schemaText,
        tableCount: tablesList.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        code: error.code
      };
    }
  }

  // Generate human-readable schema text for AI
  _generateSchemaText(tables) {
    let schemaText = `Database Schema:\n\n`;
    
    tables.forEach(table => {
      schemaText += `Table: ${table.name}\n`;
      schemaText += `Columns:\n`;
      
      table.columns.forEach(col => {
        let colDesc = `  - ${col.name} (${col.type}`;
        
        if (col.maxLength) {
          colDesc += `(${col.maxLength})`;
        }
        
        if (!col.nullable) {
          colDesc += ', NOT NULL';
        }
        
        if (col.constraint) {
          colDesc += `, ${col.constraint}`;
        }
        
        if (col.default) {
          colDesc += `, default: ${col.default}`;
        }
        
        colDesc += ')';
        schemaText += colDesc + '\n';
      });
      
      schemaText += '\n';
    });
    
    return schemaText;
  }

  // Get sample data from all tables (for AI context)
  async getSampleData(limit = 3) {
    const pool = this.getPool();
    try {
      // Get list of tables
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      
      const tablesResult = await pool.query(tablesQuery);
      const samples = {};
      
      // Get sample data from each table
      for (const row of tablesResult.rows) {
        const tableName = row.table_name;
        try {
          const sampleQuery = `SELECT * FROM ${tableName} LIMIT ${limit}`;
          const sampleResult = await pool.query(sampleQuery);
          samples[tableName] = {
            rowCount: sampleResult.rowCount,
            data: sampleResult.rows
          };
        } catch (error) {
          samples[tableName] = {
            error: error.message
          };
        }
      }
      
      return {
        success: true,
        samples: samples
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
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
