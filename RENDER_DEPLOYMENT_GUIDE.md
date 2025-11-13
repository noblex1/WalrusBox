# WalrusBox - Render Deployment Guide

## 🚀 Quick Deploy to Render

This guide will help you deploy WalrusBox to Render in minutes.

---

## Prerequisites

- GitHub account
- Render account (free tier available at [render.com](https://render.com))
- Your code pushed to a GitHub repository

---

## Method 1: One-Click Deploy (Recommended)

### Step 1: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Ready for Render deployment"

# Add your GitHub repository
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git

# Push to GitHub
git push -u origin main
```

### Step 2: Deploy on Render

1. **Go to [Render Dashboard](https://dashboard.render.com/)**

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repository**
   - Click "Connect account" if first time
   - Select your WalrusBox repository
   - Click "Connect"

4. **Configure the service:**

   **Basic Settings:**
   - Name: `walrusbox` (or your preferred name)
   - Region: `Oregon (US West)` (or closest to you)
   - Branch: `main`
   - Root Directory: (leave empty)
   - Runtime: `Node`

   **Build & Deploy:**
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`

5. **Add Environment Variables:**

   Click "Advanced" → "Add Environment Variable" for each:

   ```
   NODE_VERSION = 18.17.0
   VITE_SUI_NETWORK = testnet
   VITE_SUI_RPC_URL = https://fullnode.testnet.sui.io:443
   VITE_PACKAGE_ID = 0x386cf5f10e6dc8639fcc494123439e333e738280a8f249b638cb7b84328a8885
   VITE_REGISTRY_ID = 0x97bcf633e416c1bed96725d3872d255a4481686a66d38a589c42220aae16f366
   VITE_WALRUS_ENDPOINT = https://walrus-api.example.com
   ```

6. **Select Plan:**
   - Choose "Free" plan (or paid if needed)

7. **Click "Create Web Service"**

8. **Wait for deployment** (usually 2-5 minutes)

9. **Access your app** at the provided URL (e.g., `https://walrusbox.onrender.com`)

---

## Method 2: Using render.yaml (Infrastructure as Code)

### Step 1: Verify render.yaml

The `render.yaml` file is already created in your project root. It contains:

```yaml
services:
  - type: web
    name: walrusbox
    env: node
    region: oregon
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm run start
    envVars:
      - key: NODE_VERSION
        value: 18.17.0
      # ... other environment variables
```

### Step 2: Deploy

1. **Push to GitHub** (if not already done)

2. **Go to Render Dashboard**

3. **Click "New +" → "Blueprint"**

4. **Connect your repository**

5. **Render will automatically detect `render.yaml`**

6. **Click "Apply"**

7. **Wait for deployment**

---

## Post-Deployment Configuration

### 1. Update Environment Variables (if needed)

Go to your service → "Environment" → Update variables → "Save Changes"

### 2. Enable Auto-Deploy

Go to your service → "Settings" → "Build & Deploy"
- Enable "Auto-Deploy" for automatic deployments on git push

### 3. Custom Domain (Optional)

Go to your service → "Settings" → "Custom Domains"
- Add your domain
- Update DNS records as instructed

### 4. HTTPS

Render automatically provides free SSL certificates for all deployments.

---

## Troubleshooting

### Build Fails

**Issue**: Build command fails

**Solutions:**
1. Check Node version: `NODE_VERSION = 18.17.0`
2. Clear build cache: Settings → "Clear build cache & deploy"
3. Check logs: Click on the failed deployment

### App Not Loading

**Issue**: Deployment succeeds but app doesn't load

**Solutions:**
1. Check environment variables are set correctly
2. Verify start command: `npm run start`
3. Check logs for runtime errors
4. Ensure port is set correctly (Render provides $PORT)

### Wallet Connection Issues

**Issue**: Wallet won't connect on deployed app

**Solutions:**
1. Ensure HTTPS is enabled (automatic on Render)
2. Check browser console for errors
3. Verify environment variables are set
4. Test with different wallet extensions

### 404 on Routes

**Issue**: Direct navigation to routes returns 404

**Solution:**
The `_redirects` file should handle this. If not working:
1. Ensure `_redirects` file is in project root
2. Content should be: `/*    /index.html   200`
3. Rebuild and redeploy

### Slow Initial Load

**Issue**: First load is slow

**Solutions:**
1. Free tier spins down after inactivity
2. Upgrade to paid plan for always-on service
3. Or accept 30-60 second cold start on free tier

---

## Monitoring & Logs

### View Logs

1. Go to your service dashboard
2. Click "Logs" tab
3. View real-time logs
4. Filter by log level

### Metrics

1. Go to your service dashboard
2. Click "Metrics" tab
3. View:
   - CPU usage
   - Memory usage
   - Request count
   - Response times

---

## Updating Your Deployment

### Automatic Updates

If auto-deploy is enabled:
```bash
git add .
git commit -m "Update feature"
git push origin main
# Render automatically deploys
```

### Manual Deploy

1. Go to your service dashboard
2. Click "Manual Deploy" → "Deploy latest commit"

### Rollback

1. Go to your service dashboard
2. Click "Events" tab
3. Find previous successful deployment
4. Click "Rollback to this version"

---

## Performance Optimization

### 1. Enable Compression

Already configured in Vite build.

### 2. Code Splitting

Already configured in `vite.config.ts`:
```typescript
manualChunks: {
  vendor: ["react", "react-dom", "react-router-dom"],
  sui: ["@mysten/dapp-kit", "@mysten/sui"],
}
```

### 3. Caching

Render automatically caches static assets.

### 4. CDN

Render provides global CDN for static assets.

---

## Cost Estimation

### Free Tier
- ✅ 750 hours/month
- ✅ Automatic SSL
- ✅ Global CDN
- ⚠️ Spins down after 15 min inactivity
- ⚠️ 512 MB RAM
- ⚠️ Shared CPU

### Starter Plan ($7/month)
- ✅ Always on
- ✅ 512 MB RAM
- ✅ Shared CPU
- ✅ No spin down

### Standard Plan ($25/month)
- ✅ Always on
- ✅ 2 GB RAM
- ✅ 1 CPU
- ✅ Better performance

---

## Security Best Practices

### 1. Environment Variables

✅ Never commit `.env` to git
✅ Use Render's environment variables
✅ Rotate sensitive keys regularly

### 2. HTTPS

✅ Automatic on Render
✅ Free SSL certificates
✅ Forced HTTPS redirect

### 3. Dependencies

```bash
# Regular updates
npm audit
npm audit fix
npm update
```

### 4. Monitoring

- Enable Render notifications
- Monitor error logs
- Set up uptime monitoring (e.g., UptimeRobot)

---

## Alternative Deployment Options

If Render doesn't work for you:

### Vercel
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm install -g netlify-cli
netlify deploy --prod
```

### AWS Amplify
- Connect GitHub repository
- Configure build settings
- Deploy

---

## Support & Resources

### Render Documentation
- [Render Docs](https://render.com/docs)
- [Node.js on Render](https://render.com/docs/deploy-node-express-app)
- [Environment Variables](https://render.com/docs/environment-variables)

### WalrusBox Documentation
- [README.md](./README.md)
- [Quick Start](./QUICK_START.md)
- [Troubleshooting](./CONSOLE_MESSAGES.md)

### Community
- [Render Community](https://community.render.com/)
- [Sui Discord](https://discord.gg/sui)

---

## Deployment Checklist

Before deploying:
- [ ] Code pushed to GitHub
- [ ] `.env` not committed
- [ ] `render.yaml` configured
- [ ] Environment variables ready
- [ ] Build tested locally (`npm run build`)
- [ ] Preview tested locally (`npm run preview`)

After deploying:
- [ ] App loads successfully
- [ ] Wallet connection works
- [ ] File upload works
- [ ] File sharing works
- [ ] All routes accessible
- [ ] HTTPS enabled
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring enabled

---

## Quick Commands Reference

```bash
# Local testing
npm run build          # Build for production
npm run preview        # Test production build locally

# Git commands
git add .
git commit -m "message"
git push origin main

# Deployment
# (Automatic via Render dashboard)

# Logs
# (View in Render dashboard)
```

---

## Success! 🎉

Your WalrusBox app should now be live at:
`https://your-app-name.onrender.com`

Test all features:
1. ✅ Connect wallet
2. ✅ Upload file
3. ✅ Share file
4. ✅ Access shared link
5. ✅ Download file

---

## Need Help?

- Check [Render Status](https://status.render.com/)
- Review [deployment logs](#monitoring--logs)
- Check [troubleshooting section](#troubleshooting)
- Open an issue on GitHub

---

**Happy Deploying! 🚀**
