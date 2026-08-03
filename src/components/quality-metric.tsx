// Displays one validation metric with a clear semantic tone.

import { StyleSheet, Text, View } from 'react-native';

import { Colours } from '@/constants/colours';

type MetricTone = 'neutral' | 'brand' | 'error' | 'warning' | 'success';

interface QualityMetricProps {
  label: string;
  value: number | string;
  tone?: MetricTone;
}

const toneStyles: Record<MetricTone, { backgroundColor: string; valueColor: string }> = {
  neutral: { backgroundColor: Colours.surfaceMuted, valueColor: Colours.text },
  brand: { backgroundColor: Colours.brandSoft, valueColor: Colours.brandDark },
  error: { backgroundColor: Colours.errorSoft, valueColor: Colours.error },
  warning: { backgroundColor: Colours.warningSoft, valueColor: Colours.warning },
  success: { backgroundColor: Colours.successSoft, valueColor: Colours.success },
};

export function QualityMetric({ label, value, tone = 'neutral' }: QualityMetricProps) {
  const toneStyle = toneStyles[tone];

  return (
    <View style={[styles.card, { backgroundColor: toneStyle.backgroundColor }]}> 
      <Text style={[styles.value, { color: toneStyle.valueColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    minWidth: 140,
    flexGrow: 1,
    flexBasis: '45%',
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  value: {
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  label: {
    color: Colours.textMuted,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
});
