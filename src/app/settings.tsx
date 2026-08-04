// Presents configuration, backend access, privacy and live RevenueCat information.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import {
  ProtectedAccessStatus,
  useBackendAccess,
} from '@/providers/backend-access-provider';
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
  const router = useRouter();
  const apiConfiguration = getApiConfiguration();
  const [backendCheck, setBackendCheck] = useState<BackendCheckState>(initialBackendState);
  const [showAccessKey, setShowAccessKey] = useState(false);
  const { snapshot, loading, actionInProgress, refresh, restorePurchases } = useRevenueCat();
  const {
    accessKey,
    setAccessKey,
    status: protectedStatus,
    message: protectedMessage,
    snapshot: protectedSnapshot,
    testAccess,
    clearAccess,
  } = useBackendAccess();

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

  const handleProtectedAccess = async () => {
    const nextSnapshot = await testAccess();

    if (nextSnapshot) {
      Alert.alert(
        'Protected backend access',
        `Access succeeded. ${nextSnapshot.validationRunCount} validation runs and ${nextSnapshot.issueCount} issues are available.`,
      );
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
  const protectedStatusLabel = getProtectedStatusLabel(protectedStatus, Boolean(accessKey.trim()));
  const protectedTone = getProtectedStatusTone(protectedStatus, Boolean(accessKey.trim()));

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
            subtitle="Verify the backend, open controlled-pilot storage routes, review subscription state and confirm safeguards before production survey data is introduced."
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
              This readiness check sends no survey records. The synthetic demonstration remains local
              until upload orchestration is connected.
            </Text>
            <PrimaryButton
              label={backendCheck.status === 'checking' ? 'Testing connection…' : 'Test backend connection'}
              variant="secondary"
              disabled={backendCheck.status === 'checking'}
              onPress={handleBackendCheck}
            />
          </DashboardCard>

          <DashboardCard
            title="Controlled-pilot protected access"
            description="Use the API key configured on the local or staging backend. The key stays only in app memory and is cleared when the app closes.">
            <SettingRow label="Session status" value={protectedStatusLabel} tone={protectedTone} />

            <View style={styles.keyFieldGroup}>
              <Text style={styles.inputLabel}>Session access key</Text>
              <View style={styles.keyInputRow}>
                <TextInput
                  accessibilityLabel="Protected backend access key"
                  value={accessKey}
                  onChangeText={setAccessKey}
                  placeholder="Enter the controlled-pilot key"
                  placeholderTextColor={Colours.textMuted}
                  secureTextEntry={!showAccessKey}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="password"
                  style={styles.keyInput}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={showAccessKey ? 'Hide access key' : 'Show access key'}
                  onPress={() => setShowAccessKey((current) => !current)}
                  style={({ pressed }) => [styles.keyToggle, pressed && styles.pressed]}>
                  <Text style={styles.keyToggleText}>{showAccessKey ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            {protectedSnapshot ? (
              <>
                <SettingRow
                  label="Validation runs"
                  value={String(protectedSnapshot.validationRunCount)}
                />
                <SettingRow label="Issues" value={String(protectedSnapshot.issueCount)} />
                <SettingRow
                  label="Last protected check"
                  value={new Date(protectedSnapshot.checkedAt).toLocaleString()}
                />
              </>
            ) : null}

            <Text
              style={[
                styles.helperText,
                protectedStatus === 'error' && styles.errorHelperText,
              ]}>
              {protectedMessage}
            </Text>
            <Text style={styles.helperText}>
              Never place this key in an EXPO_PUBLIC variable, source file, screenshot or pull-request
              comment. This controlled-pilot mechanism is not the final user identity system.
            </Text>

            <PrimaryButton
              label={protectedStatus === 'checking' ? 'Testing protected access…' : 'Test protected access'}
              disabled={protectedStatus === 'checking'}
              onPress={handleProtectedAccess}
            />

            {protectedSnapshot ? (
              <PrimaryButton
                label="View protected backend summary"
                variant="secondary"
                onPress={() => router.push('/protected-data')}
              />
            ) : null}

            {accessKey ? (
              <PrimaryButton
                label="Clear session access"
                variant="danger"
                disabled={protectedStatus === 'checking'}
                onPress={clearAccess}
              />
            ) : null}
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
              title="Memory-only pilot credential"
              description="The controlled-pilot key is never persisted, logged or included in public build configuration."
            />
            <SafeguardItem
              title="Privacy-minimised protected view"
              description="The mobile summary omits observed respondent values and displays only validation and review metadata."
            />
            <SafeguardItem
              title="Raw data remains separate"
              description="The connected architecture keeps raw uploads, standardised data, issue registers and review logs distinct."
            />
            <SafeguardItem
              title="No silent substantive corrections"
              description="Reviewers approve proposed corrections before corrected outputs are generated."
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
              description="Upload, validation, protected refreshes, report exports and purchases require a live connection."
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

function getProtectedStatusLabel(status: ProtectedAccessStatus, hasKey: boolean): string {
  if (status === 'checking') return 'Checking';
  if (status === 'success') return 'Authorised';
  if (status === 'error') return 'Access failed';
  if (hasKey) return 'Key entered — not tested';
  return 'No session key';
}

function getProtectedStatusTone(status: ProtectedAccessStatus, hasKey: boolean): SettingTone {
  if (status === 'success') return 'success';
  if (status === 'error') return 'error';
  if (hasKey || status === 'checking') return 'warning';
  return 'neutral';
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
  keyFieldGroup: {
    gap: 7,
  },
  inputLabel: {
    color: Colours.text,
    fontSize: 13,
    fontWeight: '800',
  },
  keyInputRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  keyInput: {
    flex: 1,
    minHeight: 46,
    backgroundColor: Colours.background,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
    color: Colours.text,
    fontSize: 14,
  },
  keyToggle: {
    minWidth: 62,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colours.surfaceMuted,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  keyToggleText: {
    color: Colours.brandDark,
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
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
