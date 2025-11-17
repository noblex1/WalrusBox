/**
 * Share Service - Generate and manage shareable file links
 */

interface ShareLink {
  fileId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
  accessCount: number;
  maxAccess?: number;
  allowedWallets?: string[]; // Wallet addresses that can access this link
  requireWallet: boolean; // Whether wallet verification is required
}

const SHARE_LINKS_KEY = 'walrusbox_share_links';

export const shareService = {
  /**
   * Generate a shareable link for a file
   */
  generateShareLink: (
    fileId: string,
    expiresInHours: number = 24,
    maxAccess?: number,
    allowedWallets?: string[]
  ): ShareLink => {
    // Generate random token
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const shareLink: ShareLink = {
      fileId,
      token,
      expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
      createdAt: new Date(),
      accessCount: 0,
      maxAccess,
      allowedWallets: allowedWallets && allowedWallets.length > 0 ? allowedWallets : undefined,
      requireWallet: !!(allowedWallets && allowedWallets.length > 0),
    };

    // Store share link
    const links = shareService.getAllShareLinks();
    links.push(shareLink);
    localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));

    return shareLink;
  },

  /**
   * Get share link URL
   */
  getShareLinkURL: (token: string): string => {
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;
    return `${baseUrl}/share/${token}`;
  },

  /**
   * Get all share links
   */
  getAllShareLinks: (): ShareLink[] => {
    try {
      const stored = localStorage.getItem(SHARE_LINKS_KEY);
      if (!stored) return [];
      
      const links = JSON.parse(stored);
      // Convert date strings back to Date objects
      return links.map((link: any) => ({
        ...link,
        expiresAt: new Date(link.expiresAt),
        createdAt: new Date(link.createdAt),
      }));
    } catch (error) {
      console.error('Error getting share links:', error);
      return [];
    }
  },

  /**
   * Get share links for a specific file
   */
  getFileShareLinks: (fileId: string): ShareLink[] => {
    const allLinks = shareService.getAllShareLinks();
    return allLinks.filter(link => link.fileId === fileId);
  },

  /**
   * Get share link by token
   */
  getShareLinkByToken: (token: string): ShareLink | null => {
    const allLinks = shareService.getAllShareLinks();
    return allLinks.find(link => link.token === token) || null;
  },

  /**
   * Validate share link
   */
  validateShareLink: (token: string, walletAddress?: string): { valid: boolean; reason?: string } => {
    const link = shareService.getShareLinkByToken(token);
    
    if (!link) {
      return { valid: false, reason: 'Link not found' };
    }

    // Check expiration
    if (new Date() > link.expiresAt) {
      return { valid: false, reason: 'Link expired' };
    }

    // Check max access
    if (link.maxAccess && link.accessCount >= link.maxAccess) {
      return { valid: false, reason: 'Maximum access limit reached' };
    }

    // Check wallet access if required
    if (link.requireWallet && link.allowedWallets) {
      if (!walletAddress) {
        return { valid: false, reason: 'Wallet connection required' };
      }
      
      const isAllowed = link.allowedWallets.some(
        allowed => allowed.toLowerCase() === walletAddress.toLowerCase()
      );
      
      if (!isAllowed) {
        return { valid: false, reason: 'Wallet address not authorized' };
      }
    }

    return { valid: true };
  },

  /**
   * Increment access count
   */
  incrementAccessCount: (token: string): void => {
    const links = shareService.getAllShareLinks();
    const linkIndex = links.findIndex(link => link.token === token);
    
    if (linkIndex !== -1) {
      links[linkIndex].accessCount++;
      localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(links));
    }
  },

  /**
   * Revoke share link
   */
  revokeShareLink: (token: string): void => {
    const links = shareService.getAllShareLinks();
    const filtered = links.filter(link => link.token !== token);
    localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(filtered));
  },

  /**
   * Revoke all share links for a file
   */
  revokeFileShareLinks: (fileId: string): void => {
    const links = shareService.getAllShareLinks();
    const filtered = links.filter(link => link.fileId !== fileId);
    localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(filtered));
  },

  /**
   * Clean up expired links
   */
  cleanupExpiredLinks: (): number => {
    const links = shareService.getAllShareLinks();
    const now = new Date();
    const active = links.filter(link => link.expiresAt > now);
    const removedCount = links.length - active.length;
    
    if (removedCount > 0) {
      localStorage.setItem(SHARE_LINKS_KEY, JSON.stringify(active));
    }
    
    return removedCount;
  },

  /**
   * Copy share link to clipboard
   */
  copyShareLink: async (token: string): Promise<void> => {
    const url = shareService.getShareLinkURL(token);
    await navigator.clipboard.writeText(url);
  },

  /**
   * Get share link statistics
   */
  getShareLinkStats: (token: string): {
    accessCount: number;
    maxAccess?: number;
    expiresAt: Date;
    isExpired: boolean;
    remainingAccess?: number;
  } | null => {
    const link = shareService.getShareLinkByToken(token);
    if (!link) return null;

    return {
      accessCount: link.accessCount,
      maxAccess: link.maxAccess,
      expiresAt: link.expiresAt,
      isExpired: new Date() > link.expiresAt,
      remainingAccess: link.maxAccess ? link.maxAccess - link.accessCount : undefined,
    };
  },
};
