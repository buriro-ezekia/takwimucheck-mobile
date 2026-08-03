// Provides a guarded RevenueCat integration for native TakwimuCheck builds.

import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_ENTITLEMENT_ID = 'takwimucheck_pro';

export type RevenueCatState =
  | 'ready'
  | 'not-configured'
  | 'unsupported-platform'
  | 'unavailable';

export interface RevenueCatSnapshot {
  state: RevenueCatState;
  configured: boolean;
  entitlementActive: boolean;
  currentOfferingAvailable: boolean;
  packageCount: number;
  platform: string;
  message: string;
  updatedAt: string;
}

export interface PaywallOutcome {
  result: PAYWALL_RESULT;
  snapshot: RevenueCatSnapshot;
}

function isNativePurchasePlatform(): boolean {
  return Platform.OS === 'android' || Platform.OS === 'ios';
}

function getPublicApiKey(): string | undefined {
  if (Platform.OS === 'android') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ||
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim()
    );
  }

  if (Platform.OS === 'ios') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ||
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim()
    );
  }

  return undefined;
}

function entitlementIsActive(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[REVENUECAT_ENTITLEMENT_ID]);
}

function createSnapshot(
  values: Partial<Omit<RevenueCatSnapshot, 'platform' | 'updatedAt'>>,
): RevenueCatSnapshot {
  return {
    state: values.state ?? 'unavailable',
    configured: values.configured ?? false,
    entitlementActive: values.entitlementActive ?? false,
    currentOfferingAvailable: values.currentOfferingAvailable ?? false,
    packageCount: values.packageCount ?? 0,
    message: values.message ?? 'RevenueCat status is unavailable.',
    platform: Platform.OS,
    updatedAt: new Date().toISOString(),
  };
}

async function ensureRevenueCatConfigured(): Promise<RevenueCatSnapshot | null> {
  if (!isNativePurchasePlatform()) {
    return createSnapshot({
      state: 'unsupported-platform',
      message:
        'Native in-app purchases are available in Android and iOS builds. The TakwimuCheck web preview does not initiate store purchases.',
    });
  }

  const apiKey = getPublicApiKey();
  if (!apiKey) {
    return createSnapshot({
      state: 'not-configured',
      message:
        'Add a RevenueCat public SDK key to the local environment before testing purchases.',
    });
  }

  const alreadyConfigured = await Purchases.isConfigured();
  if (!alreadyConfigured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    Purchases.configure({ apiKey });
  }

  return null;
}

export async function getRevenueCatSnapshot(): Promise<RevenueCatSnapshot> {
  try {
    const configurationBlocker = await ensureRevenueCatConfigured();
    if (configurationBlocker) {
      return configurationBlocker;
    }

    const [customerInfo, offerings] = await Promise.all([
      Purchases.getCustomerInfo(),
      Purchases.getOfferings(),
    ]);

    const packageCount = offerings.current?.availablePackages.length ?? 0;

    return createSnapshot({
      state: 'ready',
      configured: true,
      entitlementActive: entitlementIsActive(customerInfo),
      currentOfferingAvailable: Boolean(offerings.current),
      packageCount,
      message: offerings.current
        ? 'RevenueCat is connected and the current offering is available.'
        : 'RevenueCat is connected, but no current offering is available yet.',
    });
  } catch (error) {
    return createSnapshot({
      state: 'unavailable',
      message: formatRevenueCatError(error),
    });
  }
}

export async function presentProPaywall(): Promise<PaywallOutcome> {
  const configurationBlocker = await ensureRevenueCatConfigured();
  if (configurationBlocker) {
    throw new Error(configurationBlocker.message);
  }

  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: REVENUECAT_ENTITLEMENT_ID,
  });

  return {
    result,
    snapshot: await getRevenueCatSnapshot(),
  };
}

export async function restoreRevenueCatPurchases(): Promise<RevenueCatSnapshot> {
  const configurationBlocker = await ensureRevenueCatConfigured();
  if (configurationBlocker) {
    throw new Error(configurationBlocker.message);
  }

  const customerInfo = await Purchases.restorePurchases();
  const offerings = await Purchases.getOfferings();

  return createSnapshot({
    state: 'ready',
    configured: true,
    entitlementActive: entitlementIsActive(customerInfo),
    currentOfferingAvailable: Boolean(offerings.current),
    packageCount: offerings.current?.availablePackages.length ?? 0,
    message: entitlementIsActive(customerInfo)
      ? 'Purchases were restored and TakwimuCheck Pro is active.'
      : 'Restore completed, but no active TakwimuCheck Pro entitlement was found.',
  });
}

export function paywallResultMessage(result: PAYWALL_RESULT): string {
  switch (result) {
    case PAYWALL_RESULT.PURCHASED:
      return 'Purchase completed. TakwimuCheck Pro access is being refreshed.';
    case PAYWALL_RESULT.RESTORED:
      return 'Purchases restored. TakwimuCheck Pro access is being refreshed.';
    case PAYWALL_RESULT.CANCELLED:
      return 'The purchase flow was cancelled. No charge was made.';
    case PAYWALL_RESULT.NOT_PRESENTED:
      return 'The paywall was not presented because Pro access may already be active.';
    case PAYWALL_RESULT.ERROR:
      return 'RevenueCat could not complete the paywall flow.';
    default:
      return 'The paywall flow finished.';
  }
}

export function formatRevenueCatError(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return 'RevenueCat could not be reached. Check the public SDK key, offering and internet connection.';
}
