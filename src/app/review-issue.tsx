// Records one authenticated human decision and shows append-only issue history.

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
import { roleAtLeast } from '@/services/auth-api';
import { describeApiError, type ProtectedIssueRecord } from '@/services/api';
import {
  getReviewHistory,
  submitReviewDecision,
  type ReviewAction,
  type ReviewDecisionRecord,
} from '@/services/review-api';
import { getFilteredValidationIssues } from '@/services/results-api';

const actions: Array<{ value: ReviewAction; label: string; description: string }> = [
  { value: 'accept_finding', label: 'Accept finding', description: 'Confirm that the finding is valid and should remain recorded.' },
  { value: 'defer_finding', label: 'Defer', description: 'Keep the finding unresolved while additional evidence is collected.' },
  { value: 'reject_finding', label: 'Reject finding', description: 'Record that the finding is not valid under the approved evidence.' },
  { value: 'propose_correction', label: 'Propose correction', description: 'Record a proposed value without modifying the uploaded source record.' },
];

export default function ReviewIssueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ runId?: string; issueId?: string }>();
  const runId = readParam(params.runId);
  const issueId = readParam(params.issueId);
  const { accessKey, signedIn, user, snapshot, refreshProtectedData } = useBackendAccess();
  const authorised = roleAtLeast(user?.role, 'reviewer');

  const [issue, setIssue] = useState<ProtectedIssueRecord | null>(null);
  const [history, setHistory] = useState<ReviewDecisionRecord[]>([]);
  const [action, setAction] = useState<ReviewAction>('accept_finding');
  const [reason, setReason] = useState('');
  const [proposedValue, setProposedValue] = useState('');
  const [pendingClientDecisionId, setPendingClientDecisionId] = useState('');
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
      getFilteredValidationIssues(accessKey, runId, { query: issueId, limit: 100, offset: 0 }),
      getReviewHistory(accessKey, runId, { issueId, limit: 100, offset: 0 }),
    ])
      .then(([issueResult, historyResult]) => {
        if (!active) return;
        const selectedIssue = issueResult.issues.find((candidate) => readText(candidate.issue_id) === issueId);
        setIssue(selectedIssue ?? null);
        setHistory(historyResult.decisions);
        if (!selectedIssue) setErrorMessage('The requested issue was not found.');
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

  useEffect(() => {
    setPendingClientDecisionId('');
  }, [action, issueId, proposedValue, reason, runId]);

  const submit = async () => {
    if (!issue || !user || !authorised) {
      Alert.alert('Review unavailable', 'Sign in with the Reviewer role or higher.');
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

    const clientDecisionId = pendingClientDecisionId || buildClientDecisionId(issueId);
    if (!pendingClientDecisionId) setPendingClientDecisionId(clientDecisionId);

    setSubmitting(true);
    setErrorMessage('');
    try {
      const result = await submitReviewDecision(accessKey, {
        client_decision_id: clientDecisionId,
        issue_id: issueId,
        validation_run_id: runId,
        action,
        decision_reason: reason.trim(),
        proposed_value: action === 'propose_correction' ? proposedValue.trim() : undefined,
        expected_previous_status: readText(issue.status) || 'open',
      });
      const saved = result.decisions[0];
      setPendingClientDecisionId('');
      setReason('');
      setProposedValue('');
      await refreshProtectedData();
      setRefreshToken((value) => value + 1);
      Alert.alert(
        result.created_count ? 'Review decision recorded' : 'Decision already recorded',
        `${humanise(saved.action)} was saved with status ${humanise(saved.review_status)}.`,
      );
    } catch (error) {
      const message = describeApiError(error);
      setErrorMessage(message);
      Alert.alert('Submit review decision', `${message}\n\nRetrying without changing the form reuses the same decision identifier.`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!signedIn || !snapshot) {
    return <AccessRequired onOpen={() => router.replace('/sign-in')} message="Sign in before opening protected issue details." />;
  }

  if (!authorised) {
    return <AccessRequired onOpen={() => router.replace('/settings')} message={`The ${humanise(user?.role ?? 'viewer')} role can inspect findings but cannot submit review decisions.`} />;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Authenticated issue review"
            title="Record a human decision"
            subtitle="The backend derives reviewer identity from the signed-in account and appends every decision to history."
          />

          <View style={styles.identityNotice}>
            <Text style={styles.identityTitle}>Authenticated reviewer</Text>
            <Text style={styles.identityText}>{user?.display_name} · {user?.email} · {humanise(user?.role ?? '')}</Text>
          </View>

          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator size="small" color={Colours.brand} />
              <Text style={styles.helperText}>Loading issue and decision history…</Text>
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
              <DashboardCard title={readText(issue.variable_name) || 'Dataset-level issue'} description="Observed respondent values remain excluded from this protected screen.">
                <View style={styles.pillRow}>
                  <Text style={[styles.pill, styles.errorPill]}>{humanise(readText(issue.severity) || 'unknown')}</Text>
                  <Text style={styles.pill}>{humanise(readText(issue.status) || 'open')}</Text>
                </View>
                <DetailRow label="Issue ID" value={issueId} />
                <DetailRow label="Record" value={readText(issue.record_id) || 'Dataset level'} />
                <DetailRow label="Rule" value={readText(issue.rule_id) || 'Not recorded'} />
                <DetailRow label="Expected" value={readText(issue.expected_rule) || 'Not recorded'} />
                <Text style={styles.issueMessage}>{readText(issue.message) || 'No message recorded.'}</Text>
              </DashboardCard>

              <DashboardCard title="Choose review action">
                <View style={styles.actionStack}>
                  {actions.map((candidate) => (
                    <Pressable
                      key={candidate.value}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: candidate.value === action }}
                      onPress={() => setAction(candidate.value)}
                      style={({ pressed }) => [styles.actionOption, candidate.value === action && styles.actionOptionSelected, pressed && styles.pressed]}>
                      <View style={styles.actionCopy}>
                        <Text style={styles.actionLabel}>{candidate.label}</Text>
                        <Text style={styles.actionDescription}>{candidate.description}</Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.helperText}>{actionDetails.description}</Text>
              </DashboardCard>

              <DashboardCard title="Reviewer evidence" description={`Reviewer is fixed to ${user?.display_name}. Only the reason and optional correction proposal are entered here.`}>
                <InputField label="Decision reason" value={reason} onChangeText={setReason} placeholder="State the evidence or reason" maxLength={1000} multiline />
                {action === 'propose_correction' ? (
                  <InputField label="Proposed value" value={proposedValue} onChangeText={setProposedValue} placeholder="Enter the proposed value" maxLength={1000} />
                ) : null}
                <PrimaryButton label={submitting ? 'Recording decision…' : 'Submit review decision'} disabled={submitting} onPress={() => void submit()} />
              </DashboardCard>

              <DashboardCard title={`Persistent review history — ${history.length}`}>
                {history.length ? history.map((decision) => (
                  <View key={decision.decision_id} style={styles.historyCard}>
                    <View style={styles.historyHeading}>
                      <Text style={styles.historyAction}>{humanise(decision.action)}</Text>
                      <Text style={styles.historyStatus}>{humanise(decision.review_status)}</Text>
                    </View>
                    <DetailRow label="Reviewer" value={decision.reviewer || 'Not recorded'} />
                    <DetailRow label="Reason" value={decision.decision_reason || 'Not recorded'} />
                    {decision.proposed_value ? <DetailRow label="Proposed" value={decision.proposed_value} /> : null}
                    <DetailRow label="Recorded" value={formatDate(decision.created_at)} />
                  </View>
                )) : <Text style={styles.helperText}>No decisions have been recorded for this issue.</Text>}
              </DashboardCard>

              <PrimaryButton label="Return to review queue" variant="secondary" onPress={() => router.replace({ pathname: '/review-queue', params: { runId } })} />
            </>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function AccessRequired({ message, onOpen }: { message: string; onOpen: () => void }) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <AppHeader showBack eyebrow="Authenticated issue review" title="Access required" subtitle={message} />
          <DashboardCard title="Account access"><PrimaryButton label="Open account settings" onPress={onOpen} /></DashboardCard>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InputField({ label, value, onChangeText, placeholder, maxLength, multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; maxLength: number; multiline?: boolean }) {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={Colours.textMuted} maxLength={maxLength} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multilineInput]} />
      <Text style={styles.characterCount}>{value.length} / {maxLength}</Text>
    </View>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.detailRow}><Text style={styles.detailLabel}>{label}</Text><Text style={styles.detailValue}>{value}</Text></View>;
}

function buildClientDecisionId(issueId: string): string {
  return `mobile:${issueId}:${Date.now()}:${Math.random().toString(36).slice(2, 10)}`;
}

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}
function readText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value).trim();
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
  identityNotice: { backgroundColor: Colours.successSoft, borderRadius: 16, padding: 16, gap: 4 },
  identityTitle: { color: Colours.success, fontSize: 14, fontWeight: '900' },
  identityText: { color: Colours.text, fontSize: 13, lineHeight: 19 },
  loadingCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colours.surface, borderRadius: 14, padding: 16 },
  helperText: { color: Colours.textMuted, fontSize: 13, lineHeight: 19 },
  errorCard: { backgroundColor: Colours.errorSoft, borderRadius: 14, padding: 16, gap: 4 },
  errorTitle: { color: Colours.error, fontSize: 14, fontWeight: '900' },
  errorText: { color: Colours.error, fontSize: 13, lineHeight: 19 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { color: Colours.brandDark, backgroundColor: Colours.brandSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: '800' },
  errorPill: { color: Colours.error, backgroundColor: Colours.errorSoft },
  issueMessage: { color: Colours.text, fontSize: 14, lineHeight: 21 },
  actionStack: { gap: 10 },
  actionOption: { borderWidth: 1, borderColor: Colours.border, borderRadius: 14, padding: 14 },
  actionOptionSelected: { borderColor: Colours.brand, backgroundColor: Colours.brandSoft },
  actionCopy: { gap: 4 },
  actionLabel: { color: Colours.text, fontSize: 14, fontWeight: '900' },
  actionDescription: { color: Colours.textMuted, fontSize: 12, lineHeight: 18 },
  pressed: { opacity: 0.78 },
  inputGroup: { gap: 7 },
  inputLabel: { color: Colours.text, fontSize: 13, fontWeight: '800' },
  input: { minHeight: 50, borderWidth: 1, borderColor: Colours.border, backgroundColor: Colours.background, borderRadius: 14, paddingHorizontal: 14, color: Colours.text, fontSize: 14 },
  multilineInput: { minHeight: 120, paddingTop: 14 },
  characterCount: { color: Colours.textMuted, fontSize: 11, textAlign: 'right' },
  historyCard: { backgroundColor: Colours.background, borderRadius: 14, padding: 14, gap: 8 },
  historyHeading: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  historyAction: { flex: 1, color: Colours.text, fontSize: 14, fontWeight: '900' },
  historyStatus: { color: Colours.brandDark, backgroundColor: Colours.brandSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, fontSize: 10, fontWeight: '800' },
  detailRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  detailLabel: { width: 92, color: Colours.textMuted, fontSize: 12, fontWeight: '700' },
  detailValue: { flex: 1, color: Colours.text, fontSize: 12, lineHeight: 18 },
});
