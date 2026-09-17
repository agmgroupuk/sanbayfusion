/**
 * Secure Auth Storage Utility for HttpOnly Session Cookies
 *
 * NO localStorage — user data is stored in-memory only.
 * - Session ID: Stored in HttpOnly cookie (not accessible to JavaScript)
 * - User Identity: Always verified via server session validation
 * - In-memory cache: Contains user profile data for UI rendering only
 *
 * On page refresh, the auth context calls verifySession() to re-populate
 * the in-memory user data from the server session.
 */

let _inMemoryUser: any = null;

export const secureAuthStorage = {
  /**
   * Store user data in memory (no localStorage)
   */
  setUser: (user: any) => {
    if (typeof window === 'undefined') return;
    _inMemoryUser = user ? { ...user } : null;
    console.log('✅ User data cached in memory');
  },

  /**
   * Get user data from memory
   */
  getUser: () => {
    return _inMemoryUser;
  },

  /**
   * Verify session via server call (HttpOnly cookie sent automatically)
   */
  verifySession: async (): Promise<{ valid: boolean; user?: any }> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        credentials: 'include', // Sends HttpOnly cookies automatically
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        return { valid: data.valid, user: data.user };
      }

      return { valid: false };
    } catch (error) {
      console.error('❌ Session verification failed:', error);
      return { valid: false };
    }
  },

  /**
   * Clear user data from memory (token cleared via logout endpoint)
   */
  clearUser: () => {
    _inMemoryUser = null;
    console.log('✅ User data cleared from memory');
  },

  /**
   * Logout and clear HttpOnly cookie via server
   */
  logout: async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Sends HttpOnly cookies automatically
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Clear local user data regardless of server response
      secureAuthStorage.clearUser();

      if (response.ok) {
        console.log('✅ Logged out successfully');
        return true;
      } else {
        console.warn('⚠️ Server logout failed, but local data cleared');
        return false;
      }
    } catch (error) {
      console.error('❌ Logout failed:', error);
      // Still clear local data
      secureAuthStorage.clearUser();
      return false;
    }
  },
};

export default secureAuthStorage;
