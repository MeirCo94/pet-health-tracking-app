import { parseDogInput, validateDog, type Dog, type DogFormErrors, type DogValues } from '@watchdog/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { ErrorMessage, PrimaryButton, TextField } from './ui';

export function DogForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Dog;
  submitLabel: string;
  onSubmit: (values: DogValues) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [breed, setBreed] = useState(initial?.breed ?? '');
  const [birthDate, setBirthDate] = useState(initial?.birthDate ?? '');
  const [errors, setErrors] = useState<DogFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (busy) return;
    const input = { name, breed, birthDate };
    const found = validateDog(input);
    setErrors(found);
    setSubmitError(null);
    if (found.name || found.breed || found.birthDate) return;

    setBusy(true);
    try {
      await onSubmit(parseDogInput(input));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setBusy(false);
    }
    // On success the screen navigates away, so busy is left as is.
  }

  return (
    <View style={styles.form}>
      <TextField
        label="Name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="off"
        placeholder="Pickles"
        error={errors.name}
        editable={!busy}
      />
      <TextField
        label="Breed (optional)"
        value={breed}
        onChangeText={setBreed}
        autoCapitalize="words"
        autoComplete="off"
        placeholder="Beagle"
        error={errors.breed}
        editable={!busy}
      />
      <TextField
        label="Birth date (optional)"
        value={birthDate}
        onChangeText={setBirthDate}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        keyboardType="numbers-and-punctuation"
        placeholder="2021-04-18"
        hint="Format: YYYY-MM-DD. An approximate date is fine."
        error={errors.birthDate}
        editable={!busy}
      />
      {submitError ? <ErrorMessage>{submitError}</ErrorMessage> : null}
      <PrimaryButton label={submitLabel} onPress={submit} busy={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
