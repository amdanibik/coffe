# ✅ Deployment Complete - Next Steps

## Status Saat Ini:

✅ **Code Changes:** Deployed to Vercel  
✅ **MySQL Endpoints:** Ready (`/mysql` handler added)  
⏳ **MySQL Credentials:** Need to be added  
⏳ **Testing:** Pending MySQL setup  

---

## 🚀 Langkah Selanjutnya:

### Step 1: Setup Railway MySQL (5 menit)

1. **Buka Railway:**  
   https://railway.app/new

2. **Create MySQL Database:**
   - Login dengan GitHub
   - Klik "New Project"
   - Pilih "Provision MySQL"
   - Tunggu hingga MySQL service ready (~30 detik)

3. **Copy Credentials:**
   - Klik MySQL service card
   - Pergi ke tab "Variables" atau "Connect"
   - Copy credentials:
     - `MYSQLHOST` atau `MYSQL_PUBLIC_URL`
     - `MYSQLPORT` (default: 3306)
     - `MYSQLDATABASE` (default: railway)
     - `MYSQLUSER` (default: root)
     - `MYSQLPASSWORD` (auto-generated)

---

### Step 2: Add MySQL Credentials ke Vercel (3 menit)

**Pilih salah satu metode:**

#### Metode A: Vercel Dashboard (Recommended)

1. Buka: https://vercel.com/amdanibiks-projects/coffee/settings/environment-variables

2. Klik "Add New" untuk setiap variable:

   | Key | Value (dari Railway) | Environment |
   |-----|---------------------|-------------|
   | `MYSQL_HOST` | `containers-us-west-xxx.railway.app` | ✅ All |
   | `MYSQL_PORT` | `3306` | ✅ All |
   | `MYSQL_DATABASE` | `railway` | ✅ All |
   | `MYSQL_USER` | `root` | ✅ All |
   | `MYSQL_PASSWORD` | (dari Railway) | ✅ All |

3. **Important:** Pastikan centang:
   - ✅ Production
   - ✅ Preview  
   - ✅ Development

4. **Redeploy:**
   - Pergi ke "Deployments" tab
   - Klik menu (⋯) pada deployment terakhir
   - Pilih "Redeploy"

#### Metode B: Vercel CLI (Alternative)

Buka **terminal baru** dan jalankan:

```bash
# Add each variable one by one
vercel env add MYSQL_HOST
# Paste Railway host, select all environments (tekan 'a')

vercel env add MYSQL_PORT  
# Enter: 3306

vercel env add MYSQL_DATABASE
# Paste Railway database name

vercel env add MYSQL_USER
# Paste Railway username

vercel env add MYSQL_PASSWORD
# Paste Railway password

# Redeploy
vercel --prod
```

---

### Step 3: Test MySQL Connection (1 menit)

#### Wait for Deployment (~1 minute)

Monitor deployment status:
```bash
# Check latest deployment
vercel deployments
```

Atau buka browser:
https://vercel.com/amdanibiks-projects/coffee/deployments

#### Test Connection

**Opsi 1: Menggunakan Script**
```bash
./test-mysql-connector.sh
```

**Opsi 2: Manual cURL**
```bash
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/mysql \
  -H "X-API-Key: test-api-key-12345" \
  -H "Content-Type: application/json"
```

**Expected Response:**
```json
{
  "success": true,
  "message": "MySQL database connection established",
  "connection": {
    "status": "connected",
    "timestamp": "2026-02-10T...",
    "version": "8.0.x",
    "database": "railway"
  }
}
```

**Opsi 3: Test dari BizCopilot**
1. Buka BizCopilot connector settings
2. **Connector URL:** `https://coffee-git-main-amdanibiks-projects.vercel.app/mysql`
3. **API Key:** `test-api-key-12345`
4. Klik "Test Connection"
5. Should show: ✅ **Connected**

---

## 📊 Import Sample Data (Optional)

Setelah koneksi berhasil, import data ke Railway MySQL:

### Create Tables:

```bash
# Download SQL schema
curl -O https://raw.githubusercontent.com/amdanibik/coffe/main/schema.sql

# Connect to Railway MySQL and import
mysql -h [RAILWAY_HOST] -u root -p[RAILWAY_PASSWORD] railway < schema.sql
```

### Or use Railway CLI:

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link project
railway link

# Open MySQL shell
railway run mysql -u root -p
```

Then paste SQL commands dari `coffee_multitenant_seed.sql`.

---

## 🔍 Verify Everything Works

### 1. Check Environment Variables:
```bash
vercel env ls
```

Should see:
- ✅ MYSQL_HOST
- ✅ MYSQL_PORT  
- ✅ MYSQL_DATABASE
- ✅ MYSQL_USER
- ✅ MYSQL_PASSWORD

### 2. Check Deployment Status:
```bash
vercel inspect
```

### 3. Check Available Endpoints:
```bash
curl https://coffee-git-main-amdanibiks-projects.vercel.app/
```

---

## ⚠️ Troubleshooting

### Error: "Connection failed"

**Solusi:**
1. Verify Railway MySQL is running
2. Check credentials are correct
3. Verify environment variables added to Vercel
4. Redeploy after adding env vars
5. Check Railway allows external connections

### Error: "Invalid API Key"

**Solusi:**
```bash
# Verify API key
vercel env ls | grep CONNECTOR_API_KEY

# Should be: test-api-key-12345
```

### Railway MySQL Not Accessible

**Check:**
1. Railway project is not paused
2. MySQL service has "Public Networking" enabled
3. Copy the PUBLIC URL, not internal URL

---

## 📚 Documentation References

- [SETUP_MYSQL_VERCEL.md](SETUP_MYSQL_VERCEL.md) - Detailed MySQL setup guide
- [MYSQL_CONNECTION_FIX.md](MYSQL_CONNECTION_FIX.md) - Technical details of the fix
- [server.js](server.js) - Main server configuration
- [src/mysqlRoutes.js](src/mysqlRoutes.js) - MySQL endpoint handlers

---

## ✅ Success Checklist

Complete these steps in order:

- [ ] Railway MySQL created and running
- [ ] Railway credentials copied
- [ ] Vercel environment variables added
- [ ] Vercel project redeployed
- [ ] MySQL connection test successful (status 200)
- [ ] BizCopilot can connect to `/mysql` endpoint
- [ ] (Optional) Sample data imported to MySQL

---

## 🎉 When Everything is Working

You'll be able to:

1. **Query MySQL from BizCopilot:**
   - Use natural language queries
   - Get data in table format
   - Run reports and analytics

2. **Switch between databases:**
   - PostgreSQL (default): `/` or `/execute`
   - MySQL: `/mysql` or `/mysql/execute`  
   - MongoDB: `/mongo` or `/mongo/execute`

3. **Use all endpoints:**
   ```
   GET  /mysql              → Connection info
   POST /mysql              → Test connection
   POST /mysql/execute      → Run SQL queries
   GET  /mysql/introspect   → Get schema
   GET  /mysql/tenants      → Get tenants data
   GET  /mysql/orders       → Get orders data
   ```

---

**Current Progress:** 🟢🟢🟢⚪⚪ (3/5 steps complete)

**Next Action:** Setup Railway MySQL and add credentials to Vercel

**Need Help?** Check the troubleshooting section or documentation references above.
