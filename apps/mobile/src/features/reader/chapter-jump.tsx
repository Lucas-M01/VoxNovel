import { useState } from 'react';
import { TextInput } from 'react-native';
import { z } from 'zod';
import { chapterSchema } from '@core/api/schemas';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { presentation } from '@ui/presentation';

const chapterInput = z.string().trim().regex(/^\d+$/).transform(Number).pipe(chapterSchema);
type Props = { color?: string | undefined; chapter: number; total: number | null; available: (chapter: number) => boolean; onSelect: (chapter: number) => void };
export function ChapterJump({ color, chapter, total, available, onSelect }: Props) {
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
  const label = `Cap. ${chapter}${total === null ? '' : ` / ${total}`}`;
  return <>
    <Button title={label} trailingIcon="pencil-outline" iconSize={12} iconColor={color} variant="quiet" labelStyle={{ color }} onPress={() => { setInput(String(chapter)); setError(''); setVisible(true); }} />
    <Dialog title="Ir para capítulo" visible={visible} onClose={() => setVisible(false)}>
      <TextInput accessibilityLabel="Número do capítulo" keyboardType="number-pad" value={input} onChangeText={setInput} onSubmitEditing={confirm} style={presentation.input} />
      {error ? <ErrorMessage message={error} /> : null}
      <Button variant="primary" title="Ir" onPress={confirm} />
    </Dialog>
  </>;
}
