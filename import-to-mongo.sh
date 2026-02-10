#!/bin/bash

# MongoDB Connection Details
MONGO_URI="mongodb+srv://bizcopilot_test:m6bw7hOT9wXR7brt@bizcopilottest.emcd4yp.mongodb.net/coffee_db?appName=BizcopilotTest"
DATABASE="coffee_db"
EXPORT_DIR="./mongo_export"

echo "🚀 Starting MongoDB Import"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Database: $DATABASE"
echo "Export Directory: $EXPORT_DIR"
echo ""

# Check if export directory exists
if [ ! -d "$EXPORT_DIR" ]; then
  echo "❌ Error: Export directory not found: $EXPORT_DIR"
  exit 1
fi

# Function to import a collection
import_collection() {
  local collection=$1
  local file=$2
  
  if [ ! -f "$file" ]; then
    echo "⚠️  File not found: $file (skipping)"
    return
  fi
  
  echo "📤 Importing: $collection"
  mongoimport --uri="$MONGO_URI" \
    --db="$DATABASE" \
    --collection="$collection" \
    --file="$file" \
    --jsonArray \
    --drop
  
  if [ $? -eq 0 ]; then
    echo "   ✅ $collection imported successfully"
  else
    echo "   ❌ Failed to import $collection"
    return 1
  fi
  echo ""
}

# Import all collections
echo "📦 Importing Collections..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

import_collection "tenants" "$EXPORT_DIR/tenants.json"
import_collection "employees" "$EXPORT_DIR/employees.json"
import_collection "managers" "$EXPORT_DIR/managers.json"
import_collection "attendance" "$EXPORT_DIR/attendance.json"
import_collection "salaries" "$EXPORT_DIR/salaries.json"
import_collection "orders" "$EXPORT_DIR/orders.json"
import_collection "order_details" "$EXPORT_DIR/order_details.json"
import_collection "order_history" "$EXPORT_DIR/order_history.json"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Import process completed!"
echo ""
echo "📊 Verify import with:"
echo "   mongosh \"$MONGO_URI\" --eval \"use $DATABASE; db.stats()\""
echo ""
