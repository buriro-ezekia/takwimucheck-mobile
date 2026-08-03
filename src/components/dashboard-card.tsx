// Renders a reusable dashboard surface that can optionally behave as a navigation card.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colours } from '@/constants/colours';

interface DashboardCardProps {
  title: string;
  description?: string;
  onPress?: () => void;
  accessibilityLabel?: string;
  children?: ReactNode;
}

export function DashboardCard({
  title,
  description,
  onPress,
  accessibilityLabel,
  children,
}: DashboardCardProps) {
  const content = (
    <>
      <View style={styles.headingRow}>
        <View style={styles.headingCopy}>
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
        {onPress ? <Text style={styles.chevron}>›</Text> : null}
      </View>
      {children ? <View style={styles.content}>{children}</View> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel ?? title}
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
        {content}
      </Pressable>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colours.surface,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    gap: 14,
    shadowColor: Colours.black,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headingCopy: {
    flex: 1,
    gap: 4,
  },
  title: {
    color: Colours.text,
    fontSize: 18,
    fontWeight: '800',
  },
  description: {
    color: Colours.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  chevron: {
    color: Colours.brand,
    fontSize: 30,
    lineHeight: 30,
    fontWeight: '500',
  },
  content: {
    gap: 12,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.995 }],
  },
});
