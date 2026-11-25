import {
  formInputFromGoal,
  formInputFromTemplate,
  GOAL_TEMPLATES,
  parseGoalInput,
  validateGoal,
  type DogGoal,
  type GoalFormErrors,
  type GoalFormInput,
  type GoalPeriod,
  type GoalSource,
  type GoalStatus,
  type GoalValues,
} from '@watchdog/shared';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../lib/theme';
import { ChoiceGroup, ErrorMessage, PrimaryButton, TextField } from './ui';

const CUSTOM = 'custom';

const TEMPLATE_OPTIONS = [
  ...GOAL_TEMPLATES.map((t) => ({ value: t.key, label: t.label })),
  { value: CUSTOM, label: 'Custom' },
];

const PERIOD_OPTIONS: { value: GoalPeriod; label: string }[] = [
  { value: 'daily', label: 'Per day' },
  { value: 'weekly', label: 'Per week' },
];

const SOURCE_OPTIONS: { value: GoalSource; label: string }[] = [
  { value: 'self', label: 'Me' },
  { value: 'vet', label: 'My vet' },
];

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
];

export function GoalForm({
  initial,
  submitLabel,
  onSubmit,
  disabled = false,
}: {
  /** Pass a saved goal to edit it. Leave out to start a new goal from a sample activity. */
  initial?: DogGoal;
  submitLabel: string;
  onSubmit: (values: GoalValues) => Promise<void>;
  /** Lock the whole form while something else on the screen, such as a delete, is in progress. */
  disabled?: boolean;
}) {
  const theme = useTheme();
  const editing = initial !== undefined;
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [form, setForm] = useState<GoalFormInput>(initial ? formInputFromGoal(initial) : formInputFromTemplate(null));
  const [errors, setErrors] = useState<GoalFormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const busy = saving || disabled;

  function set<K extends keyof GoalFormInput>(key: K, value: GoalFormInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function pickTemplate(key: string) {
    setTemplateKey(key);
    const template = GOAL_TEMPLATES.find((t) => t.key === key) ?? null;
    // Keep who set the goal; everything else restarts from the template (or blank for custom).
    setForm((prev) => ({ ...formInputFromTemplate(template), source: prev.source, prescribedBy: prev.prescribedBy }));
    setErrors({});
  }

  async function submit() {
    if (busy) return;
    const found = validateGoal(form);
    setErrors(found);
    setSubmitError(null);
    if (found.label || found.unit || found.target || found.prescribedBy) return;

    setSaving(true);
    try {
      await onSubmit(parseGoalInput(form));
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Could not save. Try again.');
      setSaving(false);
    }
    // On success the screen navigates away, so busy is left as is.
  }

  return (
    <View style={styles.form}>
      {!editing ? (
        <ChoiceGroup
          label="Start from an activity"
          options={TEMPLATE_OPTIONS}
          value={templateKey}
          onChange={pickTemplate}
          disabled={busy}
        />
      ) : null}

      <TextField
        label="Goal name"
        value={form.label}
        onChangeText={(v) => set('label', v)}
        autoCapitalize="sentences"
        autoComplete="off"
        placeholder="Daily walk"
        error={errors.label}
        editable={!busy}
      />

      <TextField
        label="Target (at least)"
        value={form.target}
        onChangeText={(v) => set('target', v)}
        keyboardType="decimal-pad"
        autoComplete="off"
        placeholder="60"
        error={errors.target}
        editable={!busy}
      />

      <TextField
        label="Unit (optional)"
        value={form.unit}
        onChangeText={(v) => set('unit', v)}
        autoCapitalize="none"
        autoComplete="off"
        placeholder="minutes"
        error={errors.unit}
        editable={!busy}
      />

      <ChoiceGroup label="How often" options={PERIOD_OPTIONS} value={form.period} onChange={(v) => set('period', v)} disabled={busy} />

      <ChoiceGroup
        label="Who set this goal?"
        options={SOURCE_OPTIONS}
        value={form.source}
        onChange={(v) => set('source', v)}
        disabled={busy}
      />

      {form.source === 'vet' ? (
        <>
          <TextField
            label="Vet's name (optional)"
            value={form.prescribedBy}
            onChangeText={(v) => set('prescribedBy', v)}
            autoCapitalize="words"
            autoComplete="off"
            placeholder="Dr. Lee"
            error={errors.prescribedBy}
            editable={!busy}
          />
          <Text style={{ color: theme.muted, fontSize: 13 }}>
            Enter the target exactly as your vet gave it. Watchdog tracks activity and does not give medical advice.
          </Text>
        </>
      ) : null}

      {editing ? (
        <ChoiceGroup label="Status" options={STATUS_OPTIONS} value={form.status} onChange={(v) => set('status', v)} disabled={busy} />
      ) : null}

      {submitError ? <ErrorMessage>{submitError}</ErrorMessage> : null}
      <PrimaryButton label={submitLabel} onPress={submit} busy={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 16 },
});
