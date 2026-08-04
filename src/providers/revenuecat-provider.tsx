// Shares RevenueCat entitlement and purchase actions across TakwimuCheck screens.

import {
  PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  RevenueCatSnapshot,
  formatRevenueCatError,
  getRevenueCatSnapshot,
  paywallResultMessage,
  presentProPaywall,
  restoreRevenueCatPurchases,
} from '@/services/revenuecat';

interface RevenueCatContextValue {
  snapshot: RevenueCatSnapshot;
  loading: boolean;
  actionInProgress: boolean;
  refresh: () => Promise<RevenueCatSnapshot>;
  showPaywall: () => Promise<string>;
  restorePurchases: () => Promise<string>;
}

const initialSnapshot: RevenueCatSnapshot = {
  state: 'not-configured',
  configured: false,
  entitlementActive: false,
  currentOfferingAvailable: false,
  packageCount: 0,
  platform: 'unknown',
  message: 'RevenueCat has not been checked yet.',
  updatedAt: new Date(0).toISOString(),
};

const RevenueCatContext = createContext<RevenueCatContextValue | undefined>(undefined);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const [snapshot, setSnapshot] = useState<RevenueCatSnapshot>(initialSnapshot);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const nextSnapshot = await getRevenueCatSnapshot();
    setSnapshot(nextSnapshot);
    setLoading(false);
    return nextSnapshot;
  }, []);

  useEffect(() => {
    void refresh();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refresh();
      }
    });

    return () => subscription.remove();
  }, [refresh]);

  const showPaywall = useCallback(async () => {
    setActionInProgress(true);

    try {
      const outcome = await presentProPaywall();
      setSnapshot(outcome.snapshot);
      return paywallResultMessage(outcome.result);
    } catch (error) {
      return formatRevenueCatError(error);
    } finally {
      setActionInProgress(false);
    }
  }, []);

  const restorePurchases = useCallback(async () => {
    setActionInProgress(true);

    try {
      const nextSnapshot = await restoreRevenueCatPurchases();
      setSnapshot(nextSnapshot);
      return nextSnapshot.message;
    } catch (error) {
      return formatRevenueCatError(error);
    } finally {
      setActionInProgress(false);
    }
  }, []);

  const value = useMemo(
    () => ({
      snapshot,
      loading,
      actionInProgress,
      refresh,
      showPaywall,
      restorePurchases,
    }),
    [snapshot, loading, actionInProgress, refresh, showPaywall, restorePurchases],
  );

  return <RevenueCatContext.Provider value={value}>{children}</RevenueCatContext.Provider>;
}

export function useRevenueCat(): RevenueCatContextValue {
  const context = useContext(RevenueCatContext);

  if (!context) {
    throw new Error('useRevenueCat must be used within RevenueCatProvider.');
  }

  return context;
}
