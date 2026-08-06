// Presents real protected issues as a review queue backed by persistent server decisions.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
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
import {
  describeApiError,
  type ProtectedIssueRecord,
  type ValidationRunRecord,
} from '@/services/api';
import {
  getFilteredValidationIssues,
  type FilteredIssueData,
} from '@/services/results-api';

const PAGE_SIZE = 100;

export default function ReviewQueueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string }>();
  const { accessKey, snapshot, message: protectedMessage } = useBackendAccess();
  const validationRuns = useMemo(
    () =>
      [...(snapshot?.validationRuns ?? [])].sort(
        (left, right) => timestamp(right.created_at) - timestamp(left.created_at),
      ),
    [snapshot?.validationRuns],
  );

  const [selectedRunId, setSelectedRunId] = useState(readParam(params.runId));
  const [selectedStatus, setSelectedStatus] = useState('');
  const [issuePage, setIssuePage] = useState<FilteredIssueData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    if (validationRuns.length === 0) {
      setSelectedRunId('');
      return;
    }
    if (!validationRuns.some((run) => readText(run.validation_run_id) === selectedRunId)) {
      setSelectedRunId(readText(validationRuns[0].validation_run_id));
    }
  }, [selectedRunId, validationRuns]);

  useEffect(() => {
    if (!selectedRunId || !accessKey.trim()) return;

    let active = true;
    setLoading(true);
    setErrorMessage('');
    getFilteredValidationIssues(accessKey, selectedRunId, {
      status: selectedStatus || undefined,
      limit: PAGE_SIZE,
      offset: 0,
    })
      .then((result) => {
        if (active) setIssuePage(result);
      })
      .catch((error) => {
        if (!active) return;
        setIssuePage(null);
        setErrorMessage(describeApiError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessKey, refreshToken, selectedRunId, selectedStatus]);

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <AppHeader
              showBack
              eyebrow="Live issue review"
              title="Protected access required"
              subtitle="Authorise the controlled-pilot backend session before reviewing real issues."
            />
            <DashboardCard title="Access required">
              <Text style={styles.helperText}>{protectedMessage}</Text>
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
            eyebrow="Live issue review"
            title="Review and resolve quality findings"
            subtitle="Select a stored validation run, open an issue and record a persistent human decision."
          />

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Human approval boundary</Text>
            <Text style={styles.noticeText}>
              Review actions update issue status and append an audit record. They never modify the
              uploaded respondent value or silently apply a proposed correction.
            </Text>
          </View>

          <DashboardCard
            title="Validation run"
            description="Runs are ordered from newest to oldest.">
            {validationRuns.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.runScroller}>
                {validationRuns.map((run, index) => {
                  const runId = readText(run.validation_run_id);
                  const selected = runId === selectedRunId;
                  return (
                    <Pressable
                      key={runId || `run-${index}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        setSelectedRunId(runId);
                        setSelectedStatus('');
                      }}
                      style={({ pressed }) => [
                        styles.runChip,
                        selected && styles.runChipSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.runTitle, selected && styles.selectedText]}>
                        {readText(run.survey_id) || 'Unnamed survey'}
                      </Text>
                      <Text style={[styles.runMeta, selected && styles.selectedText]}>
                        {formatDate(run.created_at)}
                      </Text>
                      <Text style={[styles.runMeta, selected && styles.selectedText]}>
                        {readText(run.issue_count) || '0'} issues
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <Text style={styles.helperText}>No validation runs are stored.</Text>
            )}
          </DashboardCard>

          {issuePage ? (
            <View style={styles.metricRow}>
              <MetricCard label="Matching" value={issuePage.total} />
              <MetricCard label="Open" value={issuePage.summary.open} tone="warning" />
              <MetricCard label="Errors" value={issuePage.summary.errors} tone="error" />
              <MetricCard label="Variables" value={issuePage.summary.variables_affected} />
            </View>
          ) : null}

          <DashboardCard
            title="Review status"
            description="Focus the queue by the latest persisted issue status.">
            <View style={styles.filterWrap}>
              <StatusChip
                label="All"
                selected={!selectedStatus}
                onPress={() => setSelectedStatus('')}
              />
              {(issuePage?.facets.status ?? ['open', 'accepted', 'deferred', 'rejected', 'correction_proposed']).map(
                (status) => (
                  <StatusChip
                    key={status}
                    label={humanise(status)}
                    selected={selectedStatus.toLowerCase() === status.toLowerCase()}
                    onPress={() => setSelectedStatus(status)}
                  />
                ),
              )}
            </View>
          </DashboardCard>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colours.brand} />
              <Text style={styles.helperText}>Loading the persistent review queue…</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Review queue could not be loaded</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <DashboardCard
            title={`Review queue${issuePage ? ` — ${issuePage.total}` : ''}`}
            description="Observed respondent values remain excluded. Open an issue to record a decision.">
            {!loading && issuePage?.issues.length ? (
              issuePage.issues.map((issue, index) => (
                <QueueIssueCard
                  key={readText(issue.issue_id) || `issue-${index}`}
                  issue={issue}
                  onReview={() =>
                    router.push({
                      pathname: '/review-issue',
                      params: {
                        runId: selectedRunId,
                        issueId: readText(issue.issue_id),
                      },
                    })
                  }
                />
              ))
            ) : !loading ? (
              <Text style={styles.helperText}>No issues match the selected status.</Text>
            ) : null}
          </DashboardCard>

          <PrimaryButton
            label="Open review history and audit export"
            variant="secondary"
            disabled={!selectedRunId}
            onPress={() =>
              router.push({ pathname: '/review-audit', params: { runId: selectedRunId } })
            }
          />

          <PrimaryButton
            label="Refresh review queue"
            variant="secondary"
            disabled={loading}
            onPress={() => setRefreshToken((value) => value + 1)}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QueueIssueCard({
  issue,
  onReview,
}: {
  issue: ProtectedIssueRecord;
  onReview: () => void;
}) {
  const severity = readText(issue.severity).toLowerCase();
  const status = readText(issue.status).toLowerCase() || 'open';
  return (
    <View
      style={[
        styles.issueCard,
        severity === 'error' && styles.issueCardError,
        severity === 'warning' && styles.issueCardWarning,
      ]}>
      <View style={styles.issueHeading}>
        <View style={styles.issueCopy}>
          <Text style={styles.issueVariable}>
            {readText(issue.variable_name) || 'Dataset-level issue'}
          </Text>
          <Text style={styles.issueRule}>{readText(issue.rule_id) || 'Unspecified rule'}</Text>
        </View>
        <View style={styles.pillColumn}>
          <Text style={[styles.pill, severity === 'error' && styles.errorPill]}>
            {severity || 'unknown'}
          </Text>
          <Text style={styles.statusPill}>{humanise(status)}</Text>
        </View>
      </View>
      <Text style={styles.issueMessage}>{readText(issue.message) || 'No message recorded.'}</Text>
      <DetailRow label="Record" value={readText(issue.record_id) || 'Dataset level'} />
      <DetailRow label="Expected" value={readText(issue.expected_rule) || 'Not recorded'} />
      {readText(issue.reviewer) ? (
        <DetailRow label="Reviewer" value={readText(issue.reviewer)} />
      ) : null}
      <PrimaryButton label="Review this issue" onPress={onReview} />
    </View>
  );
}

function StatusChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterChip,
        selected && styles.filterChipSelected,
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.filterChipText, selected && styles.selectedText]}>{label}</Text>
    </Pressable>
  );
}

function MetricCard({
  label,
  value,
  tone = 'brand',
}: {
  label: string;
  value: number;
  tone?: 'brand' | 'error' | 'warning';
}) {
  return (
    <View style={styles.metricCard}>
      <Text
        style={[
          styles.metricValue,
          tone === 'error' && styles.metricError,
          tone === 'warning' && styles.metricWarning,
        ]}>
        {value}
      </Text>
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

function readText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function timestamp(value: unknown): number {
  const parsed = Date.parse(readText(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatDate(value: unknown): string {
  const raw = readText(value);
  if (!raw) return 'Not recorded';
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleString();
}

function humanise(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colours.background },
  scrollContent: { alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 900, gap: 18 },
  notice: { backgroundColor: Colours.infoSoft, borderRadius: 16, padding: 16, gap: 4 },
  noticeTitle: { color: Colours.info, fontSize: 14, fontWeight: '800' },
  noticeText: { color: Colours.text, fontSize: 13, lineHeight: 19 },
  helperText: { color: Colours.textMuted, fontSize: 13, lineHeight: 19 },
  runScroller: { gap: 10, paddingRight: 8 },
  runChip: {
    minWidth: 190,
    maxWidth: 260,
    backgroundColor: Colours.background,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  runChipSelected: { backgroundColor: Colours.brand, borderColor: Colours.brand },
  runTitle: { color: Colours.text, fontSize: 14, fontWeight: '800' },
  runMeta: { color: Colours.textMuted, fontSize: 11, lineHeight: 16 },
  selectedText: { color: Colours.white },
  metricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    gap: 4,
  },
  metricValue: { color: Colours.brandDark, fontSize: 28, fontWeight: '900' },
  metricError: { color: Colours.error },
  metricWarning: { color: Colours.warning },
  metricLabel: { color: Colours.textMuted, fontSize: 13, fontWeight: '700' },
  filterWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: {
    backgroundColor: Colours.surfaceMuted,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipSelected: { backgroundColor: Colours.brand, borderColor: Colours.brand },
  filterChipText: { color: Colours.brandDark, fontSize: 12, fontWeight: '700' },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colours.surface,
    borderRadius: 14,
    padding: 16,
  },
  errorCard: { backgroundColor: Colours.errorSoft, borderRadius: 14, padding: 16, gap: 4 },
  errorTitle: { color: Colours.error, fontSize: 14, fontWeight: '800' },
  errorText: { color: Colours.error, fontSize: 13, lineHeight: 19 },
  issueCard: {
    backgroundColor: Colours.background,
    borderLeftColor: Colours.brand,
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  issueCardError: { borderLeftColor: Colours.error },
  issueCardWarning: { borderLeftColor: Colours.warning },
  issueHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  issueCopy: { flex: 1, gap: 2 },
  issueVariable: { color: Colours.text, fontSize: 14, fontWeight: '800' },
  issueRule: { color: Colours.textMuted, fontSize: 11 },
  pillColumn: { alignItems: 'flex-end', gap: 5 },
  pill: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  errorPill: { color: Colours.error, backgroundColor: Colours.errorSoft },
  statusPill: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  issueMessage: { color: Colours.text, fontSize: 13, lineHeight: 19 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { width: 84, color: Colours.textMuted, fontSize: 12, fontWeight: '700' },
  detailValue: { flex: 1, color: Colours.text, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.78 },
});
