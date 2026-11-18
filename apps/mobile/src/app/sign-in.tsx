import { normalizeEmail, validateCredentials, type AuthMode, type CredentialErrors } from '@watchdog/shared';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';

type Notice = { kind: 'error' | 'info'; text: string };

export default function SignInScreen() {
  const theme = useTheme();
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<CredentialErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === 'sign-up';

  async function submit() {
    if (busy) return;
    const problems = validateCredentials({ email, password }, mode);
    setFieldErrors(problems);
    setNotice(null);
    if (problems.email || problems.password) return;

    setBusy(true);
    const credentials = { email: normalizeEmail(email), password };
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp(credentials);
        if (error) {
          setNotice({ kind: 'error', text: error.message });
        } else if (!data.session) {
          // Email confirmation is on: the account exists but cannot sign in until confirmed.
          setNotice({ kind: 'info', text: 'Check your email to confirm your account, then sign in.' });
          setMode('sign-in');
          setPassword('');
        }
        // With confirmation off, a session arrives and the router moves to the home screen.
      } else {
        const { error } = await supabase.auth.signInWithPassword(credentials);
        if (error) setNotice({ kind: 'error', text: error.message });
      }
    } catch {
      setNotice({ kind: 'error', text: 'Could not reach the server. Check your connection and try again.' });
    } finally {
      setBusy(false);
    }
  }

  function switchMode() {
    setMode(isSignUp ? 'sign-in' : 'sign-up');
    setFieldErrors({});
    setNotice(null);
  }

  const inputStyle = [styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.surface }];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: theme.text }]}>Watchdog</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {isSignUp ? 'Create an account to start tracking.' : 'Sign in to see how your dog is doing.'}
        </Text>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Email</Text>
          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={theme.muted}
            accessibilityLabel="Email"
            editable={!busy}
          />
          {fieldErrors.email ? <Text style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.email}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.text }]}>Password</Text>
          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            textContentType={isSignUp ? 'newPassword' : 'password'}
            placeholder={isSignUp ? 'At least 8 characters' : 'Your password'}
            placeholderTextColor={theme.muted}
            accessibilityLabel="Password"
            editable={!busy}
            onSubmitEditing={submit}
            returnKeyType="go"
          />
          {fieldErrors.password ? (
            <Text style={[styles.fieldError, { color: theme.error }]}>{fieldErrors.password}</Text>
          ) : null}
        </View>

        {notice ? (
          <Text
            accessibilityRole="alert"
            style={[styles.notice, { color: notice.kind === 'error' ? theme.error : theme.info }]}
          >
            {notice.text}
          </Text>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy }}
          onPress={submit}
          disabled={busy}
          style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: busy ? 0.7 : 1 }]}
        >
          {busy ? (
            <ActivityIndicator color={theme.primaryText} />
          ) : (
            <Text style={[styles.primaryButtonText, { color: theme.primaryText }]}>
              {isSignUp ? 'Create account' : 'Sign in'}
            </Text>
          )}
        </Pressable>

        <Pressable accessibilityRole="button" onPress={switchMode} disabled={busy} style={styles.switchButton}>
          <Text style={{ color: theme.primary, fontSize: 15 }}>
            {isSignUp ? 'Already have an account? Sign in' : 'New here? Create an account'}
          </Text>
        </Pressable>
        <StatusBar style="auto" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16, maxWidth: 480, width: '100%', alignSelf: 'center' },
  title: { fontSize: 32, fontWeight: '700' },
  subtitle: { fontSize: 16, marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16 },
  fieldError: { fontSize: 13 },
  notice: { fontSize: 14 },
  primaryButton: { minHeight: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryButtonText: { fontSize: 16, fontWeight: '600' },
  switchButton: { alignItems: 'center', paddingVertical: 8 },
});
