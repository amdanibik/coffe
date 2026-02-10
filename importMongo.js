const { MongoClient } = require("mongodb");
const fs = require("fs");
const dotenv = require("dotenv");
const path = require("path");

// Load environment variables
dotenv.config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI not found in environment variables');
  process.exit(1);
}

console.log('📡 Connecting to MongoDB...');

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  connectTimeoutMS: 5000,
});

async function run() {
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db("coffee_db");
    
    const filePath = path.join(process.cwd(), 'mongo_export', 'tenants.json');
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Drop existing collection
    try {
      await db.collection("tenants").drop();
      console.log('🗑️  Dropped existing tenants collection');
    } catch (err) {
      // Collection doesn't exist, ignore
    }
    
    await db.collection("tenants").insertMany(data);
    
    console.log(`✅ Imported ${data.length} tenants`);
    
    await client.close();
    console.log('🔌 Connection closed');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  MongoDB Atlas Network Access not configured!');
      console.error('Please configure in MongoDB Atlas:');
      console.error('1. Go to Security → Network Access');
      console.error('2. Add IP Address → Allow access from anywhere (0.0.0.0/0)');
      console.error('3. Wait 1-2 minutes for propagation\n');
    }
    try {
      await client.close();
    } catch (e) {}
    process.exit(1);
  }
}

run();
