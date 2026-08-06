// Presents backend readiness, authenticated session, roles and RevenueCat status.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useBackendAccess } from '@/providers/backend-access-provider';
import { useRevenueCat } from '@/providers/revenuecat-provider';
import {
  type BackendConnectionSnapshot,
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
  message: 'Run a readiness check before signing in or using protected workflows.',
  snapshot: null,
};

export default function SettingsScreen() {
  const router = useRouter();
  const apiConfiguration = getApiConfiguration();
  const [backendCheck, setBackendCheck] = useState<BackendCheckState>(initialBackendState);
  const {
    signedIn,
    restoring,
    user,
    accessExpiresAt,
    status,
    message,
    snapshot: protectedSnapshot,
    serverEntitlement,
    refreshSession,
    refreshServerEntitlement,
    refreshProtectedData,
    signOut,
  } = useBackendAccess();
  const {
    snapshot: revenueCatSnapshot,
    loading: revenueCatLoading,
    actionInProgress,
    refresh: refreshRevenueCat,
    restorePurchases,
  } = useRevenueCat();

  const handleBackendCheck = async () => {
    setBackendCheck({ status: 'checking', message: 'Checking backend capabilities…', snapshot: null });
    try {
      const nextSnapshot = await checkBackendConnection();
      setBackendCheck({
        status: 'success',
        message: 'The backend responded and reported its production security capabilities.',
        snapshot: nextSnapshot,
      });
    } catch (error) {
      const nextMessage = describeApiError(error);
      setBackendCheck({ status: 'error', message: nextMessage, snapshot: null });
      Alert.alert('Backend readiness', nextMessage);
    }
  };

  const handleRefreshSession = async () => {
    const succeeded = await refreshSession();
    Alert.alert(
      'Authenticated session',
      succeeded ? 'The access and refresh tokens were rotated successfully.' : 'The session could not be refreshed. Sign in again.',
    );
  };

  const handleProtectedRefresh = async () => {
    const result = await refreshProtectedData();
    if (result) {
      Alert.alert(
        'Protected data refreshed',
        `${result.validationRunCount} validation runs and ${result.issueCount} issues are available.`,
      );
    }
  };

  const handleServerEntitlement = async () => {
    const result = await refreshServerEntitlement(true);
    Alert.alert(
      'Server entitlement',
      result
        ? `${result.message}\nSource: ${result.source}`
        : 'The server could not verify the RevenueCat entitlement.',
    );
  };

  const handleRestore = async () => {
    const nextMessage = await restorePurchases();
    await refreshServerEntitlement(true);
    Alert.alert('Restore purchases', nextMessage);
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
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
            title="Account, security and services"
            subtitle="Verify production security capabilities, inspect your role and session, and compare device and server subscription status."
          />

          <DashboardCard title="Backend readiness">
            <SettingRow
              label="API base URL"
              value={apiConfiguration.baseUrl ?? 'Not configured'}
              tone={apiConfiguration.configured ? 'neutral' : 'error'}
            />
            {backendCheck.snapshot ? (
              <>
                <SettingRow label="Service" value={backendCheck.snapshot.service} />
                <SettingRow label="Version" value={backendCheck.snapshot.version} />
                <SettingRow
                  label="Authentication"
                  value={backendCheck.snapshot.authenticationEnabled ? 'Enabled' : 'Disabled'}
                  tone={backendCheck.snapshot.authenticationEnabled ? 'success' : 'warning'}
                />
                <SettingRow
                  label="Short-lived tokens"
                  value={backendCheck.snapshot.shortLivedAccessTokensEnabled ? 'Enabled' : 'Disabled'}
                  tone={backendCheck.snapshot.shortLivedAccessTokensEnabled ? 'success' : 'warning'}
                />
                <SettingRow
                  label="Role authorisation"
                  value={backendCheck.snapshot.roleBasedAuthorisationEnabled ? 'Enabled' : 'Disabled'}
                  tone={backendCheck.snapshot.roleBasedAuthorisationEnabled ? 'success' : 'warning'}
                />
                <SettingRow
                  label="Server RevenueCat check"
                  value={backendCheck.snapshot.serverRevenueCatVerificationEnabled ? 'Enabled' : 'Disabled'}
                  tone={backendCheck.snapshot.serverRevenueCatVerificationEnabled ? 'success' : 'warning'}
                />
              </>
            ) : null}
            <Text style={[styles.helperText, backendCheck.status === 'error' && styles.errorText]}>
              {backendCheck.message}
            </Text>
            <PrimaryButton
              label={backendCheck.status === 'checking' ? 'Checking backend…' : 'Test backend readiness'}
              variant="secondary"
              disabled={backendCheck.status === 'checking'}
              onPress={() => void handleBackendCheck()}
            />
          </DashboardCard>

          <DashboardCard
            title="Authenticated account"
            description="The app stores only the rotating refresh token in secure storage. Access tokens remain in memory and expire quickly.">
            <SettingRow
              label="Session"
              value={restoring ? 'Restoring' : signedIn ? 'Signed in' : 'Signed out'}
              tone={signedIn ? 'success' : restoring ? 'warning' : 'neutral'}
            />
            {user ? (
              <>
                <SettingRow label="Name" value={user.display_name} />
                <SettingRow label="Email" value={user.email} />
                <SettingRow label="Role" value={humanise(user.role)} tone="success" />
                <SettingRow
                  label="Access expires"
                  value={accessExpiresAt ? new Date(accessExpiresAt).toLocaleString() : 'Not available'}
                />
                <SettingRow
                  label="RevenueCat customer"
                  value={`${user.revenuecat_app_user_id.slice(0, 18)}…`}
                />
              </>
            ) : null}
            <Text style={[styles.helperText, status === 'error' && styles.errorText]}>{message}</Text>
            {signedIn ? (
              <>
                <PrimaryButton
                  label="Rotate session tokens"
                  variant="secondary"
                  onPress={() => void handleRefreshSession()}
                />
                <PrimaryButton
                  label={status === 'checking' ? 'Refreshing protected data…' : 'Refresh protected data'}
                  variant="secondary"
                  disabled={status === 'checking'}
                  onPress={() => void handleProtectedRefresh()}
                />
                {protectedSnapshot ? (
                  <SettingRow
                    label="Protected records"
                    value={`${protectedSnapshot.validationRunCount} runs · ${protectedSnapshot.issueCount} issues`}
                    tone="success"
                  />
                ) : null}
                <PrimaryButton
                  label="Sign out"
                  variant="danger"
                  onPress={() => void handleSignOut()}
                />
              </>
            ) : (
              <PrimaryButton label="Open sign in" onPress={() => router.push('/sign-in')} />
            )}
          </DashboardCard>

          <DashboardCard title="TakwimuCheck Pro verification">
            <SettingRow label="Entitlement" value={REVENUECAT_ENTITLEMENT_ID} />
            <SettingRow
              label="Device SDK"
              value={revenueCatSnapshot.entitlementActive ? 'Active' : 'Inactive'}
              tone={revenueCatSnapshot.entitlementActive ? 'success' : 'neutral'}
            />
            <SettingRow
              label="Server authority"
              value={serverEntitlement?.active ? 'Active' : serverEntitlement ? 'Inactive' : 'Not checked'}
              tone={serverEntitlement?.active ? 'success' : serverEntitlement ? 'warning' : 'neutral'}
            />
            <SettingRow
              label="Server source"
              value={serverEntitlement?.source ?? 'Not available'}
            />
            <Text style={styles.helperText}>
              The device SDK drives the purchase interface. The backend independently verifies the
              signed-in user's entitlement before issuing a complete review-audit export link.
            </Text>
            <PrimaryButton
              label="Verify entitlement on server"
              variant="secondary"
              disabled={!signedIn}
              onPress={() => void handleServerEntitlement()}
            />
            <PrimaryButton
              label={revenueCatLoading ? 'Refreshing device status…' : 'Refresh device purchase status'}
              variant="secondary"
              disabled={!signedIn || revenueCatLoading || actionInProgress}
              onPress={() => void refreshRevenueCat()}
            />
            <PrimaryButton
              label={actionInProgress ? 'Restoring purchases…' : 'Restore purchases'}
              variant="secondary"
              disabled={!signedIn || actionInProgress}
              onPress={() => void handleRestore()}
            />
          </DashboardCard>

          <DashboardCard title="Role permissions">
            <PermissionRow role="Viewer" permission="Read validation runs, findings, reports and review history" />
            <PermissionRow role="Reviewer" permission="Viewer access plus persistent issue decisions" />
            <PermissionRow role="Supervisor" permission="Reviewer access plus CSV validation and Pro audit export" />
            <PermissionRow role="Administrator" permission="Supervisor access plus user and role management" />
          </DashboardCard>

          <DashboardCard title="Safeguards">
            <SafeguardItem text="Passwords are hashed server-side and never stored in the app." />
            <SafeguardItem text="Access and refresh tokens are opaque, revocable and separately hashed in the database." />
            <SafeguardItem text="Reviewer identity is taken from the authenticated account, not editable client text." />
            <SafeguardItem text="Original observed respondent values remain excluded from mobile summaries and audit history." />
            <SafeguardItem text="RevenueCat secret keys remain server-side; mobile builds use public SDK keys only." />
          </DashboardCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type SettingTone = 'neutral' | 'success' | 'warning' | 'error';

function SettingRow({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: SettingTone }) {
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

function PermissionRow({ role, permission }: { role: string; permission: string }) {
  return (
    <View style={styles.permissionRow}>
      <Text style={styles.permissionRole}>{role}</Text>
      <Text style={styles.permissionText}>{permission}</Text>
    </View>
  );
}

function SafeguardItem({ text }: { text: string }) {
  return (
    <View style={styles.safeguardRow}>
      <Text style={styles.safeguardMark}>✓</Text>
      <Text style={styles.safeguardText}>{text}</Text>
    </View>
  );
}

function humanise(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colours.background },
  scrollContent: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 760, gap: 18 },
  helperText: { color: Colours.textMuted, fontSize: 13, lineHeight: 19 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    borderTopColor: Colours.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  settingLabel: { color: Colours.textMuted, fontSize: 13, fontWeight: '700' },
  settingValue: { flex: 1, color: Colours.text, fontSize: 13, fontWeight: '800', textAlign: 'right' },
  successText: { color: Colours.success },
  warningText: { color: Colours.warning },
  errorText: { color: Colours.error },
  permissionRow: { gap: 4, borderTopColor: Colours.border, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  permissionRole: { color: Colours.brandDark, fontSize: 14, fontWeight: '900' },
  permissionText: { color: Colours.textMuted, fontSize: 13, lineHeight: 19 },
  safeguardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  safeguardMark: { color: Colours.success, fontSize: 16, fontWeight: '900' },
  safeguardText: { flex: 1, color: Colours.text, fontSize: 13, lineHeight: 19 },
});
