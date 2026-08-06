// Presents the live cross-platform RevenueCat subscription boundary for TakwimuCheck Pro.

import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useRevenueCat } from '@/providers/revenuecat-provider';
import { REVENUECAT_ENTITLEMENT_ID } from '@/services/revenuecat';

const freeFeatures = [
  'Synthetic demonstration project',
  'One controlled-pilot dataset up to 500 records',
  'Standard validation checks and result filters',
  'Persistent protected issue review',
  'On-screen review history',
];

const proFeatures = [
  'Complete persistent review-audit CSV export',
  'Short-lived signed export link',
  'Monthly or annual entitlement access',
  'Shared entitlement status across Android and web',
  'Future expanded project history and limits',
];

export default function UpgradeScreen() {
  const { snapshot, loading, actionInProgress, refresh, showPaywall, restorePurchases } =
    useRevenueCat();

  const handlePaywall = async () => {
    const message = await showPaywall();
    Alert.alert('TakwimuCheck Pro', message);
  };

  const handleRestore = async () => {
    const message = await restorePurchases();
    Alert.alert('Restore purchases', message);
  };

  const handleRefresh = async () => {
    const nextSnapshot = await refresh();
    Alert.alert('RevenueCat status', nextSnapshot.message);
  };

  const statusTitle = snapshot.entitlementActive
    ? 'TakwimuCheck Pro is active'
    : snapshot.state === 'ready'
      ? snapshot.purchaseActionsSupported
        ? 'Ready for a Test Store purchase'
        : 'Shared Pro access is inactive'
      : 'RevenueCat setup required';

  const subscribeLabel = snapshot.entitlementActive
    ? 'Complete audit export is unlocked'
    : !snapshot.purchaseActionsSupported
      ? 'Subscribe in the Android app'
      : actionInProgress
        ? 'Opening RevenueCat…'
        : 'View subscription options';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="RevenueCat identified customer"
            title="Unlock the complete review audit"
            subtitle="Android and web read the same entitlement through one non-guessable App User ID. Purchases remain native, while entitlement access is shared."
          />

          <View
            style={[
              styles.statusCard,
              snapshot.entitlementActive ? styles.activeStatusCard : styles.pendingStatusCard,
            ]}>
            <Text
              style={[
                styles.statusTitle,
                snapshot.entitlementActive ? styles.activeStatusTitle : styles.pendingStatusTitle,
              ]}>
              {statusTitle}
            </Text>
            <Text style={styles.statusText}>{loading ? 'Checking RevenueCat…' : snapshot.message}</Text>
            <View style={styles.statusFacts}>
              <StatusFact label="Platform" value={snapshot.platform} />
              <StatusFact
                label="Customer mode"
                value={snapshot.identifiedCustomer ? 'Identified' : 'Not identified'}
              />
              <StatusFact
                label="App User ID"
                value={snapshot.appUserId || 'Not configured'}
              />
              <StatusFact
                label="Current offering"
                value={snapshot.currentOfferingAvailable ? 'Available' : 'Not available'}
              />
              <StatusFact label="Packages" value={String(snapshot.packageCount)} />
              <StatusFact
                label="Audit export"
                value={snapshot.entitlementActive ? 'Unlocked' : 'Locked'}
              />
            </View>
          </View>

          <View style={styles.planGrid}>
            <PlanCard
              name="Pilot access"
              description="Validate, inspect and review issues without hiding the core quality-assurance workflow."
              features={freeFeatures}
            />
            <PlanCard
              name="Pro"
              description="Unlock the complete portable audit trail for supervisors and data managers."
              features={proFeatures}
              highlighted
            />
          </View>

          <View style={styles.entitlementCard}>
            <Text style={styles.entitlementLabel}>Entitlement identifier</Text>
            <Text style={styles.entitlementValue}>{REVENUECAT_ENTITLEMENT_ID}</Text>
            <Text style={styles.entitlementHelp}>
              Monthly and annual products must both unlock this entitlement. Android completes the
              Test Store purchase, while web reads the same customer entitlement using the shared
              App User ID.
            </Text>
          </View>

          <PrimaryButton
            label={subscribeLabel}
            disabled={
              snapshot.entitlementActive ||
              actionInProgress ||
              !snapshot.purchaseActionsSupported
            }
            onPress={handlePaywall}
          />
          <PrimaryButton
            label={
              snapshot.purchaseActionsSupported
                ? actionInProgress
                  ? 'Please wait…'
                  : 'Restore purchases'
                : 'Restore purchases in Android'
            }
            variant="secondary"
            disabled={actionInProgress || !snapshot.purchaseActionsSupported}
            onPress={handleRestore}
          />
          <PrimaryButton
            label={loading ? 'Refreshing…' : 'Refresh RevenueCat status'}
            variant="secondary"
            disabled={loading || actionInProgress}
            onPress={handleRefresh}
          />

          <Text style={styles.footerText}>
            Test Store purchases do not charge real money. The controlled pilot uses one shared,
            non-secret App User ID across Android and web; a public multi-user release must replace
            it with authenticated per-user identities.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusFact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statusFact}>
      <Text style={styles.statusFactLabel}>{label}</Text>
      <Text selectable style={styles.statusFactValue}>{value}</Text>
    </View>
  );
}

function PlanCard({
  name,
  description,
  features,
  highlighted = false,
}: {
  name: string;
  description: string;
  features: string[];
  highlighted?: boolean;
}) {
  return (
    <View style={[styles.planCard, highlighted && styles.highlightedPlanCard]}>
      <View style={styles.planHeading}>
        <Text style={[styles.planName, highlighted && styles.highlightedPlanName]}>{name}</Text>
        {highlighted ? <Text style={styles.recommendedBadge}>Recommended</Text> : null}
      </View>
      <Text style={styles.planDescription}>{description}</Text>
      <View style={styles.featureStack}>
        {features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <Text style={[styles.checkMark, highlighted && styles.highlightedCheckMark]}>✓</Text>
            <Text style={styles.featureText}>{feature}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  scrollContent: {
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  container: {
    width: '100%',
    maxWidth: 760,
    gap: 18,
  },
  statusCard: {
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  activeStatusCard: {
    backgroundColor: Colours.successSoft,
  },
  pendingStatusCard: {
    backgroundColor: Colours.warningSoft,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '900',
  },
  activeStatusTitle: {
    color: Colours.success,
  },
  pendingStatusTitle: {
    color: Colours.warning,
  },
  statusText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 21,
  },
  statusFacts: {
    gap: 8,
    paddingTop: 4,
  },
  statusFact: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 14,
  },
  statusFactLabel: {
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  statusFactValue: {
    flex: 1,
    color: Colours.text,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'right',
  },
  planGrid: {
    gap: 14,
  },
  planCard: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    gap: 14,
  },
  highlightedPlanCard: {
    borderColor: Colours.brand,
    borderWidth: 2,
    backgroundColor: Colours.brandSoft,
  },
  planHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  planName: {
    color: Colours.text,
    fontSize: 24,
    fontWeight: '900',
  },
  highlightedPlanName: {
    color: Colours.brandDark,
  },
  recommendedBadge: {
    color: Colours.white,
    backgroundColor: Colours.brand,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
  },
  planDescription: {
    color: Colours.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  featureStack: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  checkMark: {
    color: Colours.success,
    fontSize: 16,
    fontWeight: '900',
  },
  highlightedCheckMark: {
    color: Colours.brandDark,
  },
  featureText: {
    flex: 1,
    color: Colours.text,
    fontSize: 14,
    lineHeight: 20,
  },
  entitlementCard: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 6,
  },
  entitlementLabel: {
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  entitlementValue: {
    color: Colours.brandDark,
    fontSize: 20,
    fontWeight: '900',
    fontFamily: 'monospace',
  },
  entitlementHelp: {
    color: Colours.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  footerText: {
    color: Colours.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
});
