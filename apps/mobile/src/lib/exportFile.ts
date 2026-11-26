import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';

/**
 * Hands the owner their export as a file named `fileName`.
 *
 * - Web: downloads the file.
 * - iOS and Android: writes the JSON to a temporary file and opens the system share sheet with that
 *   file, so it can be saved to Files or Drive, emailed or sent with its name and type intact.
 *   If the device cannot share files, it falls back to sharing the JSON as text.
 *
 * Returns false if the owner dismissed the text share sheet without choosing anything. The file share
 * sheet does not report whether anything was chosen, so that case counts as done.
 */
export async function saveExport(fileName: string, text: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
    return true;
  }

  if (await Sharing.isAvailableAsync()) {
    // The cache folder is cleaned up by the system. The file is not deleted here because on Android
    // the receiving app may still be reading it after the share sheet closes.
    const file = new File(Paths.cache, fileName);
    file.create({ overwrite: true });
    file.write(text);
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      UTI: 'public.json',
      dialogTitle: 'Save or send your Watchdog export',
    });
    return true;
  }

  const result = await Share.share({ title: fileName, message: text });
  return result.action !== Share.dismissedAction;
}
