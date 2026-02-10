import { MongoClient } from "mongodb";
import fs from "fs";

const client = new MongoClient(process.env.MONGODB_URI);

async function run() {
  await client.connect();
  const db = client.db("coffee_db");

  const data = JSON.parse(fs.readFileSync("tenants.json"));

  await db.collection("tenants").insertMany(data);

  console.log("Imported", data.length, "records");
  process.exit(0);
}

run();
