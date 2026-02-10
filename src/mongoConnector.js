const { MongoClient } = require('mongodb');

class MongoDBConnector {
  constructor() {
    this.client = null;
    this.db = null;
    
    // MongoDB connection URL - support both MONGODB_URI and MONGODB_URL
    this.mongoUrl = process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017';
    this.databaseName = process.env.MONGODB_DATABASE || 'coffee_db';
    
    console.log('[MongoDB Connector] Initializing with URL:', this.mongoUrl.replace(/:[^:@]+@/, ':****@'));
    
    this.config = {
      maxPoolSize: 10,
      minPoolSize: 2,
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 30000
    };
  }

  // Initialize MongoDB connection
  async initialize() {
    try {
      if (!this.client) {
        this.client = new MongoClient(this.mongoUrl, this.config);
        await this.client.connect();
        this.db = this.client.db(this.databaseName);
        console.log('[MongoDB Connector] Connected to database:', this.databaseName);
      }
      return this.db;
    } catch (error) {
      console.error('[MongoDB Connector] Failed to initialize:', error.message);
      this.client = null;
      this.db = null;
      throw error;
    }
  }

  // Get database instance
  async getDb() {
    if (!this.db) {
      await this.initialize();
    }
    return this.db;
  }

  // Test connection
  async testConnection() {
    try {
      const db = await this.getDb();
      const admin = db.admin();
      const serverInfo = await admin.serverInfo();
      const dbStats = await db.stats();
      
      return {
        success: true,
        message: 'MongoDB connection successful',
        data: {
          connected: true,
          timestamp: new Date(),
          version: serverInfo.version,
          config: {
            database: this.databaseName,
            url: this.mongoUrl.replace(/:[^:@]+@/, ':****@') // Hide password
          },
          stats: {
            collections: dbStats.collections,
            dataSize: dbStats.dataSize,
            objects: dbStats.objects
          }
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'MongoDB connection failed',
        error: error.message,
        details: {
          database: this.databaseName
        }
      };
    }
  }

  // Execute query (MongoDB style)
  async executeQuery(collectionName, operation, query = {}, options = {}) {
    try {
      const db = await this.getDb();
      
      if (!db) {
        throw new Error('Database connection not established. Please check MONGODB_URI environment variable.');
      }
      
      const collection = db.collection(collectionName);
      const startTime = Date.now();
      
      let result;
      let rowCount = 0;
      
      switch (operation.toLowerCase()) {
        case 'find':
          result = await collection.find(query, options).toArray();
          rowCount = result.length;
          break;
          
        case 'findone':
          result = await collection.findOne(query, options);
          rowCount = result ? 1 : 0;
          break;
          
        case 'insertone':
          result = await collection.insertOne(query);
          rowCount = result.insertedCount || 0;
          break;
          
        case 'insertmany':
          result = await collection.insertMany(query);
          rowCount = result.insertedCount || 0;
          break;
          
        case 'updateone':
          result = await collection.updateOne(query, options);
          rowCount = result.modifiedCount || 0;
          break;
          
        case 'updatemany':
          result = await collection.updateMany(query, options);
          rowCount = result.modifiedCount || 0;
          break;
          
        case 'deleteone':
          result = await collection.deleteOne(query);
          rowCount = result.deletedCount || 0;
          break;
          
        case 'deletemany':
          result = await collection.deleteMany(query);
          rowCount = result.deletedCount || 0;
          break;
          
        case 'aggregate':
          result = await collection.aggregate(query).toArray();
          rowCount = result.length;
          break;
          
        case 'count':
        case 'countdocuments':
          result = await collection.countDocuments(query);
          rowCount = result;
          break;
          
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
      
      const executionTime = Date.now() - startTime;
      
      return {
        success: true,
        data: {
          result: result,
          rowCount: rowCount,
          executionTime: executionTime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        collection: collectionName,
        operation: operation
      };
    }
  }

  // Execute batch operations
  async executeBatch(operations) {
    const results = [];
    const session = this.client.startSession();
    
    try {
      await session.withTransaction(async () => {
        for (const op of operations) {
          try {
            const result = await this.executeQuery(
              op.collection,
              op.operation,
              op.query,
              op.options
            );
            results.push(result);
            
            if (!result.success) {
              throw new Error(result.error);
            }
          } catch (error) {
            results.push({
              success: false,
              error: error.message,
              collection: op.collection,
              operation: op.operation
            });
            throw error;
          }
        }
      });
      
      return {
        success: true,
        results: results
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        results: results
      };
    } finally {
      await session.endSession();
    }
  }

  // Introspect schema
  async introspectSchema() {
    try {
      const db = await this.getDb();
      const collections = await db.listCollections().toArray();
      
      const schemaInfo = [];
      
      for (const collection of collections) {
        const collName = collection.name;
        const coll = db.collection(collName);
        
        // Get sample document to understand structure
        const sampleDoc = await coll.findOne();
        const count = await coll.countDocuments();
        
        // Get indexes
        const indexes = await coll.indexes();
        
        schemaInfo.push({
          collection: collName,
          documentCount: count,
          sampleDocument: sampleDoc,
          indexes: indexes,
          fields: sampleDoc ? Object.keys(sampleDoc) : []
        });
      }
      
      // Generate schema text
      let schemaText = `MongoDB Database Schema\n\n`;
      schemaInfo.forEach(coll => {
        schemaText += `Collection: ${coll.collection} (${coll.documentCount} documents)\n`;
        if (coll.fields.length > 0) {
          schemaText += `  Fields:\n`;
          coll.fields.forEach(field => {
            const value = coll.sampleDocument[field];
            const type = Array.isArray(value) ? 'Array' : typeof value;
            schemaText += `    - ${field}: ${type}\n`;
          });
        }
        if (coll.indexes.length > 0) {
          schemaText += `  Indexes:\n`;
          coll.indexes.forEach(idx => {
            schemaText += `    - ${idx.name}: ${JSON.stringify(idx.key)}\n`;
          });
        }
        schemaText += `\n`;
      });
      
      return {
        success: true,
        collections: schemaInfo,
        schemaText: schemaText,
        collectionCount: collections.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get sample data from a collection
  async getSampleData(collectionName, limit = 5) {
    try {
      const db = await this.getDb();
      const collection = db.collection(collectionName);
      const documents = await collection.find().limit(limit).toArray();
      
      return {
        success: true,
        data: {
          collection: collectionName,
          documents: documents,
          count: documents.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get connection status
  async getConnectionStatus() {
    try {
      const isConnected = this.client && this.client.topology && this.client.topology.isConnected();
      
      return {
        success: true,
        data: {
          type: 'MongoDB',
          connected: isConnected,
          database: this.databaseName,
          url: this.mongoUrl.replace(/:[^:@]+@/, ':****@')
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Close connection
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}

// Export singleton instance
const mongoConnector = new MongoDBConnector();
module.exports = mongoConnector;
