import { queryOptions } from '@tanstack/react-query';
import { availableVoices, defaultVoice, groupedVoices, type SpeechDriver, type VoiceGroup } from '@core/tts-service';

export function speechVoicesOptions(driver: SpeechDriver) {
  return queryOptions({
    queryKey: ['speech-voices'], networkMode: 'always', staleTime: Infinity,
    queryFn: async () => {
      const voices = await availableVoices(driver);
      const snapshot = { ...driver, voices: async () => voices };
      const [groups, selected] = await Promise.all([groupedVoices(snapshot), defaultVoice(snapshot)]);
      return { groups, selected };
    },
  });
}

export function voiceLocale(code: string) {
  return code.toLowerCase().replaceAll('_', '-');
}

export function isBasicVoiceLocale(code: string) {
  const locale = voiceLocale(code);
  return locale === 'pt-br' || locale === 'en-us';
}

export function voicePickerGroups(groups: VoiceGroup[], extraLocales: readonly string[] = []): VoiceGroup[] {
  const portuguese: VoiceGroup = { code: 'pt-br', name: 'Português (Brasil)', voices: [] };
  const american: VoiceGroup = { code: 'en-us', name: 'Inglês (Estados Unidos)', voices: [] };
  const extras = new Set(extraLocales.map(voiceLocale));
  const additional: VoiceGroup[] = [];
  for (const group of groups) {
    const locale = voiceLocale(group.code);
    if (locale === 'en-us') american.voices.push(...group.voices);
    else if (locale === 'pt-br') portuguese.voices.push(...group.voices);
    else if (extras.has(locale)) additional.push(group);
  }
  return [portuguese, american, ...additional].filter(group => group.voices.length > 0);
}
