#!/bin/bash

# Force Vercel Redeploy Script
# This script forces a clean rebuild on Vercel

echo "🚀 Force Vercel Redeploy Script"
echo "================================"
echo ""

# Step 1: Clean local build
echo "📦 Step 1: Cleaning local build..."
rm -rf dist node_modules/.vite
echo "✅ Local build cleaned"
echo ""

# Step 2: Verify build works locally
echo "🔨 Step 2: Building locally to verify..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Local build successful"
else
    echo "❌ Local build failed! Fix errors before deploying."
    exit 1
fi
echo ""

# Step 3: Check git status
echo "📝 Step 3: Checking git status..."
if [[ -n $(git status -s) ]]; then
    echo "⚠️  You have uncommitted changes:"
    git status -s
    echo ""
    read -p "Do you want to commit these changes? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        read -p "Enter commit message: " commit_msg
        git commit -m "$commit_msg"
        echo "✅ Changes committed"
    fi
else
    echo "✅ Working tree clean"
fi
echo ""

# Step 4: Force rebuild with empty commit
echo "🔄 Step 4: Creating empty commit to force Vercel rebuild..."
git commit --allow-empty -m "Force Vercel rebuild - clear cache and redeploy"
echo "✅ Empty commit created"
echo ""

# Step 5: Push to trigger deployment
echo "⬆️  Step 5: Pushing to origin..."
git push origin main
if [ $? -eq 0 ]; then
    echo "✅ Pushed to origin/main"
else
    echo "❌ Push failed! Check your git configuration."
    exit 1
fi
echo ""

echo "🎉 Done!"
echo ""
echo "Next steps:"
echo "1. Go to https://vercel.com/dashboard"
echo "2. Watch the deployment progress"
echo "3. Once deployed, visit https://walbox.vercel.app"
echo "4. Hard refresh (Ctrl+Shift+R) to clear browser cache"
echo ""
echo "If the page is still blank:"
echo "- Check Vercel build logs for errors"
echo "- Verify environment variables are set"
echo "- Clear Vercel build cache in dashboard"
echo "- See VERCEL_BLANK_PAGE_TROUBLESHOOTING.md for more help"
