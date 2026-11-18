import { Stack } from 'expo-router';
import { useTheme } from '../../lib/theme';

export default function AppLayout() {
  const theme = useTheme();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="dogs/new" options={{ title: 'Add dog' }} />
      <Stack.Screen name="dogs/[id]/index" options={{ title: '' }} />
      <Stack.Screen name="dogs/[id]/edit" options={{ title: 'Edit dog' }} />
      <Stack.Screen name="dogs/[id]/goals/new" options={{ title: 'Add goal' }} />
      <Stack.Screen name="dogs/[id]/goals/[goalId]" options={{ title: 'Edit goal' }} />
    </Stack>
  );
}
