import { formatAge } from '@watchdog/shared';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorMessage, PrimaryButton, SecondaryButton } from '../../components/ui';
import { useSession } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';
import { useDogs } from '../../lib/useDogs';

const SIGN_OUT_FAILED = 'Could not sign out. Check your connection and try again.';

export default function HomeScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const { dogs, error, reload } = useDogs();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutError(null);
    try {
      // On success the session clears and the router moves to the sign-in screen.
      const { error: failure } = await supabase.auth.signOut();
      if (failure) setSignOutError(SIGN_OUT_FAILED);
    } catch {
      setSignOutError(SIGN_OUT_FAILED);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[styles.title, { color: theme.text }]}>Your dogs</Text>

        {error ? (
          <View style={styles.block}>
            <ErrorMessage>{error}</ErrorMessage>
            <SecondaryButton label="Try again" onPress={reload} />
          </View>
        ) : null}

        {dogs === null && !error ? <ActivityIndicator accessibilityLabel="Loading dogs" style={styles.block} /> : null}

        {dogs && dogs.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No dogs yet</Text>
            <Text style={{ color: theme.muted, fontSize: 15 }}>
              Add your first dog to start setting goals and tracking how they are doing.
            </Text>
            <PrimaryButton label="Add your first dog" onPress={() => router.push('/dogs/new')} />
          </View>
        ) : null}

        {dogs && dogs.length > 0 ? (
          <>
            {dogs.map((dog) => {
              const details = [dog.breed, formatAge(dog.birthDate)].filter(Boolean).join(' · ');
              return (
                <Pressable
                  key={dog.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${dog.name}${details ? `, ${details}` : ''}`}
                  onPress={() => router.push(`/dogs/${dog.id}`)}
                  style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}
                >
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{dog.name}</Text>
                  <Text style={{ color: theme.muted, fontSize: 14 }}>{details || 'No details yet'}</Text>
                </Pressable>
              );
            })}
            <PrimaryButton label="Add a dog" onPress={() => router.push('/dogs/new')} />
          </>
        ) : null}

        <View style={[styles.account, { borderTopColor: theme.border }]}>
          <Text style={{ color: theme.muted, fontSize: 14 }}>Signed in as {session?.user.email ?? 'unknown'}</Text>
          {signOutError ? <ErrorMessage>{signOutError}</ErrorMessage> : null}
          <SecondaryButton label="Settings" onPress={() => router.push('/settings')} />
          <SecondaryButton label={signingOut ? 'Signing out…' : 'Sign out'} onPress={signOut} disabled={signingOut} />
        </View>
      </ScrollView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 16, maxWidth: 560, width: '100%', alignSelf: 'center' },
  title: { fontSize: 28, fontWeight: '700' },
  block: { gap: 12 },
  empty: { borderWidth: 1, borderRadius: 14, padding: 20, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600' },
  card: { borderWidth: 1, borderRadius: 14, padding: 16, gap: 4 },
  cardTitle: { fontSize: 18, fontWeight: '600' },
  account: { marginTop: 24, paddingTop: 16, borderTopWidth: 1, gap: 12 },
});
