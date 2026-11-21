import { Text, View } from 'react-native';
import type { TextMode } from '@core/text-mode';
import { Button } from '@ui/button';

type Props = { mode: TextMode; onChange: (mode: TextMode) => void; originalAvailable: boolean };
export function TextModeChoice({ mode, onChange, originalAvailable }: Props) {
  return <View style={{ padding: 8, gap: 6 }}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      <Button title="Texto original" selected={mode === 'original'} disabled={!originalAvailable} onPress={() => onChange('original')} />
      <Button title="Traduzir para português" selected={mode === 'translated'} onPress={() => onChange('translated')} />
    </View>
    {!originalAvailable ? <Text style={{ color: '#888888' }}>Conecte-se para carregar o original. Os downloads continuam na versão em português.</Text> : null}
  </View>;
}
