// Presents configuration, backend readiness, privacy and live RevenueCat information.

import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useRevenueCat } from '@/providers/revenuecat-provider';
import {
  BackendConnectionSnapshot,
  checkBackendConnection,
  describeApiError,
  getApiConfiguration,
} from '@/services/api';
import { REVENUECAT_ENTITLEMENT_ID } from '@/services/revenuecat';

type BackendCheckState =
  | { status: 'idle'; message: string; snapshot: null }
  | { status: 'checking'; message: string; snapshot: null }
  | { status: 'success'; message: string; snapshot: BackendConnectionSnapshot }
  | { status: 'error'; message: string; snapshot: null };

const initialBackendState: BackendCheckState = {
  status: 'idle',
  message: 'Run a connection test to verify the configured backend.',
  snapshot: null,
};

export default function SettingsScreen() {
  const apiConfiguration = getApiConfiguration();
  const [backendCheck, setBackendCheck] = useState<BackendCheckState>(initialBackendState);
  const { snapshot, loading, actionInProgress, refresh, restorePurchases } = useRevenueCat();

  const handleBackendCheck = async () => {
    setBackendCheck({
      status: 'checking',
      message: 'Contacting the health, version and runtime-status endpoints…',
      snapshot: null,
    });

    try {
      const nextSnapshot = await checkBackendConnection();
      setBackendCheck({
        status: 'success',
        message: 'The TakwimuCheck backend responded successfully.',
        snapshot: nextSnapshot,
      });
    } catch (error) {
      const message = describeApiError(error);
      setBackendCheck({ status: 'error', message, snapshot: null });
      Alert.alert('Backend connection', message);
    }
  };

  const handleRestore = async () => {
    const message = await restorePurchases();
    Alert.alert('Restore purchases', message);
  };

  const handleRefresh = async () => {
    const nextSnapshot = await refresh();
    Alert.alert('RevenueCat status', nextSnapshot.message);
  };

  const showDeletionPlaceholder = () => {
    Alert.alert(
      'Deletion workflow is planned',
      'The production app will provide explicit project deletion and account deletion once authentication and backend orchestration are connected.',
    );
  };

  const backendStatus = getBackendStatusLabel(apiConfiguration.configured, backendCheck.status);
  const backendTone = getBackendStatusTone(apiConfiguration.configured, backendCheck.status);

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
            subtitle="Verify the backend, review subscription state and confirm the controls required before production survey data is introduced."
          />

          <DashboardCard title="Backend connection">
            <SettingRow label="Status" value={backendStatus} tone={backendTone} />
            <SettingRow
              label="API base URL"
              value={apiConfiguration.baseUrl ?? 'Add EXPO_PUBLIC_API_BASE_URL to .env.local'}
            />

            {backendCheck.snapshot ? (
              <>
                <SettingRow label="Service" value={backendCheck.snapshot.service} />
                <SettingRow label="Version" value={backendCheck.snapshot.version} />
                <SettingRow
                  label="Protected storage routes"
                  value={backendCheck.snapshot.protectedStorageRoutes ? 'Enabled' : 'Disabled'}
                  tone={backendCheck.snapshot.protectedStorageRoutes ? 'success' : 'neutral'}
                />
                <SettingRow
                  label="CORS"
                  value={backendCheck.snapshot.corsEnabled ? 'Enabled' : 'Disabled'}
                />
                <SettingRow
                  label="Last successful check"
                  value={new Date(backendCheck.snapshot.checkedAt).toLocaleString()}
                />
              </>
            ) : null}

            <Text
              style={[
                styles.helperText,
                backendCheck.status === 'error' && styles.errorHelperText,
              ]}>
              {backendCheck.message}
            </Text>
            <Text style={styles.helperText}>
              This readiness check sends no survey records. The demonstration workflow remains local
              and synthetic until upload and authentication are connected.
            </Text>
            <PrimaryButton
              label={backendCheck.status === 'checking' ? 'Testing connection…' : 'Test backend connection'}
              variant="secondary"
              disabled={backendCheck.status === 'checking'}
              onPress={handleBackendCheck}
            />
          </DashboardCard>

          <DashboardCard title="RevenueCat purchases">
            <SettingRow
              label="SDK status"
              value={
                loading
                  ? 'Checking'
                  : snapshot.configured
                    ? 'Configured'
                    : snapshot.state === 'unsupported-platform'
                      ? 'Native build required'
                      : 'Not configured'
              }
              tone={snapshot.configured ? 'success' : 'warning'}
            />
            <SettingRow label="Platform" value={snapshot.platform} />
            <SettingRow label="Entitlement" value={REVENUECAT_ENTITLEMENT_ID} />
            <SettingRow
              label="Current offering"
              value={snapshot.currentOfferingAvailable ? 'Available' : 'Not available'}
              tone={snapshot.currentOfferingAvailable ? 'success' : 'warning'}
            />
            <SettingRow label="Packages found" value={String(snapshot.packageCount)} />
            <SettingRow
              label="Pro access"
              value={snapshot.entitlementActive ? 'Active' : 'Inactive'}
              tone={snapshot.entitlementActive ? 'success' : 'neutral'}
            />
            <Text style={styles.helperText}>{snapshot.message}</Text>
            <PrimaryButton
              label={actionInProgress ? 'Please wait…' : 'Restore purchases'}
              variant="secondary"
              disabled={actionInProgress}
              onPress={handleRestore}
            />
            <PrimaryButton
              label={loading ? 'Refreshing…' : 'Refresh purchase status'}
              variant="secondary"
              disabled={loading || actionInProgress}
              onPress={handleRefresh}
            />
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

function getBackendStatusLabel(
  configured: boolean,
  status: BackendCheckState['status'],
): string {
  if (!configured) return 'Not configured';
  if (status === 'checking') return 'Checking';
  if (status === 'success') return 'Reachable';
  if (status === 'error') return 'Unavailable';
  return 'Configured — not tested';
}

function getBackendStatusTone(
  configured: boolean,
  status: BackendCheckState['status'],
): SettingTone {
  if (status === 'success') return 'success';
  if (!configured || status === 'error') return 'error';
  return 'warning';
}

type SettingTone = 'neutral' | 'success' | 'warning' | 'error';

function SettingRow({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  tone?: SettingTone;
}) {
  return (
    <View style={styles.settingRow}>
      <Text style={styles.settingLabel}>{label}</Text>
      <Text
        style={[
          styles.settingValue,
          tone === 'success' && styles.successText,
          tone === 'warning' && styles.warningText,
          tone === 'error' && styles.errorText,
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
  errorText: {
    color: Colours.error,
  },
  helperText: {
    color: Colours.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  errorHelperText: {
    color: Colours.error,
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
