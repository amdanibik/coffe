# 🚀 CARA UPLOAD KE SUPABASE

Aplikasi sudah siap untuk di-upload ke Supabase! Berikut panduan singkatnya:

---

## 📋 QUICK START (3 Langkah Utama)

### 1️⃣ Setup Supabase Database

```bash
# a. Buka https://supabase.com dan buat akun (gratis)
# b. Klik "New Project"
# c. Isi:
#    - Name: coffee-multitenant
#    - Database Password: (buat password, SIMPAN!)
#    - Region: Singapore (atau terdekat)
# d. Tunggu ~2 menit project selesai dibuat
```

### 2️⃣ Migrate Database

```bash
# a. Edit file .env.supabase dengan credentials Supabase
#    (Lihat Settings > Database di Supabase dashboard)

# b. Jalankan script migrate:
./migrate-to-supabase.sh

# Script akan otomatis:
# ✓ Create tables
# ✓ Upload 52MB data (334K baris)
# ✓ Create indexes
# ✓ Verify data
```

### 3️⃣ Deploy Backend API

**Pilihan Termudah - Vercel (FREE):**
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables di Vercel dashboard
```

**Pilihan Alternatif:**
- Railway (all-in-one, mudah)
- Heroku (classic)
- Render (free tier bagus)

---

## 📁 File Yang Sudah Disiapkan

✅ **SUPABASE_DEPLOYMENT.md** - Panduan lengkap deployment  
✅ **DEPLOYMENT_OPTIONS.md** - Perbandingan platform hosting  
✅ **.env.supabase** - Template config Supabase  
✅ **migrate-to-supabase.sh** - Script otomatis migrate  
✅ **vercel.json** - Config untuk Vercel  
✅ **railway.json** - Config untuk Railway  
✅ **Procfile** - Config untuk Heroku  

---

## 🎯 Rekomendasi Setup

### Untuk Demo/Testing (100% GRATIS):
```
Database: Supabase (FREE 500MB)
Backend:  Vercel (FREE unlimited)
─────────────────────────────
Total:    FREE ✅
```

### Untuk Production ($10/bulan):
```
Database: Supabase Pro ($25)
Backend:  Railway ($10)
──────────────────────────
atau gunakan Railway saja ($10) untuk DB + Backend
```

---

## 📖 Dokumentasi Lengkap

Baca file berikut untuk detail:

1. **SUPABASE_DEPLOYMENT.md** ← Panduan step-by-step Supabase
2. **DEPLOYMENT_OPTIONS.md** ← Perbandingan platform hosting
3. **README.md** ← API documentation

---

## 🚀 Quick Commands

```bash
# 1. Edit config Supabase
nano .env.supabase

# 2. Migrate database
./migrate-to-supabase.sh

# 3. Test koneksi lokal dengan Supabase
cp .env.supabase .env
npm start

# 4. Deploy ke Vercel
vercel
```

---

## ✅ Checklist Deployment

- [ ] Buat project di Supabase
- [ ] Dapatkan database credentials
- [ ] Edit `.env.supabase` dengan credentials
- [ ] Run `./migrate-to-supabase.sh`
- [ ] Verify data di Supabase dashboard
- [ ] Test koneksi lokal (optional)
- [ ] Pilih platform hosting (Vercel/Railway/dll)
- [ ] Deploy backend
- [ ] Set environment variables di hosting
- [ ] Test production API
- [ ] DONE! ✅

---

## 💡 Tips

**Gratis vs Berbayar:**
- Supabase FREE tier (500MB) cukup untuk aplikasi ini (52MB data)
- Vercel FREE tier unlimited untuk backend API
- Kombinasi ini GRATIS untuk demo & testing! ✅

**Jika Data Lebih dari 500MB:**
- Upgrade Supabase Pro ($25/month)
- Atau gunakan Railway ($10/month) all-in-one

---

## 📞 Butuh Bantuan?

Baca dokumentasi lengkap:
- **SUPABASE_DEPLOYMENT.md** - Setup Supabase detail
- **DEPLOYMENT_OPTIONS.md** - Pilihan hosting lain

Atau cek official docs:
- Supabase: https://supabase.com/docs
- Vercel: https://vercel.com/docs
- Railway: https://docs.railway.app

---

**Ready to Deploy! 🚀**

Mulai dengan membuka: https://supabase.com
