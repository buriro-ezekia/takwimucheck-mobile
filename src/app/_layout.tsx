// Configures the TakwimuCheck route stack, safe areas, purchases, review and backend access state.

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Colours } from '@/constants/colours';
import { BackendAccessProvider } from '@/providers/backend-access-provider';
import { RevenueCatProvider } from '@/providers/revenuecat-provider';
import { ReviewProvider } from '@/providers/review-provider';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <RevenueCatProvider>
        <BackendAccessProvider>
          <ReviewProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: Colours.background },
                animation: 'slide_from_right',
              }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="demo" />
              <Stack.Screen name="upload" />
              <Stack.Screen name="validation-summary" />
              <Stack.Screen name="issues" />
              <Stack.Screen name="protected-data" />
              <Stack.Screen name="review-queue" />
              <Stack.Screen name="review-issue" />
              <Stack.Screen name="review-audit" />
              <Stack.Screen name="upgrade" />
              <Stack.Screen name="settings" />
            </Stack>
          </ReviewProvider>
        </BackendAccessProvider>
      </RevenueCatProvider>
    </SafeAreaProvider>
  );
}
