import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { createQueryClient } from '@core/queries';
import { useConnectivity } from '@core/connectivity';

export default function RootLayout() {
  useConnectivity();
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <Stack screenOptions={{ headerShown: false }} />
    </QueryClientProvider>
  );
}
