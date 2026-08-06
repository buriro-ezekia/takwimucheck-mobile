// Records a validated human decision for one protected issue and shows persistent history.

import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useBackendAccess } from '@/providers/backend-access-provider';
import { describeApiError, type ProtectedIssueRecord } from '@/services/api';
import {
  getReviewHistory,
  submitReviewDecision,
  type ReviewAction,
  type ReviewDecisionRecord,
} from '@/services/review-api';
import { getFilteredValidationIssues } from '@/services/results-api';

const actions: Array<{ value: ReviewAction; label: string; description: string }> = [
  {
    value: 'accept_finding',
    label: 'Accept finding',
    description: 'Confirm that the validation finding is correct and should remain recorded.',
  },
  {
    value: 'defer_finding',
    label: 'Defer',
    description: 'Keep the finding unresolved while additional evidence is collected.',
  },
  {
    value: 'reject_finding',
    label: 'Reject finding',
    description: 'Record that the finding is not valid under the approved review evidence.',
  },
  {
    value: 'propose_correction',
    label: 'Propose correction',
    description: 'Record a proposed value without changing the uploaded respondent record.',
  },
];

export default function ReviewIssueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string; issueId?: string }>();
  const runId = readParam(params.runId);
  const issueId = readParam(params.issueId);
  const { accessKey, snapshot, refreshProtectedData } = useBackendAccess();

  const [issue, setIssue] = useState<ProtectedIssueRecord | null>(null);
  const [history, setHistory] = useState<ReviewDecisionRecord[]>([]);
  const [action, setAction] = useState<ReviewAction>('accept_finding');
  const [reviewer, setReviewer] = useState('');
  const [reason, setReason] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const actionDetails = useMemo(
    () => actions.find((candidate) => candidate.value === action) ?? actions[0],
    [action],
  );

  useEffect(() => {
    if (!runId || !issueId || !accessKey.trim()) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setErrorMessage('');

    Promise.all([
      getFilteredValidationIssues(accessKey, runId, {
        query: issueId,
        limit: 100,
        offset: 0,
      }),
      getReviewHistory(accessKey, runId, { issueId, limit: 100, offset: 0 }),
    ])
      .then(([issueResult, historyResult]) => {
        if (!active) return;
        const selectedIssue = issueResult.issues.find(
          (candidate) => readText(candidate.issue_id) === issueId,
        );
        setIssue(selectedIssue ?? null);
        setHistory(historyResult.decisions);
        if (!selectedIssue) {
          setErrorMessage('The requested issue was not found in this validation run.');
        }
      })
      .catch((error) => {
        if (!active) return;
        setIssue(null);
        setHistory([]);
        setErrorMessage(describeApiError(error));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [accessKey, issueId, refreshToken, runId]);

  const submit = async () => {
    if (!issue) {
      Alert.alert('Issue unavailable', 'Refresh the issue before submitting a decision.');
      return;
    }
    if (reviewer.trim().length < 2) {
      Alert.alert('Reviewer required', 'Enter the reviewer name before submitting.');
      return;
    }
    if (reason.trim().length < 3) {
      Alert.alert('Reason required', 'Enter a meaningful reason for the review decision.');
      return;
    }
    if (action === 'propose_correction' && !proposedValue.trim()) {
      Alert.alert('Proposed value required', 'Enter the proposed value before submitting.');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    try {
      const result = await submitReviewDecision(accessKey, {
        client_decision_id: buildClientDecisionId(issueId),
        issue_id: issueId,
        validation_run_id: runId,
        action,
        reviewer: reviewer.trim(),
        decision_reason: reason.trim(),
        proposed_value: action === 'propose_correction' ? proposedValue.trim() : undefined,
        expected_previous_status: readText(issue.status) || 'open',
      });
      const saved = result.decisions[0];
      setReason('');
      setProposedValue('');
      await refreshProtectedData();
      setRefreshToken((value) => value + 1);
      Alert.alert(
        result.created_count ? 'Review decision recorded' : 'Review decision already recorded',
        `${humanise(saved.action)} was saved with status ${humanise(saved.review_status)}.`,
      );
    } catch (error) {
      const message = describeApiError(error);
      setErrorMessage(message);
      Alert.alert('Submit review decision', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <AppHeader
              showBack
              eyebrow="Live issue review"
              title="Protected access required"
              subtitle="Authorise the controlled-pilot backend session before recording a decision."
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
            eyebrow="Live issue review"
            title="Record a human review decision"
            subtitle="The decision is persisted in the backend and appended to the review audit history."
          />

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colours.brand} />
              <Text style={styles.helperText}>Loading issue details and review history…</Text>
            </View>
          ) : null}

          {errorMessage ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorTitle}>Review action needs attention</Text>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {issue ? (
            <>
              <DashboardCard
                title={readText(issue.variable_name) || 'Dataset-level issue'}
                description="Observed respondent values remain excluded from this protected screen.">
                <View style={styles.pillRow}>
                  <Text style={[styles.pill, styles.errorPill]}>
                    {humanise(readText(issue.severity) || 'unknown')}
                  </Text>
                  <Text style={styles.pill}>{humanise(readText(issue.status) || 'open')}</Text>
                </View>
                <DetailRow label="Issue ID" value={issueId} />
                <DetailRow label="Run ID" value={runId} />
                <DetailRow label="Record" value={readText(issue.record_id) || 'Dataset level'} />
                <DetailRow label="Rule" value={readText(issue.rule_id) || 'Not recorded'} />
                <DetailRow label="Type" value={humanise(readText(issue.issue_type)) || 'Not recorded'} />
                <DetailRow label="Expected" value={readText(issue.expected_rule) || 'Not recorded'} />
                <Text style={styles.issueMessage}>
                  {readText(issue.message) || 'No validation message was recorded.'}
                </Text>
              </DashboardCard>

              <DashboardCard
                title="1. Choose review action"
                description="Every action creates a new append-only history record.">
                <View style={styles.actionStack}>
                  {actions.map((candidate) => (
                    <ActionOption
                      key={candidate.value}
                      label={candidate.label}
                      description={candidate.description}
                      selected={candidate.value === action}
                      onPress={() => setAction(candidate.value)}
                    />
                  ))}
                </View>
                <View style={styles.actionNotice}>
                  <Text style={styles.actionNoticeTitle}>{actionDetails.label}</Text>
                  <Text style={styles.actionNoticeText}>{actionDetails.description}</Text>
                </View>
              </DashboardCard>

              <DashboardCard
                title="2. Reviewer evidence"
                description="Reviewer identity and reason are mandatory and become part of the audit trail.">
                <InputField
                  label="Reviewer name"
                  value={reviewer}
                  onChangeText={setReviewer}
                  placeholder="For example, Asha Msuya"
                  maxLength={120}
                />
                <InputField
                  label="Decision reason"
                  value={reason}
                  onChangeText={setReason}
                  placeholder="State the evidence or reason for this decision"
                  maxLength={1000}
                  multiline
                />
                {action === 'propose_correction' ? (
                  <InputField
                    label="Proposed value"
                    value={proposedValue}
                    onChangeText={setProposedValue}
                    placeholder="Enter the proposed value"
                    maxLength={1000}
                  />
                ) : null}
                <PrimaryButton
                  label={submitting ? 'Recording review decision…' : 'Submit review decision'}
                  disabled={submitting}
                  onPress={submit}
                />
              </DashboardCard>

              <DashboardCard
                title={`Persistent review history — ${history.length}`}
                description="Newest decisions appear first. Proposed values are reviewer artefacts; original observed values remain excluded.">
                {history.length > 0 ? (
                  history.map((decision) => (
                    <HistoryCard key={decision.decision_id} decision={decision} />
                  ))
                ) : (
                  <Text style={styles.helperText}>No decisions have been recorded for this issue.</Text>
                )}
              </DashboardCard>

              <PrimaryButton
                label="Return to review queue"
                variant="secondary"
                onPress={() =>
                  router.replace({ pathname: '/review-queue', params: { runId } })
                }
              />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ActionOption({
  label,
  description,
  selected,
  onPress,
}: {
  label: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionOption,
        selected && styles.actionOptionSelected,
        pressed && styles.pressed,
      ]}>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionLabel}>{label}</Text>
        <Text style={styles.actionDescription}>{description}</Text>
      </View>
    </Pressable>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  maxLength: number;
  multiline?: boolean;
}) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colours.textMuted}
        autoCapitalize="sentences"
        autoCorrect
        maxLength={maxLength}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[styles.input, multiline && styles.multilineInput]}
      />
      <Text style={styles.characterCount}>{value.length.toLocaleString()} / {maxLength.toLocaleString()}</Text>
    </View>
  );
}

function HistoryCard({ decision }: { decision: ReviewDecisionRecord }) {
  return (
    <View style={styles.historyCard}>
      <View style={styles.historyHeading}>
        <Text style={styles.historyAction}>{humanise(decision.action)}</Text>
        <Text style={styles.historyStatus}>{humanise(decision.review_status)}</Text>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function buildClientDecisionId(issueId: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `mobile:${issueId}:${Date.now()}:${random}`;
}

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function readText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
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
  container: { width: '100%', maxWidth: 820, gap: 18 },
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
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
  },
  errorPill: { color: Colours.error, backgroundColor: Colours.errorSoft },
  issueMessage: { color: Colours.text, fontSize: 14, lineHeight: 21 },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { width: 88, color: Colours.textMuted, fontSize: 12, fontWeight: '700' },
  detailValue: { flex: 1, color: Colours.text, fontSize: 12, lineHeight: 18 },
  actionStack: { gap: 10 },
  actionOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    backgroundColor: Colours.background,
  },
  actionOptionSelected: { borderColor: Colours.brand, backgroundColor: Colours.brandSoft },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderColor: Colours.textMuted,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioSelected: { borderColor: Colours.brand },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colours.brand },
  actionCopy: { flex: 1, gap: 3 },
  actionLabel: { color: Colours.text, fontSize: 14, fontWeight: '800' },
  actionDescription: { color: Colours.textMuted, fontSize: 12, lineHeight: 18 },
  actionNotice: { backgroundColor: Colours.infoSoft, borderRadius: 14, padding: 14, gap: 4 },
  actionNoticeTitle: { color: Colours.info, fontSize: 13, fontWeight: '800' },
  actionNoticeText: { color: Colours.text, fontSize: 12, lineHeight: 18 },
  inputGroup: { gap: 7 },
  inputLabel: { color: Colours.text, fontSize: 13, fontWeight: '800' },
  input: {
    minHeight: 48,
    backgroundColor: Colours.background,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    color: Colours.text,
    fontSize: 14,
  },
  multilineInput: { minHeight: 112 },
  characterCount: { color: Colours.textMuted, fontSize: 10, textAlign: 'right' },
  historyCard: { backgroundColor: Colours.background, borderRadius: 14, padding: 14, gap: 8 },
  historyHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  historyAction: { flex: 1, color: Colours.text, fontSize: 14, fontWeight: '800' },
  historyStatus: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 10,
    fontWeight: '800',
  },
  pressed: { opacity: 0.78 },
});
