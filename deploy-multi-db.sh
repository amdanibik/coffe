#!/bin/bash

# Deploy Coffee Database Connector with Multi-Database Support to Vercel
# This script helps deploy the connector with PostgreSQL, MySQL, and MongoDB support

echo "╔═══════════════════════════════════════════════════════╗"
echo "║  Coffee Database Connector - Vercel Deployment       ║"
echo "║  Multi-Database Support (PostgreSQL, MySQL, MongoDB)  ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
  echo "❌ Vercel CLI is not installed"
  echo ""
  echo "Install it with:"
  echo "  npm install -g vercel"
  echo ""
  exit 1
fi

echo "✅ Vercel CLI is installed"
echo ""

# Check if user is logged in to Vercel
echo "🔐 Checking Vercel authentication..."
if ! vercel whoami &> /dev/null; then
  echo "❌ Not logged in to Vercel"
  echo ""
  echo "Please login first:"
  echo "  vercel login"
  echo ""
  exit 1
fi

VERCEL_USER=$(vercel whoami)
echo "✅ Logged in as: $VERCEL_USER"
echo ""

# Ask user what to do
echo "📝 What would you like to do?"
echo ""
echo "1. Set environment variables"
echo "2. Deploy to Vercel"
echo "3. Both (recommended for first time)"
echo ""
read -p "Enter your choice (1-3): " choice

if [ "$choice" == "1" ] || [ "$choice" == "3" ]; then
  echo ""
  echo "🔧 Setting environment variables..."
  echo ""
  echo "You'll need to provide the following:"
  echo ""
  
  # PostgreSQL
  echo "📊 PostgreSQL Configuration:"
  read -p "PostgreSQL DATABASE_URL (or press Enter to skip): " DATABASE_URL
  if [ -n "$DATABASE_URL" ]; then
    echo "$DATABASE_URL" | vercel env add DATABASE_URL production
    echo "✅ DATABASE_URL set"
  fi
  echo ""
  
  # MySQL
  echo "🐬 MySQL Configuration:"
  read -p "MySQL MYSQL_DATABASE_URL (or press Enter to skip): " MYSQL_DATABASE_URL
  if [ -n "$MYSQL_DATABASE_URL" ]; then
    echo "$MYSQL_DATABASE_URL" | vercel env add MYSQL_DATABASE_URL production
    echo "✅ MYSQL_DATABASE_URL set"
  fi
  echo ""
  
  # MongoDB
  echo "🍃 MongoDB Configuration:"
  read -p "MongoDB MONGODB_URL (or press Enter to skip): " MONGODB_URL
  if [ -n "$MONGODB_URL" ]; then
    echo "$MONGODB_URL" | vercel env add MONGODB_URL production
    echo "✅ MONGODB_URL set"
  fi
  
  read -p "MongoDB MONGODB_DATABASE (default: coffee_db): " MONGODB_DATABASE
  MONGODB_DATABASE=${MONGODB_DATABASE:-coffee_db}
  echo "$MONGODB_DATABASE" | vercel env add MONGODB_DATABASE production
  echo "✅ MONGODB_DATABASE set"
  echo ""
  
  # API Key
  echo "🔑 API Key Configuration:"
  read -p "CONNECTOR_API_KEY (required): " CONNECTOR_API_KEY
  if [ -z "$CONNECTOR_API_KEY" ]; then
    echo "❌ API Key is required!"
    exit 1
  fi
  echo "$CONNECTOR_API_KEY" | vercel env add CONNECTOR_API_KEY production
  echo "✅ CONNECTOR_API_KEY set"
  echo ""
  
  echo "✅ All environment variables set!"
  echo ""
fi

if [ "$choice" == "2" ] || [ "$choice" == "3" ]; then
  echo "🚀 Deploying to Vercel..."
  echo ""
  
  vercel --prod
  
  if [ $? -eq 0 ]; then
    echo ""
    echo "╔═══════════════════════════════════════════════════════╗"
    echo "║              Deployment Successful! 🎉                ║"
    echo "╚═══════════════════════════════════════════════════════╝"
    echo ""
    echo "Your multi-database connector is now live!"
    echo ""
    echo "📌 Available Endpoints:"
    echo "   PostgreSQL: https://your-domain.vercel.app/execute"
    echo "   MySQL:      https://your-domain.vercel.app/mysql/execute"
    echo "   MongoDB:    https://your-domain.vercel.app/mongo/execute"
    echo ""
    echo "📚 Documentation:"
    echo "   See MULTI_DATABASE_SETUP.md for usage examples"
    echo ""
  else
    echo ""
    echo "❌ Deployment failed!"
    echo "Check the error messages above for details."
    exit 1
  fi
fi

echo ""
echo "✅ Done!"
