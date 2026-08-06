// Presents persistent review history and gates full audit export with TakwimuCheck Pro.

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
  const { accessKey, snapshot: protectedSnapshot } = useBackendAccess();
  const {
    snapshot: revenueCatSnapshot,
    loading: revenueCatLoading,
    actionInProgress,
    refresh: refreshRevenueCat,
    showPaywall,
    restorePurchases,
  } = useRevenueCat();

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

  const unlockExport = async () => {
    const message = await showPaywall();
    const latest = await refreshRevenueCat();
    Alert.alert(
      latest.entitlementActive ? 'TakwimuCheck Pro active' : 'TakwimuCheck Pro',
      latest.entitlementActive
        ? 'Full review-audit export is now unlocked.'
        : message,
    );
  };

  const restore = async () => {
    const message = await restorePurchases();
    Alert.alert('Restore purchases', message);
  };

  const openExport = async () => {
    if (!runId || openingExport) return;
    if (!revenueCatSnapshot.entitlementActive) {
      Alert.alert(
        'TakwimuCheck Pro required',
        'Activate or restore TakwimuCheck Pro before exporting the complete persistent review audit.',
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
      const downloadUrl = buildReviewAuditDownloadUrl(link.download_path);
      if (pendingWindow) {
        pendingWindow.location.href = downloadUrl;
      } else {
        await Linking.openURL(downloadUrl);
      }
    } catch (error) {
      pendingWindow?.close();
      Alert.alert('Export review audit', describeApiError(error));
    } finally {
      setOpeningExport(false);
    }
  };

  if (!protectedSnapshot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <AppHeader
              showBack
              eyebrow="Review audit"
              title="Protected access required"
              subtitle="Authorise the controlled-pilot backend session before reading review history."
            />
            <DashboardCard title="Access required">
              <PrimaryButton
                label="Open backend access settings"
                onPress={() => router.replace('/settings')}
              />
            </DashboardCard>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Review audit"
            title="Persistent human-decision history"
            subtitle="Inspect append-only decisions for the validation run and export the complete audit with TakwimuCheck Pro."
          />

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Privacy-minimised audit</Text>
            <Text style={styles.noticeText}>
              The audit records reviewer actions, reasons, statuses and correction proposals. Original
              observed respondent values are not included.
            </Text>
          </View>

          <DashboardCard title="Selected validation run">
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

              <DashboardCard
                title={`Decision history — ${history.total}`}
                description="Newest decisions appear first and remain available after the app restarts.">
                {history.decisions.length > 0 ? (
                  history.decisions.map((decision) => (
                    <DecisionCard key={decision.decision_id} decision={decision} />
                  ))
                ) : (
                  <Text style={styles.helperText}>
                    No persistent review decisions have been recorded for this run.
                  </Text>
                )}
              </DashboardCard>
            </>
          ) : null}

          <DashboardCard
            title="Complete review-audit export"
            description="CSV export is a meaningful TakwimuCheck Pro capability controlled by the active RevenueCat entitlement.">
            <View
              style={[
                styles.entitlementCard,
                revenueCatSnapshot.entitlementActive
                  ? styles.entitlementActive
                  : styles.entitlementInactive,
              ]}>
              <Text
                style={[
                  styles.entitlementTitle,
                  revenueCatSnapshot.entitlementActive && styles.entitlementTitleActive,
                ]}>
                {revenueCatLoading
                  ? 'Checking TakwimuCheck Pro…'
                  : revenueCatSnapshot.entitlementActive
                    ? 'TakwimuCheck Pro active'
                    : 'TakwimuCheck Pro required'}
              </Text>
              <Text style={styles.entitlementText}>
                {revenueCatSnapshot.entitlementActive
                  ? 'The signed full review-audit CSV is unlocked for this account.'
                  : 'Issue review remains available, while complete audit export requires the Pro entitlement.'}
              </Text>
            </View>

            {revenueCatSnapshot.entitlementActive ? (
              <PrimaryButton
                label={openingExport ? 'Preparing signed audit export…' : 'Export complete review audit'}
                disabled={openingExport || !history}
                onPress={openExport}
              />
            ) : (
              <>
                <PrimaryButton
                  label={actionInProgress ? 'Opening paywall…' : 'Unlock with TakwimuCheck Pro'}
                  disabled={actionInProgress || revenueCatLoading}
                  onPress={unlockExport}
                />
                <PrimaryButton
                  label={actionInProgress ? 'Checking purchases…' : 'Restore purchases'}
                  variant="secondary"
                  disabled={actionInProgress || revenueCatLoading}
                  onPress={restore}
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

function DecisionCard({ decision }: { decision: ReviewDecisionRecord }) {
  return (
    <View style={styles.decisionCard}>
      <View style={styles.decisionHeading}>
        <View style={styles.decisionCopy}>
          <Text style={styles.decisionAction}>{humanise(decision.action)}</Text>
          <Text style={styles.decisionIssue}>{decision.issue_id}</Text>
        </View>
        <Text style={styles.statusPill}>{humanise(decision.review_status)}</Text>
      </View>
      <DetailRow label="Reviewer" value={decision.reviewer || 'Not recorded'} />
      <DetailRow label="Reason" value={decision.decision_reason || 'Not recorded'} />
      {decision.proposed_value ? (
        <DetailRow label="Proposed" value={decision.proposed_value} />
      ) : null}
      <DetailRow label="Previous" value={humanise(decision.previous_status || 'open')} />
      <DetailRow label="Recorded" value={formatDate(decision.created_at)} />
    </View>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
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
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colours.surface,
    borderRadius: 14,
    padding: 16,
  },
  helperText: { color: Colours.textMuted, fontSize: 13, lineHeight: 19 },
  errorCard: { backgroundColor: Colours.errorSoft, borderRadius: 14, padding: 16, gap: 4 },
  errorTitle: { color: Colours.error, fontSize: 14, fontWeight: '800' },
  errorText: { color: Colours.error, fontSize: 13, lineHeight: 19 },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    flexGrow: 1,
    minWidth: 160,
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 4,
  },
  metricValue: { color: Colours.brandDark, fontSize: 28, fontWeight: '900' },
  metricLabel: { color: Colours.textMuted, fontSize: 13, fontWeight: '700' },
  decisionCard: { backgroundColor: Colours.background, borderRadius: 14, padding: 14, gap: 8 },
  decisionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  decisionCopy: { flex: 1, gap: 2 },
  decisionAction: { color: Colours.text, fontSize: 14, fontWeight: '800' },
  decisionIssue: { color: Colours.textMuted, fontSize: 11 },
  statusPill: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { width: 88, color: Colours.textMuted, fontSize: 12, fontWeight: '700' },
  detailValue: { flex: 1, color: Colours.text, fontSize: 12, lineHeight: 18 },
  entitlementCard: { borderRadius: 14, padding: 14, gap: 4 },
  entitlementActive: { backgroundColor: Colours.successSoft },
  entitlementInactive: { backgroundColor: Colours.warningSoft },
  entitlementTitle: { color: Colours.warning, fontSize: 14, fontWeight: '800' },
  entitlementTitleActive: { color: Colours.success },
  entitlementText: { color: Colours.text, fontSize: 12, lineHeight: 18 },
});
