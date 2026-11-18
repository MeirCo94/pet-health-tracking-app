import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';

const SIGN_OUT_FAILED = 'Could not sign out. Check your connection and try again.';

export default function HomeScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setError(null);
    try {
      // On success the session clears and the router moves to the sign-in screen.
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) setError(SIGN_OUT_FAILED);
    } catch {
      setError(SIGN_OUT_FAILED);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Watchdog</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>
        Signed in as {session?.user.email ?? 'unknown'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Dogs and goals come next.</Text>

      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: theme.error }]}>
          {error}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: signingOut }}
        disabled={signingOut}
        onPress={signOut}
        style={[styles.button, { borderColor: theme.border, opacity: signingOut ? 0.7 : 1 }]}
      >
        {signingOut ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <Text style={{ color: theme.text, fontSize: 16 }}>Sign out</Text>
        )}
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { fontSize: 16, textAlign: 'center' },
  error: { fontSize: 14, textAlign: 'center', marginTop: 8 },
  button: {
    marginTop: 24,
    minWidth: 120,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
  },
});
