// Presents persistent review history and enforces server-verified Pro audit export.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useBackendAccess } from '@/providers/backend-access-provider';
import { useRevenueCat } from '@/providers/revenuecat-provider';
import { roleAtLeast } from '@/services/auth-api';
import { describeApiError } from '@/services/api';
import {
  buildReviewAuditDownloadUrl,
  getReviewAuditExportLink,
  getReviewHistory,
  type ReviewDecisionRecord,
  type ReviewHistoryData,
} from '@/services/review-api';

export default function ReviewAuditScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string }>();
  const runId = readParam(params.runId);
  const {
    accessKey,
    signedIn,
    user,
    snapshot: protectedSnapshot,
    serverEntitlement,
    refreshServerEntitlement,
  } = useBackendAccess();
  const {
    snapshot: revenueCatSnapshot,
    loading: revenueCatLoading,
    actionInProgress,
    refresh: refreshRevenueCat,
    showPaywall,
    restorePurchases,
  } = useRevenueCat();
  const canExport = roleAtLeast(user?.role, 'supervisor');

  const [history, setHistory] = useState<ReviewHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [openingExport, setOpeningExport] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (!runId || !accessKey.trim()) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    setErrorMessage('');
    getReviewHistory(accessKey, runId, { limit: 200, offset: 0 })
      .then((result) => {
        if (active) setHistory(result);
      })
      .catch((error) => {
        if (!active) return;
        setHistory(null);
        setErrorMessage(describeApiError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [accessKey, refreshToken, runId]);

  useEffect(() => {
    if (signedIn && canExport) void refreshServerEntitlement(false);
  }, [canExport, refreshServerEntitlement, signedIn]);

  const unlockExport = async () => {
    const message = await showPaywall();
    const device = await refreshRevenueCat();
    const server = await refreshServerEntitlement(true);
    Alert.alert(
      server?.active ? 'TakwimuCheck Pro verified' : 'TakwimuCheck Pro',
      server?.active
        ? 'The device and backend now recognise Pro access for this account.'
        : device.entitlementActive
          ? 'The device reports Pro, but the backend has not verified it yet. Refresh again after RevenueCat synchronises.'
          : message,
    );
  };

  const restore = async () => {
    const message = await restorePurchases();
    const server = await refreshServerEntitlement(true);
    Alert.alert(
      'Restore purchases',
      server?.active ? `${message}\n\nThe backend also verified Pro access.` : message,
    );
  };

  const verifyOnServer = async () => {
    const result = await refreshServerEntitlement(true);
    Alert.alert(
      'Server entitlement',
      result ? `${result.message}\nSource: ${result.source}` : 'The backend could not verify the entitlement.',
    );
  };

  const openExport = async () => {
    if (!runId || openingExport) return;
    if (!canExport) {
      Alert.alert('Supervisor role required', 'Complete audit export requires the Supervisor role or higher.');
      return;
    }

    const verified = serverEntitlement?.active
      ? serverEntitlement
      : await refreshServerEntitlement(true);
    if (!verified?.active) {
      Alert.alert(
        'Server-verified Pro required',
        'Activate or restore TakwimuCheck Pro, then ask the backend to verify the entitlement again.',
      );
      return;
    }

    let pendingWindow: Window | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      pendingWindow = window.open('about:blank', '_blank');
    }

    setOpeningExport(true);
    try {
      const link = await getReviewAuditExportLink(accessKey, runId);
      if (link.entitlement?.server_verified && !link.entitlement.active) {
        throw new Error('The backend did not verify an active Pro entitlement.');
      }
      const downloadUrl = buildReviewAuditDownloadUrl(link.download_path);
      if (pendingWindow) pendingWindow.location.href = downloadUrl;
      else await Linking.openURL(downloadUrl);
    } catch (error) {
      pendingWindow?.close();
      Alert.alert('Export review audit', describeApiError(error));
    } finally {
      setOpeningExport(false);
    }
  };

  if (!signedIn || !protectedSnapshot) {
    return (
      <AccessRequired
        title="Sign in required"
        message="Sign in and refresh protected data before opening review history."
        onOpen={() => router.replace('/sign-in')}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Authenticated review audit"
            title="Persistent human-decision history"
            subtitle="Inspect append-only decisions and export only after role and RevenueCat access are verified by the backend."
          />

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Privacy-minimised audit</Text>
            <Text style={styles.noticeText}>
              Reviewer actions, reasons, statuses and correction proposals are included. Original
              observed respondent values remain excluded.
            </Text>
          </View>

          <DashboardCard title="Account and validation run">
            <DetailRow label="Account" value={user?.display_name ?? 'Unknown'} />
            <DetailRow label="Role" value={humanise(user?.role ?? '')} />
            <DetailRow label="Run ID" value={runId || 'Not provided'} />
          </DashboardCard>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colours.brand} />
              <Text style={styles.helperText}>Loading persistent review history…</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Review history could not be loaded</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {history ? (
            <>
              <View style={styles.metricRow}>
                <MetricCard label="Decisions" value={history.summary.total} />
                <MetricCard label="Issues reviewed" value={history.summary.issues_reviewed} />
                <MetricCard label="Reviewers" value={history.summary.reviewers} />
              </View>
              <DashboardCard title={`Decision history — ${history.total}`}>
                {history.decisions.length ? history.decisions.map((decision) => (
                  <DecisionCard key={decision.decision_id} decision={decision} />
                )) : <Text style={styles.helperText}>No decisions have been recorded for this run.</Text>}
              </DashboardCard>
            </>
          ) : null}

          <DashboardCard
            title="Complete review-audit export"
            description="The mobile SDK supports purchase UX; the backend is the final authority for premium export.">
            <StatusCard
              title="Device RevenueCat SDK"
              active={revenueCatSnapshot.entitlementActive}
              message={revenueCatLoading ? 'Checking device status…' : revenueCatSnapshot.message}
            />
            <StatusCard
              title="Backend entitlement authority"
              active={Boolean(serverEntitlement?.active)}
              message={serverEntitlement?.message ?? 'The backend has not verified this account yet.'}
            />
            <StatusCard
              title="Role permission"
              active={canExport}
              message={canExport ? 'Supervisor export permission is active.' : 'Supervisor role or higher is required.'}
            />

            {canExport && serverEntitlement?.active ? (
              <PrimaryButton
                label={openingExport ? 'Preparing signed export…' : 'Export complete review audit'}
                disabled={openingExport || !history}
                onPress={() => void openExport()}
              />
            ) : (
              <>
                <PrimaryButton
                  label={actionInProgress ? 'Opening RevenueCat…' : 'Unlock with TakwimuCheck Pro'}
                  disabled={!canExport || actionInProgress || revenueCatLoading}
                  onPress={() => void unlockExport()}
                />
                <PrimaryButton
                  label={actionInProgress ? 'Checking purchases…' : 'Restore purchases'}
                  variant="secondary"
                  disabled={!canExport || actionInProgress || revenueCatLoading}
                  onPress={() => void restore()}
                />
                <PrimaryButton
                  label="Verify Pro on backend"
                  variant="secondary"
                  disabled={!canExport}
                  onPress={() => void verifyOnServer()}
                />
              </>
            )}
          </DashboardCard>

          <PrimaryButton
            label="Refresh review history"
            variant="secondary"
            disabled={loading}
            onPress={() => setRefreshToken((value) => value + 1)}
          />
          <PrimaryButton
            label="Return to review queue"
            variant="secondary"
            onPress={() => router.replace({ pathname: '/review-queue', params: { runId } })}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessRequired({ title, message, onOpen }: { title: string; message: string; onOpen: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <AppHeader showBack eyebrow="Review audit" title={title} subtitle={message} />
          <DashboardCard title="Account access"><PrimaryButton label="Open sign in" onPress={onOpen} /></DashboardCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusCard({ title, active, message }: { title: string; active: boolean; message: string }) {
  return (
    <View style={[styles.statusCard, active ? styles.statusActive : styles.statusInactive]}>
      <Text style={[styles.statusTitle, active && styles.statusTitleActive]}>{title}: {active ? 'Active' : 'Not active'}</Text>
      <Text style={styles.statusMessage}>{message}</Text>
    </View>
  );
}

function DecisionCard({ decision }: { decision: ReviewDecisionRecord }) {
  return (
    <View style={styles.decisionCard}>
      <View style={styles.decisionHeading}>
        <Text style={styles.decisionAction}>{humanise(decision.action)}</Text>
        <Text style={styles.statusPill}>{humanise(decision.review_status)}</Text>
      </View>
      <DetailRow label="Reviewer" value={decision.reviewer || 'Not recorded'} />
      <DetailRow label="Reason" value={decision.decision_reason || 'Not recorded'} />
      {decision.proposed_value ? <DetailRow label="Proposed" value={decision.proposed_value} /> : null}
      <DetailRow label="Recorded" value={formatDate(decision.created_at)} />
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return <View style={styles.metricCard}><Text style={styles.metricValue}>{value}</Text><Text style={styles.metricLabel}>{label}</Text></View>;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
function humanise(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
function formatDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colours.background },
  scrollContent: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 900, gap: 18 },
  notice: { backgroundColor: Colours.infoSoft, borderRadius: 16, padding: 16, gap: 4 },
  noticeTitle: { color: Colours.info, fontSize: 14, fontWeight: '800' },
  noticeText: { color: Colours.text, fontSize: 13, lineHeight: 19 },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colours.surface, borderRadius: 14, padding: 16 },
  helperText: { color: Colours.textMuted, fontSize: 13, lineHeight: 19 },
  errorCard: { backgroundColor: Colours.errorSoft, borderRadius: 14, padding: 16, gap: 4 },
  errorTitle: { color: Colours.error, fontSize: 14, fontWeight: '800' },
  errorText: { color: Colours.error, fontSize: 13, lineHeight: 19 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: { flexGrow: 1, minWidth: 150, backgroundColor: Colours.surface, borderColor: Colours.border, borderWidth: 1, borderRadius: 16, padding: 18, gap: 4 },
  metricValue: { color: Colours.brandDark, fontSize: 28, fontWeight: '900' },
  metricLabel: { color: Colours.textMuted, fontSize: 13, fontWeight: '700' },
  decisionCard: { backgroundColor: Colours.background, borderRadius: 14, padding: 14, gap: 8 },
  decisionHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 },
  decisionAction: { flex: 1, color: Colours.text, fontSize: 14, fontWeight: '800' },
  statusPill: { color: Colours.brandDark, backgroundColor: Colours.brandSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, fontSize: 10, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { width: 96, color: Colours.textMuted, fontSize: 12, fontWeight: '700' },
  detailValue: { flex: 1, color: Colours.text, fontSize: 12, lineHeight: 18 },
  statusCard: { borderRadius: 14, padding: 14, gap: 4 },
  statusActive: { backgroundColor: Colours.successSoft },
  statusInactive: { backgroundColor: Colours.warningSoft },
  statusTitle: { color: Colours.warning, fontSize: 14, fontWeight: '800' },
  statusTitleActive: { color: Colours.success },
  statusMessage: { color: Colours.text, fontSize: 12, lineHeight: 18 },
});
