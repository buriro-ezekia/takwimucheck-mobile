// Presents a validation issue with severity, review status and record-level context.

import { StyleSheet, Text, View } from 'react-native';

import { Colours } from '@/constants/colours';
import type { ValidationIssue } from '@/types/validation';

interface IssueCardProps {
  issue: ValidationIssue;
}

export function IssueCard({ issue }: IssueCardProps) {
  const isError = issue.severity === 'error';
  const severityBackground = isError ? Colours.errorSoft : Colours.warningSoft;
  const severityText = isError ? Colours.error : Colours.warning;

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <View style={[styles.badge, { backgroundColor: severityBackground }]}> 
          <Text style={[styles.badgeText, { color: severityText }]}>
            {issue.severity.toUpperCase()}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{issue.status}</Text>
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
    backgroundColor: Colours.surfaceMuted,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: {
    color: Colours.textMuted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
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
});
