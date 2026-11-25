import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorMessage, SecondaryButton } from '../../../../../components/ui';
import { GoalForm } from '../../../../../components/GoalForm';
import { deleteGoal, updateGoal } from '../../../../../lib/goals';
import { useTheme } from '../../../../../lib/theme';
import { useGoalEntryCount } from '../../../../../lib/useEntries';
import { useGoal } from '../../../../../lib/useGoals';

export default function EditGoalScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ goalId: string }>();
  const goalId = Array.isArray(params.goalId) ? params.goalId[0] : params.goalId;
  const { goal, loaded, error, reload } = useGoal(goalId);
  const entryCount = useGoalEntryCount(goalId);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const pending = saving || deleting;
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadError = error ?? entryCount.error;
  if (loadError) {
    return (
      <View style={styles.container}>
        <ErrorMessage>{loadError}</ErrorMessage>
        <SecondaryButton
          label="Try again"
          onPress={() => {
            reload();
            entryCount.reload();
          }}
        />
      </View>
    );
  }

  if (!loaded || entryCount.count === null) {
    return <ActivityIndicator accessibilityLabel="Loading goal" style={styles.loading} />;
  }

  if (!goal) {
    return (
      <View style={styles.container}>
        <Text style={{ color: theme.text, fontSize: 18 }}>Goal not found.</Text>
        <SecondaryButton label="Go back" onPress={() => router.back()} />
      </View>
    );
  }

  async function confirmDelete() {
    if (!goal || pending) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteGoal(goal.id);
      router.back();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete. Try again.');
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <GoalForm
        initial={goal}
        submitLabel="Save changes"
        disabled={deleting}
        unitLocked={entryCount.count > 0}
        onSubmit={async (values) => {
          if (deleting) return;
          setSaving(true);
          try {
            await updateGoal(goal.id, values);
          } catch (e) {
            setSaving(false);
            throw e;
          }
          router.back();
        }}
      />

      <View style={[styles.danger, { borderTopColor: theme.border }]}>
        {confirming ? (
          <View style={styles.confirm}>
            <Text style={{ color: theme.text, fontSize: 15 }}>
              Delete “{goal.label}”? Anything already logged for it is kept, but no longer linked to this goal. This cannot be undone.
            </Text>
            {deleteError ? <ErrorMessage>{deleteError}</ErrorMessage> : null}
            <SecondaryButton label={deleting ? 'Deleting…' : 'Yes, delete goal'} onPress={confirmDelete} disabled={pending} danger />
            <SecondaryButton label="Cancel" onPress={() => setConfirming(false)} disabled={pending} />
          </View>
        ) : (
          <SecondaryButton label="Delete goal" onPress={() => setConfirming(true)} disabled={pending} danger />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  loading: { marginTop: 48 },
  danger: { marginTop: 24, paddingTop: 20, borderTopWidth: 1 },
  confirm: { gap: 12 },
});
