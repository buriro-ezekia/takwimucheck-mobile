// Keeps the controlled-pilot backend access key and protected data in memory for one app session.

import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

import {
  checkProtectedAccess,
  describeApiError,
  ProtectedAccessSnapshot,
} from '@/services/api';

export type ProtectedAccessStatus = 'idle' | 'checking' | 'success' | 'error';

interface BackendAccessContextValue {
  accessKey: string;
  status: ProtectedAccessStatus;
  message: string;
  snapshot: ProtectedAccessSnapshot | null;
  setAccessKey: (value: string) => void;
  testAccess: () => Promise<ProtectedAccessSnapshot | null>;
  refreshProtectedData: () => Promise<ProtectedAccessSnapshot | null>;
  clearAccess: () => void;
}

const BackendAccessContext = createContext<BackendAccessContextValue | null>(null);

const initialMessage =
  'Enter the controlled-pilot access key. It remains in memory only until the app closes or you clear it.';

export function BackendAccessProvider({ children }: PropsWithChildren) {
  const [accessKey, setAccessKeyState] = useState('');
  const [status, setStatus] = useState<ProtectedAccessStatus>('idle');
  const [message, setMessage] = useState(initialMessage);
  const [snapshot, setSnapshot] = useState<ProtectedAccessSnapshot | null>(null);

  const setAccessKey = useCallback((value: string) => {
    setAccessKeyState(value);
    setStatus('idle');
    setSnapshot(null);
    setMessage(initialMessage);
  }, []);

  const runProtectedCheck = useCallback(async () => {
    setStatus('checking');
    setMessage('Testing the protected validation-runs and issue-register routes…');

    try {
      const nextSnapshot = await checkProtectedAccess(accessKey);
      setSnapshot(nextSnapshot);
      setStatus('success');
      setMessage('Protected backend access succeeded for this app session.');
      return nextSnapshot;
    } catch (error) {
      setSnapshot(null);
      setStatus('error');
      setMessage(describeApiError(error));
      return null;
    }
  }, [accessKey]);

  const clearAccess = useCallback(() => {
    setAccessKeyState('');
    setStatus('idle');
    setSnapshot(null);
    setMessage('The session access key and protected data were cleared from memory.');
  }, []);

  const value = useMemo<BackendAccessContextValue>(
    () => ({
      accessKey,
      status,
      message,
      snapshot,
      setAccessKey,
      testAccess: runProtectedCheck,
      refreshProtectedData: runProtectedCheck,
      clearAccess,
    }),
    [accessKey, clearAccess, message, runProtectedCheck, setAccessKey, snapshot, status],
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
