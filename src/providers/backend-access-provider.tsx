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
  revokeSession as requestRevokeSession,
  signIn as requestSignIn,
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
const PENDING_REVOCATION_STORAGE_KEY = 'takwimucheck.pending-revocation.v1';
const initialMessage = 'Sign in to open authenticated TakwimuCheck data and review routes.';

function removeStaleWebPersistentToken(key: string): void {
  if (Platform.OS !== 'web') return;
  try {
    globalThis.localStorage?.removeItem(key);
  } catch {
    // Storage can be unavailable in private/restricted browser contexts.
  }
}

async function readStoredSecret(key: string): Promise<string> {
  if (Platform.OS === 'web') {
    removeStaleWebPersistentToken(key);
    try {
      return globalThis.sessionStorage?.getItem(key)?.trim() ?? '';
    } catch {
      return '';
    }
  }
  return (await SecureStore.getItemAsync(key))?.trim() ?? '';
}

async function writeStoredSecret(key: string, value: string): Promise<void> {
  const token = value.trim();
  if (Platform.OS === 'web') {
    removeStaleWebPersistentToken(key);
    try {
      if (token) globalThis.sessionStorage?.setItem(key, token);
      else globalThis.sessionStorage?.removeItem(key);
    } catch {
      // The in-memory session remains usable when browser session storage is unavailable.
    }
    return;
  }
  if (token) {
    await SecureStore.setItemAsync(key, token, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

async function readStoredRefreshToken(): Promise<string> {
  return readStoredSecret(REFRESH_TOKEN_STORAGE_KEY);
}

async function writeStoredRefreshToken(value: string): Promise<void> {
  await writeStoredSecret(REFRESH_TOKEN_STORAGE_KEY, value);
}

async function readPendingRevocationToken(): Promise<string> {
  return readStoredSecret(PENDING_REVOCATION_STORAGE_KEY);
}

async function writePendingRevocationToken(value: string): Promise<void> {
  await writeStoredSecret(PENDING_REVOCATION_STORAGE_KEY, value);
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
  const refreshTokenRef = useRef('');
  const sessionGenerationRef = useRef(0);
  const signingOutRef = useRef(false);

  const applySession = useCallback(
    async (session: AuthSessionData, expectedGeneration = sessionGenerationRef.current) => {
      if (signingOutRef.current || expectedGeneration !== sessionGenerationRef.current) {
        return false;
      }
      refreshTokenRef.current = session.refresh_token;
      setAccessToken(session.access_token);
      setRefreshToken(session.refresh_token);
      setAccessExpiresAt(session.access_expires_at);
      setUser(session.user);
      setServerEntitlement(null);
      setStatus('idle');
      setMessage(
        `Signed in as ${session.user.display_name}. Protected data has not been refreshed yet.`,
      );
      await writeStoredRefreshToken(session.refresh_token);
      return true;
    },
    [],
  );

  const clearSessionState = useCallback((nextMessage = initialMessage) => {
    refreshTokenRef.current = '';
    setAccessToken('');
    setRefreshToken('');
    setAccessExpiresAt('');
    setUser(null);
    setSnapshot(null);
    setServerEntitlement(null);
    setStatus('idle');
    setMessage(nextMessage);
  }, []);

  const flushPendingRevocation = useCallback(async () => {
    const pending = await readPendingRevocationToken();
    if (!pending) return true;
    try {
      await requestRevokeSession(pending);
      await writePendingRevocationToken('');
      return true;
    } catch {
      return false;
    }
  }, []);

  const runProtectedCheck = useCallback(async () => {
    if (!accessToken.trim()) {
      setSnapshot(null);
      setStatus('error');
      setMessage('Sign in before testing authenticated backend access.');
      return null;
    }

    void flushPendingRevocation();
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
  }, [accessToken, flushPendingRevocation]);

  const refreshSession = useCallback(async () => {
    if (signingOutRef.current) return false;
    if (refreshInProgress.current) return refreshInProgress.current;

    const generation = sessionGenerationRef.current;
    const operation = (async () => {
      const token =
        refreshTokenRef.current || refreshToken.trim() || (await readStoredRefreshToken());
      if (!token || signingOutRef.current) return false;
      try {
        const session = await refreshAuthSession(token);
        if (signingOutRef.current || generation !== sessionGenerationRef.current) {
          return false;
        }
        return await applySession(session, generation);
      } catch (error) {
        if (!signingOutRef.current && generation === sessionGenerationRef.current) {
          await writeStoredRefreshToken('');
          clearSessionState(describeApiError(error));
        }
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
    void flushPendingRevocation();
    void (async () => {
      const storedToken = await readStoredRefreshToken();
      if (!active) return;
      if (!storedToken) {
        setRestoring(false);
        setStatus('idle');
        setMessage(initialMessage);
        return;
      }

      const generation = sessionGenerationRef.current;
      refreshTokenRef.current = storedToken;
      setRefreshToken(storedToken);
      try {
        const session = await refreshAuthSession(storedToken);
        if (!active || signingOutRef.current || generation !== sessionGenerationRef.current) {
          return;
        }
        await applySession(session, generation);
      } catch (error) {
        await writeStoredRefreshToken('');
        if (active && !signingOutRef.current && generation === sessionGenerationRef.current) {
          clearSessionState(describeApiError(error));
        }
      } finally {
        if (active) setRestoring(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [applySession, clearSessionState, flushPendingRevocation]);

  useEffect(() => {
    if (!accessToken || !accessExpiresAt || !refreshToken || signingOutRef.current) return;
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
      if (signingOutRef.current) return false;
      void flushPendingRevocation();
      const generation = ++sessionGenerationRef.current;
      setStatus('checking');
      setMessage('Signing in…');
      try {
        const session = await requestSignIn(email, password);
        const applied = await applySession(session, generation);
        if (applied) setRestoring(false);
        return applied;
      } catch (error) {
        if (generation === sessionGenerationRef.current && !signingOutRef.current) {
          clearSessionState(describeApiError(error));
          setStatus('error');
        }
        return false;
      }
    },
    [applySession, clearSessionState, flushPendingRevocation],
  );

  const signOut = useCallback(async () => {
    if (signingOutRef.current) return;
    signingOutRef.current = true;
    sessionGenerationRef.current += 1;

    const revocationToken =
      refreshTokenRef.current || refreshToken.trim() || (await readStoredRefreshToken());

    clearSessionState('Signing out…');
    setRestoring(false);
    await writeStoredRefreshToken('');

    const inFlight = refreshInProgress.current;
    if (inFlight) {
      try {
        await inFlight;
      } catch {
        // The refresh path already converts failures into a false result.
      }
    }

    let serverRevoked = true;
    if (revocationToken) {
      try {
        await requestRevokeSession(revocationToken);
        await writePendingRevocationToken('');
      } catch {
        serverRevoked = false;
        await writePendingRevocationToken(revocationToken);
      }
    } else {
      await writePendingRevocationToken('');
    }

    setMessage(
      serverRevoked
        ? 'You have signed out and the backend session was revoked.'
        : 'You are signed out locally. Backend revocation is pending and will retry when TakwimuCheck reconnects.',
    );
    signingOutRef.current = false;
  }, [clearSessionState, refreshToken]);

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