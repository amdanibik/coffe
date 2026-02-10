const { MongoClient, ServerApiVersion } = require("mongodb");

async function testMongoConnection(req, res) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return res.status(500).json({
      success: false,
      error: "MONGODB_URI is not defined in environment variables"
    });
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    await client.connect();
    await client.db("admin").command({ ping: 1 });

    // Get database stats
    const db = client.db("coffee_db");
    const collections = await db.listCollections().toArray();
   const stats = await db.stats();

    return res.status(200).json({
      success: true,
      message: "MongoDB connection successful",
      connection: {
        database: "coffee_db",
        collections: collections.map(c => c.name),
        stats: {
          collections: stats.collections,
          dataSize: stats.dataSize,
          indexes: stats.indexes,
          indexSize: stats.indexSize
        }
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message,
      code: err.code
    });
  } finally {
    await client.close();
  }
}

module.exports = testMongoConnection;
