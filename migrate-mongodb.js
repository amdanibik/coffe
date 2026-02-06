#!/usr/bin/env node

/**
 * MongoDB Migration Script
 * Converts PostgreSQL data from coffee_full_1month.sql to MongoDB collections
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

console.log('╔═══════════════════════════════════════════════════════╗');
console.log('║     Coffee Database - MongoDB Migration Script       ║');
console.log('╚═══════════════════════════════════════════════════════╝');
console.log('');

// MongoDB connection setup
const mongoUrl = process.env.MONGODB_URL || 'mongodb://localhost:27017';
const databaseName = process.env.MONGODB_DATABASE || 'coffee_db';

async function parseSQLFile(filename) {
  console.log(`📝 Reading SQL file: ${filename}...`);
  
  if (!fs.existsSync(filename)) {
    throw new Error(`File ${filename} not found!`);
  }
  
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  
  const data = {
    tenants: [],
    employees: [],
    managers: [],
    attendance: [],
    salaries: [],
    orders: [],
    order_details: [],
    order_history: []
  };
  
  console.log('📊 Parsing SQL data...');
  
  for (const line of lines) {
    if (line.startsWith('INSERT INTO tenants VALUES')) {
      const match = line.match(/INSERT INTO tenants VALUES\('([^']+)','([^']+)','([^']+)'\)/);
      if (match) {
        data.tenants.push({
          _id: match[1],
          id: match[1],
          code: match[2],
          name: match[3]
        });
      }
    } else if (line.startsWith('INSERT INTO employees VALUES')) {
      const match = line.match(/INSERT INTO employees VALUES\('([^']+)','([^']+)','([^']+)','([^']+)','([^']+)',(\d+)\)/);
      if (match) {
        data.employees.push({
          _id: match[1],
          id: match[1],
          tenant_id: match[2],
          name: match[3],
          role: match[4],
          join_date: new Date(match[5]),
          base_salary: parseFloat(match[6])
        });
      }
    } else if (line.startsWith('INSERT INTO managers VALUES')) {
      const match = line.match(/INSERT INTO managers VALUES\('([^']+)','([^']+)','([^']+)','([^']+)'\)/);
      if (match) {
        data.managers.push({
          _id: match[1],
          id: match[1],
          employee_id: match[2],
          tenant_id: match[3],
          level: match[4]
        });
      }
    } else if (line.startsWith('INSERT INTO attendance VALUES')) {
      const match = line.match(/INSERT INTO attendance VALUES\('([^']+)','([^']+)','([^']+)','([^']+)','([^']+)'\)/);
      if (match) {
        data.attendance.push({
          _id: match[1],
          id: match[1],
          employee_id: match[2],
          tenant_id: match[3],
          date: new Date(match[4]),
          status: match[5]
        });
      }
    } else if (line.startsWith('INSERT INTO salaries VALUES')) {
      const match = line.match(/INSERT INTO salaries VALUES\('([^']+)','([^']+)','([^']+)','([^']+)',([^,]+),([^,]+),([^)]+)\)/);
      if (match) {
        data.salaries.push({
          _id: match[1],
          id: match[1],
          employee_id: match[2],
          tenant_id: match[3],
          month: match[4],
          base_salary: parseFloat(match[5]),
          attendance_bonus: parseFloat(match[6]),
          total_salary: parseFloat(match[7])
        });
      }
    } else if (line.startsWith('INSERT INTO orders VALUES')) {
      const match = line.match(/INSERT INTO orders VALUES\('([^']+)','([^']+)','([^']+)',([^,]+),'([^']+)'\)/);
      if (match) {
        data.orders.push({
          _id: match[1],
          id: match[1],
          tenant_id: match[2],
          order_date: new Date(match[3]),
          total: parseFloat(match[4]),
          payment_method: match[5]
        });
      }
    } else if (line.startsWith('INSERT INTO order_details VALUES')) {
      const match = line.match(/INSERT INTO order_details VALUES\('([^']+)','([^']+)','([^']+)',(\d+),([^,]+),([^)]+)\)/);
      if (match) {
        data.order_details.push({
          _id: match[1],
          id: match[1],
          order_id: match[2],
          product_name: match[3],
          qty: parseInt(match[4]),
          price: parseFloat(match[5]),
          subtotal: parseFloat(match[6])
        });
      }
    } else if (line.startsWith('INSERT INTO order_history VALUES')) {
      const match = line.match(/INSERT INTO order_history VALUES\('([^']+)','([^']+)','([^']+)','([^']+)'\)/);
      if (match) {
        data.order_history.push({
          _id: match[1],
          id: match[1],
          order_id: match[2],
          status: match[3],
          created_at: new Date(match[4])
        });
      }
    }
  }
  
  console.log('✅ SQL data parsed successfully!');
  console.log('');
  console.log('📊 Data Summary:');
  console.log(`   - Tenants: ${data.tenants.length}`);
  console.log(`   - Employees: ${data.employees.length}`);
  console.log(`   - Managers: ${data.managers.length}`);
  console.log(`   - Attendance: ${data.attendance.length}`);
  console.log(`   - Salaries: ${data.salaries.length}`);
  console.log(`   - Orders: ${data.orders.length}`);
  console.log(`   - Order Details: ${data.order_details.length}`);
  console.log(`   - Order History: ${data.order_history.length}`);
  console.log('');
  
  return data;
}

async function migrateToMongoDB(data) {
  console.log('🔌 Connecting to MongoDB...');
  console.log(`   URL: ${mongoUrl}`);
  console.log(`   Database: ${databaseName}`);
  console.log('');
  
  const client = new MongoClient(mongoUrl);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB!');
    console.log('');
    
    const db = client.db(databaseName);
    
    // Drop existing collections if they exist
    console.log('🗑️  Dropping existing collections...');
    const collections = await db.listCollections().toArray();
    for (const collection of collections) {
      await db.collection(collection.name).drop();
      console.log(`   ✓ Dropped ${collection.name}`);
    }
    console.log('');
    
    // Insert data into collections
    console.log('📤 Inserting data into MongoDB...');
    
    for (const [collectionName, documents] of Object.entries(data)) {
      if (documents.length > 0) {
        const collection = db.collection(collectionName);
        await collection.insertMany(documents);
        console.log(`   ✓ Inserted ${documents.length} documents into ${collectionName}`);
      }
    }
    
    console.log('');
    console.log('📑 Creating indexes...');
    
    // Create indexes for better performance
    await db.collection('tenants').createIndex({ code: 1 }, { unique: true });
    await db.collection('employees').createIndex({ tenant_id: 1 });
    await db.collection('orders').createIndex({ tenant_id: 1 });
    await db.collection('orders').createIndex({ order_date: -1 });
    await db.collection('attendance').createIndex({ employee_id: 1, date: 1 });
    
    console.log('   ✓ Indexes created');
    console.log('');
    console.log('✅ MongoDB migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during migration:', error.message);
    throw error;
  } finally {
    await client.close();
    console.log('');
    console.log('🔌 MongoDB connection closed');
  }
}

async function main() {
  try {
    // Check if MongoDB connection is configured
    if (!process.env.MONGODB_URL && !process.env.MONGODB_DATABASE) {
      console.log('⚠️  MongoDB credentials not found in environment variables');
      console.log('');
      console.log('Please set the following environment variables:');
      console.log('  MONGODB_URL - MongoDB connection URL (e.g., mongodb://localhost:27017)');
      console.log('  MONGODB_DATABASE - MongoDB database name (e.g., coffee_db)');
      console.log('');
      console.log('Example:');
      console.log('  export MONGODB_URL=mongodb://localhost:27017');
      console.log('  export MONGODB_DATABASE=coffee_db');
      console.log('');
      console.log('Or for MongoDB Atlas:');
      console.log('  export MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net/');
      console.log('');
      process.exit(1);
    }
    
    // Parse SQL file
    const data = await parseSQLFile('coffee_full_1month.sql');
    
    // Migrate to MongoDB
    await migrateToMongoDB(data);
    
    console.log('');
    console.log('🎉 All done! MongoDB is ready to use.');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run migration
main();
