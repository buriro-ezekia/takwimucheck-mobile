// Presents configuration, privacy and purchase-readiness information for TakwimuCheck.

import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { getApiConfiguration } from '@/services/api';

export default function SettingsScreen() {
  const apiConfiguration = getApiConfiguration();

  const showRestorePlaceholder = () => {
    Alert.alert(
      'Restore purchases is not active yet',
      'This action will call RevenueCat after the native SDK integration milestone is complete.',
    );
  };

  const showDeletionPlaceholder = () => {
    Alert.alert(
      'Deletion workflow is planned',
      'The production app will provide explicit project deletion and account deletion once authentication and backend orchestration are connected.',
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
            eyebrow="Application settings"
            title="Configuration and safeguards"
            subtitle="Review the current development environment and the controls planned before production data is introduced."
          />

          <DashboardCard title="Backend connection">
            <SettingRow
              label="Status"
              value={apiConfiguration.configured ? 'Configured' : 'Not configured'}
              tone={apiConfiguration.configured ? 'success' : 'warning'}
            />
            <SettingRow
              label="API base URL"
              value={apiConfiguration.baseUrl ?? 'Add EXPO_PUBLIC_API_BASE_URL to a local .env file'}
            />
            <Text style={styles.helperText}>
              The current product shell uses only synthetic local data and does not send records to a server.
            </Text>
          </DashboardCard>

          <DashboardCard title="Data safeguards">
            <SafeguardItem
              title="Synthetic demo by default"
              description="The public demonstration contains no respondent or institutional data."
            />
            <SafeguardItem
              title="Raw data remains separate"
              description="The connected architecture will keep raw uploads, standardised data, issue registers and review logs distinct."
            />
            <SafeguardItem
              title="No silent substantive corrections"
              description="Reviewers will approve proposed corrections before corrected outputs are generated."
            />
            <SafeguardItem
              title="Explicit deletion controls"
              description="Project and account deletion will be visible application actions, not support-only procedures."
            />
          </DashboardCard>

          <DashboardCard title="Purchases">
            <SettingRow label="RevenueCat SDK" value="Not installed" tone="warning" />
            <SettingRow label="Entitlement" value="takwimucheck_pro" />
            <SettingRow label="Products" value="Monthly and annual subscriptions planned" />
            <PrimaryButton
              label="Restore purchases"
              variant="secondary"
              onPress={showRestorePlaceholder}
            />
          </DashboardCard>

          <DashboardCard title="Connectivity behaviour">
            <SafeguardItem
              title="Low-connectivity optimised"
              description="Project summaries and review context will be cached where practical."
            />
            <SafeguardItem
              title="Internet-required actions"
              description="Upload, validation, report exports and purchases will require a live connection."
            />
          </DashboardCard>

          <PrimaryButton
            label="Preview deletion control"
            variant="danger"
            onPress={showDeletionPlaceholder}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'success' | 'warning';
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text
        style={[
          styles.settingValue,
          tone === 'success' && styles.successText,
          tone === 'warning' && styles.warningText,
        ]}>
        {value}
      </Text>
    </View>
  );
}

function SafeguardItem({ title, description }: { title: string; description: string }) {
  return (
    <View style={styles.safeguardItem}>
      <View style={styles.safeguardMark}>
        <Text style={styles.safeguardMarkText}>✓</Text>
      </View>
      <View style={styles.safeguardCopy}>
        <Text style={styles.safeguardTitle}>{title}</Text>
        <Text style={styles.safeguardDescription}>{description}</Text>
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
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    borderTopColor: Colours.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  settingLabel: {
    color: Colours.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  settingValue: {
    flex: 1,
    color: Colours.text,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  successText: {
    color: Colours.success,
  },
  warningText: {
    color: Colours.warning,
  },
  helperText: {
    color: Colours.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  safeguardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderTopColor: Colours.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  safeguardMark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colours.successSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  safeguardMarkText: {
    color: Colours.success,
    fontSize: 13,
    fontWeight: '900',
  },
  safeguardCopy: {
    flex: 1,
    gap: 3,
  },
  safeguardTitle: {
    color: Colours.text,
    fontSize: 14,
    fontWeight: '800',
  },
  safeguardDescription: {
    color: Colours.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
});
