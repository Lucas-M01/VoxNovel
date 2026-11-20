import { queryOptions } from '@tanstack/react-query';
import { availableVoices, defaultVoice, groupedVoices, type SpeechDriver } from '@core/tts-service';

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
