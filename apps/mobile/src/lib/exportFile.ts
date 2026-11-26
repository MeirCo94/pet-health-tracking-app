import { Platform, Share } from 'react-native';

/**
 * Hands the owner their export. On the web it downloads a file. On iOS and Android it opens the
 * system share sheet with the text, so it can be saved to Files, emailed or copied.
 * Returns false if the owner dismissed the share sheet without choosing anything.
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
  const result = await Share.share({ title: fileName, message: text });
  return result.action !== Share.dismissedAction;
}
