# Quick Start Guide - Coffee Database Connector

## 🚀 Langkah Cepat untuk Memulai

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Database PostgreSQL

**Opsi A: Menggunakan Script (Otomatis)**
```bash
./setup-database.sh
```

**Opsi B: Manual**
```bash
# Buat database
createdb coffee_db

# Import data
psql coffee_db < coffee_multitenant_seed.sql
```

### 3. Konfigurasi Environment
Edit file `.env` sesuai dengan setup PostgreSQL Anda:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coffee_db
DB_USER=postgres
DB_PASSWORD=your_password
CONNECTOR_API_KEY=test-api-key-12345
```

### 4. Jalankan Server
```bash
npm start
```

Server akan berjalan di: `http://localhost:3000`

### 5. Test Aplikasi

**Opsi A: Via Browser (UI Test)**
Buka browser dan akses:
```
http://localhost:3000
```

**Opsi B: Via Script (Command Line)**
```bash
./test-api.sh
```

**Opsi C: Via cURL (Manual)**
```bash
# Test connection
curl -X POST -H "X-API-Key: test-api-key-12345" \
  http://localhost:3000/api/test-connection

# Get tenants
curl -H "X-API-Key: test-api-key-12345" \
  http://localhost:3000/api/tenants
```

## 📊 Sesuai Gambar Konfigurasi

Aplikasi ini dibuat sesuai dengan kebutuhan di gambar:

### Database Connector
- ✅ **Connector URL**: `http://localhost:3000` (atau URL deployment Anda)
- ✅ **Connector API Key**: Diatur via environment variable `CONNECTOR_API_KEY`
- ✅ **Full URL**: URL lengkah dari deployed database connector

### Configuration
- ✅ **Database Type**: PostgreSQL (dropdown di UI)
- ✅ **Query Timeout**: 30000ms (1000-120000ms range)
- ✅ **Test Connection**: Button untuk test koneksi ke database

## 🎯 Fitur Utama

1. **Database Connection Testing**
   - Test koneksi real-time ke PostgreSQL
   - Menampilkan status koneksi dan versi database

2. **API Key Authentication**
   - Semua endpoint dilindungi dengan API Key
   - Support via header atau query parameter

3. **Query Timeout Configuration**
   - Configurable timeout untuk setiap query
   - Default: 30 detik

4. **RESTful API Endpoints**
   - Get all tenants
   - Get orders with filtering
   - Get order details
   - Execute custom queries
   - Statistics & analytics

## 📝 API Documentation

Lihat file [README.md](README.md) untuk dokumentasi lengkap API endpoints.

## 🔍 Data Structure

Lihat file [DATA_EXTRACTION.md](DATA_EXTRACTION.md) untuk:
- Struktur database lengkap
- Sample data dan queries
- Estimasi volume data

## ⚙️ Troubleshooting

### Database Connection Error
```bash
# Check PostgreSQL service
sudo systemctl status postgresql

# Check database exists
psql -l | grep coffee_db
```

### Port Already in Use
Edit `.env` dan ubah `PORT=3000` ke port lain

### Permission Denied on Scripts
```bash
chmod +x setup-database.sh test-api.sh
```

## 📞 Support

Jika ada masalah, check:
1. PostgreSQL sudah running
2. Database sudah di-import
3. File `.env` sudah dikonfigurasi dengan benar
4. Port 3000 tidak digunakan aplikasi lain
