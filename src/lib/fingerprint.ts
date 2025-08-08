/**
 * Browser fingerprinting utility for anonymous user identification
 * Used to enforce one-vote-per-user without requiring authentication
 * 
 * Uses modern @fingerprintjs/fingerprintjs for better accuracy and privacy
 */
import FingerprintJS from '@fingerprintjs/fingerprintjs'

// Cache the fingerprint agent and result to avoid repeated expensive calculations
let fpAgent: any = null
let cachedFingerprint: string | null = null;

/**
 * Generate a unique browser fingerprint for the current user
 * Uses various browser characteristics to create a consistent identifier
 * @returns Promise<string> - Unique fingerprint hash for this browser/device
 */
export async function getUserFingerprint(): Promise<string> {
  // Return cached fingerprint if already generated
  if (cachedFingerprint) {
    return cachedFingerprint;
  }

  try {
    // Initialize the agent if not already done
    if (!fpAgent) {
      fpAgent = await FingerprintJS.load();
    }

    // Get the fingerprint
    const result = await fpAgent.get();
    const visitorId = result.visitorId;
    cachedFingerprint = typeof visitorId === 'string' ? visitorId : 'fallback_' + Math.random().toString(36).substr(2, 9);
    
    return cachedFingerprint;
  } catch (error) {
    // Fallback to a simple random ID if fingerprinting fails
    console.warn('Fingerprinting failed:', error);
    const fallbackId = 'fallback_' + Math.random().toString(36).substr(2, 9);
    cachedFingerprint = fallbackId;
    return cachedFingerprint;
  }
}