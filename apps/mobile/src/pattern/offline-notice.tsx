import { Text } from 'react-native';
import { useConnectivity } from '@core/connectivity';

export function OfflineNotice({ mode }: { mode: 'reading' | 'speech' }) {
  const status = useConnectivity();
  if (status !== 'offline') return null;
  return <Text style={{ color: '#F0A500', fontSize: 11 }}>
    {mode === 'speech' ? 'Sem internet — só os capítulos baixados estão disponíveis' : 'Sem internet — só capítulos baixados'}
  </Text>;
}
