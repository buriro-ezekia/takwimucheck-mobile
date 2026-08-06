// Renders the role-aware TakwimuCheck home dashboard and workflow entry points.

import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { QualityMetric } from '@/components/quality-metric';
import { Colours } from '@/constants/colours';
import { demoProject, workflowSteps } from '@/constants/demo-data';
import { useBackendAccess } from '@/providers/backend-access-provider';
import { roleAtLeast, type UserRole } from '@/services/auth-api';

export default function HomeScreen() {
  const router = useRouter();
  const { metrics } = demoProject;
  const { signedIn, restoring, user, accessExpiresAt } = useBackendAccess();
  const canReview = roleAtLeast(user?.role, 'reviewer');
  const canValidate = roleAtLeast(user?.role, 'supervisor');

  const openProtected = (path: '/upload' | '/review-queue' | '/protected-data', minimum: UserRole) => {
    if (!signedIn) {
      router.push('/sign-in');
      return;
    }
    if (!roleAtLeast(user?.role, minimum)) {
      Alert.alert(
        'Role required',
        `This action requires the ${humanise(minimum)} role or higher. Your current role is ${humanise(user?.role ?? 'viewer')}.`,
      );
      return;
    }
    router.push(path);
  };

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
              persistent human review workflow and auditable quality report.
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

            <View style={styles.accountCard}>
              <Text style={styles.accountTitle}>
                {restoring
                  ? 'Restoring secure session…'
                  : signedIn && user
                    ? `Signed in as ${user.display_name}`
                    : 'Sign in for protected workflows'}
              </Text>
              <Text style={styles.accountText}>
                {signedIn && user
                  ? `${humanise(user.role)} · ${user.email}${accessExpiresAt ? ` · access token expires ${formatTime(accessExpiresAt)}` : ''}`
                  : 'Validation, review, reporting and premium export now use short-lived authenticated sessions.'}
              </Text>
              <PrimaryButton
                label={signedIn ? 'View account and session' : 'Sign in'}
                variant="secondary"
                disabled={restoring}
                onPress={() => router.push(signedIn ? '/settings' : '/sign-in')}
              />
            </View>

            <View style={styles.actionStack}>
              <PrimaryButton
                label={canValidate ? 'Upload and validate a CSV' : 'Upload and validate — Supervisor'}
                disabled={restoring}
                onPress={() => openProtected('/upload', 'supervisor')}
              />
              <PrimaryButton
                label={canReview ? 'Review real issues' : 'Review real issues — Reviewer'}
                variant="secondary"
                disabled={restoring}
                onPress={() => openProtected('/review-queue', 'reviewer')}
              />
              <PrimaryButton
                label="Review validation results"
                variant="secondary"
                disabled={restoring}
                onPress={() => openProtected('/protected-data', 'viewer')}
              />
              <PrimaryButton
                label="Open demonstration project"
                variant="secondary"
                onPress={() => router.push('/demo')}
              />
            </View>
          </View>

          <View style={styles.pilotNotice}>
            <Text style={styles.pilotNoticeTitle}>Authenticated production workflow</Text>
            <Text style={styles.pilotNoticeText}>
              Viewer accounts inspect results, reviewers record decisions, supervisors run validation
              and export server-verified Pro audits, and administrators manage accounts.
            </Text>
          </View>

          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeTitle}>Synthetic demonstration data</Text>
            <Text style={styles.demoNoticeText}>
              The public demonstration remains available without signing in and contains no personal
              or confidential survey information.
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
              title="Authenticated account"
              description="Sign in, inspect your role, refresh the session and verify server-side Pro access."
              onPress={() => router.push(signedIn ? '/settings' : '/sign-in')}
            />
            <DashboardCard
              title="Upload and validate"
              description="Supervisor and administrator accounts can select a CSV, run preflight and start validation."
              onPress={() => openProtected('/upload', 'supervisor')}
            />
            <DashboardCard
              title="Live issue review"
              description="Reviewer, supervisor and administrator accounts can record persistent decisions."
              onPress={() => openProtected('/review-queue', 'reviewer')}
            />
            <DashboardCard
              title="Validation results and reports"
              description="Signed-in accounts can filter protected findings and open short-lived reports."
              onPress={() => openProtected('/protected-data', 'viewer')}
            />
            <DashboardCard
              title="Demonstration validation summary"
              description="Inspect fictional coverage, rule groups and issue severity without signing in."
              onPress={() => router.push('/validation-summary')}
            />
            <DashboardCard
              title="TakwimuCheck Pro"
              description="Purchase status is shown in the app; premium export is enforced again by the backend."
              onPress={() => router.push('/upgrade')}
            />
          </View>

          <Text style={styles.footerText}>
            Access tokens are short-lived. Refresh tokens are stored in secure device storage on
            native platforms and protected browser storage for the web session.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function humanise(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTime(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'soon' : parsed.toLocaleTimeString();
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colours.background },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 760, gap: 24 },
  hero: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 24,
    padding: 24,
    gap: 20,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoMark: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: Colours.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { color: Colours.white, fontSize: 17, fontWeight: '900', letterSpacing: 0.6 },
  brandCopy: { gap: 2 },
  brandName: { color: Colours.text, fontSize: 21, fontWeight: '800' },
  brandLabel: { color: Colours.brand, fontSize: 10, fontWeight: '800', letterSpacing: 1.1 },
  heroTitle: { color: Colours.text, fontSize: 36, lineHeight: 42, fontWeight: '900', letterSpacing: -1 },
  heroSubtitle: { color: Colours.textMuted, fontSize: 17, lineHeight: 25, maxWidth: 660 },
  workflowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
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
  workflowNumber: { color: Colours.white, fontSize: 11, fontWeight: '800' },
  workflowLabel: { color: Colours.brandDark, fontSize: 13, fontWeight: '700' },
  accountCard: { backgroundColor: Colours.infoSoft, borderRadius: 16, padding: 16, gap: 8 },
  accountTitle: { color: Colours.info, fontSize: 15, fontWeight: '900' },
  accountText: { color: Colours.text, fontSize: 13, lineHeight: 19 },
  actionStack: { gap: 10 },
  pilotNotice: { backgroundColor: Colours.brandSoft, borderRadius: 18, padding: 18, gap: 5 },
  pilotNoticeTitle: { color: Colours.brandDark, fontSize: 15, fontWeight: '800' },
  pilotNoticeText: { color: Colours.text, fontSize: 14, lineHeight: 21 },
  demoNotice: { backgroundColor: Colours.infoSoft, borderRadius: 18, padding: 18, gap: 5 },
  demoNoticeTitle: { color: Colours.info, fontSize: 15, fontWeight: '800' },
  demoNoticeText: { color: Colours.text, fontSize: 14, lineHeight: 21 },
  sectionHeader: { gap: 4 },
  sectionTitle: { color: Colours.text, fontSize: 24, fontWeight: '800' },
  sectionSubtitle: { color: Colours.textMuted, fontSize: 14 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  cardStack: { gap: 14 },
  footerText: {
    color: Colours.textMuted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
