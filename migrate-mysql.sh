#!/bin/bash

# Script to migrate PostgreSQL data to MySQL
# This script converts PostgreSQL schema to MySQL compatible format

echo "╔═══════════════════════════════════════════════════════╗"
echo "║     Coffee Database - MySQL Migration Script         ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if coffee_full_1month.sql exists
if [ ! -f "coffee_full_1month.sql" ]; then
  echo "❌ Error: coffee_full_1month.sql not found!"
  exit 1
fi

echo "📝 Converting PostgreSQL SQL to MySQL format..."

# Create MySQL compatible SQL file
cat coffee_full_1month.sql | \
  # Remove CASCADE from DROP TABLE
  sed 's/DROP TABLE IF EXISTS \(.*\) CASCADE;/DROP TABLE IF EXISTS \1;/g' | \
  # Convert UUID to CHAR(36)
  sed 's/UUID/CHAR(36)/g' | \
  # Convert TEXT to VARCHAR(255)
  sed 's/ TEXT/ VARCHAR(255)/g' | \
  # Convert TIMESTAMP to DATETIME
  sed 's/ TIMESTAMP/ DATETIME/g' | \
  # Convert NUMERIC to DECIMAL(15,2)
  sed 's/ NUMERIC/ DECIMAL(15,2)/g' | \
  # Convert DATE to DATE (keep as is)
  sed 's/ INT/ INT/g' > coffee_mysql.sql

echo "✅ Created coffee_mysql.sql"
echo ""

# Check if MySQL credentials are set
if [ -z "$MYSQL_HOST" ] || [ -z "$MYSQL_DATABASE" ] || [ -z "$MYSQL_USER" ]; then
  echo "⚠️  MySQL credentials not found in environment variables"
  echo ""
  echo "Please set the following environment variables:"
  echo "  MYSQL_HOST - MySQL host address"
  echo "  MYSQL_PORT - MySQL port (default: 3306)"
  echo "  MYSQL_DATABASE - MySQL database name"
  echo "  MYSQL_USER - MySQL username"
  echo "  MYSQL_PASSWORD - MySQL password"
  echo ""
  echo "Or use MYSQL_DATABASE_URL for connection string"
  echo ""
  echo "Example:"
  echo "  export MYSQL_HOST=your-mysql-host.com"
  echo "  export MYSQL_DATABASE=coffee_db"
  echo "  export MYSQL_USER=your_user"
  echo "  export MYSQL_PASSWORD=your_password"
  echo ""
  echo "The SQL file has been created: coffee_mysql.sql"
  echo "You can import it manually using:"
  echo "  mysql -h \$MYSQL_HOST -u \$MYSQL_USER -p \$MYSQL_DATABASE < coffee_mysql.sql"
  exit 0
fi

# If credentials are available, offer to import
echo "MySQL credentials found!"
echo "Host: $MYSQL_HOST"
echo "Database: $MYSQL_DATABASE"
echo "User: $MYSQL_USER"
echo ""

read -p "Do you want to import data to MySQL now? (y/n) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📤 Importing data to MySQL..."
  
  if [ -n "$MYSQL_PASSWORD" ]; then
    mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE" < coffee_mysql.sql
  else
    mysql -h "$MYSQL_HOST" -P "${MYSQL_PORT:-3306}" -u "$MYSQL_USER" "$MYSQL_DATABASE" < coffee_mysql.sql
  fi
  
  if [ $? -eq 0 ]; then
    echo "✅ Data imported successfully to MySQL!"
  else
    echo "❌ Error importing data to MySQL"
    exit 1
  fi
else
  echo "ℹ️  Skipping import. You can import manually later using:"
  echo "  mysql -h \$MYSQL_HOST -u \$MYSQL_USER -p \$MYSQL_DATABASE < coffee_mysql.sql"
fi

echo ""
echo "✅ MySQL migration script completed!"
