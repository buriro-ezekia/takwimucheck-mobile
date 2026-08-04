// Presents the live RevenueCat subscription boundary for TakwimuCheck Pro.

import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useRevenueCat } from '@/providers/revenuecat-provider';
import { REVENUECAT_ENTITLEMENT_ID } from '@/services/revenuecat';

const freeFeatures = [
  'Synthetic demonstration project',
  'One user dataset up to 500 records',
  'Standard validation checks',
  'On-screen quality summary',
];

const proFeatures = [
  'Up to 10 active projects',
  'Datasets up to 10,000 records',
  'Custom validation metadata',
  'Project history and issue review',
  'Full CSV, HTML and Excel exports',
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
      ? 'Ready for a Test Store purchase'
      : 'RevenueCat setup required';

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="RevenueCat Test Store"
            title="Unlock TakwimuCheck Pro"
            subtitle="Monthly and annual products share one entitlement, while prices and packages are loaded from the current RevenueCat offering."
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
                label="Current offering"
                value={snapshot.currentOfferingAvailable ? 'Available' : 'Not available'}
              />
              <StatusFact label="Packages" value={String(snapshot.packageCount)} />
              <StatusFact
                label="Pro access"
                value={snapshot.entitlementActive ? 'Active' : 'Inactive'}
              />
            </View>
          </View>

          <View style={styles.planGrid}>
            <PlanCard
              name="Free"
              description="Evaluate the workflow and validate a small dataset."
              features={freeFeatures}
            />
            <PlanCard
              name="Pro"
              description="For supervisors and data managers handling active survey projects."
              features={proFeatures}
              highlighted
            />
          </View>

          <View style={styles.entitlementCard}>
            <Text style={styles.entitlementLabel}>Entitlement identifier</Text>
            <Text style={styles.entitlementValue}>{REVENUECAT_ENTITLEMENT_ID}</Text>
            <Text style={styles.entitlementHelp}>
              The monthly and annual Test Store products must both unlock this entitlement.
            </Text>
          </View>

          <PrimaryButton
            label={
              snapshot.entitlementActive
                ? 'Pro access is active'
                : actionInProgress
                  ? 'Opening RevenueCat…'
                  : 'View subscription options'
            }
            disabled={snapshot.entitlementActive || actionInProgress}
            onPress={handlePaywall}
          />
          <PrimaryButton
            label={actionInProgress ? 'Please wait…' : 'Restore purchases'}
            variant="secondary"
            disabled={actionInProgress}
            onPress={handleRestore}
          />
          <PrimaryButton
            label={loading ? 'Refreshing…' : 'Refresh RevenueCat status'}
            variant="secondary"
            disabled={loading || actionInProgress}
            onPress={handleRefresh}
          />

          <Text style={styles.footerText}>
            Test Store purchases behave like subscriptions for entitlement testing but do not charge
            real money. A native development build is required for the full purchase flow.
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
      <Text style={styles.statusFactValue}>{value}</Text>
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
