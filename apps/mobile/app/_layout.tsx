import { useEffect, useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { createQueryClient } from '@core/queries';
import { useConnectivity } from '@core/connectivity';
import SplashScreen from '@screens/splash-screen';
import { colors } from '@ui/presentation';

export default function RootLayout() {
  useConnectivity();
  const [client] = useState(createQueryClient);
  const [ready, setReady] = useState(false);
  useEffect(() => { const timer = setTimeout(() => setReady(true), 1500); return () => clearTimeout(timer); }, []);
  if (!ready) return <><StatusBar style="light" /><SplashScreen /></>;
  return <SafeAreaProvider><QueryClientProvider client={client}>
    <StatusBar style="light" />
    <SafeAreaView edges={['left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.text, headerTitleStyle: { fontWeight: 'bold' }, contentStyle: { backgroundColor: colors.background }, headerShadowVisible: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ title: 'Nova Obra' }} />
        <Stack.Screen name="detail" options={{ title: 'Detalhes da obra' }} />
        <Stack.Screen name="reading" options={{ title: 'Leitura' }} />
        <Stack.Screen name="speech" options={{ title: 'Lendo...' }} />
        <Stack.Screen name="downloads" options={{ title: 'Downloads' }} />
        <Stack.Screen name="filters" options={{ title: 'Filtros' }} />
      </Stack>
    </SafeAreaView>
  </QueryClientProvider></SafeAreaProvider>;
}
