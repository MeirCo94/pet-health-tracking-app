import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { parseDate, toLocalDateString } from '@watchdog/shared';
import { createElement, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '../lib/theme';

export function PrimaryButton({
  label,
  onPress,
  busy = false,
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 }]}
    >
      {busy ? (
        <ActivityIndicator color={theme.primaryText} />
      ) : (
        <Text style={[styles.buttonText, { color: theme.primaryText }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  disabled = false,
  danger = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const theme = useTheme();
  const color = danger ? theme.error : theme.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.button, styles.secondary, { borderColor: danger ? theme.error : theme.border, opacity: disabled ? 0.6 : 1 }]}
    >
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

export function TextField({ label, error, hint, ...props }: TextInputProps & { label: string; error?: string; hint?: string }) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={theme.muted}
        {...props}
        style={[
          styles.input,
          { color: theme.text, borderColor: error ? theme.error : theme.border, backgroundColor: theme.surface },
        ]}
      />
      {hint && !error ? <Text style={[styles.hint, { color: theme.muted }]}>{hint}</Text> : null}
      {error ? <Text style={[styles.hint, { color: theme.error }]}>{error}</Text> : null}
    </View>
  );
}

export function ErrorMessage({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="alert" style={[styles.errorText, { color: theme.error }]}>
      {children}
    </Text>
  );
}

/** A single choice from a few options, shown as a row of pills. Wraps onto more lines if needed. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  disabled = false,
}: {
  label?: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <View style={styles.field}>
      {label ? <Text style={[styles.label, { color: theme.text }]}>{label}</Text> : null}
      <View accessibilityRole="radiogroup" style={styles.choices}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled }}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={[
                styles.choice,
                {
                  backgroundColor: selected ? theme.primary : theme.surface,
                  borderColor: selected ? theme.primary : theme.border,
                  opacity: disabled ? 0.6 : 1,
                },
              ]}
            >
              <Text style={{ color: selected ? theme.primaryText : theme.text, fontSize: 15, fontWeight: selected ? '600' : '400' }}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function dateFromString(value: string): Date {
  const parsed = parseDate(value);
  return parsed ? new Date(parsed.year, parsed.month - 1, parsed.day) : new Date();
}

/**
 * A date picker that holds a YYYY-MM-DD string. It uses the browser's date input on web,
 * the compact system picker on iOS and the system dialog on Android.
 */
export function DateField({
  label,
  value,
  onChange,
  maxDate,
  error,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Latest date that can be chosen. */
  maxDate?: Date;
  error?: string;
  disabled?: boolean;
}) {
  const theme = useTheme();
  const current = dateFromString(value);
  const text = value ? current.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Choose a date';

  let control: ReactNode;
  if (Platform.OS === 'web') {
    control = createElement('input', {
      type: 'date',
      value,
      max: maxDate ? toLocalDateString(maxDate) : undefined,
      disabled,
      'aria-label': label,
      onChange: (event: { target: { value: string } }) => onChange(event.target.value),
      style: {
        border: `1px solid ${error ? theme.error : theme.border}`,
        borderRadius: 10,
        padding: '12px 14px',
        fontSize: 16,
        minHeight: 48,
        boxSizing: 'border-box',
        backgroundColor: theme.surface,
        color: theme.text,
        colorScheme: theme.background === '#ffffff' ? 'light' : 'dark',
        fontFamily: 'inherit',
      },
    });
  } else if (Platform.OS === 'ios') {
    control = (
      <View style={styles.pickerRow}>
        <DateTimePicker
          accessibilityLabel={label}
          value={current}
          mode="date"
          display="compact"
          maximumDate={maxDate}
          disabled={disabled}
          onChange={(_, selected) => {
            if (selected) onChange(toLocalDateString(selected));
          }}
        />
      </View>
    );
  } else {
    control = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${text}. Change date`}
        disabled={disabled}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: current,
            mode: 'date',
            maximumDate: maxDate,
            onChange: (event, selected) => {
              if (event.type === 'set' && selected) onChange(toLocalDateString(selected));
            },
          })
        }
        style={[styles.input, { borderColor: error ? theme.error : theme.border, backgroundColor: theme.surface, opacity: disabled ? 0.6 : 1 }]}
      >
        <Text style={{ color: theme.text, fontSize: 16 }}>{text}</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      {control}
      {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}
    </View>
  );
}

/** A thin bar showing 0 to 100 percent. The meaning is always also given in text next to it. */
export function ProgressBar({ percent, met = false, label }: { percent: number; met?: boolean; label: string }) {
  const theme = useTheme();
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: clamped }}
      style={[styles.track, { backgroundColor: theme.border }]}
    >
      <View style={{ width: `${clamped}%`, height: '100%', backgroundColor: met ? theme.info : theme.primary }} />
    </View>
  );
}

const styles = StyleSheet.create({
  pickerRow: { alignItems: 'flex-start' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  button: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  buttonText: { fontSize: 16, fontWeight: '600' },
  secondary: { borderWidth: 1 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  hint: { fontSize: 13 },
  errorText: { fontSize: 14 },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: { borderWidth: 1, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
});
