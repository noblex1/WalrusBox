// Seal Client Service
// Manages the Seal client connection and lifecycle for encryption operations

import { SealClient } from '@mysten/seal';
import type { SealClientOptions, KeyServerConfig } from '@mysten/seal';
import { SuiClient } from '@mysten/sui/client';
import { getSealConfig } from './sealConfig';
import { SealClientConfig, SealError, SealErrorType } from './sealTypes';

/**
 * Seal Client Service - Singleton pattern for managing SealClient
 * 
 * Note: The @mysten/seal package provides threshold encryption with key servers.
 * This service wraps the SealClient and provides a unified interface for
 * encryption operations with Walrus storage.
 */
class SealClientService {
  private static instance: SealClientService | null = null;
  private sealClient: SealClient | null = null;
  private suiClient: SuiClient | null = null;
  private config: SealClientConfig | null = null;
  private initialized: boolean = false;
  private currentRpcIndex: number = 0;

  /**
   * Private constructor to enforce singleton pattern
   */
  private constructor() {}

  /**
   * Get the singleton instance
   */
  public static getInstance(): SealClientService {
    if (!SealClientService.instance) {
      SealClientService.instance = new SealClientService();
    }
    return SealClientService.instance;
  }

  /**
   * Initialize the Seal client with configuration
   * @param config - Optional configuration override
   * @throws {SealError} If initialization fails
   */
  public async initialize(config?: SealClientConfig): Promise<void> {
    try {
      // Use provided config or load from environment
      if (config) {
        this.config = config;
      } else {
        const sealConfig = getSealConfig();
        
        if (!sealConfig.enabled) {
          throw new SealError(
            SealErrorType.INITIALIZATION_ERROR,
            'Seal is not enabled in configuration',
            undefined,
            false
          );
        }

        this.config = {
          rpcUrl: sealConfig.rpcUrl,
          network: sealConfig.network,
          publisherUrl: sealConfig.publisherUrl,
          aggregatorUrl: sealConfig.aggregatorUrl,
          fallbackRpcUrls: this.getFallbackRpcUrls(sealConfig.network),
        };
      }

      // Validate configuration
      this.validateConfig(this.config);

      // Initialize Sui client and Seal client with primary RPC
      await this.connectToRpc(this.config.rpcUrl);

      this.initialized = true;
      console.log('Seal client initialized successfully', {
        network: this.config.network,
        rpcUrl: this.config.rpcUrl,
      });
    } catch (error) {
      this.initialized = false;
      this.sealClient = null;
      this.suiClient = null;

      if (error instanceof SealError) {
        throw error;
      }

      throw new SealError(
        SealErrorType.INITIALIZATION_ERROR,
        `Failed to initialize Seal client: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
        false
      );
    }
  }

  /**
   * Connect to a specific RPC endpoint
   * @param rpcUrl - The RPC URL to connect to
   */
  private async connectToRpc(rpcUrl: string): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('Configuration not set');
      }

      // Create Sui client
      this.suiClient = new SuiClient({ url: rpcUrl });

      // For now, we'll initialize SealClient when needed with key server configs
      // The actual key server configuration will be provided during encryption operations
      // This is a placeholder initialization
      console.log('Connected to Sui RPC:', rpcUrl);
      
      // Note: SealClient requires key server configurations which are typically
      // provided at encryption time. We'll create the client lazily when needed.
    } catch (error) {
      throw new SealError(
        SealErrorType.RPC_ERROR,
        `Failed to connect to RPC endpoint ${rpcUrl}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined,
        true
      );
    }
  }

  /**
   * Attempt to connect using fallback RPC endpoints
   * @returns True if successfully connected to a fallback
   */
  private async tryFallbackRpc(): Promise<boolean> {
    if (!this.config?.fallbackRpcUrls || this.config.fallbackRpcUrls.length === 0) {
      return false;
    }

    console.warn('Primary RPC failed, attempting fallback endpoints...');

    for (let i = 0; i < this.config.fallbackRpcUrls.length; i++) {
      const fallbackUrl = this.config.fallbackRpcUrls[i];
      
      try {
        console.log(`Trying fallback RPC ${i + 1}/${this.config.fallbackRpcUrls.length}:`, fallbackUrl);
        await this.connectToRpc(fallbackUrl);
        this.currentRpcIndex = i + 1; // Track which fallback we're using
        console.log('Successfully connected to fallback RPC');
        return true;
      } catch (error) {
        console.warn(`Fallback RPC ${fallbackUrl} failed:`, error);
        continue;
      }
    }

    return false;
  }

  /**
   * Get the SealClient instance
   * @throws {SealError} If client is not initialized
   */
  public getClient(): SealClient | null {
    if (!this.initialized) {
      throw new SealError(
        SealErrorType.INITIALIZATION_ERROR,
        'Seal client is not initialized. Call initialize() first.',
        undefined,
        false
      );
    }

    return this.sealClient;
  }

  /**
   * Get the Sui client instance
   * @throws {SealError} If client is not initialized
   */
  public getSuiClient(): SuiClient {
    if (!this.initialized || !this.suiClient) {
      throw new SealError(
        SealErrorType.INITIALIZATION_ERROR,
        'Sui client is not initialized. Call initialize() first.',
        undefined,
        false
      );
    }

    return this.suiClient;
  }

  /**
   * Create a SealClient with key server configurations
   * @param serverConfigs - Key server configurations
   * @returns A configured SealClient instance
   */
  public createSealClient(serverConfigs: KeyServerConfig[]): SealClient {
    if (!this.suiClient) {
      throw new SealError(
        SealErrorType.INITIALIZATION_ERROR,
        'Sui client is not initialized',
        undefined,
        false
      );
    }

    // Create SealClient options
    const options: SealClientOptions = {
      suiClient: this.suiClient as any, // Type assertion for compatibility
      serverConfigs,
      verifyKeyServers: true,
      timeout: 30000, // 30 seconds
    };

    // Create and return SealClient instance
    const client = new SealClient(options);
    this.sealClient = client;
    
    return client;
  }

  /**
   * Check if the client is initialized
   */
  public isInitialized(): boolean {
    return this.initialized && this.suiClient !== null;
  }

  /**
   * Get the current configuration
   */
  public getConfig(): SealClientConfig | null {
    return this.config;
  }

  /**
   * Disconnect and cleanup the client
   */
  public disconnect(): void {
    if (this.sealClient) {
      // Cleanup seal client resources if needed
      this.sealClient = null;
    }

    if (this.suiClient) {
      // Cleanup sui client resources if needed
      this.suiClient = null;
    }

    this.initialized = false;
    this.currentRpcIndex = 0;
    console.log('Seal client disconnected');
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  public static reset(): void {
    if (SealClientService.instance) {
      SealClientService.instance.disconnect();
      SealClientService.instance = null;
    }
  }

  /**
   * Handle RPC errors with fallback logic
   * @param operation - The operation to execute
   * @returns The result of the operation
   */
  public async withRpcFallback<T>(
    operation: (suiClient: SuiClient) => Promise<T>
  ): Promise<T> {
    if (!this.isInitialized()) {
      throw new SealError(
        SealErrorType.INITIALIZATION_ERROR,
        'Client not initialized',
        undefined,
        false
      );
    }

    try {
      return await operation(this.suiClient!);
    } catch (error) {
      // If it's an RPC error, try fallback
      if (this.isRpcError(error)) {
        console.warn('RPC operation failed, attempting fallback...');
        
        const fallbackSuccess = await this.tryFallbackRpc();
        
        if (fallbackSuccess && this.suiClient) {
          // Retry the operation with fallback RPC
          try {
            return await operation(this.suiClient);
          } catch (retryError) {
            throw new SealError(
              SealErrorType.RPC_ERROR,
              'Operation failed even with fallback RPC',
              retryError instanceof Error ? retryError : undefined,
              false
            );
          }
        }
      }

      // Re-throw if not an RPC error or fallback failed
      throw error;
    }
  }

  /**
   * Validate the client configuration
   */
  private validateConfig(config: SealClientConfig): void {
    if (!config.rpcUrl || !this.isValidUrl(config.rpcUrl)) {
      throw new SealError(
        SealErrorType.INVALID_CONFIG_ERROR,
        `Invalid RPC URL: ${config.rpcUrl}`,
        undefined,
        false
      );
    }

    if (!config.publisherUrl || !this.isValidUrl(config.publisherUrl)) {
      throw new SealError(
        SealErrorType.INVALID_CONFIG_ERROR,
        `Invalid publisher URL: ${config.publisherUrl}`,
        undefined,
        false
      );
    }

    if (!config.aggregatorUrl || !this.isValidUrl(config.aggregatorUrl)) {
      throw new SealError(
        SealErrorType.INVALID_CONFIG_ERROR,
        `Invalid aggregator URL: ${config.aggregatorUrl}`,
        undefined,
        false
      );
    }

    if (config.network !== 'testnet' && config.network !== 'mainnet') {
      throw new SealError(
        SealErrorType.INVALID_CONFIG_ERROR,
        `Invalid network: ${config.network}. Must be 'testnet' or 'mainnet'`,
        undefined,
        false
      );
    }
  }

  /**
   * Check if a string is a valid URL
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if an error is an RPC-related error
   */
  private isRpcError(error: unknown): boolean {
    if (error instanceof SealError) {
      return error.type === SealErrorType.RPC_ERROR || error.type === SealErrorType.NETWORK_ERROR;
    }

    // Check for common RPC error patterns
    const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
    return (
      errorMessage.includes('rpc') ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('econnrefused')
    );
  }

  /**
   * Get fallback RPC URLs based on network
   */
  private getFallbackRpcUrls(network: 'testnet' | 'mainnet'): string[] {
    if (network === 'testnet') {
      return [
        'https://fullnode.testnet.sui.io:443',
        'https://sui-testnet-rpc.allthatnode.com',
        'https://sui-testnet.nodeinfra.com',
      ];
    } else {
      return [
        'https://fullnode.mainnet.sui.io:443',
        'https://sui-mainnet-rpc.allthatnode.com',
        'https://sui-mainnet.nodeinfra.com',
      ];
    }
  }
}

// Export singleton instance getter
export const sealClient = SealClientService.getInstance();

// Export class for testing
export { SealClientService };
