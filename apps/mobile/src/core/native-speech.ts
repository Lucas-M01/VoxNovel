import * as Speech from 'expo-speech';
import type { SpeechDriver } from '@core/tts-service';

export const nativeSpeech: SpeechDriver = {
  speak: (text, options) => {
    const nativeOptions: Speech.SpeechOptions = { onDone: options.onDone, onStopped: options.onStopped, onError: options.onError };
    if (options.rate !== undefined) nativeOptions.rate = options.rate;
    if (options.pitch !== undefined) nativeOptions.pitch = options.pitch;
    if (options.voice !== undefined) nativeOptions.voice = options.voice;
    if (options.language !== undefined) nativeOptions.language = options.language;
    Speech.speak(text, nativeOptions);
  },
  stop: () => Speech.stop(),
  voices: () => Speech.getAvailableVoicesAsync(),
};
