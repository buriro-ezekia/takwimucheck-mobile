// Renders a filterable synthetic issue register for the TakwimuCheck review workflow.

import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { IssueCard } from '@/components/issue-card';
import { Colours } from '@/constants/colours';
import { demoIssues, demoProject } from '@/constants/demo-data';

type IssueFilter = 'all' | 'open' | 'reviewed' | 'errors' | 'warnings';

const filters: { id: IssueFilter; label: string }[] = [
  { id: 'all', label: 'All samples' },
  { id: 'open', label: 'Open' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'errors', label: 'Errors' },
  { id: 'warnings', label: 'Warnings' },
];

export default function IssuesScreen() {
  const [activeFilter, setActiveFilter] = useState<IssueFilter>('all');

  const visibleIssues = useMemo(() => {
    return demoIssues.filter((issue) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'open') return issue.status === 'open';
      if (activeFilter === 'reviewed') return issue.status === 'reviewed';
      if (activeFilter === 'errors') return issue.severity === 'error';
      return issue.severity === 'warning';
    });
  }, [activeFilter]);

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
            subtitle="Inspect each finding with its record reference, variable, observed value and expected rule before taking action."
          />

          <View style={styles.demoNotice}>
            <Text style={styles.demoNoticeTitle}>Sample register</Text>
            <Text style={styles.demoNoticeText}>
              Six representative findings are displayed from a fictional run containing{' '}
              {demoProject.metrics.errors + demoProject.metrics.warnings} total issues.
            </Text>
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
            <Text style={styles.resultHint}>Read-only demonstration</Text>
          </View>

          <View style={styles.issueStack}>
            {visibleIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </View>

          {visibleIssues.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No sample issues match this filter</Text>
              <Text style={styles.emptyText}>Choose another filter to continue reviewing the demonstration.</Text>
            </View>
          ) : null}

          <View style={styles.nextStepCard}>
            <Text style={styles.nextStepTitle}>Production review decisions</Text>
            <Text style={styles.nextStepText}>
              The connected product will support accept, defer and propose-correction decisions with
              a reason, reviewer identity and timestamp. This product-shell milestone is intentionally
              read-only.
            </Text>
          </View>
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
  nextStepCard: {
    backgroundColor: Colours.brandSoft,
    borderRadius: 18,
    padding: 18,
    gap: 6,
    marginBottom: 8,
  },
  nextStepTitle: {
    color: Colours.brandDark,
    fontSize: 16,
    fontWeight: '800',
  },
  nextStepText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 21,
  },
});
