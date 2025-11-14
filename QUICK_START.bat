@echo off
REM WalrusBox 3D UI Upgrade - Quick Start Script (Windows)
REM This script helps you get started with the 3D UI upgrade

echo.
echo ========================================
echo WalrusBox 3D UI Upgrade - Quick Start
echo ========================================
echo.

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

echo [OK] Node.js version:
node -v
echo.

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo X npm is not installed. Please install npm first.
    pause
    exit /b 1
)

echo [OK] npm version:
npm -v
echo.

REM Install dependencies
echo Installing dependencies...
echo This may take a few minutes...
echo.

call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo [OK] Dependencies installed successfully!
    echo.
) else (
    echo.
    echo X Failed to install dependencies. Please check the error messages above.
    pause
    exit /b 1
)

REM Create backup of App.tsx
if not exist "src\App.tsx.backup" (
    echo Creating backup of App.tsx...
    copy src\App.tsx src\App.tsx.backup >nul
    echo [OK] Backup created: src\App.tsx.backup
    echo.
)

REM Display next steps
echo ========================================
echo Setup Complete!
echo ========================================
echo.
echo Next Steps:
echo ===========
echo.
echo 1. Start the development server:
echo    npm run dev
echo.
echo 2. Open your browser to:
echo    http://localhost:8080
echo.
echo 3. To use the new 3D landing page, update src\App.tsx:
echo    - Import: import Home3D from './pages/Home3D';
echo    - Replace: ^<Route path="/" element={^<Home3D /^>} /^>
echo.
echo 4. Read the documentation:
echo    - 3D_UI_IMPLEMENTATION_SUMMARY.md (Start here!)
echo    - COMPONENT_USAGE_GUIDE.md (Component examples)
echo    - IMPLEMENTATION_CHECKLIST.md (Step-by-step plan)
echo.
echo Documentation Files Created:
echo ============================
echo [OK] 3D_UI_IMPLEMENTATION_SUMMARY.md - Complete overview
echo [OK] FUTURISTIC_3D_UPGRADE_GUIDE.md - Design system guide
echo [OK] IMPLEMENTATION_CHECKLIST.md - Implementation steps
echo [OK] COMPONENT_USAGE_GUIDE.md - Component documentation
echo.
echo New Components Created:
echo =======================
echo [OK] src\components\3d\SplineScene.tsx
echo [OK] src\components\3d\ParticleField.tsx
echo [OK] src\components\animated\AnimatedCard.tsx
echo [OK] src\components\animated\GlowButton.tsx
echo [OK] src\components\effects\GridBackground.tsx
echo [OK] src\pages\Home3D.tsx
echo.
echo Quick Test:
echo ===========
echo Run 'npm run dev' and visit http://localhost:8080
echo The current site should work exactly as before.
echo.
echo To see the new 3D UI, follow step 3 above to update App.tsx
echo.
echo Need Help?
echo ==========
echo Check the documentation files listed above.
echo All components have detailed usage examples.
echo.
echo Happy coding!
echo.
pause
