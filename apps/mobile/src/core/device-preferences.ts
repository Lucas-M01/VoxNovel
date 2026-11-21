import { z } from 'zod';
import { readingPreferencesSchema } from '@core/reading-preferences';

export const speechRates = [1, 1.25, 1.5, 1.75, 2];
export function limitSpeechRate(rate: number) {
  return Math.min(rate, 2);
}

export const devicePreferencesSchema = z.object({
  reading: readingPreferencesSchema.pick({
    sizeIndex: true, fontIndex: true, themeIndex: true,
    spacingIndex: true, widthIndex: true, scrollSpeedIndex: true,
  }).optional(),
  speechRate: z.number().positive().transform(limitSpeechRate).optional(),
  extraVoiceLocales: z.array(z.string().min(1)).optional(),
  voiceId: z.string().min(1).nullable().optional(),
});
export type DevicePreferences = z.infer<typeof devicePreferencesSchema>;
