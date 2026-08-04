// Presents a validation issue with severity, status, evidence and review actions.

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colours } from '@/constants/colours';
import type {
  IssueStatus,
  ReviewAction,
  ReviewDecision,
  ValidationIssue,
} from '@/types/validation';

interface IssueCardProps {
  issue: ValidationIssue;
  latestDecision?: ReviewDecision;
  onAction: (issue: ValidationIssue, action: ReviewAction) => void;
}

const statusLabels: Record<IssueStatus, string> = {
  open: 'Open',
  accepted: 'Accepted',
  deferred: 'Deferred',
  'correction-proposed': 'Correction proposed',
};

const actionLabels: Record<ReviewAction, string> = {
  accept: 'Accepted finding',
  defer: 'Deferred finding',
  'propose-correction': 'Proposed correction',
};

export function IssueCard({ issue, latestDecision, onAction }: IssueCardProps) {
  const isError = issue.severity === 'error';
  const severityBackground = isError ? Colours.errorSoft : Colours.warningSoft;
  const severityText = isError ? Colours.error : Colours.warning;
  const statusPalette = getStatusPalette(issue.status);

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: severityBackground }]}>
          <Text style={[styles.badgeText, { color: severityText }]}>
            {issue.severity.toUpperCase()}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusPalette.background }]}>
          <Text style={[styles.statusText, { color: statusPalette.text }]}>
            {statusLabels[issue.status]}
          </Text>
        </View>
        <Text style={styles.issueId}>{issue.id}</Text>
      </View>

      <View style={styles.copy}>
        <Text style={styles.title}>{issue.title}</Text>
        <Text style={styles.message}>{issue.message}</Text>
      </View>

      <View style={styles.details}>
        <DetailRow label="Record" value={issue.recordId} />
        <DetailRow label="Variable" value={issue.variable} />
        <DetailRow label="Observed" value={issue.observedValue} />
        <DetailRow label="Expected" value={issue.expected} />
      </View>

      <Text style={styles.ruleLabel}>
        {issue.category} · {issue.ruleId}
      </Text>

      {latestDecision ? (
        <View style={styles.latestDecision}>
          <Text style={styles.latestDecisionEyebrow}>Latest review decision</Text>
          <Text style={styles.latestDecisionTitle}>{actionLabels[latestDecision.action]}</Text>
          <Text style={styles.latestDecisionReason}>{latestDecision.reason}</Text>
          {latestDecision.proposedValue ? (
            <View style={styles.proposedValueBox}>
              <Text style={styles.proposedValueLabel}>Proposed correction</Text>
              <Text style={styles.proposedValueText}>{latestDecision.proposedValue}</Text>
            </View>
          ) : null}
          <Text style={styles.latestDecisionMeta}>
            {latestDecision.reviewer} · {new Date(latestDecision.createdAt).toLocaleString()}
          </Text>
        </View>
      ) : null}

      <View style={styles.actionGroup}>
        <Text style={styles.actionLabel}>Record a decision</Text>
        <View style={styles.actionRow}>
          <ActionButton
            label="Accept"
            tone="success"
            onPress={() => onAction(issue, 'accept')}
          />
          <ActionButton
            label="Defer"
            tone="warning"
            onPress={() => onAction(issue, 'defer')}
          />
          <ActionButton
            label="Propose correction"
            tone="info"
            onPress={() => onAction(issue, 'propose-correction')}
          />
        </View>
      </View>
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

function ActionButton({
  label,
  tone,
  onPress,
}: {
  label: string;
  tone: 'success' | 'warning' | 'info';
  onPress: () => void;
}) {
  const palette = {
    success: { background: Colours.successSoft, text: Colours.success },
    warning: { background: Colours.warningSoft, text: Colours.warning },
    info: { background: Colours.infoSoft, text: Colours.info },
  }[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        { backgroundColor: palette.background },
        pressed && styles.pressed,
      ]}>
      <Text style={[styles.actionButtonText, { color: palette.text }]}>{label}</Text>
    </Pressable>
  );
}

function getStatusPalette(status: IssueStatus): { background: string; text: string } {
  if (status === 'accepted') {
    return { background: Colours.successSoft, text: Colours.success };
  }

  if (status === 'deferred') {
    return { background: Colours.warningSoft, text: Colours.warning };
  }

  if (status === 'correction-proposed') {
    return { background: Colours.infoSoft, text: Colours.info };
  }

  return { background: Colours.surfaceMuted, text: Colours.textMuted };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  issueId: {
    marginLeft: 'auto',
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  copy: {
    gap: 5,
  },
  title: {
    color: Colours.text,
    fontSize: 18,
    fontWeight: '800',
  },
  message: {
    color: Colours.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  details: {
    backgroundColor: Colours.background,
    borderRadius: 14,
    padding: 14,
    gap: 9,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    width: 76,
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    color: Colours.text,
    fontSize: 13,
    lineHeight: 18,
  },
  ruleLabel: {
    color: Colours.brandDark,
    fontSize: 12,
    fontWeight: '700',
  },
  latestDecision: {
    backgroundColor: Colours.brandSoft,
    borderRadius: 14,
    padding: 14,
    gap: 5,
  },
  latestDecisionEyebrow: {
    color: Colours.brandDark,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  latestDecisionTitle: {
    color: Colours.text,
    fontSize: 14,
    fontWeight: '800',
  },
  latestDecisionReason: {
    color: Colours.text,
    fontSize: 13,
    lineHeight: 19,
  },
  proposedValueBox: {
    backgroundColor: Colours.surface,
    borderRadius: 10,
    padding: 10,
    gap: 3,
    marginTop: 3,
  },
  proposedValueLabel: {
    color: Colours.info,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  proposedValueText: {
    color: Colours.text,
    fontSize: 13,
    lineHeight: 18,
  },
  latestDecisionMeta: {
    color: Colours.textMuted,
    fontSize: 11,
    marginTop: 3,
  },
  actionGroup: {
    gap: 8,
    borderTopColor: Colours.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  actionLabel: {
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.72,
  },
});
