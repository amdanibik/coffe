const { MongoClient, ServerApiVersion } = require("mongodb");

// MongoDB Atlas - Cluster Bizcopilot
const uri = process.env.MONGODB_URI || "mongodb+srv://bizcopilot_test:m6bw7hOT9wXR7brt@bizcopilot.k59fjml.mongodb.net/?retryWrites=true&w=majority&appName=Bizcopilot";

if (!uri) {
  throw new Error("❌ MONGODB_URI is not defined in environment variables");
}

console.log("🔌 Connecting to MongoDB Atlas...");
console.log("URI:", uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@'));

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas!");
    
    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment successfully!");

    // Test coffee_db database
    const db = client.db("coffee_db");
    const collections = await db.listCollections().toArray();
    
    console.log("\n📊 Database: coffee_db");
    console.log("Collections:", collections.length);
    
    if (collections.length > 0) {
      console.log("\n📦 Collections found:");
      for (const coll of collections) {
        const count = await db.collection(coll.name).countDocuments();
        console.log(`   - ${coll.name}: ${count} documents`);
      }
    } else {
      console.log("ℹ️  No collections found. Database is empty.");
    }
    
    // Get database stats
    const stats = await db.stats();
    console.log("\n📈 Database Stats:");
    console.log(`   - Data Size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Indexes: ${stats.indexes}`);
    console.log(`   - Collections: ${stats.collections}`);
    
  } catch (err) {
    console.error("\n❌ MongoDB connection error:", err.message);
    if (err.code) console.error("Error code:", err.code);
    process.exit(1);
  } finally {
    await client.close();
    console.log("\n🔌 Connection closed");
  }
}

run();
