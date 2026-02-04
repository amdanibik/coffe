# 🚀 Opsi Deployment

## 📊 Perbandingan Platform Hosting

| Platform | Pros | Cons | Free Tier | Best For |
|----------|------|------|-----------|----------|
| **Vercel** | ⚡ Super cepat, Easy deploy, Auto SSL | Serverless (bukan persistent) | ✅ Unlimited | Static + API routes |
| **Railway** | 🚂 Easy, PostgreSQL included, Auto deploy | Limited free tier | ✅ $5 credit | Full-stack apps |
| **Heroku** | 🎯 Mature, Many addons | Dynos sleep after 30 min | ✅ 550 hours/month | Simple apps |
| **Render** | 💎 Free tier good, Auto deploy | Slow cold starts | ✅ 750 hours/month | Backend APIs |
| **DigitalOcean** | 💪 Full control, Good pricing | Need more setup | ❌ $4/month | Production apps |
| **Fly.io** | 🛩️ Edge deployment, Fast | Complex config | ✅ Limited | Global apps |

---

## 🎯 Recommended Setup: Supabase + Vercel

### Why This Combo?

✅ **Both have generous free tiers**  
✅ **Easy to setup**  
✅ **Great performance**  
✅ **Auto SSL/HTTPS**  
✅ **Excellent for demos & MVPs**  

### Architecture:
```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       ▼
┌──────────────┐     API      ┌──────────────┐
│   Vercel     │ ───────────► │  Supabase    │
│  (Backend)   │   Queries    │ (PostgreSQL) │
└──────────────┘              └──────────────┘
```

---

## 1️⃣ Supabase + Vercel (Recommended)

### Setup Supabase
```bash
# 1. Buka https://supabase.com
# 2. Create project
# 3. Run migration script
./migrate-to-supabase.sh
```

### Deploy ke Vercel
```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy (interactive)
vercel

# Set environment variables di dashboard:
# https://vercel.com/[your-name]/[project]/settings/environment-variables
```

**Environment Variables untuk Vercel:**
```
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-password
CONNECTOR_API_KEY=your-api-key
QUERY_TIMEOUT=30000
```

**Cost:** FREE ✅

---

## 2️⃣ Railway (Easiest All-in-One)

Railway provides PostgreSQL + Hosting in one place!

### Setup
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
railway init

# 4. Add PostgreSQL
railway add

# 5. Deploy
railway up
```

### Or Deploy via GitHub:
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Click "New Project" → "Deploy from GitHub"
4. Select your repo
5. Railway auto-detects Node.js
6. Add environment variables
7. Deploy! ✅

**Migration:**
```bash
# Railway provides DATABASE_URL automatically
# Just run migration:
railway run bash
./migrate-to-supabase.sh  # or manual psql
```

**Cost:** $5 credit free, then $5-10/month

---

## 3️⃣ Heroku (Classic Choice)

### Setup
```bash
# 1. Install Heroku CLI
# Mac: brew install heroku/brew/heroku
# Linux: curl https://cli-assets.heroku.com/install.sh | sh

# 2. Login
heroku login

# 3. Create app
heroku create coffee-connector

# 4. Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# 5. Set config vars
heroku config:set CONNECTOR_API_KEY=your-key
heroku config:set QUERY_TIMEOUT=30000

# 6. Deploy
git push heroku main

# 7. Migrate data
heroku pg:psql < coffee_multitenant_seed.sql
```

**Cost:** FREE (with sleep) or $7/month (no sleep)

---

## 4️⃣ Render

### Setup via GitHub:
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Click "New +" → "Web Service"
4. Connect GitHub repo
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Add Environment Variables
7. Click "Create Web Service"

### Add PostgreSQL:
1. Click "New +" → "PostgreSQL"
2. Copy connection string
3. Add to your web service as `DATABASE_URL`
4. Migrate data

**Cost:** FREE (auto-sleep after 15 min)

---

## 5️⃣ DigitalOcean App Platform

### Setup:
1. Go to [cloud.digitalocean.com](https://cloud.digitalocean.com)
2. Create → Apps → Deploy from GitHub
3. Select repository
4. Configure:
   - **Type:** Web Service
   - **Build Command:** `npm install`
   - **Run Command:** `npm start`
5. Add PostgreSQL database ($15/month)
6. Add environment variables
7. Deploy

**Cost:** $5/month (app) + $15/month (database)

---

## 6️⃣ VPS (DigitalOcean Droplet / AWS EC2)

For full control and production use.

### Setup on Ubuntu VPS:
```bash
# 1. SSH to server
ssh root@your-server-ip

# 2. Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# 4. Clone repository
git clone [your-repo-url]
cd coffee

# 5. Install dependencies
npm install

# 6. Setup database
./setup-database.sh

# 7. Install PM2 (process manager)
npm install -g pm2

# 8. Start app
pm2 start server.js --name coffee-connector
pm2 save
pm2 startup

# 9. Setup Nginx reverse proxy
sudo apt install nginx
# Configure nginx (see nginx.conf)

# 10. Get SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

**Cost:** $4-10/month

---

## 📦 Using Supabase with Any Platform

All platforms above can use Supabase as the database!

### Steps:
1. **Setup Supabase** (see SUPABASE_DEPLOYMENT.md)
2. **Get connection string** from Supabase dashboard
3. **Add to platform** as environment variables:
   ```
   DB_HOST=db.xxxxx.supabase.co
   DB_PASSWORD=your-supabase-password
   ```
4. **Deploy!**

---

## 🔐 Environment Variables Checklist

Copy these to your hosting platform:

```env
# Database (Supabase or other)
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your-secure-password

# Or use connection string (alternative)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxx.supabase.co:5432/postgres

# API Configuration
CONNECTOR_API_KEY=your-production-api-key
QUERY_TIMEOUT=30000

# Server
PORT=3000
NODE_ENV=production
```

---

## 🎯 Quick Decision Guide

**For Demo/Learning:**
→ Supabase (DB) + Vercel (Backend) = FREE ✅

**For Small Project:**
→ Railway = Easy + All-in-one = $5/month

**For Production:**
→ Supabase (DB) + DigitalOcean App = Reliable = $20/month

**For Enterprise:**
→ AWS RDS (DB) + ECS/EKS = Scalable = $$$

---

## 📊 Cost Comparison (Monthly)

| Setup | Free Tier | Paid |
|-------|-----------|------|
| Supabase + Vercel | ✅ FREE | $25+ (if scale) |
| Railway | $5 credit | $10-20 |
| Heroku + Postgres | ❌ Limited | $7-16 |
| Render | ✅ FREE* | $7-20 |
| DigitalOcean | ❌ | $20-30 |
| VPS (Self-hosted) | ❌ | $5-10 |

*with limitations (sleep after inactivity)

---

## ✅ Recommended Path

### For This Project (Coffee Connector):

**Option A - Completely Free:**
```
1. Supabase (Database) - FREE
2. Vercel (Backend API) - FREE
3. Total: FREE ✅
```

**Option B - Best Balance:**
```
1. Railway (DB + Backend) - $5-10/month
2. Everything in one place
3. Easy to manage
```

**Option C - Production Ready:**
```
1. Supabase Pro (DB) - $25/month
2. DigitalOcean App (Backend) - $5/month
3. Reliable, scalable
```

---

## 🚀 Next Steps

1. **Choose your platform** from above
2. **Follow SUPABASE_DEPLOYMENT.md** to migrate database
3. **Deploy backend** using chosen platform
4. **Test** your production API
5. **Monitor** and optimize

---

## 📞 Support Links

- **Vercel**: https://vercel.com/docs
- **Railway**: https://docs.railway.app
- **Heroku**: https://devcenter.heroku.com
- **Render**: https://render.com/docs
- **DigitalOcean**: https://docs.digitalocean.com
- **Supabase**: https://supabase.com/docs

---

**Happy Deploying! 🚀**
