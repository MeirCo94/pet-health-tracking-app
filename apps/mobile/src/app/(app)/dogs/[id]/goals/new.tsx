import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { GoalForm } from '../../../../../components/GoalForm';
import { createGoal } from '../../../../../lib/goals';

export default function NewGoalScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const dogId = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <GoalForm
        submitLabel="Add goal"
        onSubmit={async (values) => {
          if (!dogId) throw new Error('Missing dog.');
          await createGoal(dogId, values);
          router.back();
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
