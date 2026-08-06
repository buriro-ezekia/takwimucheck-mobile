// Shares RevenueCat state for the currently authenticated TakwimuCheck account.

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

import { useBackendAccess } from '@/providers/backend-access-provider';
import {
  RevenueCatSnapshot,
  disconnectRevenueCatCustomer,
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
  state: 'signed-out',
  configured: false,
  entitlementActive: false,
  currentOfferingAvailable: false,
  packageCount: 0,
  platform: 'unknown',
  appUserId: '',
  identifiedCustomer: false,
  purchaseActionsSupported: false,
  message: 'Sign in before checking TakwimuCheck Pro.',
  updatedAt: new Date(0).toISOString(),
};

const RevenueCatContext = createContext<RevenueCatContextValue | undefined>(undefined);

export function RevenueCatProvider({ children }: PropsWithChildren) {
  const { user, signedIn, refreshServerEntitlement } = useBackendAccess();
  const appUserId = user?.revenuecat_app_user_id ?? '';
  const [snapshot, setSnapshot] = useState<RevenueCatSnapshot>(initialSnapshot);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const nextSnapshot = await getRevenueCatSnapshot(appUserId);
    setSnapshot(nextSnapshot);
    setLoading(false);
    return nextSnapshot;
  }, [appUserId]);

  useEffect(() => {
    if (!signedIn || !appUserId) {
      setSnapshot(initialSnapshot);
      setLoading(false);
      void disconnectRevenueCatCustomer();
      return;
    }
    void refresh();
    void refreshServerEntitlement(false);
  }, [appUserId, refresh, refreshServerEntitlement, signedIn]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && signedIn && appUserId) {
        void refresh();
        void refreshServerEntitlement(false);
      }
    });
    return () => subscription.remove();
  }, [appUserId, refresh, refreshServerEntitlement, signedIn]);

  const showPaywall = useCallback(async () => {
    setActionInProgress(true);
    try {
      if (!appUserId) return 'Sign in before opening subscription options.';
      const outcome = await presentProPaywall(appUserId);
      setSnapshot(outcome.snapshot);
      await refreshServerEntitlement(true);
      return paywallResultMessage(outcome.result);
    } catch (error) {
      return formatRevenueCatError(error);
    } finally {
      setActionInProgress(false);
    }
  }, [appUserId, refreshServerEntitlement]);

  const restorePurchases = useCallback(async () => {
    setActionInProgress(true);
    try {
      if (!appUserId) return 'Sign in before restoring purchases.';
      const nextSnapshot = await restoreRevenueCatPurchases(appUserId);
      setSnapshot(nextSnapshot);
      await refreshServerEntitlement(true);
      return nextSnapshot.message;
    } catch (error) {
      return formatRevenueCatError(error);
    } finally {
      setActionInProgress(false);
    }
  }, [appUserId, refreshServerEntitlement]);

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
  if (!context) throw new Error('useRevenueCat must be used within RevenueCatProvider.');
  return context;
}
