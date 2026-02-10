const { MongoClient } = require('mongodb');

const MONGODB_URI = 'mongodb+srv://bizcopilot_test:Ms4aIgru69yW7wKg@bizcopilottest.emcd4yp.mongodb.net/?appName=BizcopilotTest';

async function test() {
  console.log('Testing MongoDB connection...');
  console.log('URI:', MONGODB_URI.replace(/:[^:@]+@/, ':***@'));
  
  const client = new MongoClient(MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
  });
  
  try {
    console.log('Attempting to connect...');
    await client.connect();
    console.log('✅ Connected successfully!');
    
    const db = client.db('test');
    const result = await db.admin().ping();
    console.log('✅ Ping result:', result);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error code:', error.code);
  } finally {
    await client.close();
  }
}

test();
