// Displays a consistent TakwimuCheck screen heading with optional back navigation.

import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colours } from '@/constants/colours';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  showBack?: boolean;
}

export function AppHeader({ title, subtitle, eyebrow, showBack = false }: AppHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.wrapper}>
      {showBack ? (
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
          <Text style={styles.backButtonText}>‹ Back</Text>
        </Pressable>
      ) : null}

      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 38,
    justifyContent: 'center',
    marginBottom: 4,
  },
  backButtonText: {
    color: Colours.brand,
    fontSize: 16,
    fontWeight: '700',
  },
  eyebrow: {
    color: Colours.brand,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: Colours.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: Colours.textMuted,
    fontSize: 16,
    lineHeight: 23,
    maxWidth: 680,
  },
  pressed: {
    opacity: 0.65,
  },
});
