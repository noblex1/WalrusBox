# Deployment Checklist for Vercel

## Pre-Deployment

- [x] Fixed duplicate React providers issue
- [x] Added React deduplication in vite.config.ts
- [x] Created vercel.json for SPA routing
- [x] Added production URL to .env
- [x] Updated share service to use environment URL
- [x] Build completes successfully
- [x] No TypeScript errors

## Vercel Dashboard Configuration

### Environment Variables

Add these in Vercel Project Settings → Environment Variables:

```
VITE_APP_URL=https://wal-box.vercel.app
VITE_SUI_NETWORK=testnet
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443
VITE_PACKAGE_ID=0x00628889acf68531d55826be91d54d9518d8c6843cfcb6e7d1bd9a691367cdcd
VITE_REGISTRY_ID=0xa2d83098a4d2af212c311781a172b3d27f75c4ec1718bdb98b69e00eddb33911
VITE_FOLDER_REGISTRY_ID=0x3a13ca2fadfe77dcfa0aa7b5d2f723d8660fff1cc0f72bbdcddc51ac74c85a87
VITE_WALRUS_ENDPOINT=https://publisher.walrus-testnet.walrus.space
VITE_APP_NAME=WalrusBox
VITE_APP_ENV=production
```

### Build Settings

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`
- **Node Version**: 18.x or higher

## Post-Deployment Testing

### 1. Basic Functionality
- [ ] Visit https://wal-box.vercel.app
- [ ] Page loads without blank screen
- [ ] No console errors (especially React errors)
- [ ] Home page displays correctly

### 2. Navigation
- [ ] Click "Launch App" button
- [ ] Dashboard loads after wallet connection
- [ ] Navigate to Analytics page
- [ ] All routes work correctly
- [ ] Browser back/forward buttons work

### 3. Wallet Integration
- [ ] Connect wallet button appears
- [ ] Wallet connection modal opens
- [ ] Can connect with Sui wallet
- [ ] Wallet address displays correctly
- [ ] Can disconnect wallet

### 4. File Operations
- [ ] Can upload files
- [ ] Files appear in dashboard
- [ ] Can view file details
- [ ] Can download files
- [ ] Can delete files

### 5. Analytics Dashboard
- [ ] Analytics page loads
- [ ] Charts render correctly
- [ ] Data displays properly
- [ ] Export button works
- [ ] Refresh button works

### 6. Share Functionality
- [ ] Can generate share links
- [ ] Share links use correct URL (https://wal-box.vercel.app/share/...)
- [ ] Share links work in incognito mode
- [ ] QR codes generate correctly

### 7. Performance
- [ ] Page loads in < 3 seconds
- [ ] No layout shifts
- [ ] Smooth animations
- [ ] Responsive on mobile

### 8. Theme
- [ ] Dark mode works
- [ ] Light mode works
- [ ] Theme persists on refresh

## Common Issues & Solutions

### Issue: Blank Page
**Solution**: Check browser console for errors. If React duplicate instance error, verify providers are only in main.tsx

### Issue: 404 on Refresh
**Solution**: Ensure vercel.json has proper rewrites configuration

### Issue: Share Links Wrong URL
**Solution**: Verify VITE_APP_URL is set in Vercel environment variables

### Issue: Wallet Not Connecting
**Solution**: Check that @mysten/dapp-kit CSS is imported and wallet extensions are installed

### Issue: Build Fails
**Solution**: Check Node version (should be 18+) and ensure all dependencies are installed

## Rollback Plan

If deployment fails:
1. Revert to previous commit
2. Check Vercel deployment logs
3. Fix issues locally
4. Test with `npm run build && npm run preview`
5. Redeploy

## Monitoring

After deployment, monitor:
- Vercel Analytics for traffic
- Browser console for errors
- User feedback
- Performance metrics

## Success Criteria

✅ Application loads without errors
✅ All features work as expected
✅ Performance is acceptable
✅ No console errors
✅ Share links work correctly
✅ Analytics dashboard displays data

## Next Steps

After successful deployment:
1. Test all features thoroughly
2. Share link with team/users
3. Monitor for issues
4. Gather feedback
5. Plan next iteration

---

**Deployment URL**: https://wal-box.vercel.app
**Last Updated**: 2025-01-17
**Status**: Ready for Deployment ✅
