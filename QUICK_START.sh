#!/bin/bash

# WalrusBox 3D UI Upgrade - Quick Start Script
# This script helps you get started with the 3D UI upgrade

echo "🚀 WalrusBox 3D UI Upgrade - Quick Start"
echo "========================================"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node -v)"
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm version: $(npm -v)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo "This may take a few minutes..."
echo ""

npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
else
    echo ""
    echo "❌ Failed to install dependencies. Please check the error messages above."
    exit 1
fi

# Check if installation was successful
echo "🔍 Verifying installation..."
echo ""

# Check for key dependencies
DEPS=("@splinetool/react-spline" "@react-three/fiber" "framer-motion" "three")
ALL_INSTALLED=true

for dep in "${DEPS[@]}"; do
    if npm list "$dep" &> /dev/null; then
        echo "✅ $dep installed"
    else
        echo "❌ $dep not found"
        ALL_INSTALLED=false
    fi
done

echo ""

if [ "$ALL_INSTALLED" = true ]; then
    echo "✅ All 3D dependencies installed successfully!"
    echo ""
else
    echo "⚠️  Some dependencies may not be installed correctly."
    echo "Please run 'npm install' manually and check for errors."
    echo ""
fi

# Create a backup of App.tsx if it doesn't exist
if [ ! -f "src/App.tsx.backup" ]; then
    echo "💾 Creating backup of App.tsx..."
    cp src/App.tsx src/App.tsx.backup
    echo "✅ Backup created: src/App.tsx.backup"
    echo ""
fi

# Display next steps
echo "🎉 Setup Complete!"
echo ""
echo "📋 Next Steps:"
echo "=============="
echo ""
echo "1. Start the development server:"
echo "   npm run dev"
echo ""
echo "2. Open your browser to:"
echo "   http://localhost:8080"
echo ""
echo "3. To use the new 3D landing page, update src/App.tsx:"
echo "   - Import: import Home3D from './pages/Home3D';"
echo "   - Replace: <Route path=\"/\" element={<Home3D />} />"
echo ""
echo "4. Read the documentation:"
echo "   - 3D_UI_IMPLEMENTATION_SUMMARY.md (Start here!)"
echo "   - COMPONENT_USAGE_GUIDE.md (Component examples)"
echo "   - IMPLEMENTATION_CHECKLIST.md (Step-by-step plan)"
echo ""
echo "📚 Documentation Files Created:"
echo "================================"
echo "✅ 3D_UI_IMPLEMENTATION_SUMMARY.md - Complete overview"
echo "✅ FUTURISTIC_3D_UPGRADE_GUIDE.md - Design system guide"
echo "✅ IMPLEMENTATION_CHECKLIST.md - Implementation steps"
echo "✅ COMPONENT_USAGE_GUIDE.md - Component documentation"
echo ""
echo "🎨 New Components Created:"
echo "=========================="
echo "✅ src/components/3d/SplineScene.tsx"
echo "✅ src/components/3d/ParticleField.tsx"
echo "✅ src/components/animated/AnimatedCard.tsx"
echo "✅ src/components/animated/GlowButton.tsx"
echo "✅ src/components/effects/GridBackground.tsx"
echo "✅ src/pages/Home3D.tsx"
echo ""
echo "⚡ Quick Test:"
echo "============="
echo "Run 'npm run dev' and visit http://localhost:8080"
echo "The current site should work exactly as before."
echo ""
echo "To see the new 3D UI, follow step 3 above to update App.tsx"
echo ""
echo "🆘 Need Help?"
echo "============="
echo "Check the documentation files listed above."
echo "All components have detailed usage examples."
echo ""
echo "Happy coding! 🚀"
echo ""
