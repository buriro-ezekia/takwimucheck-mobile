// Guides controlled-pilot users through CSV selection, server preflight and validation submission.

import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/app-header';
import { DashboardCard } from '@/components/dashboard-card';
import { PrimaryButton } from '@/components/primary-button';
import { Colours } from '@/constants/colours';
import { useBackendAccess } from '@/providers/backend-access-provider';
import {
  describeApiError,
  preflightCsvUpload,
  submitCsvValidation,
  type CsvPreflightData,
  type UploadableCsvFile,
  type ValidationSubmissionData,
} from '@/services/api';

type UploadStatus =
  | 'idle'
  | 'selecting'
  | 'preflighting'
  | 'ready'
  | 'blocked'
  | 'submitting'
  | 'completed'
  | 'error';

export default function UploadScreen() {
  const router = useRouter();
  const {
    accessKey,
    status: protectedStatus,
    refreshProtectedData,
  } = useBackendAccess();
  const [surveyId, setSurveyId] = useState('');
  const [selectedFile, setSelectedFile] = useState<UploadableCsvFile | null>(null);
  const [preflight, setPreflight] = useState<CsvPreflightData | null>(null);
  const [submission, setSubmission] = useState<ValidationSubmissionData | null>(null);
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [message, setMessage] = useState(
    'Select one CSV file. Nothing is uploaded until you run the protected preflight.',
  );

  const hasSessionAccess = Boolean(accessKey.trim()) && protectedStatus === 'success';
  const canSubmit = Boolean(
    selectedFile && preflight?.ready && surveyId.trim() && status !== 'submitting',
  );
  const columnPreview = useMemo(
    () => preflight?.columns.slice(0, 12).join(', ') ?? '',
    [preflight],
  );

  const selectCsv = async () => {
    setStatus('selecting');
    setMessage('Opening the system document picker…');

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'text/comma-separated-values',
          'application/csv',
          'application/vnd.ms-excel',
          'text/plain',
        ],
        copyToCacheDirectory: true,
        multiple: false,
        base64: false,
      });

      if (result.canceled || !result.assets?.[0]) {
        setStatus('idle');
        setMessage('File selection was cancelled. No data was uploaded.');
        return;
      }

      const asset = result.assets[0];
      const nextFile: UploadableCsvFile = {
        uri: asset.uri,
        name: asset.name,
        mimeType: asset.mimeType,
        size: asset.size,
        webFile: asset.file ?? null,
      };

      setSelectedFile(nextFile);
      setPreflight(null);
      setSubmission(null);
      setStatus('idle');
      setMessage('CSV selected locally. Run preflight before starting validation.');
    } catch (error) {
      const nextMessage = describeApiError(error);
      setStatus('error');
      setMessage(nextMessage);
      Alert.alert('Select CSV file', nextMessage);
    }
  };

  const runPreflight = async () => {
    if (!selectedFile) {
      Alert.alert('CSV required', 'Select a CSV file before running preflight.');
      return;
    }

    setStatus('preflighting');
    setSubmission(null);
    setMessage('Checking file size, encoding, headers, row structure and pilot limits…');

    try {
      const result = await preflightCsvUpload(accessKey, selectedFile);
      setPreflight(result);
      setStatus(result.ready ? 'ready' : 'blocked');
      setMessage(
        result.ready
          ? 'Preflight passed. Review the summary, enter a survey ID and start validation.'
          : 'Preflight found blocking problems. Correct the CSV and select it again.',
      );
    } catch (error) {
      const nextMessage = describeApiError(error);
      setPreflight(null);
      setStatus('error');
      setMessage(nextMessage);
      Alert.alert('CSV preflight', nextMessage);
    }
  };

  const startValidation = async () => {
    if (!selectedFile || !preflight?.ready) {
      Alert.alert('Preflight required', 'Run a successful CSV preflight before validation.');
      return;
    }

    if (!surveyId.trim()) {
      Alert.alert('Survey ID required', 'Enter a short survey identifier before validation.');
      return;
    }

    setStatus('submitting');
    setMessage('Uploading the accepted CSV and running the configured validation pipeline…');

    try {
      const result = await submitCsvValidation(accessKey, selectedFile, surveyId);
      setSubmission(result);
      setStatus('completed');
      setMessage('Validation completed and protected summaries were stored successfully.');
      await refreshProtectedData();
      Alert.alert(
        'Validation completed',
        `${result.issues_written} issue(s) were written to the protected issue register.`,
      );
    } catch (error) {
      const nextMessage = describeApiError(error);
      setStatus('error');
      setMessage(nextMessage);
      Alert.alert('Validation run', nextMessage);
    }
  };

  const resetUpload = () => {
    setSurveyId('');
    setSelectedFile(null);
    setPreflight(null);
    setSubmission(null);
    setStatus('idle');
    setMessage('Select one CSV file. Nothing is uploaded until you run the protected preflight.');
  };

  if (!hasSessionAccess) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.container}>
            <AppHeader
              showBack
              eyebrow="Upload and validate"
              title="CSV validation run"
              subtitle="Authorise the controlled-pilot backend session before selecting or uploading a dataset."
            />
            <DashboardCard title="Protected access required">
              <Text style={styles.helperText}>
                Open Settings, enter the TakwimuCheck backend pilot key and confirm that the session
                status is Authorised. The RevenueCat public SDK key is not used here.
              </Text>
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <View style={styles.container}>
          <AppHeader
            showBack
            eyebrow="Upload and validate"
            title="Create a validation run"
            subtitle="Select one CSV, review server-side preflight results and deliberately start the protected validation pipeline."
          />

          <View style={styles.notice}>
            <Text style={styles.noticeTitle}>Controlled-pilot safeguard</Text>
            <Text style={styles.noticeText}>
              File selection is local. Preflight uploads the file for structure checks but creates no
              validation run. Validation starts only after you confirm the accepted summary.
            </Text>
          </View>

          <DashboardCard
            title="1. Select CSV"
            description="Use a UTF-8 comma-separated file. Only one file is handled at a time.">
            {selectedFile ? (
              <View style={styles.fileCard}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileMeta}>
                  {selectedFile.size ? formatBytes(selectedFile.size) : 'Size reported by server during preflight'}
                </Text>
              </View>
            ) : (
              <Text style={styles.helperText}>No CSV is currently selected.</Text>
            )}
            <PrimaryButton
              label={status === 'selecting' ? 'Opening file picker…' : selectedFile ? 'Choose another CSV' : 'Select CSV file'}
              variant="secondary"
              disabled={status === 'selecting' || status === 'preflighting' || status === 'submitting'}
              onPress={selectCsv}
            />
          </DashboardCard>

          <DashboardCard
            title="2. Run upload preflight"
            description="Checks extension, UTF-8 encoding, file size, headers, row widths and the controlled-pilot record limit.">
            <PrimaryButton
              label={status === 'preflighting' ? 'Running preflight…' : 'Run upload preflight'}
              disabled={!selectedFile || status === 'preflighting' || status === 'submitting'}
              onPress={runPreflight}
            />

            {preflight ? (
              <View style={styles.summaryCard}>
                <DetailRow label="Readiness" value={preflight.ready ? 'Ready' : 'Blocked'} />
                <DetailRow label="File size" value={formatBytes(preflight.file_size_bytes)} />
                <DetailRow label="Records" value={preflight.row_count.toLocaleString()} />
                <DetailRow label="Columns" value={preflight.column_count.toLocaleString()} />
                <DetailRow label="Encoding" value={preflight.encoding.toUpperCase()} />
                <DetailRow
                  label="Pilot record limit"
                  value={preflight.limits.max_records.toLocaleString()}
                />
                {columnPreview ? (
                  <View style={styles.columnBlock}>
                    <Text style={styles.detailLabel}>Column preview</Text>
                    <Text style={styles.columnText}>{columnPreview}</Text>
                  </View>
                ) : null}
                {preflight.warnings.map((warning) => (
                  <MessageRow key={warning} tone="warning" text={warning} />
                ))}
                {preflight.errors.map((error) => (
                  <MessageRow key={error} tone="error" text={error} />
                ))}
              </View>
            ) : null}
          </DashboardCard>

          <DashboardCard
            title="3. Start validation"
            description="The survey ID links the run, protected issue register and generated reports.">
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Survey ID</Text>
              <TextInput
                accessibilityLabel="Survey identifier"
                value={surveyId}
                onChangeText={setSurveyId}
                placeholder="For example, HOUSEHOLD_2026"
                placeholderTextColor={Colours.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={120}
                style={styles.input}
              />
            </View>

            <PrimaryButton
              label={status === 'submitting' ? 'Running validation…' : 'Start protected validation'}
              disabled={!canSubmit}
              onPress={startValidation}
            />

            {submission ? (
              <View style={styles.completedCard}>
                <Text style={styles.completedTitle}>Validation completed</Text>
                <DetailRow
                  label="Run ID"
                  value={readText(submission.validation_run.validation_run_id) || 'Recorded'}
                />
                <DetailRow
                  label="Status"
                  value={readText(submission.validation_run.status) || 'Completed'}
                />
                <DetailRow label="Issues" value={submission.issues_written.toLocaleString()} />
                <DetailRow
                  label="Quality score"
                  value={readText(submission.validation_run.quality_score) || 'Not recorded'}
                />
                <DetailRow
                  label="Quality rating"
                  value={submission.quality_rating || 'Not recorded'}
                />
                <PrimaryButton
                  label="View protected backend summary"
                  variant="secondary"
                  onPress={() => router.push('/protected-data')}
                />
              </View>
            ) : null}
          </DashboardCard>

          <Text
            style={[
              styles.statusText,
              (status === 'error' || status === 'blocked') && styles.errorText,
              status === 'completed' && styles.successText,
            ]}>
            {message}
          </Text>

          {selectedFile ? (
            <PrimaryButton
              label="Clear selected upload"
              variant="danger"
              disabled={status === 'preflighting' || status === 'submitting'}
              onPress={resetUpload}
            />
          ) : null}
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

function MessageRow({ tone, text }: { tone: 'warning' | 'error'; text: string }) {
  return (
    <View style={[styles.messageRow, tone === 'error' ? styles.errorBox : styles.warningBox]}>
      <Text style={tone === 'error' ? styles.errorText : styles.warningText}>{text}</Text>
    </View>
  );
}

function formatBytes(value: number): string {
  if (value < 1024) return `${value} bytes`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(2)} MB`;
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
    borderRadius: 18,
    padding: 18,
    gap: 5,
  },
  noticeTitle: {
    color: Colours.info,
    fontSize: 15,
    fontWeight: '800',
  },
  noticeText: {
    color: Colours.text,
    fontSize: 14,
    lineHeight: 21,
  },
  helperText: {
    color: Colours.textMuted,
    fontSize: 13,
    lineHeight: 19,
  },
  fileCard: {
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 4,
  },
  fileName: {
    color: Colours.text,
    fontSize: 15,
    fontWeight: '800',
  },
  fileMeta: {
    color: Colours.textMuted,
    fontSize: 12,
  },
  summaryCard: {
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailLabel: {
    color: Colours.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  detailValue: {
    flex: 1,
    color: Colours.text,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'right',
  },
  columnBlock: {
    gap: 5,
  },
  columnText: {
    color: Colours.text,
    fontSize: 12,
    lineHeight: 18,
  },
  messageRow: {
    borderRadius: 12,
    padding: 11,
  },
  warningBox: {
    backgroundColor: Colours.warningSoft,
  },
  errorBox: {
    backgroundColor: Colours.errorSoft,
  },
  warningText: {
    color: Colours.warning,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
  },
  errorText: {
    color: Colours.error,
  },
  successText: {
    color: Colours.success,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: Colours.text,
    fontSize: 13,
    fontWeight: '800',
  },
  input: {
    minHeight: 48,
    borderColor: Colours.border,
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: Colours.background,
    color: Colours.text,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  completedCard: {
    backgroundColor: Colours.successSoft,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  completedTitle: {
    color: Colours.success,
    fontSize: 15,
    fontWeight: '800',
  },
  statusText: {
    color: Colours.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});
