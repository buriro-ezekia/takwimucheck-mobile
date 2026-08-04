// Displays a privacy-minimised summary from authenticated controlled-pilot backend routes.

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useBackendAccess } from '@/providers/backend-access-provider';
import type { ProtectedIssueRecord, ValidationRunRecord } from '@/services/api';

export default function ProtectedDataScreen() {
  const router = useRouter();
  const { snapshot, status, message, refreshProtectedData } = useBackendAccess();

  if (!snapshot) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <AppHeader
              showBack
              eyebrow="Controlled pilot"
              title="Protected backend data"
              subtitle="A successful session access check is required before protected validation summaries can be displayed."
            />

            <DashboardCard title="Access required">
              <Text style={styles.helperText}>{message}</Text>
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

  const validationRuns = snapshot.validationRuns.slice(0, 10);
  const issues = snapshot.issues.slice(0, 20);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Controlled pilot"
            title="Protected backend data"
            subtitle="This view shows validation-run and issue metadata while intentionally omitting observed respondent values."
          />

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Session-protected access</Text>
            <Text style={styles.noticeText}>
              The access key is held in memory only and is never displayed, logged or committed.
            </Text>
          </View>

          <View style={styles.metricRow}>
            <MetricCard label="Validation runs" value={snapshot.validationRunCount} />
            <MetricCard label="Issues" value={snapshot.issueCount} />
          </View>

          <DashboardCard title="Validation runs">
            {validationRuns.length > 0 ? (
              validationRuns.map((run, index) => (
                <ValidationRunRow
                  key={readText(run.validation_run_id) || `validation-run-${index}`}
                  run={run}
                />
              ))
            ) : (
              <EmptyText text="No validation runs are stored in the configured database." />
            )}
          </DashboardCard>

          <DashboardCard
            title="Issue register"
            description="Only identifiers, rule context and review status are shown. Current respondent values are deliberately excluded from this screen.">
            {issues.length > 0 ? (
              issues.map((issue, index) => (
                <IssueRow
                  key={readText(issue.issue_id) || `protected-issue-${index}`}
                  issue={issue}
                />
              ))
            ) : (
              <EmptyText text="No issues are stored in the configured database." />
            )}
          </DashboardCard>

          <Text style={styles.helperText}>
            Last refreshed {new Date(snapshot.checkedAt).toLocaleString()}. Showing up to 10 runs and
            20 issues from this controlled-pilot session.
          </Text>

          <PrimaryButton
            label={status === 'checking' ? 'Refreshing protected data…' : 'Refresh protected data'}
            disabled={status === 'checking'}
            onPress={refreshProtectedData}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ValidationRunRow({ run }: { run: ValidationRunRecord }) {
  return (
    <View style={styles.recordCard}>
      <Text style={styles.recordTitle}>
        {readText(run.validation_run_id) || 'Unnamed validation run'}
      </Text>
      <DetailRow label="Survey" value={readText(run.survey_id) || 'Not recorded'} />
      <DetailRow label="Status" value={readText(run.status) || 'Not recorded'} />
      <DetailRow label="Issues" value={readText(run.issue_count) || '0'} />
      <DetailRow label="Quality" value={readText(run.quality_score) || 'Not recorded'} />
      <DetailRow label="Created" value={readText(run.created_at) || 'Not recorded'} />
    </View>
  );
}

function IssueRow({ issue }: { issue: ProtectedIssueRecord }) {
  return (
    <View style={styles.recordCard}>
      <View style={styles.issueHeading}>
        <Text style={styles.recordTitle}>{readText(issue.issue_id) || 'Unnamed issue'}</Text>
        <Text style={styles.statusPill}>{readText(issue.status) || 'Unknown status'}</Text>
      </View>
      <DetailRow label="Run" value={readText(issue.validation_run_id) || 'Not recorded'} />
      <DetailRow label="Variable" value={readText(issue.variable_name) || 'Not recorded'} />
      <DetailRow label="Rule" value={readText(issue.rule_id) || 'Not recorded'} />
      <DetailRow label="Severity" value={readText(issue.severity) || 'Not recorded'} />
      <DetailRow label="Type" value={readText(issue.issue_type) || 'Not recorded'} />
      <DetailRow label="Message" value={readText(issue.message) || 'Not recorded'} />
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

function EmptyText({ text }: { text: string }) {
  return <Text style={styles.emptyText}>{text}</Text>;
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
    maxWidth: 760,
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
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flexGrow: 1,
    minWidth: 150,
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
  metricLabel: {
    color: Colours.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  recordCard: {
    backgroundColor: Colours.background,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  recordTitle: {
    flex: 1,
    color: Colours.text,
    fontSize: 14,
    fontWeight: '800',
  },
  issueHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    color: Colours.brandDark,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 5,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailLabel: {
    width: 70,
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
});
