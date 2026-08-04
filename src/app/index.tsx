// Renders the TakwimuCheck home dashboard and entry points into live and demonstration workflows.

import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { QualityMetric } from '@/components/quality-metric';
import { Colours } from '@/constants/colours';
import { demoProject, workflowSteps } from '@/constants/demo-data';

export default function HomeScreen() {
  const router = useRouter();
  const { metrics } = demoProject;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <View style={styles.hero}>
            <View style={styles.brandRow}>
              <View style={styles.logoMark}>
                <Text style={styles.logoText}>TC</Text>
              </View>
              <View style={styles.brandCopy}>
                <Text style={styles.brandName}>TakwimuCheck</Text>
                <Text style={styles.brandLabel}>SHIPATON 2026 BUILD</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>Mobile survey data quality assurance</Text>
            <Text style={styles.heroSubtitle}>
              Turn survey datasets and validation metadata into an explainable issue register,
              review workflow and auditable quality report.
            </Text>

            <View style={styles.workflowRow}>
              {workflowSteps.map((step, index) => (
                <View key={step} style={styles.workflowItem}>
                  <View style={styles.workflowBadge}>
                    <Text style={styles.workflowNumber}>{index + 1}</Text>
                  </View>
                  <Text style={styles.workflowLabel}>{step}</Text>
                </View>
              ))}
            </View>

            <View style={styles.actionStack}>
              <PrimaryButton
                label="Upload and validate a CSV"
                onPress={() => router.push('/upload')}
              />
              <PrimaryButton
                label="Open demonstration project"
                variant="secondary"
                onPress={() => router.push('/demo')}
              />
            </View>
          </View>

          <View style={styles.pilotNotice}>
            <Text style={styles.pilotNoticeTitle}>Controlled-pilot CSV workflow</Text>
            <Text style={styles.pilotNoticeText}>
              Authorised pilot sessions can now select a UTF-8 CSV, review server-side preflight
              results and deliberately start a protected validation run.
            </Text>
          </View>

          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeTitle}>Synthetic demonstration data</Text>
            <Text style={styles.demoNoticeText}>
              The records and issues shown in the public product demonstration are fictional and
              contain no personal or confidential survey information.
            </Text>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest demonstration snapshot</Text>
            <Text style={styles.sectionSubtitle}>{demoProject.name}</Text>
          </View>

          <View style={styles.metricGrid}>
            <QualityMetric label="Records checked" value={metrics.recordsChecked} tone="brand" />
            <QualityMetric label="Rules executed" value={metrics.rulesExecuted} />
            <QualityMetric label="Errors" value={metrics.errors} tone="error" />
            <QualityMetric label="Warnings" value={metrics.warnings} tone="warning" />
            <QualityMetric label="Reviewed issues" value={metrics.reviewedIssues} tone="success" />
            <QualityMetric label="Open issues" value={metrics.openIssues} tone="brand" />
          </View>

          <View style={styles.cardStack}>
            <DashboardCard
              title="Upload and validate"
              description="Select one CSV, run protected preflight checks and start a configured validation run."
              onPress={() => router.push('/upload')}
            />

            <DashboardCard
              title="Protected backend summary"
              description="Inspect stored validation-run and issue metadata without displaying observed respondent values."
              onPress={() => router.push('/protected-data')}
            />

            <DashboardCard
              title="Demonstration validation summary"
              description="Inspect fictional coverage, rule groups and issue severity before reviewing sample records."
              onPress={() => router.push('/validation-summary')}
            />

            <DashboardCard
              title="Sample issue register"
              description="Filter fictional errors and warnings, then test the human review workflow."
              onPress={() => router.push('/issues')}
            />

            <DashboardCard
              title="TakwimuCheck Pro"
              description="Preview the subscription boundary for full reports, larger datasets and project history."
              onPress={() => router.push('/upgrade')}
            />

            <DashboardCard
              title="Settings"
              description="Review API configuration, protected access, data safeguards and purchase-restoration readiness."
              onPress={() => router.push('/settings')}
            />
          </View>

          <Text style={styles.footerText}>
            Mobile-first and low-connectivity optimised. Upload, validation, protected refreshes,
            exports and purchases require an internet connection.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colours.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  container: {
    width: '100%',
    maxWidth: 760,
    gap: 24,
  },
  hero: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colours.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: Colours.white,
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  brandCopy: {
    gap: 2,
  },
  brandName: {
    color: Colours.text,
    fontSize: 21,
    fontWeight: '800',
  },
  brandLabel: {
    color: Colours.brand,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroTitle: {
    color: Colours.text,
    fontSize: 36,
    lineHeight: 42,
    fontWeight: '900',
    letterSpacing: -1,
  },
  heroSubtitle: {
    color: Colours.textMuted,
    fontSize: 17,
    lineHeight: 25,
    maxWidth: 660,
  },
  workflowRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  workflowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colours.brandSoft,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  workflowBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colours.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  workflowNumber: {
    color: Colours.white,
    fontSize: 11,
    fontWeight: '800',
  },
  workflowLabel: {
    color: Colours.brandDark,
    fontSize: 13,
    fontWeight: '700',
  },
  actionStack: {
    gap: 10,
  },
  pilotNotice: {
    backgroundColor: Colours.brandSoft,
    borderRadius: 18,
    padding: 18,
    gap: 5,
  },
  pilotNoticeTitle: {
    color: Colours.brandDark,
    fontSize: 15,
    fontWeight: '800',
  },
  pilotNoticeText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 21,
  },
  demoNotice: {
    backgroundColor: Colours.infoSoft,
    borderRadius: 18,
    padding: 18,
    gap: 5,
  },
  demoNoticeTitle: {
    color: Colours.info,
    fontSize: 15,
    fontWeight: '800',
  },
  demoNoticeText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: Colours.text,
    fontSize: 24,
    fontWeight: '800',
  },
  sectionSubtitle: {
    color: Colours.textMuted,
    fontSize: 14,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cardStack: {
    gap: 14,
  },
  footerText: {
    color: Colours.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
