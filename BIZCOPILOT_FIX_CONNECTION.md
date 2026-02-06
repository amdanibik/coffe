# Fix BizCopilot Connection Error (404 Not Found)

## ✅ Good News
The API endpoint is working correctly! The "404 Not Found" error is actually an **API Key mismatch** issue.

## 🔍 Root Cause
The API key you entered in BizCopilot doesn't match the `CONNECTOR_API_KEY` environment variable configured in your Vercel deployment.

## 🛠️ How to Fix

### Step 1: Get Your Vercel API Key

1. Go to your Vercel Dashboard: https://vercel.com/dashboard
2. Select your project: **coffee-git-main-amdanibiks-projects**
3. Go to **Settings** → **Environment Variables**
4. Find `CONNECTOR_API_KEY` and copy its value

### Step 2: Update BizCopilot Configuration

1. Go back to BizCopilot: https://bizcopilot.app
2. In the **Database Configuration** section
3. Update the **Connector API Key** field with the exact value from Vercel
4. Click **Save** first
5. Then click **Test Connection**

### Step 3: Verify Connection

After updating the API key, you should see:
- ✅ **Connection successful**
- Database connector is ready

---

## 🔒 If You Don't Know Your API Key

If you forgot the API key or it's not set in Vercel, follow these steps:

### Option 1: Set a New API Key in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Find `CONNECTOR_API_KEY` (or add it if missing)
3. Set a secure value, for example:
   ```
   coffee-db-secure-key-2026-abc123xyz789
   ```
4. **Important**: Add it to all environments (Production, Preview, Development)
5. Click **Save**
6. Go to **Deployments** tab and click **Redeploy** on the latest deployment
7. Wait for redeployment to complete (usually 1-2 minutes)
8. Use this same API key in BizCopilot

### Option 2: Check Current Environment Variable

Run this command to see what's currently set in Vercel:

```bash
# Install Vercel CLI if you haven't
npm i -g vercel

# Login to Vercel
vercel login

# Pull environment variables
vercel env pull .env.vercel

# View the CONNECTOR_API_KEY
cat .env.vercel | grep CONNECTOR_API_KEY
```

---

## 📋 Testing the Connection Manually

You can test if your API key works using curl:

```bash
# Replace YOUR_API_KEY with your actual API key from Vercel
curl -X POST https://coffee-git-main-amdanibiks-projects.vercel.app/api/db/connect \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_API_KEY"
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Direct database connection established",
  "connection": {
    "status": "connected",
    "timestamp": "2026-02-06T...",
    "database": "...",
    "poolInfo": {...}
  }
}
```

**Error Response (Wrong API Key):**
```json
{
  "success": false,
  "error": "Invalid API Key"
}
```

---

## 🎯 Quick Fix Summary

1. **Get API Key from Vercel** → Settings → Environment Variables → `CONNECTOR_API_KEY`
2. **Paste in BizCopilot** → Connector API Key field
3. **Save** configuration
4. **Test Connection** → Should now work ✅

---

## 🆘 Still Having Issues?

### Check These:

1. **API Key Format**:
   - No extra spaces before/after
   - No quotes around the key
   - Copy-paste exactly as shown in Vercel

2. **Vercel Deployment**:
   - Check if the latest deployment succeeded
   - Environment variable must be set in Production environment
   - May need to redeploy after changing environment variables

3. **BizCopilot Configuration**:
   - Connector URL should be: `https://coffee-git-main-amdanibiks-projects.vercel.app/api/db/connect`
   - Not just the domain, must include `/api/db/connect`

4. **Network/CORS**:
   - The connector allows all origins (`*`)
   - Should work from any domain

### Test Individual Endpoints:

```bash
# Test health (no auth required)
curl https://coffee-git-main-amdanibiks-projects.vercel.app/health

# Test connector metadata (no auth required)
curl https://coffee-git-main-amdanibiks-projects.vercel.app/api/connector/metadata

# Test with auth (replace YOUR_KEY)
curl -H "X-API-Key: YOUR_KEY" \
  https://coffee-git-main-amdanibiks-projects.vercel.app/api/tenants
```

---

## 💡 Security Note

The `CONNECTOR_API_KEY` is used to protect your database from unauthorized access. Never share it publicly or commit it to git. Always use environment variables for sensitive values.

---

**Last Updated**: 2026-02-06
**Status**: ✅ Endpoint is working, just needs correct API key
