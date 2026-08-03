// Configures the TakwimuCheck route stack and global safe-area treatment.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colours } from '@/constants/colours';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colours.background },
          animation: 'slide_from_right',
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="demo" />
        <Stack.Screen name="validation-summary" />
        <Stack.Screen name="issues" />
        <Stack.Screen name="upgrade" />
        <Stack.Screen name="settings" />
      </Stack>
    </SafeAreaProvider>
  );
}
