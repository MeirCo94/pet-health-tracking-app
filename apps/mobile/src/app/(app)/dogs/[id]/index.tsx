import { describeGoalSource, formatAge, formatGoalTarget } from '@watchdog/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorMessage, PrimaryButton, SecondaryButton } from '../../../../components/ui';
import { useTheme } from '../../../../lib/theme';
import { useDog } from '../../../../lib/useDogs';
import { useGoals } from '../../../../lib/useGoals';

export default function DogScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { dog, loaded, error, reload } = useDog(id);
  const goalList = useGoals(id);

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorMessage>{error}</ErrorMessage>
        <SecondaryButton label="Try again" onPress={reload} />
      </View>
    );
  }

  if (!loaded) {
    return <ActivityIndicator accessibilityLabel="Loading dog" style={styles.loading} />;
  }

  if (!dog) {
    return (
      <View style={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Dog not found</Text>
        <Text style={{ color: theme.muted }}>It may have been deleted.</Text>
        <PrimaryButton label="Back to your dogs" onPress={() => router.dismissAll()} />
      </View>
    );
  }

  const age = formatAge(dog.birthDate);
  const rows: [string, string][] = [
    ['Breed', dog.breed ?? 'Not set'],
    ['Age', age ?? 'Not set'],
    ['Birth date', dog.birthDate ?? 'Not set'],
  ];

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: dog.name }} />
      <Text style={[styles.title, { color: theme.text }]}>{dog.name}</Text>

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={{ color: theme.muted, fontSize: 15 }}>{label}</Text>
            <Text style={{ color: theme.text, fontSize: 15 }}>{value}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Goals</Text>

      {goalList.error ? (
        <View style={styles.block}>
          <ErrorMessage>{goalList.error}</ErrorMessage>
          <SecondaryButton label="Try again" onPress={goalList.reload} />
        </View>
      ) : null}

      {goalList.goals === null && !goalList.error ? <ActivityIndicator accessibilityLabel="Loading goals" /> : null}

      {goalList.goals && goalList.goals.length === 0 ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={{ color: theme.muted, fontSize: 15 }}>
            No goals yet. Add one, such as a daily walk, to start tracking how {dog.name} is doing.
          </Text>
        </View>
      ) : null}

      {goalList.goals?.map((goal) => (
        <Pressable
          key={goal.id}
          accessibilityRole="button"
          accessibilityLabel={`${goal.label}, ${formatGoalTarget(goal)}`}
          onPress={() => router.push(`/dogs/${dog.id}/goals/${goal.id}`)}
          style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border, opacity: goal.status === 'paused' ? 0.7 : 1 }]}
        >
          <View style={styles.goalHeader}>
            <Text style={[styles.goalTitle, { color: theme.text }]}>{goal.label}</Text>
            {goal.status === 'paused' ? <Text style={{ color: theme.muted, fontSize: 13 }}>Paused</Text> : null}
          </View>
          <Text style={{ color: theme.text, fontSize: 15 }}>{formatGoalTarget(goal)}</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{describeGoalSource(goal)}</Text>
        </Pressable>
      ))}

      <PrimaryButton label="Add a goal" onPress={() => router.push(`/dogs/${dog.id}/goals/new`)} />

      <SecondaryButton label="Edit details" onPress={() => router.push(`/dogs/${dog.id}/edit`)} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  loading: { marginTop: 48 },
  title: { fontSize: 28, fontWeight: '700' },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '700', marginTop: 8 },
  block: { gap: 12 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  goalTitle: { fontSize: 17, fontWeight: '600' },
});
