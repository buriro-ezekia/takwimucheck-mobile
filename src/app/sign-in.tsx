// Presents the production backend sign-in flow for TakwimuCheck accounts.

import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useBackendAccess } from '@/providers/backend-access-provider';

export default function SignInScreen() {
  const router = useRouter();
  const { signedIn, restoring, status, message, user, signIn, signOut } = useBackendAccess();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const submitting = status === 'checking';

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Sign in', 'Enter both your email address and password.');
      return;
    }
    const succeeded = await signIn(email, password);
    if (succeeded) {
      setPassword('');
      router.replace('/');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setPassword('');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.container}>
            <AppHeader
              showBack
              eyebrow="Authenticated access"
              title="Sign in to TakwimuCheck"
              subtitle="Short-lived access tokens protect survey validation, review and reporting actions."
            />

            <View style={styles.notice}>
              <Text style={styles.noticeTitle}>Production security boundary</Text>
              <Text style={styles.noticeText}>
                Your password is sent only to the configured backend over the active connection. The
                app keeps the access token in memory and stores only the rotating refresh token in
                secure device storage.
              </Text>
            </View>

            {signedIn && user ? (
              <DashboardCard title="Signed-in account">
                <DetailRow label="Name" value={user.display_name} />
                <DetailRow label="Email" value={user.email} />
                <DetailRow label="Role" value={humanise(user.role)} />
                <DetailRow
                  label="RevenueCat ID"
                  value={`${user.revenuecat_app_user_id.slice(0, 16)}…`}
                />
                <Text style={styles.helperText}>{message}</Text>
                <PrimaryButton label="Return to dashboard" onPress={() => router.replace('/')} />
                <PrimaryButton
                  label="Sign out"
                  variant="danger"
                  onPress={() => void handleSignOut()}
                />
              </DashboardCard>
            ) : (
              <DashboardCard title={restoring ? 'Restoring session' : 'Account credentials'}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Email address</Text>
                  <TextInput
                    accessibilityLabel="Email address"
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.org"
                    placeholderTextColor={Colours.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="username"
                    editable={!restoring && !submitting}
                    style={styles.input}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    accessibilityLabel="Password"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    placeholderTextColor={Colours.textMuted}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    textContentType="password"
                    editable={!restoring && !submitting}
                    onSubmitEditing={() => void handleSignIn()}
                    style={styles.input}
                  />
                </View>

                <Text style={[styles.helperText, status === 'error' && styles.errorText]}>
                  {message}
                </Text>
                <PrimaryButton
                  label={restoring ? 'Restoring session…' : submitting ? 'Signing in…' : 'Sign in'}
                  disabled={restoring || submitting}
                  onPress={() => void handleSignIn()}
                />
              </DashboardCard>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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

function humanise(value: string): string {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colours.background },
  keyboardArea: { flex: 1 },
  scrollContent: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 18, paddingVertical: 24 },
  container: { width: '100%', maxWidth: 680, gap: 18 },
  notice: { backgroundColor: Colours.infoSoft, borderRadius: 16, padding: 16, gap: 5 },
  noticeTitle: { color: Colours.info, fontSize: 14, fontWeight: '800' },
  noticeText: { color: Colours.text, fontSize: 13, lineHeight: 20 },
  fieldGroup: { gap: 7 },
  inputLabel: { color: Colours.text, fontSize: 13, fontWeight: '800' },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colours.border,
    backgroundColor: Colours.background,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Colours.text,
    fontSize: 15,
  },
  helperText: { color: Colours.textMuted, fontSize: 13, lineHeight: 19 },
  errorText: { color: Colours.error },
  detailRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  detailLabel: { width: 112, color: Colours.textMuted, fontSize: 12, fontWeight: '700' },
  detailValue: { flex: 1, color: Colours.text, fontSize: 12, lineHeight: 18 },
});
