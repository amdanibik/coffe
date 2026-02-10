const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// MongoDB connection settings
const MONGODB_URI = 'mongodb+srv://bizcopilot_test:Ms4aIgru69yW7wKg@bizcopilottest.emcd4yp.mongodb.net/?appName=BizcopilotTest';
const DATABASE_NAME = 'coffee_db';

// Parse SQL INSERT statements
function parseInsertStatement(line, tableName) {
  const regex = new RegExp(`INSERT INTO ${tableName} VALUES\\((.+?)\\);?`, 'i');
  const match = line.match(regex);
  
  if (!match) return null;
  
  const valuesString = match[1];
  const values = [];
  let current = '';
  let inQuote = false;
  let depth = 0;
  
  for (let i = 0; i < valuesString.length; i++) {
    const char = valuesString[i];
    
    if (char === "'" && (i === 0 || valuesString[i - 1] !== '\\')) {
      inQuote = !inQuote;
      current += char;
    } else if (char === '(' && !inQuote) {
      depth++;
      current += char;
    } else if (char === ')' && !inQuote) {
      depth--;
      current += char;
    } else if (char === ',' && !inQuote && depth === 0) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    values.push(current.trim());
  }
  
  return values.map(val => {
    val = val.trim();
    if (val.startsWith("'") && val.endsWith("'")) {
      return val.slice(1, -1).replace(/\\'/g, "'");
    }
    if (val === 'NULL') return null;
    if (!isNaN(val) && val !== '') return Number(val);
    return val;
  });
}

// Define table schemas
const schemas = {
  tenants: ['id', 'code', 'name'],
  employees: ['id', 'tenant_id', 'name', 'role', 'join_date', 'base_salary'],
  managers: ['id', 'employee_id', 'tenant_id', 'level'],
  attendance: ['id', 'employee_id', 'tenant_id', 'date', 'status'],
  salaries: ['id', 'employee_id', 'tenant_id', 'month', 'base_salary', 'attendance_bonus', 'total_salary'],
  orders: ['id', 'tenant_id', 'order_date', 'total', 'payment_method'],
  order_details: ['id', 'order_id', 'product_name', 'qty', 'price', 'subtotal'],
  order_history: ['id', 'order_id', 'status', 'created_at']
};

// Convert values array to document
function valuesToDocument(tableName, values) {
  const schema = schemas[tableName];
  if (!schema) return null;
  
  const doc = {};
  schema.forEach((field, index) => {
    if (index < values.length) {
      doc[field] = values[index];
    }
  });
  
  return doc;
}

// Parse SQL file
function parseSqlFile(filePath) {
  console.log(`📖 Reading SQL file: ${filePath}`);
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  const collections = {
    tenants: [],
    employees: [],
    managers: [],
    attendance: [],
    salaries: [],
    orders: [],
    order_details: [],
    order_history: []
  };
  
  let totalInserts = 0;
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine.startsWith('INSERT INTO')) continue;
    
    for (const tableName of Object.keys(collections)) {
      if (trimmedLine.includes(`INSERT INTO ${tableName}`)) {
        const values = parseInsertStatement(trimmedLine, tableName);
        if (values) {
          const doc = valuesToDocument(tableName, values);
          if (doc) {
            collections[tableName].push(doc);
            totalInserts++;
            
            if (totalInserts % 1000 === 0) {
              process.stdout.write(`\r📝 Parsed ${totalInserts} inserts...`);
            }
          }
        }
        break;
      }
    }
  }
  
  console.log(`\n✅ Parsed ${totalInserts} total inserts`);
  
  // Show summary
  for (const [tableName, docs] of Object.entries(collections)) {
    if (docs.length > 0) {
      console.log(`   - ${tableName}: ${docs.length} documents`);
    }
  }
  
  return collections;
}

// Migrate to MongoDB
async function migrateToMongo(collections) {
  console.log('\n🔌 Connecting to MongoDB...');
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db(DATABASE_NAME);
    
    // Drop existing collections
    console.log('\n🗑️  Dropping existing collections...');
    const existingCollections = await db.listCollections().toArray();
    for (const coll of existingCollections) {
      await db.collection(coll.name).drop();
      console.log(`   - Dropped: ${coll.name}`);
    }
    
    // Insert documents
    console.log('\n📤 Inserting documents...');
    let totalInserted = 0;
    
    for (const [collectionName, docs] of Object.entries(collections)) {
      if (docs.length === 0) continue;
      
      const collection = db.collection(collectionName);
      const result = await collection.insertMany(docs, { ordered: false });
      console.log(`   ✅ ${collectionName}: ${result.insertedCount} documents`);
      totalInserted += result.insertedCount;
    }
    
    console.log(`\n✨ Total inserted: ${totalInserted} documents`);
    
    // Show statistics
    console.log('\n📊 Database Statistics:');
    for (const [collectionName, docs] of Object.entries(collections)) {
      if (docs.length === 0) continue;
      const count = await db.collection(collectionName).countDocuments();
      console.log(`   - ${collectionName}: ${count} documents`);
    }
    
    // Create indexes
    console.log('\n🔍 Creating indexes...');
    await db.collection('tenants').createIndex({ code: 1 }, { unique: true });
    await db.collection('employees').createIndex({ tenant_id: 1 });
    await db.collection('orders').createIndex({ tenant_id: 1 });
    await db.collection('orders').createIndex({ order_date: 1 });
    await db.collection('order_details').createIndex({ order_id: 1 });
    console.log('   ✅ Indexes created');
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.close();
    console.log('🔌 MongoDB connection closed');
  }
}

// Main function
async function main() {
  try {
    console.log('🚀 Starting SQL to MongoDB Migration\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const sqlFilePath = path.join(__dirname, 'coffee_full_1month.sql');
    
    // Parse SQL file
    const collections = parseSqlFile(sqlFilePath);
    
    // Migrate to MongoDB
    await migrateToMongo(collections);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRATION COMPLETE!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run migration
if (require.main === module) {
  main();
}

module.exports = { parseSqlFile, migrateToMongo };
