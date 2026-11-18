import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DogForm } from '../../../../components/DogForm';
import { ErrorMessage, SecondaryButton } from '../../../../components/ui';
import { deleteDog, updateDog } from '../../../../lib/dogs';
import { useTheme } from '../../../../lib/theme';
import { useDog } from '../../../../lib/useDogs';

export default function EditDogScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { dog, loaded, error, reload } = useDog(id);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
        <Text style={{ color: theme.text, fontSize: 18 }}>Dog not found.</Text>
        <SecondaryButton label="Back to your dogs" onPress={() => router.dismissAll()} />
      </View>
    );
  }

  async function confirmDelete() {
    if (!dog || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteDog(dog.id);
      router.dismissAll();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete. Try again.');
      setDeleting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <DogForm
        initial={dog}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await updateDog(dog.id, values);
          router.back();
        }}
      />

      <View style={[styles.danger, { borderTopColor: theme.border }]}>
        {confirming ? (
          <View style={styles.confirm}>
            <Text style={{ color: theme.text, fontSize: 15 }}>
              Delete {dog.name}? This also deletes their goals and logged entries, and it cannot be undone.
            </Text>
            {deleteError ? <ErrorMessage>{deleteError}</ErrorMessage> : null}
            <SecondaryButton label={deleting ? 'Deleting…' : `Yes, delete ${dog.name}`} onPress={confirmDelete} disabled={deleting} danger />
            <SecondaryButton label="Cancel" onPress={() => setConfirming(false)} disabled={deleting} />
          </View>
        ) : (
          <SecondaryButton label="Delete dog" onPress={() => setConfirming(true)} danger />
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
