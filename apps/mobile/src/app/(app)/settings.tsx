import { DELETE_CONFIRMATION_WORD, exportFileName, isDeleteConfirmed, serializeExport } from '@watchdog/shared';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ErrorMessage, PrimaryButton, SecondaryButton, TextField } from '../../components/ui';
import { deleteAccount, finishSignOut, loadAccountExport } from '../../lib/account';
import { useSession } from '../../lib/auth';
import { saveExport } from '../../lib/exportFile';
import { useTheme } from '../../lib/theme';

export default function SettingsScreen() {
  const theme = useTheme();
  const { session } = useSession();
  const email = session?.user.email ?? null;

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportNote, setExportNote] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Set when the account was deleted but this device could not clear the saved session.
  const [deletedNeedsSignOut, setDeletedNeedsSignOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const pending = exporting || deleting;

  async function exportData() {
    if (pending) return;
    setExporting(true);
    setExportError(null);
    setExportNote(null);
    try {
      const data = await loadAccountExport(email);
      const saved = await saveExport(exportFileName(new Date()), serializeExport(data));
      if (saved) {
        setExportNote(
          `Exported ${data.counts.dogs} ${data.counts.dogs === 1 ? 'dog' : 'dogs'}, ${data.counts.goals} ${
            data.counts.goals === 1 ? 'goal' : 'goals'
          } and ${data.counts.entries} ${data.counts.entries === 1 ? 'entry' : 'entries'}.`,
        );
      }
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Could not export your data. Try again.');
    } finally {
      setExporting(false);
    }
  }

  async function confirmDelete() {
    if (pending || !isDeleteConfirmed(typed)) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      // On success the session clears and the router moves to the sign-in screen.
      const { signedOut } = await deleteAccount();
      if (!signedOut) {
        setDeletedNeedsSignOut(true);
        setDeleting(false);
      }
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete your account. Try again.');
      setDeleting(false);
    }
  }

  async function retrySignOut() {
    setSignOutError(null);
    if (!(await finishSignOut())) {
      setSignOutError('Could not finish signing out. Close and reopen the app, then sign in again if asked.');
    }
  }

  if (deletedNeedsSignOut) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.block}>
          <Text style={[styles.heading, { color: theme.text }]}>Your account has been deleted</Text>
          <Text style={{ color: theme.muted, fontSize: 15 }}>
            Your dogs, goals and logged activity are gone. This device still has to finish signing out.
          </Text>
          {signOutError ? <ErrorMessage>{signOutError}</ErrorMessage> : null}
          <PrimaryButton label="Finish signing out" onPress={retrySignOut} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.block}>
        <Text style={[styles.heading, { color: theme.text }]}>Account</Text>
        <Text style={{ color: theme.muted, fontSize: 15 }}>Signed in as {email ?? 'unknown'}</Text>
      </View>

      <View style={styles.block}>
        <Text style={[styles.heading, { color: theme.text }]}>Your data</Text>
        <Text style={{ color: theme.muted, fontSize: 15 }}>
          Download everything saved for your account: your dogs, goals and logged activity, as one file you can keep.
        </Text>
        {exportError ? <ErrorMessage>{exportError}</ErrorMessage> : null}
        {exportNote ? <Text style={{ color: theme.info, fontSize: 14 }}>{exportNote}</Text> : null}
        <PrimaryButton label="Export my data" onPress={exportData} busy={exporting} />
      </View>

      <View style={[styles.block, styles.danger, { borderTopColor: theme.border }]}>
        <Text style={[styles.heading, { color: theme.text }]}>Delete account</Text>
        <Text style={{ color: theme.muted, fontSize: 15 }}>
          This permanently deletes your account and all of your dogs, goals and logged activity. It cannot be undone.
          Export your data first if you want a copy.
        </Text>
        {confirming ? (
          <View style={styles.block}>
            <TextField
              label={`Type ${DELETE_CONFIRMATION_WORD} to confirm`}
              value={typed}
              onChangeText={setTyped}
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              editable={!pending}
            />
            {deleteError ? <ErrorMessage>{deleteError}</ErrorMessage> : null}
            <SecondaryButton
              label={deleting ? 'Deleting…' : 'Permanently delete my account'}
              onPress={confirmDelete}
              disabled={pending || !isDeleteConfirmed(typed)}
              danger
            />
            <SecondaryButton
              label="Cancel"
              onPress={() => {
                setConfirming(false);
                setTyped('');
                setDeleteError(null);
              }}
              disabled={pending}
            />
          </View>
        ) : (
          <SecondaryButton label="Delete my account" onPress={() => setConfirming(true)} disabled={pending} danger />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, gap: 28, maxWidth: 560, width: '100%', alignSelf: 'center' },
  block: { gap: 12 },
  heading: { fontSize: 20, fontWeight: '700' },
  danger: { borderTopWidth: 1, paddingTop: 24 },
});
