// Summarises validation execution, coverage and issue severity for the synthetic project.

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { QualityMetric } from '@/components/quality-metric';
import { Colours } from '@/constants/colours';
import { demoProject, ruleCoverage } from '@/constants/demo-data';

export default function ValidationSummaryScreen() {
  const router = useRouter();
  const { metrics } = demoProject;
  const totalIssues = metrics.errors + metrics.warnings;
  const reviewedPercentage = Math.round((metrics.reviewedIssues / totalIssues) * 100);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Validation run"
            title="Quality summary"
            subtitle="A transparent view of what was checked, what remains open and where validation coverage is incomplete."
          />

          <View style={styles.metricGrid}>
            <QualityMetric label="Records checked" value={metrics.recordsChecked} tone="brand" />
            <QualityMetric label="Rules executed" value={metrics.rulesExecuted} />
            <QualityMetric label="Errors" value={metrics.errors} tone="error" />
            <QualityMetric label="Warnings" value={metrics.warnings} tone="warning" />
          </View>

          <DashboardCard
            title="Issue review progress"
            description="The demonstration register contains 50 issues across errors and warnings.">
            <ProgressRow label="Reviewed" value={metrics.reviewedIssues} total={totalIssues} tone="success" />
            <ProgressRow label="Open" value={metrics.openIssues} total={totalIssues} tone="brand" />
            <Text style={styles.helperText}>{reviewedPercentage}% of issues have been reviewed.</Text>
          </DashboardCard>

          <DashboardCard
            title="Coverage safeguards"
            description="Coverage indicators prevent incomplete metadata or unexecuted checks from appearing as a clean result.">
            <CoverageRow label="Validation coverage" value={demoProject.validationCoverage} />
            <CoverageRow label="Metadata coverage" value={demoProject.metadataCoverage} />
          </DashboardCard>

          <DashboardCard
            title="Rule-group execution"
            description="Each group shows how much of its intended scope was checked.">
            {ruleCoverage.map((item) => (
              <View key={item.id} style={styles.ruleGroup}>
                <View style={styles.ruleHeadingRow}>
                  <View style={styles.ruleCopy}>
                    <Text style={styles.ruleLabel}>{item.label}</Text>
                    <Text style={styles.ruleMeta}>{item.checksExecuted} checks executed</Text>
                  </View>
                  <Text style={styles.ruleCoverage}>{item.coverage}%</Text>
                </View>
                <View style={styles.track}>
                  <View
                    style={[
                      styles.fill,
                      { width: `${item.coverage}%` as `${number}%` },
                      item.status === 'passed' ? styles.successFill : styles.brandFill,
                    ]}
                  />
                </View>
              </View>
            ))}
          </DashboardCard>

          <DashboardCard
            title="Interpretation"
            description="This screen deliberately avoids presenting one unexplained overall quality score.">
            <Text style={styles.interpretationText}>
              The current run checked most planned rules, but 38 issues remain open and metadata
              coverage is below 100%. A supervisor should inspect the issue register before accepting
              the dataset or generating a final report.
            </Text>
          </DashboardCard>

          <PrimaryButton label="Open issue register" onPress={() => router.push('/issues')} />
        </View>
      </ScrollView>
    </SafeAreaView>
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
        <View style={[styles.fill, styles.brandFill, { width: `${value}%` as `${number}%` }]} />
      </View>
    </View>
  );
}

function ProgressRow({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: 'success' | 'brand';
}) {
  const percentage = Math.round((value / total) * 100);

  return (
    <View style={styles.coverageGroup}>
      <View style={styles.coverageLabelRow}>
        <Text style={styles.coverageLabel}>{label}</Text>
        <Text style={styles.coverageValue}>
          {value} of {total}
        </Text>
      </View>
      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            tone === 'success' ? styles.successFill : styles.brandFill,
            { width: `${percentage}%` as `${number}%` },
          ]}
        />
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
    borderRadius: 999,
  },
  brandFill: {
    backgroundColor: Colours.brand,
  },
  successFill: {
    backgroundColor: Colours.success,
  },
  helperText: {
    color: Colours.textMuted,
    fontSize: 12,
  },
  ruleGroup: {
    gap: 8,
    borderTopColor: Colours.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 12,
  },
  ruleHeadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  ruleCoverage: {
    color: Colours.brandDark,
    fontSize: 14,
    fontWeight: '800',
  },
  interpretationText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 22,
  },
});
