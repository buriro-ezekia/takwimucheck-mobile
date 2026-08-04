// Renders an interactive synthetic issue register with auditable review decisions.

import { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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
import { IssueCard } from '@/components/issue-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { demoProject } from '@/constants/demo-data';
import { useReview } from '@/providers/review-provider';
import type { ReviewAction, ReviewDecision, ValidationIssue } from '@/types/validation';

type IssueFilter =
  | 'all'
  | 'open'
  | 'accepted'
  | 'deferred'
  | 'correction-proposed'
  | 'errors'
  | 'warnings';

interface ReviewDraft {
  issue: ValidationIssue;
  action: ReviewAction;
}

const filters: { id: IssueFilter; label: string }[] = [
  { id: 'all', label: 'All samples' },
  { id: 'open', label: 'Open' },
  { id: 'accepted', label: 'Accepted' },
  { id: 'deferred', label: 'Deferred' },
  { id: 'correction-proposed', label: 'Corrections' },
  { id: 'errors', label: 'Errors' },
  { id: 'warnings', label: 'Warnings' },
];

const actionCopy: Record<
  ReviewAction,
  { title: string; description: string; confirmation: string }
> = {
  accept: {
    title: 'Accept finding',
    description: 'Confirm that the finding is valid and should remain in the issue register.',
    confirmation: 'The finding was accepted and the review history was updated.',
  },
  defer: {
    title: 'Defer finding',
    description: 'Record why a decision cannot yet be completed and what clarification is needed.',
    confirmation: 'The finding was deferred and the review history was updated.',
  },
  'propose-correction': {
    title: 'Propose correction',
    description: 'Suggest a correction without changing the underlying synthetic record.',
    confirmation: 'The proposed correction was recorded for supervisor review.',
  },
};

export default function IssuesScreen() {
  const {
    issues,
    decisions,
    latestDecisionsByIssue,
    submitDecision,
    resetReview,
  } = useReview();
  const [activeFilter, setActiveFilter] = useState<IssueFilter>('all');
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft | null>(null);
  const [reviewer, setReviewer] = useState('Demo reviewer');
  const [reason, setReason] = useState('');
  const [proposedValue, setProposedValue] = useState('');

  const statusCounts = useMemo(
    () => ({
      open: issues.filter((issue) => issue.status === 'open').length,
      accepted: issues.filter((issue) => issue.status === 'accepted').length,
      deferred: issues.filter((issue) => issue.status === 'deferred').length,
      corrections: issues.filter((issue) => issue.status === 'correction-proposed').length,
    }),
    [issues],
  );

  const visibleIssues = useMemo(() => {
    return issues.filter((issue) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'errors') return issue.severity === 'error';
      if (activeFilter === 'warnings') return issue.severity === 'warning';
      return issue.status === activeFilter;
    });
  }, [activeFilter, issues]);

  const decisionHistory = useMemo(
    () =>
      [...decisions].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [decisions],
  );

  const openReview = (issue: ValidationIssue, action: ReviewAction) => {
    setReviewDraft({ issue, action });
    setReason('');
    setProposedValue('');
  };

  const closeReview = () => {
    setReviewDraft(null);
    setReason('');
    setProposedValue('');
  };

  const handleSubmitDecision = () => {
    if (!reviewDraft) return;

    try {
      submitDecision({
        issueId: reviewDraft.issue.id,
        action: reviewDraft.action,
        reviewer,
        reason,
        proposedValue,
      });
      const confirmation = actionCopy[reviewDraft.action].confirmation;
      closeReview();
      Alert.alert('Review decision saved', confirmation);
    } catch (error) {
      Alert.alert(
        'Review decision incomplete',
        error instanceof Error ? error.message : 'Complete the required review fields.',
      );
    }
  };

  const handleReset = () => {
    Alert.alert(
      'Reset demonstration decisions?',
      'This restores the original synthetic issues and seeded review history. No real data are affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset demonstration',
          style: 'destructive',
          onPress: () => {
            resetReview();
            setActiveFilter('all');
          },
        },
      ],
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
            eyebrow="Issue register"
            title="Review data-quality findings"
            subtitle="Inspect evidence, record a reasoned decision and retain a visible audit trail before any correction is approved."
          />

          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeTitle}>Interactive synthetic demonstration</Text>
            <Text style={styles.demoNoticeText}>
              Six representative findings are displayed from a fictional run containing{' '}
              {demoProject.metrics.errors + demoProject.metrics.warnings} total issues. Decisions remain
              within this app session and never modify survey records.
            </Text>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryMetric label="Open" value={statusCounts.open} tone="neutral" />
            <SummaryMetric label="Accepted" value={statusCounts.accepted} tone="success" />
            <SummaryMetric label="Deferred" value={statusCounts.deferred} tone="warning" />
            <SummaryMetric label="Corrections" value={statusCounts.corrections} tone="info" />
          </View>

          <ScrollView
            horizontal
            contentContainerStyle={styles.filterRow}
            showsHorizontalScrollIndicator={false}>
            {filters.map((filter) => {
              const isActive = filter.id === activeFilter;

              return (
                <Pressable
                  key={filter.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isActive }}
                  onPress={() => setActiveFilter(filter.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    isActive && styles.activeFilterChip,
                    pressed && styles.pressed,
                  ]}>
                  <Text style={[styles.filterText, isActive && styles.activeFilterText]}>
                    {filter.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.resultRow}>
            <Text style={styles.resultCount}>
              {visibleIssues.length} {visibleIssues.length === 1 ? 'sample issue' : 'sample issues'}
            </Text>
            <Text style={styles.resultHint}>{decisions.length} audit entries</Text>
          </View>

          <View style={styles.issueStack}>
            {visibleIssues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                latestDecision={latestDecisionsByIssue[issue.id]}
                onAction={openReview}
              />
            ))}
          </View>

          {visibleIssues.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No sample issues match this filter</Text>
              <Text style={styles.emptyText}>Choose another filter to continue reviewing the demonstration.</Text>
            </View>
          ) : null}

          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Decision history</Text>
              <Text style={styles.sectionSubtitle}>
                Every action records the issue, reviewer, reason and timestamp. Proposed values remain suggestions only.
              </Text>
            </View>
          </View>

          <View style={styles.historyStack}>
            {decisionHistory.map((decision) => (
              <HistoryItem
                key={decision.id}
                decision={decision}
                issue={issues.find((issue) => issue.id === decision.issueId)}
              />
            ))}
          </View>

          <View style={styles.resetCard}>
            <Text style={styles.resetTitle}>Demonstration controls</Text>
            <Text style={styles.resetText}>
              Reset restores the seeded synthetic decisions so the workflow can be demonstrated again.
            </Text>
            <PrimaryButton
              label="Reset demonstration decisions"
              variant="danger"
              onPress={handleReset}
            />
          </View>
        </View>
      </ScrollView>

      <ReviewDecisionModal
        draft={reviewDraft}
        reviewer={reviewer}
        reason={reason}
        proposedValue={proposedValue}
        onReviewerChange={setReviewer}
        onReasonChange={setReason}
        onProposedValueChange={setProposedValue}
        onCancel={closeReview}
        onSubmit={handleSubmitDecision}
      />
    </SafeAreaView>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'neutral' | 'success' | 'warning' | 'info';
}) {
  const palette = {
    neutral: { background: Colours.surface, text: Colours.text },
    success: { background: Colours.successSoft, text: Colours.success },
    warning: { background: Colours.warningSoft, text: Colours.warning },
    info: { background: Colours.infoSoft, text: Colours.info },
  }[tone];

  return (
    <View style={[styles.summaryMetric, { backgroundColor: palette.background }]}>
      <Text style={[styles.summaryValue, { color: palette.text }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function HistoryItem({
  decision,
  issue,
}: {
  decision: ReviewDecision;
  issue?: ValidationIssue;
}) {
  const title = actionCopy[decision.action].title;

  return (
    <View style={styles.historyItem}>
      <View style={styles.historyHeader}>
        <View style={styles.historyCopy}>
          <Text style={styles.historyTitle}>{title}</Text>
          <Text style={styles.historyIssue}>
            {decision.issueId} · {issue?.title ?? 'Issue unavailable'}
          </Text>
        </View>
        <Text style={styles.historyTime}>{new Date(decision.createdAt).toLocaleString()}</Text>
      </View>
      <Text style={styles.historyReason}>{decision.reason}</Text>
      {decision.proposedValue ? (
        <View style={styles.historyProposal}>
          <Text style={styles.historyProposalLabel}>Proposed correction</Text>
          <Text style={styles.historyProposalText}>{decision.proposedValue}</Text>
        </View>
      ) : null}
      <Text style={styles.historyReviewer}>Reviewer: {decision.reviewer}</Text>
    </View>
  );
}

function ReviewDecisionModal({
  draft,
  reviewer,
  reason,
  proposedValue,
  onReviewerChange,
  onReasonChange,
  onProposedValueChange,
  onCancel,
  onSubmit,
}: {
  draft: ReviewDraft | null;
  reviewer: string;
  reason: string;
  proposedValue: string;
  onReviewerChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onProposedValueChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  if (!draft) return null;

  const copy = actionCopy[draft.action];
  const correctionRequired = draft.action === 'propose-correction';

  return (
    <Modal
      animationType="slide"
      transparent
      visible
      onRequestClose={onCancel}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <ScrollView
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalEyebrow}>{draft.issue.id}</Text>
              <Text style={styles.modalTitle}>{copy.title}</Text>
              <Text style={styles.modalDescription}>{copy.description}</Text>
            </View>

            <View style={styles.modalIssueContext}>
              <Text style={styles.modalIssueTitle}>{draft.issue.title}</Text>
              <Text style={styles.modalIssueText}>
                Observed: {draft.issue.observedValue}
              </Text>
              <Text style={styles.modalIssueText}>Expected: {draft.issue.expected}</Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Reviewer name</Text>
              <TextInput
                accessibilityLabel="Reviewer name"
                autoCapitalize="words"
                maxLength={80}
                onChangeText={onReviewerChange}
                placeholder="Enter reviewer name"
                placeholderTextColor={Colours.textMuted}
                style={styles.textInput}
                value={reviewer}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Reason</Text>
              <TextInput
                accessibilityLabel="Review reason"
                maxLength={600}
                multiline
                onChangeText={onReasonChange}
                placeholder="Explain the evidence and reasoning for this decision"
                placeholderTextColor={Colours.textMuted}
                style={[styles.textInput, styles.multilineInput]}
                textAlignVertical="top"
                value={reason}
              />
              <Text style={styles.characterCount}>{reason.length}/600</Text>
            </View>

            {correctionRequired ? (
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Proposed correction</Text>
                <TextInput
                  accessibilityLabel="Proposed correction"
                  maxLength={300}
                  multiline
                  onChangeText={onProposedValueChange}
                  placeholder="Describe the proposed value or corrective action"
                  placeholderTextColor={Colours.textMuted}
                  style={[styles.textInput, styles.correctionInput]}
                  textAlignVertical="top"
                  value={proposedValue}
                />
                <Text style={styles.characterCount}>{proposedValue.length}/300</Text>
              </View>
            ) : null}

            <View style={styles.modalSafeguard}>
              <Text style={styles.modalSafeguardTitle}>No silent correction</Text>
              <Text style={styles.modalSafeguardText}>
                This action records a review decision only. It does not alter the synthetic source record.
              </Text>
            </View>

            <View style={styles.modalActions}>
              <PrimaryButton label="Save decision" onPress={onSubmit} />
              <PrimaryButton label="Cancel" variant="secondary" onPress={onCancel} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    gap: 20,
  },
  demoNotice: {
    backgroundColor: Colours.infoSoft,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  demoNoticeTitle: {
    color: Colours.info,
    fontSize: 14,
    fontWeight: '800',
  },
  demoNoticeText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryMetric: {
    minWidth: 112,
    flexGrow: 1,
    borderRadius: 15,
    padding: 14,
    gap: 2,
    borderColor: Colours.border,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  summaryLabel: {
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  filterRow: {
    gap: 9,
    paddingRight: 4,
  },
  filterChip: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  activeFilterChip: {
    backgroundColor: Colours.brand,
    borderColor: Colours.brand,
  },
  filterText: {
    color: Colours.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  activeFilterText: {
    color: Colours.white,
  },
  pressed: {
    opacity: 0.76,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  resultCount: {
    color: Colours.text,
    fontSize: 16,
    fontWeight: '800',
  },
  resultHint: {
    color: Colours.textMuted,
    fontSize: 12,
  },
  issueStack: {
    gap: 14,
  },
  emptyState: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 6,
  },
  emptyTitle: {
    color: Colours.text,
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    color: Colours.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  sectionHeader: {
    borderTopColor: Colours.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 20,
  },
  sectionCopy: {
    gap: 4,
  },
  sectionTitle: {
    color: Colours.text,
    fontSize: 22,
    fontWeight: '900',
  },
  sectionSubtitle: {
    color: Colours.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  historyStack: {
    gap: 10,
  },
  historyItem: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 15,
    gap: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  historyCopy: {
    flex: 1,
    gap: 2,
  },
  historyTitle: {
    color: Colours.text,
    fontSize: 15,
    fontWeight: '800',
  },
  historyIssue: {
    color: Colours.brandDark,
    fontSize: 12,
    fontWeight: '700',
  },
  historyTime: {
    maxWidth: 132,
    color: Colours.textMuted,
    fontSize: 10,
    lineHeight: 14,
    textAlign: 'right',
  },
  historyReason: {
    color: Colours.text,
    fontSize: 13,
    lineHeight: 19,
  },
  historyProposal: {
    backgroundColor: Colours.infoSoft,
    borderRadius: 10,
    padding: 10,
    gap: 3,
  },
  historyProposalLabel: {
    color: Colours.info,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  historyProposalText: {
    color: Colours.text,
    fontSize: 12,
    lineHeight: 18,
  },
  historyReviewer: {
    color: Colours.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  resetCard: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 8,
    marginBottom: 8,
  },
  resetTitle: {
    color: Colours.text,
    fontSize: 16,
    fontWeight: '800',
  },
  resetText: {
    color: Colours.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 32, 30, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    width: '100%',
    maxHeight: '92%',
    backgroundColor: Colours.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  modalContent: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 32,
    gap: 18,
  },
  modalHeader: {
    gap: 5,
  },
  modalEyebrow: {
    color: Colours.brand,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.7,
  },
  modalTitle: {
    color: Colours.text,
    fontSize: 24,
    fontWeight: '900',
  },
  modalDescription: {
    color: Colours.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  modalIssueContext: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  modalIssueTitle: {
    color: Colours.text,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
  },
  modalIssueText: {
    color: Colours.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
  fieldGroup: {
    gap: 7,
  },
  fieldLabel: {
    color: Colours.text,
    fontSize: 13,
    fontWeight: '800',
  },
  textInput: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: Colours.text,
    fontSize: 14,
  },
  multilineInput: {
    minHeight: 122,
  },
  correctionInput: {
    minHeight: 92,
  },
  characterCount: {
    color: Colours.textMuted,
    fontSize: 10,
    textAlign: 'right',
  },
  modalSafeguard: {
    backgroundColor: Colours.brandSoft,
    borderRadius: 13,
    padding: 13,
    gap: 3,
  },
  modalSafeguardTitle: {
    color: Colours.brandDark,
    fontSize: 13,
    fontWeight: '800',
  },
  modalSafeguardText: {
    color: Colours.text,
    fontSize: 12,
    lineHeight: 18,
  },
  modalActions: {
    gap: 9,
  },
});
