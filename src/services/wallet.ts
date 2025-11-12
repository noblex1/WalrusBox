// Mock Nautilus Wallet Service
export interface WalletState {
  connected: boolean;
  address: string | null;
}

const MOCK_ADDRESS = "0x1234...5678abcd";

export const walletService = {
  connect: async (): Promise<string> => {
    // Simulate wallet connection delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    localStorage.setItem('wallet_connected', 'true');
    localStorage.setItem('wallet_address', MOCK_ADDRESS);
    return MOCK_ADDRESS;
  },

  disconnect: (): void => {
    localStorage.removeItem('wallet_connected');
    localStorage.removeItem('wallet_address');
  },

  getState: (): WalletState => {
    const connected = localStorage.getItem('wallet_connected') === 'true';
    const address = localStorage.getItem('wallet_address');
    return { connected, address };
  },

  formatAddress: (address: string): string => {
    if (address.length <= 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }
};
