#!/bin/bash

# Script untuk menambahkan MySQL Environment Variables ke Vercel
# Jalankan: ./add-mysql-to-vercel.sh

clear
echo "============================================================"
echo "  Add MySQL Environment Variables to Vercel"
echo "============================================================"
echo ""
echo "Script ini akan menambahkan MySQL credentials ke Vercel project."
echo "Pastikan Anda sudah login ke Vercel CLI (vercel whoami)"
echo ""

# Pilihan 1: Gunakan contoh credentials (untuk testing)
# Pilihan 2: Input manual
# Pilihan 3: Gunakan MySQL service populer

echo "Pilih opsi MySQL yang ingin Anda gunakan:"
echo ""
echo "1) Testing/Development (localhost MySQL)"
echo "2) Input MySQL credentials secara manual"
echo "3) Railway MySQL"
echo "4) PlanetScale MySQL"
echo "5) DigitalOcean MySQL"
echo "6) AWS RDS MySQL"
echo ""
read -p "Pilih (1-6): " CHOICE
echo ""

case $CHOICE in
  1)
    echo "📋 Menggunakan localhost MySQL untuk testing..."
    MYSQL_HOST="localhost"
    MYSQL_PORT="3306"
    MYSQL_DATABASE="coffee_db"
    MYSQL_USER="root"
    MYSQL_PASSWORD="password"
    echo ""
    echo "⚠️  WARNING: Localhost tidak bisa diakses dari Vercel!"
    echo "   Ini hanya untuk referensi. Anda perlu gunakan cloud MySQL."
    echo ""
    read -p "Lanjutkan? (y/n): " CONFIRM
    if [ "$CONFIRM" != "y" ]; then
      echo "Dibatalkan."
      exit 0
    fi
    ;;
  2)
    echo "📝 Input MySQL credentials:"
    echo ""
    read -p "MySQL Host (contoh: mysql-xxx.railway.app): " MYSQL_HOST
    read -p "MySQL Port (default 3306): " MYSQL_PORT
    MYSQL_PORT=${MYSQL_PORT:-3306}
    read -p "Database Name (contoh: coffee_db): " MYSQL_DATABASE
    read -p "Username: " MYSQL_USER
    read -sp "Password: " MYSQL_PASSWORD
    echo ""
    ;;
  3)
    echo "🚂 Railway MySQL Setup"
    echo ""
    echo "1. Buka https://railway.app/new"
    echo "2. Create new project → Add MySQL database"
    echo "3. Copy credentials dari Railway dashboard"
    echo ""
    read -p "Railway MySQL Host: " MYSQL_HOST
    read -p "Railway MySQL Port (default 3306): " MYSQL_PORT
    MYSQL_PORT=${MYSQL_PORT:-3306}
    read -p "Database Name: " MYSQL_DATABASE
    read -p "Username: " MYSQL_USER
    read -sp "Password: " MYSQL_PASSWORD
    echo ""
    ;;
  4)
    echo "🌐 PlanetScale MySQL Setup"
    echo ""
    echo "1. Buka https://planetscale.com/"
    echo "2. Create new database"
    echo "3. Get connection string dari dashboard"
    echo ""
    read -p "PlanetScale Host (xxx.planetscale.cloud): " MYSQL_HOST
    read -p "Port (default 3306): " MYSQL_PORT
    MYSQL_PORT=${MYSQL_PORT:-3306}
    read -p "Database Name: " MYSQL_DATABASE
    read -p "Username: " MYSQL_USER
    read -sp "Password: " MYSQL_PASSWORD
    echo ""
    ;;
  5)
    echo "🌊 DigitalOcean MySQL Setup"
    echo ""
    read -p "DigitalOcean MySQL Host: " MYSQL_HOST
    read -p "Port (default 3306): " MYSQL_PORT
    MYSQL_PORT=${MYSQL_PORT:-3306}
    read -p "Database Name: " MYSQL_DATABASE
    read -p "Username: " MYSQL_USER
    read -sp "Password: " MYSQL_PASSWORD
    echo ""
    ;;
  6)
    echo "☁️  AWS RDS MySQL Setup"
    echo ""
    read -p "AWS RDS Endpoint: " MYSQL_HOST
    read -p "Port (default 3306): " MYSQL_PORT
    MYSQL_PORT=${MYSQL_PORT:-3306}
    read -p "Database Name: " MYSQL_DATABASE
    read -p "Username: " MYSQL_USER
    read -sp "Password: " MYSQL_PASSWORD
    echo ""
    ;;
  *)
    echo "❌ Pilihan tidak valid"
    exit 1
    ;;
esac

echo ""
echo "============================================================"
echo "  Konfirmasi MySQL Credentials"
echo "============================================================"
echo ""
echo "Host:     $MYSQL_HOST"
echo "Port:     $MYSQL_PORT"
echo "Database: $MYSQL_DATABASE"
echo "User:     $MYSQL_USER"
echo "Password: ${MYSQL_PASSWORD:0:3}***"
echo ""
read -p "Kredensial sudah benar? (y/n): " CONFIRM

if [ "$CONFIRM" != "y" ]; then
  echo "Dibatalkan. Jalankan script lagi untuk input ulang."
  exit 0
fi

echo ""
echo "============================================================"
echo "  Adding Environment Variables to Vercel..."
echo "============================================================"
echo ""

# Function to add env var to all environments
add_env_var() {
  local key=$1
  local value=$2
  
  echo "Adding $key..."
  
  # Add to production
  echo "$value" | vercel env add "$key" production 2>/dev/null
  
  # Add to preview
  echo "$value" | vercel env add "$key" preview 2>/dev/null
  
  # Add to development
  echo "$value" | vercel env add "$key" development 2>/dev/null
  
  echo "✅ $key added to all environments"
}

# Add all MySQL environment variables
add_env_var "MYSQL_HOST" "$MYSQL_HOST"
add_env_var "MYSQL_PORT" "$MYSQL_PORT"
add_env_var "MYSQL_DATABASE" "$MYSQL_DATABASE"
add_env_var "MYSQL_USER" "$MYSQL_USER"
add_env_var "MYSQL_PASSWORD" "$MYSQL_PASSWORD"

# Create connection string
MYSQL_URL="mysql://$MYSQL_USER:$MYSQL_PASSWORD@$MYSQL_HOST:$MYSQL_PORT/$MYSQL_DATABASE"
add_env_var "MYSQL_DATABASE_URL" "$MYSQL_URL"

echo ""
echo "============================================================"
echo "  ✅ MySQL Environment Variables Added!"
echo "============================================================"
echo ""
echo "Environment variables yang ditambahkan:"
echo "  - MYSQL_HOST"
echo "  - MYSQL_PORT"
echo "  - MYSQL_DATABASE"
echo "  - MYSQL_USER"
echo "  - MYSQL_PASSWORD"
echo "  - MYSQL_DATABASE_URL"
echo ""
echo "============================================================"
echo "  Next Steps:"
echo "============================================================"
echo ""
echo "1. Verify environment variables di Vercel Dashboard:"
echo "   https://vercel.com/amdanibiks-projects/coffee/settings/environment-variables"
echo ""
echo "2. Deploy ulang aplikasi:"
echo "   vercel --prod"
echo ""
echo "3. Test koneksi MySQL setelah deploy:"
echo "   ./test-mysql-connector.sh"
echo ""
echo "   Atau manual:"
echo "   curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mysql \\"
echo "     -H \"X-API-Key: test-api-key-12345\""
echo ""
echo "============================================================"
