# WalrusBox

A modern, secure, and decentralized file storage platform built on blockchain technology. WalrusBox enables users to upload, manage, and share encrypted files with seamless wallet integration using the Nautilus blockchain wallet.

## Overview

WalrusBox is a **Web3-enabled file management system** that combines the security of encryption with the transparency and accessibility of blockchain technology. Users can connect their Nautilus wallet to securely store and manage their files in a decentralized environment.

### Key Features

- 🔐 **End-to-End Encryption** - All files are encrypted locally before storage
- 💼 **Wallet Integration** - Connect and authenticate using Nautilus blockchain wallet
- 📁 **File Management** - Upload, organize, view, and manage your encrypted files
- 🔗 **Decentralized Storage** - Leverage blockchain infrastructure for secure file storage
- 📤 **Easy Sharing** - Generate secure share links for controlled file distribution
- 🎨 **Modern UI** - Intuitive, responsive interface built with React and Tailwind CSS
- 🔄 **Real-time Updates** - Live file list management and status tracking

## Technology Stack

### Frontend
- **React 18** - Modern UI framework with hooks
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build tool
- **Tailwind CSS** - Utility-first styling framework
- **shadcn/ui** - High-quality, accessible component library
- **React Router v6** - Client-side routing
- **React Query (TanStack Query)** - Server state management
- **Lucide React** - Icon library
- **Sonner & React Toasts** - Notification system

### Development Tools
- **ESLint** - Code quality and consistency
- **TypeScript ESLint** - TypeScript linting
- **PostCSS & Autoprefixer** - CSS processing
- **Bun** - Fast JavaScript runtime and package manager

## Getting Started

### Prerequisites
- Node.js 16+ or Bun
- npm, yarn, or bun package manager
- A modern web browser
- Nautilus wallet browser extension (for wallet integration)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd dapp-cloud-stage-main
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   ```

3. **Start the development server**
   ```bash
   bun dev
   # or
   npm run dev
   ```

   The application will be available at `http://localhost:5173`

### Build for Production

```bash
bun run build
# or
npm run build
```

The optimized production build will be generated in the `dist/` directory.

### Preview Production Build

```bash
bun run preview
# or
npm run preview
```

## Project Structure

```
src/
├── components/          # Reusable React components
│   ├── FileListTable.tsx        # Displays user's files
│   ├── FileUploadArea.tsx       # File upload interface
│   ├── ShareModal.tsx           # Share file dialog
│   ├── WalletConnectButton.tsx  # Wallet connection UI
│   └── ui/                      # shadcn/ui component library
├── pages/              # Page components (routing)
│   ├── Home.tsx        # Landing page
│   ├── Dashboard.tsx   # Main dashboard
│   ├── FileView.tsx    # File details view
│   └── NotFound.tsx    # 404 page
├── services/           # Business logic and API calls
│   ├── encryption.ts   # File encryption/decryption
│   ├── files.ts        # File management service
│   ├── storage.ts      # Storage operations
│   └── wallet.ts       # Wallet integration
├── hooks/              # Custom React hooks
├── lib/                # Utility functions
├── App.tsx             # Root component
└── main.tsx            # Application entry point
```

## Usage

### Connecting Your Wallet

1. Navigate to the dashboard
2. Click the **"Connect Wallet"** button
3. Authorize the connection in your Nautilus wallet
4. Your wallet address will be displayed once connected

### Uploading Files

1. Go to the **Dashboard**
2. Navigate to the **Upload** tab
3. Drag and drop files or click to browse
4. Files will be encrypted and stored securely

### Managing Files

1. Access the **My Files** tab to view all uploaded files
2. View file details, download, or delete files as needed
3. Generate secure share links for selective sharing

## API & Services

### Encryption Service (`services/encryption.ts`)
Handles client-side encryption and decryption of files

### Files Service (`services/files.ts`)
Manages file operations (upload, download, delete, list)

### Storage Service (`services/storage.ts`)
Handles local and decentralized storage operations

### Wallet Service (`services/wallet.ts`)
Manages wallet connection and authentication with Nautilus

## Development

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run build:dev` - Build for development environment
- `npm run lint` - Run ESLint code quality checks
- `npm run preview` - Preview the production build locally

### Code Quality

This project uses ESLint to maintain code quality and consistency. Run:

```bash
npm run lint
```

## Security Considerations

- All files are **encrypted client-side** before transmission
- Private keys are never exposed to the application
- Wallet authentication provides user verification
- Share links are generated with time-limited access tokens

## Browser Support

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Note:** Requires Nautilus wallet extension for full functionality

## Contributing

Contributions are welcome! Please ensure:

1. Code passes ESLint checks (`npm run lint`)
2. TypeScript types are properly defined
3. Components follow the existing patterns
4. Changes are tested in development mode

## License

[Add your license here]

## Support & Contact

For issues, feature requests, or questions, please open an issue in the repository.

---

**WalrusBox** - Secure, Decentralized File Management for the Web3 Era
