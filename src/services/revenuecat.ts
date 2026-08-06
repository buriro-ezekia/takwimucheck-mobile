// Provides identified cross-platform RevenueCat entitlement access for TakwimuCheck.

import { Platform } from 'react-native';
import Purchases, { CustomerInfo, LOG_LEVEL } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';

export const REVENUECAT_ENTITLEMENT_ID = 'TakwimuCheck Pro';

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
  appUserId: string;
  identifiedCustomer: boolean;
  purchaseActionsSupported: boolean;
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

  if (Platform.OS === 'web') {
    return (
      process.env.EXPO_PUBLIC_REVENUECAT_WEB_API_KEY?.trim() ||
      process.env.EXPO_PUBLIC_REVENUECAT_API_KEY?.trim()
    );
  }

  return undefined;
}

function getConfiguredAppUserId(): string | undefined {
  return process.env.EXPO_PUBLIC_REVENUECAT_APP_USER_ID?.trim() || undefined;
}

function appUserIdIsValid(value: string): boolean {
  if (value.length < 24 || value.length > 128) return false;
  if (value.startsWith('$RCAnonymousID:')) return false;
  if (value.includes('@') || /\s/.test(value)) return false;
  return /^[A-Za-z0-9_.:-]+$/.test(value);
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
    appUserId: values.appUserId ?? '',
    identifiedCustomer: values.identifiedCustomer ?? false,
    purchaseActionsSupported:
      values.purchaseActionsSupported ?? isNativePurchasePlatform(),
    message: values.message ?? 'RevenueCat status is unavailable.',
    platform: Platform.OS,
    updatedAt: new Date().toISOString(),
  };
}

async function ensureRevenueCatConfigured(): Promise<RevenueCatSnapshot | null> {
  if (!['android', 'ios', 'web'].includes(Platform.OS)) {
    return createSnapshot({
      state: 'unsupported-platform',
      message: `RevenueCat is not supported on ${Platform.OS}.`,
    });
  }

  const apiKey = getPublicApiKey();
  if (!apiKey) {
    return createSnapshot({
      state: 'not-configured',
      message:
        'Add the appropriate RevenueCat public SDK key to the local environment before checking subscriptions.',
    });
  }

  const appUserId = getConfiguredAppUserId();
  if (!appUserId || !appUserIdIsValid(appUserId)) {
    return createSnapshot({
      state: 'not-configured',
      message:
        'Add one shared, non-guessable RevenueCat App User ID to EXPO_PUBLIC_REVENUECAT_APP_USER_ID for the controlled pilot.',
    });
  }

  const alreadyConfigured = await Purchases.isConfigured();
  if (!alreadyConfigured) {
    Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO);
    Purchases.configure({ apiKey, appUserID: appUserId });
  } else {
    const currentAppUserId = await Purchases.getAppUserID();
    if (currentAppUserId !== appUserId) {
      await Purchases.logIn(appUserId);
    }
  }

  return null;
}

export async function getRevenueCatSnapshot(): Promise<RevenueCatSnapshot> {
  try {
    const configurationBlocker = await ensureRevenueCatConfigured();
    if (configurationBlocker) {
      return configurationBlocker;
    }

    const customerInfo = await Purchases.getCustomerInfo();
    const appUserId = await Purchases.getAppUserID();

    let currentOfferingAvailable = false;
    let packageCount = 0;
    try {
      const offerings = await Purchases.getOfferings();
      currentOfferingAvailable = Boolean(offerings.current);
      packageCount = offerings.current?.availablePackages.length ?? 0;
    } catch {
      // Entitlement reads remain useful on web even when native offerings are unavailable.
    }

    const active = entitlementIsActive(customerInfo);
    const platformMessage =
      Platform.OS === 'web'
        ? active
          ? 'The browser is identified as the same RevenueCat customer and TakwimuCheck Pro is active.'
          : 'The browser is identified, but TakwimuCheck Pro is not active for this customer.'
        : currentOfferingAvailable
          ? 'RevenueCat is connected and the current offering is available.'
          : 'RevenueCat is connected, but no current offering is available yet.';

    return createSnapshot({
      state: 'ready',
      configured: true,
      entitlementActive: active,
      currentOfferingAvailable,
      packageCount,
      appUserId,
      identifiedCustomer: !appUserId.startsWith('$RCAnonymousID:'),
      purchaseActionsSupported: isNativePurchasePlatform(),
      message: platformMessage,
    });
  } catch (error) {
    return createSnapshot({
      state: 'unavailable',
      message: formatRevenueCatError(error),
    });
  }
}

export async function presentProPaywall(): Promise<PaywallOutcome> {
  if (!isNativePurchasePlatform()) {
    throw new Error(
      'Subscription purchases are completed in the Android or iOS app. Refresh the browser after the same identified customer is active on mobile.',
    );
  }

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
  if (!isNativePurchasePlatform()) {
    throw new Error(
      'Purchase restoration is available in the Android or iOS app. The browser reads entitlement access through the shared App User ID.',
    );
  }

  const configurationBlocker = await ensureRevenueCatConfigured();
  if (configurationBlocker) {
    throw new Error(configurationBlocker.message);
  }

  const customerInfo = await Purchases.restorePurchases();
  const offerings = await Purchases.getOfferings();
  const appUserId = await Purchases.getAppUserID();

  return createSnapshot({
    state: 'ready',
    configured: true,
    entitlementActive: entitlementIsActive(customerInfo),
    currentOfferingAvailable: Boolean(offerings.current),
    packageCount: offerings.current?.availablePackages.length ?? 0,
    appUserId,
    identifiedCustomer: !appUserId.startsWith('$RCAnonymousID:'),
    purchaseActionsSupported: true,
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

  return 'RevenueCat could not be reached. Check the public SDK key, shared App User ID, offering and internet connection.';
}
