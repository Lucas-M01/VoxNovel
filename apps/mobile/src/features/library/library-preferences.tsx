import { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { devicePreferencesSchema, speechRates, type DevicePreferences } from '@core/device-preferences';
import { devicePreferencesOptions } from '@core/local-queries';
import type { LocalStorage } from '@core/local-storage';
import { nativeSpeech } from '@core/native-speech';
import { readingPreferencesSchema } from '@core/reading-preferences';
import { ReadingPreferencesFields } from '@features/reader/reading-controls';
import { isBasicVoiceLocale, speechVoicesOptions, voiceLocale } from '@features/speech/speech-queries';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { ErrorMessage } from '@ui/error-message';
import { presentation } from '@ui/presentation';

type Props = { storage: LocalStorage; visible: boolean; onClose: () => void };
export function LibraryPreferences({ storage, visible, onClose }: Props) {
  const client = useQueryClient();
  const [section, setSection] = useState<'reading' | 'speech'>('reading');
  const [showLanguages, setShowLanguages] = useState(false);
  const [choosingVoice, setChoosingVoice] = useState(false);
  const [draft, setDraft] = useState<DevicePreferences>({});
  const options = devicePreferencesOptions(storage);
  const saved = useQuery({ ...options, enabled: visible });
  const voices = useQuery({ ...speechVoicesOptions(nativeSpeech), enabled: visible && section === 'speech' });
  const save = useMutation({
    scope: { id: 'device-preferences' },
    networkMode: 'always',
    mutationFn: (preferences: DevicePreferences) => storage.savePreferences(preferences),
    onSuccess: (_, preferences) => {
      client.setQueryData(options.queryKey, preferences);
      setDraft({});
      setChoosingVoice(false);
      setShowLanguages(false);
      onClose();
    },
  });
  const current = { ...saved.data, ...draft };
  const reading = readingPreferencesSchema.parse(current.reading ?? {});
  const voice = voices.data?.groups.flatMap(group => group.voices).find(item => item.identifier === current.voiceId);
  const extraLanguages = (voices.data?.groups ?? []).filter(group => !isBasicVoiceLocale(group.code));
  const enabledLocales = current.extraVoiceLocales ?? [];
  function toggleLocale(code: string) {
    const locale = voiceLocale(code);
    update({ extraVoiceLocales: enabledLocales.includes(locale)
      ? enabledLocales.filter(value => value !== locale)
      : [...enabledLocales, locale] });
  }
  function update(patch: DevicePreferences) {
    if (!save.isPending) setDraft(previous => ({ ...previous, ...patch }));
  }
  function close() {
    if (save.isPending) return;
    save.reset();
    setDraft({});
    setChoosingVoice(false);
    setShowLanguages(false);
    onClose();
  }
  return <Dialog title="Preferências" visible={visible} onClose={close} placement="bottom" closeTitle="Cancelar"
    confirm={{ title: 'Salvar preferências', variant: 'primary', busy: save.isPending, disabled: !Object.keys(draft).length || saved.isPending,
      onPress: () => save.mutate(devicePreferencesSchema.parse(current)) }}>
    <View style={styles.row}>
      <Button title="Leitura" selected={section === 'reading'} style={styles.tab} onPress={() => setSection('reading')} />
      <Button title="Ouvir" selected={section === 'speech'} style={styles.tab} onPress={() => setSection('speech')} />
    </View>
    {save.isError ? <ErrorMessage message="Não foi possível salvar as preferências neste aparelho." /> : null}
    {saved.isPending ? <ActivityIndicator accessibilityLabel="Carregando preferências" /> : <View style={styles.content}>
      {section === 'reading' ? <ReadingPreferencesFields preferences={reading} onChange={patch => update({ reading: { ...reading, ...patch } })} /> : <>
        <Text style={presentation.subtitle}>Velocidade padrão</Text>
        <View style={styles.row}>{speechRates.map(rate => <Button key={rate} title={`${rate}x`} selected={current.speechRate === rate} onPress={() => update({ speechRate: rate })} />)}</View>
        <Button title="Escolher voz padrão" caption={voice?.name ?? 'Voz automática'} icon="account-voice" trailingIcon={choosingVoice ? 'chevron-up' : 'chevron-down'} onPress={() => setChoosingVoice(previous => !previous)} />
        {choosingVoice ? <>
          <Button title="Voz automática" selected={!current.voiceId} onPress={() => { update({ voiceId: null }); setChoosingVoice(false); }} />
          {voices.data?.groups.map(group => <View key={group.code} style={styles.content}>
            <Text style={presentation.subtitle}>{group.name}</Text>
            {group.voices.map(item => <Button key={item.identifier} title={`${item.name} (${item.quality})`} selected={item.identifier === current.voiceId}
              onPress={() => { update({ voiceId: item.identifier }); setChoosingVoice(false); }} />)}
          </View>)}
        </> : null}
        <Button title="Outros idiomas no player" trailingIcon={showLanguages ? 'chevron-up' : 'chevron-down'} onPress={() => setShowLanguages(value => !value)} />
        {showLanguages ? <View style={styles.content}>
          <Text style={presentation.subtitle}>Escolha quais idiomas instalados também aparecem no seletor do player.</Text>
          {extraLanguages.map(group => {
            const enabled = enabledLocales.includes(voiceLocale(group.code));
            return <Button key={group.code} title={group.name} trailingIcon={enabled ? 'check' : undefined}
              selected={enabled} onPress={() => toggleLocale(group.code)} />;
          })}
          {extraLanguages.length === 0 ? <Text style={presentation.subtitle}>Nenhum idioma adicional disponível no aparelho.</Text> : null}
        </View> : null}
      </>}
    </View>}
  </Dialog>;
}
const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tab: { flex: 1 },
  content: { gap: 14 },
});
