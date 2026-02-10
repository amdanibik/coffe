#!/bin/bash

echo "=================================================="
echo "  Setup MySQL Environment Variables for Vercel  "
echo "=================================================="
echo ""

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI belum terinstall"
    echo "Install dengan: npm i -g vercel"
    echo "Atau gunakan Vercel Dashboard: https://vercel.com/amdanibiks-projects/coffee/settings/environment-variables"
    exit 1
fi

echo "✅ Vercel CLI detected"
echo ""
echo "Masukkan kredensial MySQL Anda:"
echo ""

# Prompt for MySQL credentials
read -p "MySQL Host (contoh: mysql.example.com): " MYSQL_HOST
read -p "MySQL Port (default: 3306): " MYSQL_PORT
MYSQL_PORT=${MYSQL_PORT:-3306}
read -p "MySQL Database Name (contoh: coffee_db): " MYSQL_DATABASE
read -p "MySQL Username: " MYSQL_USER
read -sp "MySQL Password: " MYSQL_PASSWORD
echo ""

echo ""
echo "=================================================="
echo "  Menambahkan Environment Variables...          "
echo "=================================================="
echo ""

# Add environment variables
echo "$MYSQL_HOST" | vercel env add MYSQL_HOST production
echo "$MYSQL_PORT" | vercel env add MYSQL_PORT production
echo "$MYSQL_DATABASE" | vercel env add MYSQL_DATABASE production
echo "$MYSQL_USER" | vercel env add MYSQL_USER production
echo "$MYSQL_PASSWORD" | vercel env add MYSQL_PASSWORD production

echo ""
echo "✅ Environment variables berhasil ditambahkan!"
echo ""
echo "=================================================="
echo "  Next Steps:                                    "
echo "=================================================="
echo ""
echo "1. Deploy ulang aplikasi:"
echo "   vercel --prod"
echo ""
echo "2. Test koneksi MySQL:"
echo "   curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mysql \\"
echo "     -H \"X-API-Key: test-api-key-12345\""
echo ""
echo "3. Atau test dari browser:"
echo "   https://coffee-git-main-amdanibiks-projects.vercel.app/mysql?apiKey=test-api-key-12345"
echo ""
