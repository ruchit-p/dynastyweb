// MARK: Admin Security Helper

import { getAuth } from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

// Local session cache to avoid repeated network calls in the same session
let claimCache: { isAdmin: boolean } | null = null;

function isAdminSubdomain(): boolean {
  if (typeof window === 'undefined') return false;
  // Accept both "admin.<domain>" and "<something>.admin.<domain>" patterns just in case
  const host = window.location.hostname;
  return host.split('.').includes('admin');
}

async function verifyAdminAccess(): Promise<boolean> {
  if (claimCache) return claimCache.isAdmin;

  const auth = getAuth();
  const user = auth.currentUser;
  if (!user) return false;

  try {
    const tokenResult = await user.getIdTokenResult(true); // force refresh to get up-to-date claims
    const isAdmin = Boolean(tokenResult.claims.admin);
    claimCache = { isAdmin };
    return isAdmin;
  } catch (error) {
    console.error('[adminSecurity] Failed to verify admin access', error);
    return false;
  }
}

async function logAdminAction(action: string, metadata?: Record<string, unknown>): Promise<void> {
  try {
    const callable = httpsCallable(functions, 'logAdminAction');
    await callable({ action, metadata: metadata || {} });
  } catch (error) {
    // We still want the UI to keep working even when logging fails
    console.error(`[adminSecurity] Failed to log admin action "${action}"`, error);
  }
}

function clearCache() {
  claimCache = null;
}

export const adminSecurity = {
  isAdminSubdomain,
  verifyAdminAccess,
  logAdminAction,
  clearCache,
}; 