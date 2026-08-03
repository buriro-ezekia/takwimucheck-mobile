// Renders the synthetic TakwimuCheck project overview used for safe product demonstration.

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { QualityMetric } from '@/components/quality-metric';
import { Colours } from '@/constants/colours';
import { demoProject, ruleCoverage } from '@/constants/demo-data';

export default function DemoProjectScreen() {
  const router = useRouter();
  const { metrics } = demoProject;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Demonstration project"
            title={demoProject.name}
            subtitle="A fictional household-survey project showing the planned mobile review experience without exposing real respondent data."
          />

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Demo mode</Text>
            <Text style={styles.noticeText}>
              All records, variables and issue examples on this screen are synthetic.
            </Text>
          </View>

          <DashboardCard title="Dataset details">
            <DetailRow label="File" value={demoProject.datasetLabel} />
            <DetailRow label="Source" value={demoProject.source} />
            <DetailRow label="Last run" value={demoProject.lastRunLabel} />
          </DashboardCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quality snapshot</Text>
            <Text style={styles.sectionSubtitle}>
              Counts are shown separately rather than compressed into a single unexplained score.
            </Text>
          </View>

          <View style={styles.metricGrid}>
            <QualityMetric label="Records checked" value={metrics.recordsChecked} tone="brand" />
            <QualityMetric label="Rules executed" value={metrics.rulesExecuted} />
            <QualityMetric label="Errors" value={metrics.errors} tone="error" />
            <QualityMetric label="Warnings" value={metrics.warnings} tone="warning" />
            <QualityMetric label="Reviewed issues" value={metrics.reviewedIssues} tone="success" />
            <QualityMetric label="Open issues" value={metrics.openIssues} tone="brand" />
          </View>

          <DashboardCard
            title="Validation coverage"
            description="Coverage is visible so unexecuted checks are not mistaken for clean data.">
            <CoverageRow label="Validation coverage" value={demoProject.validationCoverage} />
            <CoverageRow label="Metadata coverage" value={demoProject.metadataCoverage} />
          </DashboardCard>

          <DashboardCard title="Rule groups" description="Five validation areas are represented in this demonstration.">
            {ruleCoverage.map((item) => (
              <View key={item.id} style={styles.ruleRow}>
                <View style={styles.ruleCopy}>
                  <Text style={styles.ruleLabel}>{item.label}</Text>
                  <Text style={styles.ruleMeta}>{item.checksExecuted} checks executed</Text>
                </View>
                <Text
                  style={[
                    styles.ruleStatus,
                    item.status === 'passed' ? styles.passedStatus : styles.attentionStatus,
                  ]}>
                  {item.status === 'passed' ? 'Passed' : 'Attention'}
                </Text>
              </View>
            ))}
          </DashboardCard>

          <View style={styles.actionStack}>
            <PrimaryButton
              label="Open validation summary"
              onPress={() => router.push('/validation-summary')}
            />
            <PrimaryButton
              label="Review sample issues"
              variant="secondary"
              onPress={() => router.push('/issues')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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

function CoverageRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.coverageGroup}>
      <View style={styles.coverageLabelRow}>
        <Text style={styles.coverageLabel}>{label}</Text>
        <Text style={styles.coverageValue}>{value}%</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${value}%` as `${number}%` }]} />
      </View>
    </View>
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
    gap: 22,
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
    fontSize: 14,
    lineHeight: 20,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  detailLabel: {
    width: 74,
    color: Colours.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    color: Colours.text,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: Colours.text,
    fontSize: 23,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: Colours.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  coverageGroup: {
    gap: 8,
  },
  coverageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  coverageLabel: {
    color: Colours.text,
    fontSize: 14,
    fontWeight: '700',
  },
  coverageValue: {
    color: Colours.brandDark,
    fontSize: 14,
    fontWeight: '800',
  },
  track: {
    height: 9,
    backgroundColor: Colours.surfaceMuted,
    borderRadius: 999,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colours.brand,
    borderRadius: 999,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopColor: Colours.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  ruleCopy: {
    flex: 1,
    gap: 3,
  },
  ruleLabel: {
    color: Colours.text,
    fontSize: 14,
    fontWeight: '700',
  },
  ruleMeta: {
    color: Colours.textMuted,
    fontSize: 12,
  },
  ruleStatus: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 11,
    fontWeight: '800',
  },
  passedStatus: {
    color: Colours.success,
    backgroundColor: Colours.successSoft,
  },
  attentionStatus: {
    color: Colours.warning,
    backgroundColor: Colours.warningSoft,
  },
  actionStack: {
    gap: 10,
    paddingBottom: 8,
  },
});
