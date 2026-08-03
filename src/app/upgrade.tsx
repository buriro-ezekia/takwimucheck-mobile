// Previews the TakwimuCheck subscription boundary before RevenueCat is connected.

import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';

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
  const showPlaceholder = () => {
    Alert.alert(
      'RevenueCat integration pending',
      'The native purchase flow will be connected after the product shell is verified on Android. No purchase has been attempted.',
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Subscription preview"
            title="Unlock TakwimuCheck Pro"
            subtitle="The production app will offer monthly and annual plans through RevenueCat while one entitlement controls Pro access."
          />

          <View style={styles.statusCard}>
            <Text style={styles.statusTitle}>Integration status</Text>
            <Text style={styles.statusText}>
              Product shell only. Purchases are disabled until the RevenueCat SDK, Test Store products,
              paywall and entitlement verification are implemented in a native development build.
            </Text>
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
            <Text style={styles.entitlementLabel}>Planned entitlement identifier</Text>
            <Text style={styles.entitlementValue}>takwimucheck_pro</Text>
            <Text style={styles.entitlementHelp}>
              Both monthly and annual products will unlock the same Pro entitlement.
            </Text>
          </View>

          <PrimaryButton label="Preview purchase step" onPress={showPlaceholder} />
          <PrimaryButton
            label="Restore purchases"
            variant="secondary"
            onPress={showPlaceholder}
          />

          <Text style={styles.footerText}>
            Subscription prices will be loaded from the active RevenueCat offering rather than
            hard-coded in the app.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    backgroundColor: Colours.warningSoft,
    borderRadius: 18,
    padding: 18,
    gap: 6,
  },
  statusTitle: {
    color: Colours.warning,
    fontSize: 15,
    fontWeight: '800',
  },
  statusText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 21,
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
