import { router } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';
import { DogForm } from '../../../components/DogForm';
import { createDog } from '../../../lib/dogs';

export default function NewDogScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <DogForm
        submitLabel="Add dog"
        onSubmit={async (values) => {
          const dog = await createDog(values);
          router.replace(`/dogs/${dog.id}`);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
