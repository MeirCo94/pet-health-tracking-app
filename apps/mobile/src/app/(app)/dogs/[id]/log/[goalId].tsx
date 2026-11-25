import {
  entriesInPeriod,
  formatNumber,
  nowFormValues,
  parseEntryInput,
  summarizeGoal,
  validateEntry,
  type DogEntry,
  type EntryFormErrors,
} from '@watchdog/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateField, ErrorMessage, PrimaryButton, ProgressBar, SecondaryButton, TextField } from '../../../../../components/ui';
import { createEntry, deleteEntry } from '../../../../../lib/entries';
import { useTheme } from '../../../../../lib/theme';
import { useWeekEntries } from '../../../../../lib/useEntries';
import { useGoal } from '../../../../../lib/useGoals';

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export default function LogScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string; goalId: string }>();
  const dogId = first(params.id);
  const goalId = first(params.goalId);
  const { goal, loaded, error, reload } = useGoal(goalId);
  const weekEntries = useWeekEntries(dogId);

  const [value, setValue] = useState('');
  // Starts at the moment the screen opens. Change it to log something that happened earlier.
  const [start] = useState(() => nowFormValues(new Date()));
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<EntryFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const pending = saving || removingId !== null;

  const loadError = error ?? weekEntries.error;
  if (loadError) {
    return (
      <View style={styles.container}>
        <ErrorMessage>{loadError}</ErrorMessage>
        <SecondaryButton
          label="Try again"
          onPress={() => {
            reload();
            weekEntries.reload();
          }}
        />
      </View>
    );
  }

  if (!loaded || weekEntries.entries === null) {
    return <ActivityIndicator accessibilityLabel="Loading goal" style={styles.loading} />;
  }

  if (!goal || goal.dogId !== dogId) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text, fontSize: 18 }}>Goal not found.</Text>
        <SecondaryButton label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  if (goal.status !== 'active') {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text, fontSize: 18 }}>{goal.label} is paused.</Text>
        <Text style={{ color: theme.muted }}>Set it back to active to log activity.</Text>
        <SecondaryButton label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  const now = weekEntries.now;
  const progress = summarizeGoal(goal, weekEntries.entries, now);
  const logged = entriesInPeriod(goal, weekEntries.entries, now);
  const unit = goal.unit ?? '';

  async function submit() {
    if (!goal || pending) return;
    const input = { value, date, time, note };
    const found = validateEntry(input);
    setErrors(found);
    setSubmitError(null);
    if (found.value || found.date || found.time || found.note) return;

    setSaving(true);
    try {
      await createEntry(goal, parseEntryInput(input));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setSaving(false);
      return;
    }
    router.back();
  }

  async function remove(entry: DogEntry) {
    if (pending) return;
    setRemovingId(entry.id);
    setRemoveError(null);
    try {
      await deleteEntry(entry.id);
      weekEntries.reload();
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : 'Could not remove. Try again.');
    }
    setRemovingId(null);
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { color: theme.text }]}>{goal.label}</Text>
      <View style={styles.block}>
        <Text style={{ color: theme.text, fontSize: 16 }}>{progress.text}</Text>
        <ProgressBar percent={progress.percent} met={progress.met} label={progress.text} />
        {progress.met ? <Text style={{ color: theme.info, fontSize: 14, fontWeight: '600' }}>Goal met</Text> : null}
      </View>

      <View style={styles.block}>
        <TextField
          label={unit ? `How many ${unit}?` : 'Amount'}
          value={value}
          onChangeText={setValue}
          keyboardType="decimal-pad"
          autoComplete="off"
          placeholder="30"
          error={errors.value}
          editable={!pending}
          autoFocus
        />
        <View style={styles.when}>
          <View style={styles.whenDate}>
            <DateField label="Date" value={date} onChange={setDate} maxDate={now} error={errors.date} disabled={pending} />
          </View>
          <View style={styles.whenTime}>
            <TextField
              label="Time (24-hour)"
              value={time}
              onChangeText={setTime}
              keyboardType="numbers-and-punctuation"
              autoComplete="off"
              autoCorrect={false}
              maxLength={5}
              placeholder="14:30"
              error={errors.time}
              editable={!pending}
            />
          </View>
        </View>
        <TextField
          label="Note (optional)"
          value={note}
          onChangeText={setNote}
          autoComplete="off"
          placeholder="Park with the neighbour's dog"
          error={errors.note}
          editable={!pending}
        />
        {submitError ? <ErrorMessage>{submitError}</ErrorMessage> : null}
        <PrimaryButton label="Log" onPress={submit} busy={saving} />
      </View>

      {logged.length > 0 ? (
        <View style={[styles.block, { borderTopColor: theme.border }, styles.history]}>
          <Text style={[styles.heading, { color: theme.text }]}>Logged {goal.period === 'daily' ? 'today' : 'this week'}</Text>
          {removeError ? <ErrorMessage>{removeError}</ErrorMessage> : null}
          {logged.map((entry) => (
            <View key={entry.id} style={styles.entryRow}>
              <View style={styles.entryText}>
                <Text style={{ color: theme.text, fontSize: 15 }}>
                  {formatNumber(entry.value)}
                  {unit ? ` ${unit}` : ''}
                </Text>
                <Text style={{ color: theme.muted, fontSize: 13 }}>
                  {timeLabel(entry.loggedAt)}
                  {entry.note ? ` · ${entry.note}` : ''}
                </Text>
              </View>
              <SecondaryButton
                label={removingId === entry.id ? 'Removing…' : 'Remove'}
                onPress={() => remove(entry)}
                disabled={pending}
                danger
              />
            </View>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 20, maxWidth: 560, width: '100%', alignSelf: 'center' },
  loading: { marginTop: 48 },
  title: { fontSize: 24, fontWeight: '700' },
  block: { gap: 12 },
  when: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'flex-start' },
  whenDate: { flexGrow: 1, minWidth: 180 },
  whenTime: { width: 140 },
  history: { borderTopWidth: 1, paddingTop: 20 },
  heading: { fontSize: 17, fontWeight: '600' },
  entryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  entryText: { flex: 1, gap: 2 },
});
