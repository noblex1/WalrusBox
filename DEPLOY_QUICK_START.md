# 🚀 Deploy to Render - Quick Start

## 5-Minute Deployment

### Step 1: Prepare (1 minute)

```bash
# Run deployment preparation script
./deploy.sh

# Or manually:
npm install
npm run build
git add .
git commit -m "Ready for deployment"
git push origin main
```

### Step 2: Deploy on Render (3 minutes)

1. **Go to**: https://dashboard.render.com/
2. **Click**: "New +" → "Web Service"
3. **Connect**: Your GitHub repository
4. **Configure**:
   - Name: `walrusbox`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run start`
5. **Add Environment Variables**:
   ```
   NODE_VERSION = 18.17.0
   VITE_SUI_NETWORK = testnet
   VITE_SUI_RPC_URL = https://fullnode.testnet.sui.io:443
   VITE_PACKAGE_ID = 0x386cf5f10e6dc8639fcc494123439e333e738280a8f249b638cb7b84328a8885
   VITE_REGISTRY_ID = 0x97bcf633e416c1bed96725d3872d255a4481686a66d38a589c42220aae16f366
   VITE_WALRUS_ENDPOINT = https://walrus-api.example.com
   ```
6. **Click**: "Create Web Service"

### Step 3: Access (1 minute)

Wait 2-5 minutes for deployment, then access at:
`https://your-app-name.onrender.com`

---

## Environment Variables (Copy-Paste Ready)

```
NODE_VERSION
18.17.0

VITE_SUI_NETWORK
testnet

VITE_SUI_RPC_URL
https://fullnode.testnet.sui.io:443

VITE_PACKAGE_ID
0x386cf5f10e6dc8639fcc494123439e333e738280a8f249b638cb7b84328a8885

VITE_REGISTRY_ID
0x97bcf633e416c1bed96725d3872d255a4481686a66d38a589c42220aae16f366

VITE_WALRUS_ENDPOINT
https://walrus-api.example.com
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Build fails | Check Node version = 18.17.0 |
| App won't load | Verify environment variables |
| 404 on routes | Ensure `_redirects` file exists |
| Wallet won't connect | HTTPS is automatic on Render |

---

## Quick Commands

```bash
# Test locally
npm run build && npm run preview

# Deploy
git push origin main  # Auto-deploys if enabled

# View logs
# Go to Render dashboard → Your service → Logs
```

---

## Files Created for Deployment

- ✅ `render.yaml` - Render configuration
- ✅ `_redirects` - SPA routing fix
- ✅ `vite.config.ts` - Updated with preview config
- ✅ `package.json` - Added start script
- ✅ `deploy.sh` - Deployment helper script
- ✅ `RENDER_DEPLOYMENT_GUIDE.md` - Full guide
- ✅ `DEPLOY_QUICK_START.md` - This file

---

## Success Checklist

After deployment:
- [ ] App loads at Render URL
- [ ] Wallet connects successfully
- [ ] File upload works
- [ ] File sharing works
- [ ] All routes accessible

---

**Need detailed help?** See [RENDER_DEPLOYMENT_GUIDE.md](./RENDER_DEPLOYMENT_GUIDE.md)

**Ready to deploy?** Run `./deploy.sh` now!
