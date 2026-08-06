// Manages authenticated backend sessions, secure refresh-token storage and protected data state.

import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Platform } from 'react-native';

import {
  getServerEntitlement,
  refreshSession as refreshAuthSession,
  signIn as requestSignIn,
  signOut as requestSignOut,
  type AuthSessionData,
  type AuthUser,
  type ServerEntitlementData,
} from '@/services/auth-api';
import { checkProtectedAccess, describeApiError } from '@/services/api';
import type { ProtectedAccessSnapshot } from '@/services/api';

export type ProtectedAccessStatus =
  | 'restoring'
  | 'idle'
  | 'checking'
  | 'success'
  | 'error';

interface BackendAccessContextValue {
  accessKey: string;
  accessToken: string;
  accessExpiresAt: string;
  user: AuthUser | null;
  signedIn: boolean;
  restoring: boolean;
  status: ProtectedAccessStatus;
  message: string;
  snapshot: ProtectedAccessSnapshot | null;
  serverEntitlement: ServerEntitlementData | null;
  setAccessKey: (value: string) => void;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
  refreshServerEntitlement: (forceRefresh?: boolean) => Promise<ServerEntitlementData | null>;
  testAccess: () => Promise<ProtectedAccessSnapshot | null>;
  refreshProtectedData: () => Promise<ProtectedAccessSnapshot | null>;
  clearAccess: () => void;
}

const BackendAccessContext = createContext<BackendAccessContextValue | null>(null);
const REFRESH_TOKEN_STORAGE_KEY = 'takwimucheck.refresh-token.v1';
const initialMessage = 'Sign in to open authenticated TakwimuCheck data and review routes.';

async function readStoredRefreshToken(): Promise<string> {
  if (Platform.OS === 'web') {
    try {
      return globalThis.localStorage?.getItem(REFRESH_TOKEN_STORAGE_KEY)?.trim() ?? '';
    } catch {
      return '';
    }
  }
  return (await SecureStore.getItemAsync(REFRESH_TOKEN_STORAGE_KEY))?.trim() ?? '';
}

async function writeStoredRefreshToken(value: string): Promise<void> {
  const token = value.trim();
  if (Platform.OS === 'web') {
    try {
      if (token) globalThis.localStorage?.setItem(REFRESH_TOKEN_STORAGE_KEY, token);
      else globalThis.localStorage?.removeItem(REFRESH_TOKEN_STORAGE_KEY);
    } catch {
      // A private browser context may reject storage; the active in-memory session still works.
    }
    return;
  }
  if (token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_STORAGE_KEY, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_STORAGE_KEY);
  }
}

export function BackendAccessProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState('');
  const [refreshToken, setRefreshToken] = useState('');
  const [accessExpiresAt, setAccessExpiresAt] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [restoring, setRestoring] = useState(true);
  const [status, setStatus] = useState<ProtectedAccessStatus>('restoring');
  const [message, setMessage] = useState('Restoring the authenticated session…');
  const [snapshot, setSnapshot] = useState<ProtectedAccessSnapshot | null>(null);
  const [serverEntitlement, setServerEntitlement] = useState<ServerEntitlementData | null>(null);
  const refreshInProgress = useRef<Promise<boolean> | null>(null);

  const applySession = useCallback(async (session: AuthSessionData) => {
    setAccessToken(session.access_token);
    setRefreshToken(session.refresh_token);
    setAccessExpiresAt(session.access_expires_at);
    setUser(session.user);
    setServerEntitlement(null);
    setStatus('idle');
    setMessage(`Signed in as ${session.user.display_name}. Protected data has not been refreshed yet.`);
    await writeStoredRefreshToken(session.refresh_token);
  }, []);

  const clearSessionState = useCallback((nextMessage = initialMessage) => {
    setAccessToken('');
    setRefreshToken('');
    setAccessExpiresAt('');
    setUser(null);
    setSnapshot(null);
    setServerEntitlement(null);
    setStatus('idle');
    setMessage(nextMessage);
  }, []);

  const runProtectedCheck = useCallback(async () => {
    if (!accessToken.trim()) {
      setSnapshot(null);
      setStatus('error');
      setMessage('Sign in before testing authenticated backend access.');
      return null;
    }

    setStatus('checking');
    setMessage('Loading authenticated validation runs and issues…');
    try {
      const nextSnapshot = await checkProtectedAccess(accessToken);
      setSnapshot(nextSnapshot);
      setStatus('success');
      setMessage('Authenticated backend access succeeded for this session.');
      return nextSnapshot;
    } catch (error) {
      setSnapshot(null);
      setStatus('error');
      setMessage(describeApiError(error));
      return null;
    }
  }, [accessToken]);

  const refreshSession = useCallback(async () => {
    if (refreshInProgress.current) return refreshInProgress.current;
    const operation = (async () => {
      const token = refreshToken.trim() || (await readStoredRefreshToken());
      if (!token) return false;
      try {
        const session = await refreshAuthSession(token);
        await applySession(session);
        return true;
      } catch (error) {
        await writeStoredRefreshToken('');
        clearSessionState(describeApiError(error));
        return false;
      }
    })();
    refreshInProgress.current = operation;
    try {
      return await operation;
    } finally {
      refreshInProgress.current = null;
    }
  }, [applySession, clearSessionState, refreshToken]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const storedToken = await readStoredRefreshToken();
      if (!active) return;
      if (!storedToken) {
        setRestoring(false);
        setStatus('idle');
        setMessage(initialMessage);
        return;
      }
      setRefreshToken(storedToken);
      try {
        const session = await refreshAuthSession(storedToken);
        if (!active) return;
        await applySession(session);
      } catch (error) {
        await writeStoredRefreshToken('');
        if (active) clearSessionState(describeApiError(error));
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applySession, clearSessionState]);

  useEffect(() => {
    if (!accessToken || !accessExpiresAt || !refreshToken) return;
    const expiry = Date.parse(accessExpiresAt);
    if (!Number.isFinite(expiry)) return;
    const delay = Math.max(1_000, expiry - Date.now() - 60_000);
    const timer = setTimeout(() => {
      void refreshSession();
    }, delay);
    return () => clearTimeout(timer);
  }, [accessExpiresAt, accessToken, refreshSession, refreshToken]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setStatus('checking');
      setMessage('Signing in…');
      try {
        const session = await requestSignIn(email, password);
        await applySession(session);
        setRestoring(false);
        return true;
      } catch (error) {
        clearSessionState(describeApiError(error));
        setStatus('error');
        return false;
      }
    },
    [applySession, clearSessionState],
  );

  const signOut = useCallback(async () => {
    const token = accessToken;
    clearSessionState('You have signed out.');
    setRestoring(false);
    await writeStoredRefreshToken('');
    if (token.trim()) {
      try {
        await requestSignOut(token);
      } catch {
        // Local sign-out remains complete even when the server is temporarily unreachable.
      }
    }
  }, [accessToken, clearSessionState]);

  const refreshServerEntitlement = useCallback(
    async (forceRefresh = false) => {
      if (!accessToken.trim()) {
        setServerEntitlement(null);
        return null;
      }
      try {
        const result = await getServerEntitlement(accessToken, forceRefresh);
        setServerEntitlement(result);
        return result;
      } catch (error) {
        setMessage(describeApiError(error));
        setServerEntitlement(null);
        return null;
      }
    },
    [accessToken],
  );

  const setAccessKey = useCallback((value: string) => {
    // Compatibility alias during the migration; user-facing screens no longer accept raw API keys.
    setAccessToken(value.trim());
    setSnapshot(null);
    setStatus('idle');
  }, []);

  const clearAccess = useCallback(() => {
    void signOut();
  }, [signOut]);

  const value = useMemo<BackendAccessContextValue>(
    () => ({
      accessKey: accessToken,
      accessToken,
      accessExpiresAt,
      user,
      signedIn: Boolean(accessToken && user),
      restoring,
      status,
      message,
      snapshot,
      serverEntitlement,
      setAccessKey,
      signIn,
      signOut,
      refreshSession,
      refreshServerEntitlement,
      testAccess: runProtectedCheck,
      refreshProtectedData: runProtectedCheck,
      clearAccess,
    }),
    [
      accessExpiresAt,
      accessToken,
      clearAccess,
      message,
      refreshServerEntitlement,
      refreshSession,
      restoring,
      runProtectedCheck,
      serverEntitlement,
      setAccessKey,
      signIn,
      signOut,
      snapshot,
      status,
      user,
    ],
  );

  return <BackendAccessContext.Provider value={value}>{children}</BackendAccessContext.Provider>;
}

export function useBackendAccess(): BackendAccessContextValue {
  const context = useContext(BackendAccessContext);
  if (!context) {
    throw new Error('useBackendAccess must be used within BackendAccessProvider.');
  }
  return context;
}
