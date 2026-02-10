const { MongoClient, ServerApiVersion } = require("mongodb");
const fs = require('fs');
const path = require('path');

async function importToMongo(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

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
    await db.collection('tenants').createIndex({ code: 1 }, { unique: true });
    await db.collection('employees').createIndex({ tenant_id: 1 });
    await db.collection('orders').createIndex({ tenant_id: 1 });
    await db.collection('orders').createIndex({ order_date: 1 });
    await db.collection('order_details').createIndex({ order_id: 1 });
    console.log('✅ Indexes created');

    // Get final stats
    const stats = await db.stats();

    return res.status(200).json({
      success: true,
      message: 'MongoDB import completed',
      summary: {
        totalCollections: results.length,
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
    return res.status(500).json({
      success: false,
      error: err.message,
      code: err.code
    });
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

module.exports = importToMongo;
