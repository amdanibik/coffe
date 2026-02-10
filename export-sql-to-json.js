const fs = require('fs');
const path = require('path');

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

// Export to JSON files
function exportToJson(collections, outputDir) {
  console.log(`\n📦 Exporting to JSON files in: ${outputDir}`);
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const [collectionName, docs] of Object.entries(collections)) {
    if (docs.length === 0) continue;
    
    const outputPath = path.join(outputDir, `${collectionName}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(docs, null, 2));
    console.log(`   ✅ ${collectionName}.json (${docs.length} documents)`);
  }
  
  console.log(`\n✅ Export completed!`);
}

// Main function
function main() {
  try {
    console.log('🚀 Starting SQL to JSON Export\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const sqlFilePath = path.join(__dirname, 'coffee_full_1month.sql');
    const outputDir = path.join(__dirname, 'mongo_export');
    
    // Parse SQL file
    const collections = parseSqlFile(sqlFilePath);
    
    // Export to JSON
    exportToJson(collections, outputDir);
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ EXPORT COMPLETE!');
    console.log(`📂 Files saved in: ${outputDir}`);
    console.log('\n💡 Import ke MongoDB dengan:');
    console.log('   mongoimport --uri="<connection_string>" --db=coffee_db --collection=<collection_name> --file=<file>.json --jsonArray');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run export
if (require.main === module) {
  main();
}

module.exports = { parseSqlFile, exportToJson };
