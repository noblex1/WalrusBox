/**
 * Vitest setup file
 * Configures test environment and global mocks
 */

import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock environment variables for tests
process.env.VITE_SUI_NETWORK = 'testnet';
process.env.VITE_SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443';
process.env.VITE_WALRUS_PUBLISHER_URL = 'https://publisher.walrus-testnet.walrus.space';
process.env.VITE_WALRUS_AGGREGATOR_URL = 'https://aggregator.walrus-testnet.walrus.space';
process.env.VITE_SEAL_ENABLED = 'true';
process.env.VITE_SEAL_CHUNK_SIZE = '10485760';
process.env.VITE_SEAL_MAX_FILE_SIZE = '104857600';
process.env.VITE_ENCRYPTION_ALGORITHM = 'AES-GCM';
process.env.VITE_ENCRYPTION_KEY_SIZE = '256';

// Mock IndexedDB for key storage tests
const indexedDB = {
  open: vi.fn(),
  deleteDatabase: vi.fn(),
};

global.indexedDB = indexedDB as any;

// Polyfill File.arrayBuffer() for jsdom environment
if (typeof File !== 'undefined' && !File.prototype.arrayBuffer) {
  File.prototype.arrayBuffer = async function() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Polyfill Blob.arrayBuffer() for jsdom environment
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = async function() {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(this);
    });
  };
}

// Extend expect with custom matchers if needed
expect.extend({
  // Add custom matchers here if needed
});
