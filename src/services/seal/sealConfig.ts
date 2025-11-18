/**
 * Seal Configuration Module
 * 
 * This module handles the configuration and validation of Seal-related
 * environment variables for encrypted file storage on Walrus.
 */

export interface SealConfig {
  enabled: boolean;
  rpcUrl: string;
  network: 'testnet' | 'mainnet';
  publisherUrl: string;
  aggregatorUrl: string;
  chunkSize: number;
  maxFileSize: number;
  encryptionAlgorithm: string;
  encryptionKeySize: number;
}

/**
 * Validation error thrown when Seal configuration is invalid
 */
export class SealConfigError extends Error {
  constructor(message: string) {
    super(`Seal Configuration Error: ${message}`);
    this.name = 'SealConfigError';
  }
}

/**
 * Validates that a required environment variable is present
 */
function validateRequired(value: string | undefined, name: string): string {
  if (!value || value.trim() === '') {
    throw new SealConfigError(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Validates and parses a numeric environment variable
 */
function validateNumber(
  value: string | undefined,
  name: string,
  min?: number,
  max?: number
): number {
  const strValue = validateRequired(value, name);
  const numValue = parseInt(strValue, 10);
  
  if (isNaN(numValue)) {
    throw new SealConfigError(`${name} must be a valid number, got: ${strValue}`);
  }
  
  if (min !== undefined && numValue < min) {
    throw new SealConfigError(`${name} must be at least ${min}, got: ${numValue}`);
  }
  
  if (max !== undefined && numValue > max) {
    throw new SealConfigError(`${name} must be at most ${max}, got: ${numValue}`);
  }
  
  return numValue;
}

/**
 * Validates a URL format
 */
function validateUrl(value: string | undefined, name: string): string {
  const url = validateRequired(value, name);
  
  try {
    new URL(url);
    return url;
  } catch (error) {
    throw new SealConfigError(`${name} must be a valid URL, got: ${url}`);
  }
}

/**
 * Validates boolean environment variable
 */
function validateBoolean(value: string | undefined, name: string, defaultValue: boolean): boolean {
  if (!value || value.trim() === '') {
    return defaultValue;
  }
  
  const normalized = value.toLowerCase().trim();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
    return true;
  }
  if (normalized === 'false' || normalized === '0' || normalized === 'no') {
    return false;
  }
  
  throw new SealConfigError(`${name} must be a boolean value (true/false), got: ${value}`);
}

/**
 * Validates network type
 */
function validateNetwork(value: string | undefined, name: string): 'testnet' | 'mainnet' {
  const network = validateRequired(value, name).toLowerCase();
  
  if (network !== 'testnet' && network !== 'mainnet') {
    throw new SealConfigError(`${name} must be either 'testnet' or 'mainnet', got: ${network}`);
  }
  
  return network as 'testnet' | 'mainnet';
}

/**
 * Loads and validates Seal configuration from environment variables
 */
export function loadSealConfig(): SealConfig {
  try {
    const enabled = validateBoolean(
      import.meta.env.VITE_SEAL_ENABLED,
      'VITE_SEAL_ENABLED',
      false
    );

    // If Seal is not enabled, return minimal config
    if (!enabled) {
      return {
        enabled: false,
        rpcUrl: '',
        network: 'testnet',
        publisherUrl: '',
        aggregatorUrl: '',
        chunkSize: 10485760, // 10MB default
        maxFileSize: 104857600, // 100MB default
        encryptionAlgorithm: 'AES-GCM',
        encryptionKeySize: 256,
      };
    }

    // Validate all required configuration when enabled
    const rpcUrl = validateUrl(import.meta.env.VITE_SUI_RPC_URL, 'VITE_SUI_RPC_URL');
    const network = validateNetwork(import.meta.env.VITE_SUI_NETWORK, 'VITE_SUI_NETWORK');
    const publisherUrl = validateUrl(
      import.meta.env.VITE_WALRUS_PUBLISHER_URL,
      'VITE_WALRUS_PUBLISHER_URL'
    );
    const aggregatorUrl = validateUrl(
      import.meta.env.VITE_WALRUS_AGGREGATOR_URL,
      'VITE_WALRUS_AGGREGATOR_URL'
    );

    // Validate chunk size (1MB to 50MB)
    const chunkSize = validateNumber(
      import.meta.env.VITE_SEAL_CHUNK_SIZE,
      'VITE_SEAL_CHUNK_SIZE',
      1048576, // 1MB minimum
      52428800 // 50MB maximum
    );

    // Validate max file size (1MB to 1GB)
    const maxFileSize = validateNumber(
      import.meta.env.VITE_SEAL_MAX_FILE_SIZE,
      'VITE_SEAL_MAX_FILE_SIZE',
      1048576, // 1MB minimum
      1073741824 // 1GB maximum
    );

    // Validate encryption algorithm
    const encryptionAlgorithm = validateRequired(
      import.meta.env.VITE_ENCRYPTION_ALGORITHM,
      'VITE_ENCRYPTION_ALGORITHM'
    );
    if (encryptionAlgorithm !== 'AES-GCM') {
      throw new SealConfigError(
        `VITE_ENCRYPTION_ALGORITHM must be 'AES-GCM', got: ${encryptionAlgorithm}`
      );
    }

    // Validate encryption key size
    const encryptionKeySize = validateNumber(
      import.meta.env.VITE_ENCRYPTION_KEY_SIZE,
      'VITE_ENCRYPTION_KEY_SIZE'
    );
    if (encryptionKeySize !== 128 && encryptionKeySize !== 192 && encryptionKeySize !== 256) {
      throw new SealConfigError(
        `VITE_ENCRYPTION_KEY_SIZE must be 128, 192, or 256, got: ${encryptionKeySize}`
      );
    }

    return {
      enabled,
      rpcUrl,
      network,
      publisherUrl,
      aggregatorUrl,
      chunkSize,
      maxFileSize,
      encryptionAlgorithm,
      encryptionKeySize,
    };
  } catch (error) {
    if (error instanceof SealConfigError) {
      throw error;
    }
    throw new SealConfigError(`Failed to load configuration: ${error}`);
  }
}

/**
 * Singleton instance of Seal configuration
 */
let configInstance: SealConfig | null = null;

/**
 * Gets the current Seal configuration, loading it if necessary
 */
export function getSealConfig(): SealConfig {
  if (!configInstance) {
    configInstance = loadSealConfig();
  }
  return configInstance;
}

/**
 * Resets the configuration instance (useful for testing)
 */
export function resetSealConfig(): void {
  configInstance = null;
}

/**
 * Checks if Seal is enabled and properly configured
 */
export function isSealEnabled(): boolean {
  try {
    const config = getSealConfig();
    return config.enabled;
  } catch (error) {
    console.error('Seal configuration error:', error);
    return false;
  }
}
