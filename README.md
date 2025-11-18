# WalBox

<div align="center">

![WalBox Logo](https://img.shields.io/badge/WalBox-Decentralized%20Storage-0ea5e9?style=for-the-badge)

**A Modern, Secure, and Decentralized File Storage Platform Built on Sui Blockchain**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-wal--box.vercel.app-success?style=flat-square&logo=vercel)](https://wal-box.vercel.app)
[![Sui Network](https://img.shields.io/badge/Sui-Testnet-4da2ff?style=flat-square)](https://sui.io)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb?style=flat-square&logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.3-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Seal Integration](https://img.shields.io/badge/Seal-30%25-orange?style=flat-square)](https://docs.walrus.site/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) • [Seal Integration](#-seal-integration-advanced-encryption) • [Demo](#-demo) • [Installation](#-installation) • [Usage](#-usage) • [Architecture](#-architecture) • [Documentation](#-documentation)

> **🚧 Active Development**: Currently integrating Mysten Labs' Seal for advanced encryption and chunking capabilities. Core encryption and chunking services are complete. Storage integration in progress.

</div>

---

## 📖 Overview

WalBox is a **Web3-enabled file management system** that combines the security of client-side encryption with the transparency and accessibility of blockchain technology. Built on the Sui blockchain, it enables users to securely store, manage, and share encrypted files in a fully decentralized environment.

### Why WalBox?

- 🔐 **End-to-End Encryption** - Files are encrypted locally before upload using AES-256-GCM
- 🌐 **Decentralized Storage** - Leverages Walrus (Sui's storage solution) with IndexedDB fallback
- ⛓️ **Blockchain Metadata** - File ownership and access control stored immutably on Sui
- 💼 **Multi-Wallet Support** - Compatible with Sui Wallet, Nautilus, Slush, Suiet, and more
- 🔗 **Secure Sharing** - Wallet-restricted links with QR codes and expiration control
- 🎨 **Modern UI/UX** - Beautiful, responsive interface with glassmorphism design
- 🔄 **Auto-Fallback** - Seamless degradation to local storage when needed
- 🚀 **Production Ready** - 15+ features, comprehensive testing, full documentation
- 🔒 **Seal Integration (In Progress)** - Advanced encryption with chunking for large files

### Feature Comparison

| Feature | WalBox | Traditional Cloud | Other Web3 |
|---------|-----------|-------------------|------------|
| End-to-End Encryption | ✅ AES-256-GCM | ❌ Server-side | ⚠️ Varies |
| Decentralized Storage | ✅ Walrus | ❌ Centralized | ✅ IPFS/Arweave |
| Blockchain Metadata | ✅ Sui | ❌ Database | ✅ Various |
| Wallet-Based Access | ✅ Built-in | ❌ Email/Password | ⚠️ Limited |
| Share Links | ✅ With restrictions | ✅ Basic | ⚠️ Limited |
| QR Code Sharing | ✅ Yes | ❌ No | ❌ No |
| File Preview | ✅ Yes | ✅ Yes | ⚠️ Limited |
| Search & Filter | ✅ Yes | ✅ Yes | ⚠️ Limited |
| Dark Theme | ✅ Yes | ⚠️ Varies | ⚠️ Varies |
| No Vendor Lock-in | ✅ Yes | ❌ No | ✅ Yes |
| Privacy | ✅ Full | ⚠️ Limited | ✅ Good |

---

## ✨ Features

### Core Functionality

- **🔐 Client-Side Encryption**
  - AES-256-GCM encryption
  - Keys never leave your browser
  - Secure against network interception

- **💼 Wallet Integration**
  - Official Mysten Labs dApp Kit
  - Auto-connect functionality
  - Multiple wallet support
  - Transaction signing

- **📁 File Management**
  - Upload with drag & drop
  - Real-time progress tracking
  - File list with metadata
  - Download and delete operations

- **🔗 Blockchain Integration**
  - On-chain file metadata
  - Ownership verification
  - Access control lists
  - Immutable audit trail

- **🎨 User Experience**
  - Responsive design (mobile, tablet, desktop)
  - Dark theme with glassmorphism
  - Toast notifications
  - Loading states and error handling

### Advanced Features

- **🔗 Secure File Sharing**
  - Generate shareable links with QR codes
  - Wallet-based access restrictions
  - Custom expiration times (1-720 hours)
  - Download limits and access tracking
  - Revoke links anytime

- **🔐 Access Control**
  - Public/private file visibility
  - Wallet address restrictions
  - Granular permission management
  - Address-based access lists
  - Owner-only operations

- **📊 File Management**
  - Search and filter files
  - File preview (images, videos, audio)
  - Favorites and recent files
  - Export file lists
  - Keyboard shortcuts

- **🎨 User Experience**
  - Dark/light theme toggle
  - Responsive design (mobile, tablet, desktop)
  - Glass-morphism UI
  - Toast notifications
  - Loading states and error handling

- **💾 Storage Flexibility**
  - Walrus decentralized storage
  - IndexedDB local fallback
  - Automatic mode detection
  - Seamless switching

- **🔒 Seal Integration (In Development)**
  - Advanced encryption service with AES-256-GCM
  - File chunking for large file support (up to 100MB+)
  - Chunk-level integrity verification with SHA-256 hashes
  - Wallet-based key derivation
  - Configurable chunk sizes with optimization
  - Retry logic with exponential backoff
  - Progress tracking for chunked uploads

- **👨‍💻 Developer Experience**
  - Full TypeScript support
  - Comprehensive error handling
  - Detailed console logging
  - Hot module replacement

---

## 🚀 Demo

### Live Application

🌐 **Production**: [https://wal-box.vercel.app](https://wal-box.vercel.app)

```bash
# Development server
npm run dev
# Access at: http://localhost:5173
```

### Feature Showcase

**🔐 Secure File Upload**
```
Drag & Drop → Encrypt (AES-256) → Upload to Walrus → 
Store Metadata on Sui → Done!
```

**🔗 Smart Sharing**
```
Select File → Add Wallet Addresses → Set Expiration → 
Generate Link → Share via QR or URL
```

**🎨 Modern Interface**
```
Glass-morphism Design → Dark/Light Theme → 
Responsive Layout → Smooth Animations
```

**🔍 Advanced Search**
```
Search by Name → Filter by Type → Sort by Date → 
View Favorites → Export Results
```

### Screenshots

**Dashboard**
- Modern file management interface
- Real-time upload progress
- File list with search and filters
- Quick actions (view, share, delete)

**Share Modal**
- Wallet address input with validation
- Expiration and access limit controls
- QR code generation
- Active links management

**Share Page**
- Public file access page
- Wallet connection prompt
- File preview and details
- Secure download

**Wallet Connection**
- One-click wallet integration
- Multiple wallet support (Sui, Nautilus, Slush, Suiet)
- Auto-reconnect functionality
- Clear connection status

---

## 🛠️ Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 18.3.1 | UI framework |
| TypeScript | 5.8.3 | Type safety |
| Vite | 5.4.19 | Build tool |
| Tailwind CSS | 3.4.17 | Styling |
| shadcn/ui | Latest | Component library |
| React Router | 6.30.1 | Routing |
| TanStack Query | 5.83.0 | State management |

### Blockchain

| Technology | Version | Purpose |
|------------|---------|---------|
| @mysten/dapp-kit | 0.13.2 | Wallet integration |
| @mysten/sui | 1.44.0 | Sui SDK |
| Sui Move | 2024 | Smart contracts |

### Storage & Security

| Technology | Purpose |
|------------|---------|
| Web Crypto API | AES-256-GCM encryption |
| IndexedDB | Local storage fallback & key management |
| Walrus | Decentralized storage |
| SessionStorage | Encryption key management |
| @mysten/seal | Advanced encryption & chunking (in development) |

---

## 📦 Installation

### Prerequisites

- **Node.js** 16+ or **Bun**
- **npm**, **yarn**, or **bun** package manager
- **Sui Wallet** extension (Sui Wallet, Nautilus, Slush, or Suiet)
- **Git** for cloning the repository

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd walbox

# Install dependencies
npm install
# or
bun install

# Configure environment variables
cp .env.example .env
# Edit .env with your configuration

# Start development server
npm run dev
# or
bun dev
```

### Environment Configuration

Create a `.env` file in the project root:

```env
# Sui Network Configuration
VITE_SUI_NETWORK=testnet
VITE_SUI_RPC_URL=https://fullnode.testnet.sui.io:443

# Smart Contract Configuration
VITE_PACKAGE_ID=0x386cf5f10e6dc8639fcc494123439e333e738280a8f249b638cb7b84328a8885
VITE_REGISTRY_ID=0x97bcf633e416c1bed96725d3872d255a4481686a66d38a589c42220aae16f366

# Walrus Storage Configuration
# Mock mode (for local testing):
VITE_WALRUS_ENDPOINT=https://walrus-api.example.com
# Production mode (when ready):
# VITE_WALRUS_ENDPOINT=https://publisher.walrus-testnet.walrus.space
VITE_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space

# Seal Configuration (Optional - for advanced encryption)
VITE_SEAL_ENABLED=false
VITE_SEAL_CHUNK_SIZE=10485760
VITE_SEAL_MAX_FILE_SIZE=104857600
VITE_ENCRYPTION_ALGORITHM=AES-GCM
VITE_ENCRYPTION_KEY_SIZE=256
```

---

## 🎮 Usage

### 1. Install Wallet Extension

Choose one of the supported wallets:

- [Sui Wallet](https://chrome.google.com/webstore) (Recommended)
- [Nautilus Wallet](https://nautilus.tech/)
- [Slush Wallet](https://slush.app/)
- [Suiet Wallet](https://suiet.app/)

### 2. Get Testnet SUI

1. Open your wallet
2. Switch to **Testnet** network
3. Visit [Sui Testnet Faucet](https://testnet-faucet.sui.io/)
4. Request test tokens

### 3. Connect Wallet

1. Open the application
2. Click **"Connect Wallet"** button
3. Select your wallet from the modal
4. Approve the connection
5. Your address will be displayed

### 4. Upload Files

1. Navigate to **Dashboard**
2. Click **"Upload"** tab
3. Drag & drop files or click to browse
4. Click **"Upload & Encrypt File"**
5. Approve the transaction in your wallet
6. Wait for confirmation

### 5. Manage Files

- **View Files**: Click **"My Files"** tab
- **Download**: Click on a file to download
- **Delete**: Use the delete button
- **Share**: Generate secure share links with wallet restrictions

### 6. Share Files Securely

1. Click the **Share** button next to any file
2. **Optional**: Add wallet addresses to restrict access
   - Enter Sui wallet address (0x...)
   - Click + or press Enter
   - Add multiple addresses
3. Set **expiration time** (default: 24 hours)
4. Set **max downloads** (optional)
5. Click **"Generate Share Link"**
6. **Copy link** or show **QR code**
7. Share with recipients

### 7. Access Shared Files

1. Open the share link
2. If wallet-restricted, click **"Connect Wallet"**
3. Approve connection
4. Download the file if authorized

---

## 🔒 Seal Integration (Advanced Encryption)

### Overview

WalBox is integrating **Mysten Labs' Seal** for advanced encryption capabilities, enabling secure storage of large files with chunking support. This integration provides enterprise-grade encryption with the following benefits:

### Key Features

- **🔐 Enhanced Encryption**
  - AES-256-GCM encryption using Web Crypto API
  - Wallet-based key derivation for seamless UX
  - Secure key management with IndexedDB storage
  - Key export/import for backup and recovery

- **📦 File Chunking**
  - Split large files into manageable chunks (default: 10MB)
  - Support for files up to 100MB+ (configurable)
  - Intelligent chunk size optimization
  - Parallel chunk processing (planned)

- **✅ Integrity Verification**
  - SHA-256 hash generation for each chunk
  - Content hash verification on download
  - Chunk-level integrity checks
  - Automatic corruption detection

- **🔄 Reliability**
  - Retry logic with exponential backoff
  - RPC endpoint fallback on failure
  - Partial upload recovery (planned)
  - Detailed error handling and logging

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Seal Integration Layer              │
│  ┌────────────────────────────────────────────┐ │
│  │  sealConfig.ts - Configuration & Validation│ │
│  │  sealClient.ts - Walrus Client Wrapper    │ │
│  │  sealEncryption.ts - Encryption Service   │ │
│  │  sealChunking.ts - File Chunking Service  │ │
│  │  sealStorage.ts - Upload/Download (WIP)   │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
              │                  │
              ▼                  ▼
    ┌──────────────────┐  ┌──────────────┐
    │  Sui Blockchain  │  │   Walrus     │
    │  - Metadata      │  │  - Encrypted │
    │  - Access Control│  │    Chunks    │
    └──────────────────┘  └──────────────┘
```

### Implementation Status

**Phase 1: Core Services (Completed)**
- ✅ Configuration module with environment validation
- ✅ Seal client initialization with RPC fallback
- ✅ Encryption service with key management
- ✅ Chunking service with metadata generation
- ✅ Type definitions and error handling

**Phase 2: Storage Integration (In Progress)**
- 🔄 Upload orchestration with progress tracking
- 🔄 Download and reassembly logic
- 🔄 Retry mechanisms and error recovery
- 🔄 Integration with existing Walrus service

**Phase 3: UI Integration (Planned)**
- 📋 Encryption toggle in upload interface
- 📋 Encryption status indicators
- 📋 Key management UI
- 📋 Migration tools for existing files

**Phase 4: Testing & Optimization (Planned)**
- 📋 Performance optimization
- 📋 Comprehensive testing suite
- 📋 Security audit
- 📋 Documentation

### Configuration

Enable Seal in your `.env` file:

```env
# Enable Seal integration
VITE_SEAL_ENABLED=true

# Chunk configuration
VITE_SEAL_CHUNK_SIZE=10485760      # 10MB chunks
VITE_SEAL_MAX_FILE_SIZE=104857600  # 100MB max file size

# Encryption settings
VITE_ENCRYPTION_ALGORITHM=AES-GCM
VITE_ENCRYPTION_KEY_SIZE=256

# Walrus endpoints
VITE_WALRUS_PUBLISHER_URL=https://publisher.walrus-testnet.walrus.space
VITE_WALRUS_AGGREGATOR_URL=https://aggregator.walrus-testnet.walrus.space
```

### Technical Details

**Encryption Flow:**
```
File → Encrypt (AES-256-GCM) → Chunk (10MB) → 
Generate Hashes → Upload to Walrus → Store Metadata
```

**Download Flow:**
```
Retrieve Metadata → Download Chunks → Verify Hashes → 
Reassemble → Decrypt → Return File
```

**Key Management:**
- Keys derived from wallet signatures (deterministic)
- Secure storage in IndexedDB (encrypted)
- Export/import for backup
- Automatic key rotation (planned)

### Security Considerations

- All encryption happens client-side
- Keys never transmitted to servers
- Chunk-level integrity verification
- Wallet-based key derivation for UX
- Secure memory cleanup after operations

### Documentation

- [Seal Integration Spec](./.kiro/specs/seal-integration/requirements.md) - Requirements
- [Design Document](./.kiro/specs/seal-integration/design.md) - Architecture
- [Implementation Tasks](./.kiro/specs/seal-integration/tasks.md) - Progress tracking

---

## 🔗 File Sharing Features

### Secure Link Sharing

WalBox provides a comprehensive file sharing system with advanced security features:

#### Key Features

- **🔐 Wallet-Based Access Control**
  - Restrict files to specific Sui wallet addresses
  - Add multiple authorized wallets
  - Case-insensitive address matching
  - Automatic wallet verification

- **⏰ Expiration Control**
  - Set custom expiration (1-720 hours)
  - Default: 24 hours
  - Automatic link cleanup
  - Time-based access control

- **📊 Access Tracking**
  - View access count per link
  - Set maximum download limits
  - Track remaining accesses
  - Monitor link usage

- **📱 QR Code Generation**
  - Generate QR codes for any link
  - Easy mobile sharing
  - High error correction
  - Instant scanning

- **🔒 Link Management**
  - View all active links
  - Revoke links instantly
  - Multiple links per file
  - Link statistics dashboard

#### How It Works

**Creating a Share Link:**

1. Click Share button on any file
2. (Optional) Add wallet addresses for restrictions
3. Set expiration time and download limits
4. Generate secure link with 256-bit token
5. Copy link or show QR code

**Accessing a Shared File:**

1. Recipient opens the share link
2. If wallet-restricted, connects wallet
3. System verifies authorization
4. Download file if authorized

#### Security Features

- **256-bit cryptographic tokens** - Virtually impossible to guess
- **Wallet verification** - Only authorized addresses can access
- **Expiration enforcement** - Links automatically expire
- **Access limits** - Control number of downloads
- **Revocation** - Instantly invalidate links
- **No bypass** - All validation enforced

#### Use Cases

- **Team Collaboration**: Share with specific team members
- **Client Deliverables**: Secure file delivery to clients
- **NFT Holder Benefits**: Exclusive content for token holders
- **Temporary Sharing**: Time-limited file access
- **Controlled Distribution**: Limited download counts

#### Documentation

- [File Sharing Guide](./FILE_SHARING_GUIDE.md) - Complete guide
- [Quick Start Sharing](./QUICK_START_SHARING.md) - 30-second reference
- [Wallet-Restricted Sharing](./WALLET_RESTRICTED_SHARING.md) - Access control
- [Sharing Test Guide](./SHARING_TEST_GUIDE.md) - Testing procedures

---

## 🏗️ Architecture

### System Overview

```
┌─────────────────────────────────────────────────┐
│                  User Browser                    │
│  ┌────────────────────────────────────────────┐ │
│  │         React Frontend (Vite)              │ │
│  │  - Wallet Integration (dApp Kit)           │ │
│  │  - File Upload UI                          │ │
│  │  - Encryption Service (AES-256)            │ │
│  └──────────┬──────────────────┬──────────────┘ │
│             │                  │                 │
└─────────────┼──────────────────┼─────────────────┘
              │                  │
              ▼                  ▼
    ┌──────────────────┐  ┌──────────────┐
    │  Sui Blockchain  │  │   Storage    │
    │  - FileRegistry  │  │  - Walrus    │
    │  - FileObject    │  │  - IndexedDB │
    │  - Access Control│  │  (Fallback)  │
    └──────────────────┘  └──────────────┘
```

### Data Flow

**Upload Flow:**
```
File Selection → Encryption (AES-256) → Storage Upload → 
Blockchain Transaction → UI Update → Success
```

**Download Flow:**
```
File Selection → Blockchain Verification → Storage Download → 
Decryption → File Download → Success
```

### Smart Contract

**Location:** `contracts/sources/walbox.move`

**Key Components:**

- **FileObject**: Stores file metadata
  - `file_id`: Unique identifier
  - `walrus_object_hash`: Storage reference
  - `owner`: File owner address
  - `visibility`: Public/private flag
  - `allowed_addresses`: Access control list

- **FileRegistry**: Shared registry
  - Maps file IDs to FileObject IDs
  - Enables file discovery
  - Maintains ownership records

**Functions:**

- `create_file`: Create new file metadata
- `set_visibility`: Update file visibility
- `add_allowed_address`: Grant access
- `remove_allowed_address`: Revoke access
- `verify_access`: Check permissions

---

## 📂 Project Structure

```
walbox/
├── contracts/                 # Sui Move smart contracts
│   ├── sources/
│   │   └── walbox.move    # Main contract
│   ├── Move.toml             # Contract configuration
│   └── README.md             # Contract documentation
│
├── src/
│   ├── components/           # React components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── FileUploadArea.tsx
│   │   ├── FileListTable.tsx
│   │   ├── WalletConnectButton.tsx
│   │   ├── StorageModeBanner.tsx
│   │   ├── ShareModal.tsx   # File sharing modal
│   │   ├── SearchBar.tsx    # File search
│   │   ├── ThemeToggle.tsx  # Dark/light theme
│   │   ├── FileIcon.tsx     # File type icons
│   │   └── FilePreviewModal.tsx
│   │
│   ├── pages/               # Page components
│   │   ├── Home.tsx
│   │   ├── Dashboard.tsx
│   │   ├── FileView.tsx
│   │   ├── SharePage.tsx    # Public share page
│   │   └── NotFound.tsx
│   │
│   ├── services/            # Business logic
│   │   ├── encryption.ts   # AES-256 encryption
│   │   ├── storage.ts      # Walrus/IndexedDB
│   │   ├── files.ts        # Blockchain integration
│   │   ├── localFiles.ts   # Local file metadata
│   │   ├── share.ts        # Share link management
│   │   ├── preview.ts      # File preview
│   │   ├── favorites.ts    # Favorites & recent
│   │   ├── export.ts       # Export functionality
│   │   ├── slushHelper.ts  # Wallet detection
│   │   └── seal/           # Seal integration (in development)
│   │       ├── sealTypes.ts      # Type definitions
│   │       ├── sealConfig.ts     # Configuration & validation
│   │       ├── sealClient.ts     # Walrus client wrapper
│   │       ├── sealEncryption.ts # Advanced encryption
│   │       ├── sealChunking.ts   # File chunking service
│   │       └── sealStorage.ts    # Storage orchestration (planned)
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useWallet.ts   # Wallet integration
│   │   ├── useTheme.ts    # Theme management
│   │   ├── useFileFilter.ts # File filtering
│   │   ├── useKeyboardShortcuts.ts
│   │   └── use-toast.ts   # Notifications
│   │
│   ├── lib/                # Utility functions
│   ├── App.tsx             # Root component
│   └── main.tsx            # Entry point
│
├── .kiro/                  # Kiro IDE specs
│   └── specs/
│       └── seal-integration/  # Seal integration spec
│           ├── requirements.md
│           ├── design.md
│           └── tasks.md
│
├── public/                 # Static assets
├── .env                    # Environment variables
├── .env.example           # Environment template
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tailwind.config.ts     # Tailwind configuration
└── README.md              # This file
```

---

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start dev server with hot reload
npm run build            # Build for production
npm run build:dev        # Build for development
npm run preview          # Preview production build
npm run lint             # Run ESLint

# Smart Contract
cd contracts
sui move build           # Build contract
sui move test            # Run tests
sui client publish       # Deploy to network
```

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Make Changes**
   - Edit files in `src/`
   - Hot reload updates automatically

3. **Test Changes**
   - Upload files
   - Check console logs
   - Verify transactions

4. **Build for Production**
   ```bash
   npm run build
   ```

### Code Quality

- **TypeScript**: Full type safety
- **ESLint**: Code quality checks
- **Prettier**: Code formatting (via IDE)
- **Git Hooks**: Pre-commit checks (optional)

---

## 🧪 Testing

### Manual Testing

See [TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md) for comprehensive testing guide.

**Quick Test:**

1. Connect wallet
2. Upload a file
3. Verify in list
4. Download file
5. Delete file

### Browser Compatibility

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | ✅ Fully supported |
| Firefox | 88+ | ✅ Fully supported |
| Safari | 14+ | ✅ Supported |
| Edge | 90+ | ✅ Fully supported |

### Network Requirements

- **Testnet**: For development and testing
- **Mainnet**: For production deployment
- **HTTPS**: Required for Web Crypto API (encryption)
- **Localhost**: Works without HTTPS

---

## 📚 Documentation

### User Guides

- [Quick Start Guide](./QUICK_START.md) - Get started in 5 minutes
- [File Sharing Guide](./FILE_SHARING_GUIDE.md) - Complete sharing guide
- [Quick Start Sharing](./QUICK_START_SHARING.md) - 30-second reference
- [Wallet-Restricted Sharing](./WALLET_RESTRICTED_SHARING.md) - Access control
- [Testing Checklist](./TESTING_CHECKLIST.md) - 29-point test guide
- [Wallet Setup](./WALLET_CONNECTION_SUMMARY.md) - Wallet configuration

### Developer Guides

- [Wallet Integration](./WALLET_CONNECTION_AUDIT.md) - Technical audit
- [Walrus Storage](./WALRUS_STORAGE_GUIDE.md) - Storage implementation
- [Smart Contract](./contracts/README.md) - Contract documentation
- [BCS Serialization](./BCS_SERIALIZATION_FIX.md) - Transaction encoding
- [Sharing Implementation](./SHARING_WITH_WALLET_COMPLETE.md) - Technical docs
- [Phase 1 Features](./PHASE1_COMPLETE.md) - Feature implementation

### Technical Documentation

- [System Status](./SYSTEM_STATUS.md) - System health report
- [Architecture](./FINAL_REPORT.md) - Complete system overview
- [API Reference](./WALRUS_API_IMPLEMENTATION.md) - Walrus API guide
- [Console Messages](./CONSOLE_MESSAGES.md) - Debug guide
- [Integration Guide](./INTEGRATION_GUIDE.md) - Integration steps

---

## 🔐 Security

### Encryption

- **Algorithm**: AES-256-GCM
- **Key Generation**: Web Crypto API
- **Key Storage**: SessionStorage (client-side only)
- **IV**: Random 12-byte initialization vector

### Best Practices

1. **Never expose private keys**
   - All keys stored client-side
   - No server-side key storage
   - Keys cleared on session end

2. **Verify transactions**
   - Always review transaction details
   - Check gas costs
   - Verify recipient addresses

3. **Use HTTPS in production**
   - Required for Web Crypto API
   - Protects against MITM attacks
   - Ensures secure connections

4. **Regular audits**
   - Review smart contract code
   - Monitor transaction patterns
   - Update dependencies regularly

### Security Considerations

- Files encrypted before upload
- Blockchain provides immutable audit trail
- Access control enforced on-chain
- No centralized point of failure

---

## 🚀 Deployment

### Prerequisites

- Domain with HTTPS
- Sui wallet with SUI tokens
- Deployed smart contract
- Configured environment variables

### Build for Production

```bash
# Build optimized bundle
npm run build

# Output in dist/ directory
# Deploy to your hosting provider
```

### Hosting Options

- **Vercel**: Recommended for React apps
- **Netlify**: Easy deployment
- **AWS S3 + CloudFront**: Scalable solution
- **IPFS**: Decentralized hosting

### Post-Deployment

1. Verify HTTPS is enabled
2. Test wallet connection
3. Upload test file
4. Monitor gas costs
5. Set up analytics

---

## 🤝 Contributing

We welcome contributions! Please follow these guidelines:

### How to Contribute

1. **Fork the repository**
2. **Create a feature branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Run tests and linting**
   ```bash
   npm run lint
   ```
5. **Commit your changes**
   ```bash
   git commit -m 'Add amazing feature'
   ```
6. **Push to your branch**
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Standards

- Follow TypeScript best practices
- Use existing component patterns
- Add comments for complex logic
- Update documentation as needed
- Ensure all tests pass

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

### Built With

- [Sui Blockchain](https://sui.io/) - Layer 1 blockchain
- [Mysten Labs](https://mystenlabs.com/) - Sui SDK and tools
- [Walrus](https://docs.walrus.site/) - Decentralized storage
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework

### Special Thanks

- Sui Foundation for blockchain infrastructure
- Mysten Labs for excellent developer tools
- Open source community for inspiration

---

## 📞 Support

### Getting Help

- **Documentation**: Check the [docs](./QUICK_START.md)
- **Issues**: Open a [GitHub issue](https://github.com/your-repo/issues)
- **Discord**: Join the [Sui Discord](https://discord.gg/sui)
- **Twitter**: Follow [@SuiNetwork](https://twitter.com/SuiNetwork)

### Common Issues

See [Troubleshooting Guide](./ENCRYPTION_FIX_COMPLETE.md#troubleshooting) for solutions to common problems.

---

## 🗺️ Roadmap

### Current Version (v1.0)

- ✅ Wallet integration (multiple wallets)
- ✅ File upload/download with progress
- ✅ Client-side AES-256-GCM encryption
- ✅ Blockchain metadata storage
- ✅ Access control and permissions
- ✅ **Secure file sharing with links**
- ✅ **Wallet-based access restrictions**
- ✅ **QR code generation**
- ✅ **File search and filtering**
- ✅ **File preview (images, videos, audio)**
- ✅ **Favorites and recent files**
- ✅ **Dark/light theme**
- ✅ **Keyboard shortcuts**
- ✅ **Export functionality**

### Phase 1.5 - Seal Integration (In Progress)

**Completed:**
- ✅ Seal package installation and configuration
- ✅ Type definitions and interfaces
- ✅ Configuration module with validation
- ✅ Seal client service with RPC fallback
- ✅ Advanced encryption service (AES-256-GCM)
- ✅ Key management (generation, export, import)
- ✅ Wallet-based key derivation
- ✅ File chunking service
- ✅ Chunk metadata generation
- ✅ Chunk integrity verification (SHA-256)
- ✅ Chunk size optimization

**In Development:**
- 🔄 Seal storage service (upload/download orchestration)
- 🔄 Retry logic with exponential backoff
- 🔄 Progress tracking for chunked uploads
- 🔄 Frontend encryption toggle UI
- 🔄 Encryption status indicators
- 🔄 Key management UI
- 🔄 Data integrity verification UI
- 🔄 Backward compatibility layer
- 🔄 Migration tools for existing files

**Next Steps:**
- 📋 Performance optimization
- 📋 Comprehensive testing
- 📋 User & developer documentation
- 📋 Security audit

### Phase 2 (Planned)

- 🔄 Password-protected share links
- 🔄 Email notifications on access
- 🔄 Folder organization
- 🔄 File versioning
- 🔄 Collaborative features
- 🔄 Advanced analytics

### Future Plans

- NFT-gated file access
- Token-gated content
- DAO membership verification
- Multi-chain support
- Decentralized identity
- Mobile app (iOS/Android)
- Enterprise features

---

## 📊 Stats

- **Smart Contract**: Deployed on Sui Testnet
- **Package ID**: `0x386cf5f10e6dc8639fcc494123439e333e738280a8f249b638cb7b84328a8885`
- **Network**: Sui Testnet
- **Status**: Production Ready (Phase 1.5 in development)
- **Features**: 15+ Phase 1 features implemented
- **Components**: 25+ React components
- **Services**: 10+ business logic services (+ 5 Seal services)
- **Documentation**: 20+ comprehensive guides
- **Seal Integration**: 30% complete (4/13 major tasks)

---

<div align="center">

**Built By SUi North for the Web3 community**

[⬆ Back to Top](#walbox)

</div>
