import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSession } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../lib/theme';

export default function HomeScreen() {
  const theme = useTheme();
  const { session } = useSession();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Watchdog</Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>
        Signed in as {session?.user.email ?? 'unknown'}
      </Text>
      <Text style={[styles.subtitle, { color: theme.muted }]}>Dogs and goals come next.</Text>

      <Pressable
        accessibilityRole="button"
        onPress={() => supabase.auth.signOut()}
        style={[styles.button, { borderColor: theme.border }]}
      >
        <Text style={{ color: theme.text, fontSize: 16 }}>Sign out</Text>
      </Pressable>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { fontSize: 16, textAlign: 'center' },
  button: { marginTop: 24, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1 },
});
