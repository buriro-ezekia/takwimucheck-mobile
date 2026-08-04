// Presents validation runs, aggregate quality results, filters and secure report access.

import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
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
import { useBackendAccess } from '@/providers/backend-access-provider';
import { describeApiError, type ProtectedIssueRecord, type ValidationRunRecord } from '@/services/api';
import {
  buildReportDownloadUrl,
  getFilteredValidationIssues,
  getValidationReportLink,
  getValidationRunDetail,
  type FilteredIssueData,
  type ReportArtifact,
  type ResultFilters,
  type ValidationRunDetailData,
} from '@/services/results-api';

const PAGE_SIZE = 20;

interface AppliedFilters {
  severity: string;
  status: string;
  issueType: string;
  variableName: string;
  query: string;
}

const emptyFilters: AppliedFilters = {
  severity: '',
  status: '',
  issueType: '',
  variableName: '',
  query: '',
};

export default function ProtectedDataScreen() {
  const {
    accessKey,
    snapshot,
    status: protectedStatus,
    message: protectedMessage,
    refreshProtectedData,
  } = useBackendAccess();

  const validationRuns = useMemo(
    () =>
      [...(snapshot?.validationRuns ?? [])].sort(
        (left, right) => timestamp(right.created_at) - timestamp(left.created_at),
      ),
    [snapshot?.validationRuns],
  );

  const [selectedRunId, setSelectedRunId] = useState('');
  const [detail, setDetail] = useState<ValidationRunDetailData | null>(null);
  const [issuePage, setIssuePage] = useState<FilteredIssueData | null>(null);
  const [issues, setIssues] = useState<ProtectedIssueRecord[]>([]);
  const [filters, setFilters] = useState<AppliedFilters>(emptyFilters);
  const [searchDraft, setSearchDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [openingArtifactKey, setOpeningArtifactKey] = useState('');

  useEffect(() => {
    if (validationRuns.length === 0) {
      setSelectedRunId('');
      return;
    }

    const selectedStillExists = validationRuns.some(
      (run) => readText(run.validation_run_id) === selectedRunId,
    );
    if (!selectedStillExists) {
      setSelectedRunId(readText(validationRuns[0].validation_run_id));
    }
  }, [selectedRunId, validationRuns]);

  useEffect(() => {
    if (!selectedRunId || !accessKey.trim()) return;

    let active = true;
    setLoading(true);
    setErrorMessage('');

    const requestFilters: ResultFilters = {
      severity: filters.severity || undefined,
      status: filters.status || undefined,
      issueType: filters.issueType || undefined,
      variableName: filters.variableName || undefined,
      query: filters.query || undefined,
      limit: PAGE_SIZE,
      offset: 0,
    };

    Promise.all([
      getValidationRunDetail(accessKey, selectedRunId),
      getFilteredValidationIssues(accessKey, selectedRunId, requestFilters),
    ])
      .then(([nextDetail, nextIssues]) => {
        if (!active) return;
        setDetail(nextDetail);
        setIssuePage(nextIssues);
        setIssues(nextIssues.issues);
      })
      .catch((error) => {
        if (!active) return;
        setDetail(null);
        setIssuePage(null);
        setIssues([]);
        setErrorMessage(describeApiError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessKey, filters, selectedRunId]);

  const handleRunSelection = (runId: string) => {
    setSelectedRunId(runId);
    setFilters(emptyFilters);
    setSearchDraft('');
    setDetail(null);
    setIssuePage(null);
    setIssues([]);
  };

  const updateFilter = (key: keyof AppliedFilters, value: string) => {
    setFilters((current) => ({
      ...current,
      [key]: current[key] === value ? '' : value,
    }));
  };

  const applySearch = () => {
    setFilters((current) => ({ ...current, query: searchDraft.trim() }));
  };

  const clearFilters = () => {
    setFilters(emptyFilters);
    setSearchDraft('');
  };

  const loadMore = async () => {
    if (!issuePage?.has_more || loadingMore || !selectedRunId) return;

    setLoadingMore(true);
    setErrorMessage('');
    try {
      const nextPage = await getFilteredValidationIssues(accessKey, selectedRunId, {
        severity: filters.severity || undefined,
        status: filters.status || undefined,
        issueType: filters.issueType || undefined,
        variableName: filters.variableName || undefined,
        query: filters.query || undefined,
        limit: PAGE_SIZE,
        offset: issues.length,
      });
      setIssuePage(nextPage);
      setIssues((current) => [...current, ...nextPage.issues]);
    } catch (error) {
      setErrorMessage(describeApiError(error));
    } finally {
      setLoadingMore(false);
    }
  };

  const openReport = async (report: ReportArtifact) => {
    if (!selectedRunId || openingArtifactKey) return;

    let pendingWindow: Window | null = null;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      pendingWindow = window.open('about:blank', '_blank');
    }

    setOpeningArtifactKey(report.artifact_key);
    try {
      const link = await getValidationReportLink(
        accessKey,
        selectedRunId,
        report.artifact_key,
      );
      const downloadUrl = buildReportDownloadUrl(link.download_path);

      if (pendingWindow) {
        pendingWindow.location.href = downloadUrl;
      } else {
        await Linking.openURL(downloadUrl);
      }
    } catch (error) {
      pendingWindow?.close();
      Alert.alert('Open validation report', describeApiError(error));
    } finally {
      setOpeningArtifactKey('');
    }
  };

  if (!snapshot) {
    return <AccessRequired message={protectedMessage} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Validation results"
            title="Review quality findings and reports"
            subtitle="Select a validation run, focus the issue register with privacy-minimised filters and open a short-lived report link."
          />

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Session-protected results</Text>
            <Text style={styles.noticeText}>
              Respondent values are excluded from this workspace. Report links are scoped to one
              artefact and expire after five minutes.
            </Text>
          </View>

          <DashboardCard
            title="Validation runs"
            description="Runs are ordered from newest to oldest. Select one to load its quality summary.">
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
                      onPress={() => handleRunSelection(runId)}
                      style={({ pressed }) => [
                        styles.runChip,
                        selected && styles.runChipSelected,
                        pressed && styles.pressed,
                      ]}>
                      <Text style={[styles.runChipSurvey, selected && styles.runChipSelectedText]}>
                        {readText(run.survey_id) || 'Unnamed survey'}
                      </Text>
                      <Text style={[styles.runChipMeta, selected && styles.runChipSelectedText]}>
                        {formatDate(run.created_at)}
                      </Text>
                      <Text style={[styles.runChipMeta, selected && styles.runChipSelectedText]}>
                        {readText(run.issue_count) || '0'} issues
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            ) : (
              <EmptyText text="No validation runs are stored in the configured database." />
            )}
          </DashboardCard>

          {loading && !detail ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colours.brand} />
              <Text style={styles.helperText}>Loading the selected validation run…</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Results could not be loaded</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {detail ? (
            <>
              <RunSummary run={detail.validation_run} summary={detail.issue_summary} />

              <DashboardCard
                title="Filter issue register"
                description="Filters are applied by the backend before issue metadata is returned.">
                <View style={styles.searchRow}>
                  <TextInput
                    accessibilityLabel="Search issue metadata"
                    value={searchDraft}
                    onChangeText={setSearchDraft}
                    onSubmitEditing={applySearch}
                    placeholder="Search variable, rule, type or message"
                    placeholderTextColor={Colours.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="search"
                    style={styles.searchInput}
                  />
                  <Pressable
                    accessibilityRole="button"
                    onPress={applySearch}
                    style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}>
                    <Text style={styles.searchButtonText}>Search</Text>
                  </Pressable>
                </View>

                <FilterGroup
                  label="Severity"
                  values={issuePage?.facets.severity ?? ['error', 'warning']}
                  selected={filters.severity}
                  onSelect={(value) => updateFilter('severity', value)}
                />
                <FilterGroup
                  label="Status"
                  values={issuePage?.facets.status ?? []}
                  selected={filters.status}
                  onSelect={(value) => updateFilter('status', value)}
                />
                <FilterGroup
                  label="Issue type"
                  values={(issuePage?.facets.issue_type ?? []).slice(0, 10)}
                  selected={filters.issueType}
                  onSelect={(value) => updateFilter('issueType', value)}
                />
                <FilterGroup
                  label="Variable"
                  values={(issuePage?.facets.variable_name ?? []).slice(0, 10)}
                  selected={filters.variableName}
                  onSelect={(value) => updateFilter('variableName', value)}
                />

                {hasActiveFilters(filters) ? (
                  <PrimaryButton
                    label="Clear all filters"
                    variant="secondary"
                    onPress={clearFilters}
                  />
                ) : null}
              </DashboardCard>

              <DashboardCard
                title={`Issue register${issuePage ? ` — ${issuePage.total}` : ''}`}
                description="Identifiers, rule context and review status are shown. Current respondent values remain excluded.">
                {issues.length > 0 ? (
                  issues.map((issue, index) => (
                    <IssueRow
                      key={readText(issue.issue_id) || `result-issue-${index}`}
                      issue={issue}
                    />
                  ))
                ) : loading ? (
                  <View style={styles.inlineLoading}>
                    <ActivityIndicator size="small" color={Colours.brand} />
                    <Text style={styles.helperText}>Applying filters…</Text>
                  </View>
                ) : (
                  <EmptyText text="No issues match the selected filters." />
                )}

                {issuePage?.has_more ? (
                  <PrimaryButton
                    label={loadingMore ? 'Loading more issues…' : `Load more (${issues.length} of ${issuePage.total})`}
                    variant="secondary"
                    disabled={loadingMore}
                    onPress={loadMore}
                  />
                ) : null}
              </DashboardCard>

              <DashboardCard
                title="Validation reports"
                description="Opening a report requests a five-minute signed link. The session access key is never placed in the URL.">
                {detail.reports.length > 0 ? (
                  detail.reports.map((report) => (
                    <View key={report.artifact_key} style={styles.reportRow}>
                      <View style={styles.reportCopy}>
                        <Text style={styles.reportTitle}>{report.label}</Text>
                        <Text style={styles.reportMeta}>
                          {report.file_name} · {formatBytes(report.size_bytes)}
                        </Text>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        disabled={Boolean(openingArtifactKey)}
                        onPress={() => openReport(report)}
                        style={({ pressed }) => [
                          styles.reportButton,
                          pressed && styles.pressed,
                          Boolean(openingArtifactKey) && styles.disabled,
                        ]}>
                        <Text style={styles.reportButtonText}>
                          {openingArtifactKey === report.artifact_key ? 'Opening…' : 'Open'}
                        </Text>
                      </Pressable>
                    </View>
                  ))
                ) : (
                  <EmptyText text="No allowlisted validation reports are available for this run." />
                )}
              </DashboardCard>
            </>
          ) : null}

          <Text style={styles.helperText}>
            Last protected refresh {new Date(snapshot.checkedAt).toLocaleString()}.
          </Text>

          <PrimaryButton
            label={
              protectedStatus === 'checking'
                ? 'Refreshing validation runs…'
                : 'Refresh validation runs'
            }
            variant="secondary"
            disabled={protectedStatus === 'checking'}
            onPress={refreshProtectedData}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessRequired({ message }: { message: string }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Validation results"
            title="Protected access required"
            subtitle="Authorise the controlled-pilot backend session before viewing validation findings or reports."
          />
          <DashboardCard title="Access required">
            <Text style={styles.helperText}>{message}</Text>
          </DashboardCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function RunSummary({
  run,
  summary,
}: {
  run: ValidationRunRecord;
  summary: ValidationRunDetailData['issue_summary'];
}) {
  return (
    <>
      <View style={styles.metricRow}>
        <MetricCard label="All issues" value={summary.total} />
        <MetricCard label="Errors" value={summary.errors} tone="error" />
        <MetricCard label="Open" value={summary.open} tone="warning" />
        <MetricCard label="Variables" value={summary.variables_affected} />
      </View>
      <DashboardCard title="Selected run summary">
        <DetailRow label="Survey" value={readText(run.survey_id) || 'Not recorded'} />
        <DetailRow label="Run ID" value={readText(run.validation_run_id) || 'Not recorded'} />
        <DetailRow label="Status" value={readText(run.status) || 'Not recorded'} />
        <DetailRow label="Quality score" value={readText(run.quality_score) || 'Not recorded'} />
        <DetailRow label="Created" value={formatDate(run.created_at)} />
      </DashboardCard>
    </>
  );
}

function FilterGroup({
  label,
  values,
  selected,
  onSelect,
}: {
  label: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  if (values.length === 0) return null;

  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.filterWrap}>
        <FilterChip label="All" selected={!selected} onPress={() => onSelect(selected)} />
        {values.map((value) => (
          <FilterChip
            key={`${label}-${value}`}
            label={humanise(value)}
            selected={selected.casefold?.() === value.casefold?.() || selected.toLowerCase() === value.toLowerCase()}
            onPress={() => onSelect(value)}
          />
        ))}
      </View>
    </View>
  );
}

function FilterChip({
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
      <Text style={[styles.filterChipText, selected && styles.filterChipSelectedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

function IssueRow({ issue }: { issue: ProtectedIssueRecord }) {
  const severity = readText(issue.severity).toLowerCase();
  const status = readText(issue.status).toLowerCase();
  return (
    <View
      style={[
        styles.issueCard,
        severity === 'error' && styles.issueCardError,
        severity === 'warning' && styles.issueCardWarning,
      ]}>
      <View style={styles.issueHeading}>
        <View style={styles.issueTitleCopy}>
          <Text style={styles.issueVariable}>
            {readText(issue.variable_name) || 'Dataset-level issue'}
          </Text>
          <Text style={styles.issueRule}>{readText(issue.rule_id) || 'Unspecified rule'}</Text>
        </View>
        <View style={styles.pillColumn}>
          <Text
            style={[
              styles.severityPill,
              severity === 'error' && styles.errorPill,
              severity === 'warning' && styles.warningPill,
            ]}>
            {severity || 'unknown'}
          </Text>
          <Text style={styles.statusPill}>{status || 'unknown'}</Text>
        </View>
      </View>
      <Text style={styles.issueMessage}>{readText(issue.message) || 'No message recorded.'}</Text>
      <DetailRow label="Type" value={humanise(readText(issue.issue_type)) || 'Not recorded'} />
      <DetailRow label="Record" value={readText(issue.record_id) || 'Dataset level'} />
      <DetailRow label="Expected" value={readText(issue.expected_rule) || 'Not recorded'} />
      {readText(issue.decision) ? (
        <DetailRow label="Decision" value={humanise(readText(issue.decision))} />
      ) : null}
    </View>
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

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
}

function hasActiveFilters(filters: AppliedFilters): boolean {
  return Object.values(filters).some((value) => value.trim());
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

function formatBytes(value: number): string {
  if (!Number.isFinite(value) || value < 0) return 'Unknown size';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function humanise(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function readText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
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
    maxWidth: 900,
    gap: 18,
  },
  notice: {
    backgroundColor: Colours.infoSoft,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  noticeTitle: {
    color: Colours.info,
    fontSize: 14,
    fontWeight: '800',
  },
  noticeText: {
    color: Colours.text,
    fontSize: 13,
    lineHeight: 19,
  },
  runScroller: {
    gap: 10,
    paddingRight: 8,
  },
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
  runChipSelected: {
    backgroundColor: Colours.brand,
    borderColor: Colours.brand,
  },
  runChipSurvey: {
    color: Colours.text,
    fontSize: 14,
    fontWeight: '800',
  },
  runChipMeta: {
    color: Colours.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  runChipSelectedText: {
    color: Colours.white,
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
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
  metricValue: {
    color: Colours.brandDark,
    fontSize: 28,
    fontWeight: '900',
  },
  metricError: {
    color: Colours.error,
  },
  metricWarning: {
    color: Colours.warning,
  },
  metricLabel: {
    color: Colours.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colours.surface,
    borderRadius: 14,
    padding: 16,
  },
  inlineLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  errorCard: {
    backgroundColor: Colours.errorSoft,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  errorTitle: {
    color: Colours.error,
    fontSize: 14,
    fontWeight: '800',
  },
  errorText: {
    color: Colours.error,
    fontSize: 13,
    lineHeight: 19,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  searchInput: {
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
  searchButton: {
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colours.brand,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  searchButtonText: {
    color: Colours.white,
    fontSize: 13,
    fontWeight: '800',
  },
  filterGroup: {
    gap: 8,
  },
  filterLabel: {
    color: Colours.text,
    fontSize: 13,
    fontWeight: '800',
  },
  filterWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterChip: {
    backgroundColor: Colours.surfaceMuted,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterChipSelected: {
    backgroundColor: Colours.brand,
    borderColor: Colours.brand,
  },
  filterChipText: {
    color: Colours.brandDark,
    fontSize: 12,
    fontWeight: '700',
  },
  filterChipSelectedText: {
    color: Colours.white,
  },
  issueCard: {
    backgroundColor: Colours.background,
    borderLeftColor: Colours.brand,
    borderLeftWidth: 4,
    borderRadius: 14,
    padding: 14,
    gap: 9,
  },
  issueCardError: {
    borderLeftColor: Colours.error,
  },
  issueCardWarning: {
    borderLeftColor: Colours.warning,
  },
  issueHeading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  issueTitleCopy: {
    flex: 1,
    gap: 2,
  },
  issueVariable: {
    color: Colours.text,
    fontSize: 14,
    fontWeight: '800',
  },
  issueRule: {
    color: Colours.textMuted,
    fontSize: 11,
  },
  pillColumn: {
    alignItems: 'flex-end',
    gap: 5,
  },
  severityPill: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  errorPill: {
    color: Colours.error,
    backgroundColor: Colours.errorSoft,
  },
  warningPill: {
    color: Colours.warning,
    backgroundColor: Colours.warningSoft,
  },
  statusPill: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  issueMessage: {
    color: Colours.text,
    fontSize: 13,
    lineHeight: 19,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    width: 84,
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    color: Colours.text,
    fontSize: 12,
    lineHeight: 18,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colours.background,
    borderRadius: 14,
    padding: 14,
  },
  reportCopy: {
    flex: 1,
    gap: 3,
  },
  reportTitle: {
    color: Colours.text,
    fontSize: 13,
    fontWeight: '800',
  },
  reportMeta: {
    color: Colours.textMuted,
    fontSize: 11,
    lineHeight: 16,
  },
  reportButton: {
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colours.brand,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  reportButtonText: {
    color: Colours.white,
    fontSize: 12,
    fontWeight: '800',
  },
  helperText: {
    color: Colours.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  emptyText: {
    color: Colours.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.55,
  },
});
