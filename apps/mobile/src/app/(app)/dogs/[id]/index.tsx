import { formatAge } from '@watchdog/shared';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorMessage, PrimaryButton, SecondaryButton } from '../../../../components/ui';
import { useTheme } from '../../../../lib/theme';
import { useDog } from '../../../../lib/useDogs';

export default function DogScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { dog, loaded, error, reload } = useDog(id);

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

      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Goals</Text>
        <Text style={{ color: theme.muted, fontSize: 15 }}>Setting goals and logging activity come next.</Text>
      </View>

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
  sectionTitle: { fontSize: 18, fontWeight: '600' },
});
