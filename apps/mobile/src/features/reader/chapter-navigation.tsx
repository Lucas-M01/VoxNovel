import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { z } from 'zod';
import { chapterSchema } from '@core/api/schemas';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';

const chapterInput = z.string().trim().regex(/^\d+$/).transform(Number).pipe(chapterSchema);
type Props = { chapter: number; total: number | null; available: (chapter: number) => boolean; onSelect: (chapter: number) => void };
export function ChapterNavigation({ chapter, total, available, onSelect }: Props) {
  const [visible, setVisible] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  function confirm() {
    const parsed = chapterInput.safeParse(input);
    if (!parsed.success) { setError('Capítulo inválido.'); return; }
    if (total !== null && parsed.data > total) { setError('Capítulo fora do intervalo.'); return; }
    if (!available(parsed.data)) { setError(`Capítulo ${parsed.data} não está baixado e você está offline.`); return; }
    onSelect(parsed.data); setVisible(false);
  }
  return <View style={{ gap: 8 }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
      <Button style={{ flex: 1 }} title="Capítulo anterior" disabled={!available(chapter - 1)} onPress={() => onSelect(chapter - 1)} />
      <Button style={{ flex: 1 }} title={`Cap. ${chapter}${total === null ? '' : ` / ${total}`}`} onPress={() => { setInput(String(chapter)); setError(''); setVisible(true); }} />
      <Button style={{ flex: 1 }} title="Próximo capítulo" disabled={!available(chapter + 1)} onPress={() => onSelect(chapter + 1)} />
    </View>
    <Dialog title="Ir para capítulo" visible={visible} onClose={() => setVisible(false)}>
      <TextInput accessibilityLabel="Número do capítulo" keyboardType="number-pad" value={input} onChangeText={setInput} onSubmitEditing={confirm} style={{ color: '#FFFFFF', borderColor: '#888888', borderWidth: 1, padding: 12 }} />
      {error ? <ErrorMessage message={error} /> : null}
      <Button title="Ir" onPress={confirm} />
    </Dialog>
  </View>;
}
