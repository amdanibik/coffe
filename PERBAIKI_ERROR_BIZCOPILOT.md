# 🔧 Cara Memperbaiki Error "Connection failed: 404 Not Found"

## 📌 Masalahnya Apa?

Error **"404 Not Found"** yang Anda lihat di BizCopilot sebenarnya bukan error 404 yang sesungguhnya. API endpoint-nya **sudah bekerja dengan baik**! ✅

Yang terjadi adalah: **API Key yang Anda masukkan tidak cocok** dengan yang ada di Vercel.

## ✅ Solusi Cepat (3 Langkah)

### 1️⃣ Ambil API Key dari Vercel

```bash
# Cara 1: Via Vercel Dashboard (Paling Mudah)
1. Buka: https://vercel.com/dashboard
2. Pilih project: coffee-git-main-amdanibiks-projects
3. Klik: Settings → Environment Variables
4. Cari: CONNECTOR_API_KEY
5. Copy value-nya

# Cara 2: Via Terminal (Jika sudah install Vercel CLI)
vercel env pull .env.vercel
cat .env.vercel | grep CONNECTOR_API_KEY
```

### 2️⃣ Masukkan ke BizCopilot

Di halaman BizCopilot yang Anda screenshot:
- Paste API Key yang baru Anda copy ke field **"Connector API Key"**
- **PENTING**: Pastikan tidak ada spasi di awal/akhir
- Klik **Save** dulu
- Baru klik **Test Connection**

### 3️⃣ Selesai! ✅

Seharusnya sekarang muncul: **"Connection successful"**

---

## 🧪 Test Manual (Opsional)

Jalankan script test yang sudah saya buatkan:

```bash
./test-bizcopilot-connection.sh
```

Script ini akan:
- Test endpoint health check
- Test connector metadata
- Minta Anda input API key
- Test koneksi dengan API key tersebut
- Kasih tahu apakah API key-nya benar atau salah

---

## ❓ Jika Tidak Tahu API Key-nya

Kalau API key belum pernah di-set atau lupa, lakukan ini:

### Set API Key Baru di Vercel:

1. **Buat API Key Baru** (contoh):
   ```
   coffee-db-key-2026-amdanibik-production123
   ```

2. **Tambahkan ke Vercel**:
   - Dashboard → Project → Settings → Environment Variables
   - Add New Variable:
     - **Name**: `CONNECTOR_API_KEY`
     - **Value**: (paste API key baru Anda)
     - **Environment**: Pilih semua (Production, Preview, Development)
   - Save

3. **Redeploy Project**:
   - Pergi ke tab "Deployments"
   - Klik tombol "..." pada deployment terakhir
   - Pilih "Redeploy"
   - Tunggu sampai selesai (1-2 menit)

4. **Gunakan API Key yang Sama di BizCopilot**

---

## 🎯 Checklist Troubleshooting

Jika masih error, cek ini:

- [ ] API Key di BizCopilot **PERSIS SAMA** dengan di Vercel (tidak boleh beda 1 karakter pun)
- [ ] Tidak ada spasi di awal/akhir API key
- [ ] Sudah klik **Save** di BizCopilot sebelum Test Connection
- [ ] URL Connector benar: `https://coffee-git-main-amdanibiks-projects.vercel.app/api/db/connect`
- [ ] Vercel deployment terakhir berhasil (tidak error)
- [ ] Environment variable sudah di-set di environment **Production**

---

## 💡 Tips

1. **Simpan API Key** di tempat aman (password manager)
2. **Jangan share** API key di public (GitHub, screenshot, dll)
3. **Test dulu** dengan script sebelum input ke BizCopilot
4. Kalau ganti API key, **harus redeploy** Vercel

---

## 📞 Test Endpoint Sekarang

Coba command ini untuk test langsung:

```bash
# Test tanpa auth (harus berhasil)
curl https://coffee-git-main-amdanibiks-projects.vercel.app/health

# Test dengan auth (ganti YOUR_API_KEY)
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/api/db/connect \
  -H "X-API-Key: YOUR_API_KEY" \
  -H "Content-Type: application/json"
```

Kalau berhasil, response-nya:
```json
{"success":true,"message":"Direct database connection established",...}
```

Kalau API key salah:
```json
{"success":false,"error":"Invalid API Key"}
```

---

## ✨ Kesimpulan

- ✅ API endpoint **BEKERJA dengan baik**
- ✅ Bukan masalah 404 sebenarnya
- ⚠️ Masalah: **API Key tidak cocok**
- 🔧 Solusi: **Copy API key dari Vercel, paste ke BizCopilot**

---

Dokumentasi lengkap ada di: [BIZCOPILOT_FIX_CONNECTION.md](BIZCOPILOT_FIX_CONNECTION.md) (English version)
