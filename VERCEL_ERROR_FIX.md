# 🚨 Vercel Deployment - Error Fix

## Error yang Terjadi

```
error: Environment Variable "DB_HOST" references Secret "db_host", 
which does not exist.
```

## ✅ Sudah Diperbaiki!

Fix sudah di-commit dan push ke GitHub. Vercel akan auto-redeploy dengan config yang benar.

---

## 🔧 Apa yang Diperbaiki?

### 1. File `vercel.json` Updated
**Sebelum (ERROR):**
```json
{
  "env": {
    "DB_HOST": "@db_host",  // ❌ Secrets belum dibuat
    ...
  }
}
```

**Sesudah (FIXED):**
```json
{
  "version": 2,
  "builds": [...],
  "routes": [...]
  // ✅ env dihapus, akan di-set manual via dashboard
}
```

### 2. Dokumentasi Diperjelas
Sekarang dokumentasi menjelaskan:
- ✅ JANGAN set env variables saat pertama kali deploy
- ✅ Env variables di-set SETELAH database dibuat
- ✅ Step-by-step yang lebih jelas

---

## 🚀 Cara Deploy Sekarang (Step-by-Step)

### Langkah 1: Deploy Project (Tanpa Database Dulu)

1. Buka [https://vercel.com](https://vercel.com)
2. Import `amdanibik/coffe`
3. **Configure Project:**
   - Framework: Other
   - Build Command: (default)
   - **JANGAN isi Environment Variables!**
4. Klik **"Deploy"**
5. ✅ Deploy akan sukses! (meski belum ada database)

### Langkah 2: Create Database

1. Di Vercel Dashboard → pilih project **coffe**
2. Tab **"Storage"** → **"Create Database"**
3. Pilih **"Postgres"**
4. Name: `coffee-db`
5. Region: Singapore
6. Klik **"Create"**

### Langkah 3: Connect Database

1. Setelah database ready, klik **"Connect"**
2. Select project: **coffe**
3. Environment: **All** (Production, Preview, Development)
4. Klik **"Connect"**

✅ Vercel otomatis menambahkan env variables:
- `POSTGRES_URL`
- `POSTGRES_HOST`
- `POSTGRES_PASSWORD`
- dll

### Langkah 4: Tambah Environment Variables Manual

1. Settings → **Environment Variables**
2. Klik **"Add New"** untuk setiap variable:

| Key | Value | Environment |
|-----|-------|-------------|
| `CONNECTOR_API_KEY` | `your-api-key-123` | All |
| `QUERY_TIMEOUT` | `30000` | All |
| `NODE_ENV` | `production` | Production |

3. Klik **"Save"** untuk setiap variable

### Langkah 5: Redeploy

1. Tab **"Deployments"**
2. Klik **"..."** pada deployment terakhir
3. Klik **"Redeploy"**
4. ✅ Deploy dengan env variables lengkap!

### Langkah 6: Migrate Data

```bash
# Get POSTGRES_URL dari Storage → coffee-db → .env.local
./migrate-to-vercel.sh "postgres://default:xxx@xxx.neon.tech:5432/verceldb"
```

Atau via Query editor di Vercel Dashboard.

---

## 📋 Checklist Deployment

- [x] Fix vercel.json (sudah di-push)
- [ ] Deploy project ke Vercel (tanpa env variables)
- [ ] Create Vercel Postgres database
- [ ] Connect database to project (env auto-set)
- [ ] Tambah env variables manual (API_KEY, dll)
- [ ] Redeploy dengan env lengkap
- [ ] Migrate database (tables + data)
- [ ] Test production API
- [ ] DONE! ✅

---

## 🎯 Tips Penting

### ❌ JANGAN:
- Set environment variables saat pertama kali deploy
- Gunakan Secrets (@db_host) sebelum create Secret
- Deploy dengan env incomplete

### ✅ LAKUKAN:
1. Deploy project dulu (akan error connection, normal)
2. Create & connect database (env auto-set)
3. Tambah env manual (API_KEY, dll)
4. Redeploy
5. Migrate data

---

## 🔄 Jika Masih Error

### Error: Module Not Found
```bash
# Pastikan dependencies lengkap
npm install
git add package.json package-lock.json
git commit -m "Update dependencies"
git push
```

### Error: Connection Failed
- Check POSTGRES_URL sudah ter-set
- Settings → Environment Variables → Verify
- Redeploy

### Error: Function Timeout
- Normal untuk query besar
- Database migration via CLI, bukan serverless function

---

## 📞 Support

- Dokumentasi: [DEPLOY_VERCEL.md](DEPLOY_VERCEL.md)
- Vercel Docs: https://vercel.com/docs
- Vercel Postgres: https://vercel.com/docs/storage/vercel-postgres

---

## ✅ Status

**Fix sudah di-push ke GitHub!**

Commit: `Fix Vercel deployment - remove env secrets from vercel.json`

Sekarang Anda bisa:
1. Refresh halaman deploy di Vercel
2. Atau re-import repository
3. Follow step-by-step di atas

**Deployment akan berhasil!** 🚀
