#!/bin/bash

# WalrusBox Deployment Script for Render
# This script prepares your app for deployment

echo "🚀 WalrusBox Deployment Preparation"
echo "===================================="
echo ""

# Check if git is initialized
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
    echo "✅ Git initialized"
else
    echo "✅ Git repository already initialized"
fi

# Check if .gitignore exists
if [ ! -f .gitignore ]; then
    echo "⚠️  Warning: .gitignore not found"
    echo "Creating .gitignore..."
    cat > .gitignore << EOF
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
dist/
build/

# Environment
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Misc
*.log
.cache/
EOF
    echo "✅ .gitignore created"
fi

# Check if node_modules exists
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Test build
echo ""
echo "🔨 Testing production build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed! Please fix errors before deploying."
    exit 1
fi

# Test preview
echo ""
echo "🔍 Testing preview server..."
echo "Starting preview server for 5 seconds..."
timeout 5 npm run preview &
sleep 6
echo "✅ Preview test complete"

# Git status
echo ""
echo "📊 Git Status:"
git status --short

# Prompt for commit
echo ""
read -p "📝 Enter commit message (or press Enter to skip): " commit_message

if [ ! -z "$commit_message" ]; then
    echo "Adding files to git..."
    git add .
    
    echo "Committing changes..."
    git commit -m "$commit_message"
    
    echo "✅ Changes committed"
    
    # Check if remote exists
    if git remote | grep -q origin; then
        read -p "🚀 Push to GitHub? (y/n): " push_confirm
        if [ "$push_confirm" = "y" ]; then
            echo "Pushing to GitHub..."
            git push origin main || git push origin master
            echo "✅ Pushed to GitHub"
        fi
    else
        echo "⚠️  No remote repository configured"
        echo "Add your GitHub repository:"
        echo "git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git"
        echo "git push -u origin main"
    fi
fi

echo ""
echo "✅ Deployment preparation complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to https://dashboard.render.com/"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repository"
echo "4. Configure as per RENDER_DEPLOYMENT_GUIDE.md"
echo "5. Click 'Create Web Service'"
echo ""
echo "📖 Full guide: RENDER_DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Good luck with your deployment!"
