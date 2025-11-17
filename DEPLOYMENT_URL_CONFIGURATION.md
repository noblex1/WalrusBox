# Deployment URL Configuration

## Overview

The production deployment URL has been configured throughout the application to ensure share links and other features work correctly in production.

## Production URL

**Live Application**: [https://wal-box.vercel.app](https://wal-box.vercel.app)

## Changes Made

### 1. Environment Configuration

#### `.env`
Added production URL configuration:
```env
VITE_APP_URL=https://wal-box.vercel.app
```

#### `.env.example`
Added URL configuration template:
```env
VITE_APP_URL=http://localhost:5173
```

### 2. Share Service Update

**File**: `src/services/share.ts`

Updated `getShareLinkURL` to use environment variable:
```typescript
getShareLinkURL: (token: string): string => {
  const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${baseUrl}/share/${token}`;
}
```

**Benefits**:
- Share links will use the production URL when `VITE_APP_URL` is set
- Falls back to `window.location.origin` for local development
- Ensures consistent share links across environments

### 3. README Updates

Added production URL to:
- Live Demo badge at the top
- Demo section with direct link

## Usage

### Development
```bash
# .env
VITE_APP_URL=http://localhost:5173

npm run dev
```

### Production (Vercel)
```bash
# .env
VITE_APP_URL=https://wal-box.vercel.app

npm run build
```

### Environment Variables in Vercel

Make sure to set the environment variable in Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add: `VITE_APP_URL` = `https://wal-box.vercel.app`
3. Redeploy the application

## Testing Share Links

1. Upload a file in production
2. Generate a share link
3. Verify the link uses `https://wal-box.vercel.app/share/{token}`
4. Test the link in an incognito window

## Notes

- The URL is used primarily for generating shareable links
- Local development will automatically use `localhost:5173` if `VITE_APP_URL` is not set
- The fallback to `window.location.origin` ensures the app works in any environment
- Share links generated in production will always point to the production URL

## Related Files

- `.env` - Production environment configuration
- `.env.example` - Environment template
- `src/services/share.ts` - Share link generation
- `README.md` - Documentation with live demo link
