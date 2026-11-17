import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Watchdog</Text>
      <Text style={styles.subtitle}>Foundation build. Dog health goals come next.</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 28, fontWeight: '600' },
  subtitle: { marginTop: 8, fontSize: 16, opacity: 0.7, textAlign: 'center' },
});
