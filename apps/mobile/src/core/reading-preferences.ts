import { useState } from 'react';
import { z } from 'zod';

export const fontSizes = [14, 16, 18, 20, 23];
export const spacings = [1.4, 1.6, 1.8, 2];
export const widths = [1, 0.95, 0.9, 0.85];
export const fonts = [
  { name: 'Padrão', family: undefined }, { name: 'Serif', family: 'serif' }, { name: 'Monospace', family: 'monospace' },
];
export const themes = [
  { name: 'Escuro', background: '#0F0F1A', text: '#D4D4D4', line: '#1E1E2E' },
  { name: 'Preto', background: '#000000', text: '#CCCCCC', line: '#111111' },
  { name: 'Sépia', background: '#1C1612', text: '#C8B89A', line: '#2A211A' },
  { name: 'Claro', background: '#F5F0E8', text: '#2C2C2C', line: '#E0DAD0' },
];
export const scrollSpeeds = [
  { name: 'Lenta', value: 0.5 }, { name: 'Normal', value: 1 }, { name: 'Rápida', value: 1.8 }, { name: 'Muito rápida', value: 3 },
];
export const readingPreferencesSchema = z.object({
  sizeIndex: z.int().min(0).max(4).default(2),
  fontIndex: z.int().min(0).max(2).default(0),
  themeIndex: z.int().min(0).max(3).default(0),
  spacingIndex: z.int().min(0).max(3).default(2),
  widthIndex: z.int().min(0).max(3).default(2),
  scrollSpeedIndex: z.int().min(0).max(3).default(0),
  autoScroll: z.boolean().default(false), controlsVisible: z.boolean().default(true), immersive: z.boolean().default(true),
});
export type ReadingPreferences = z.infer<typeof readingPreferencesSchema>;
export function useReadingPreferences() {
  const [preferences, setPreferences] = useState(() => readingPreferencesSchema.parse({}));
  function update(patch: Partial<ReadingPreferences>) {
    setPreferences(previous => readingPreferencesSchema.parse({ ...previous, ...patch }));
  }
  return { preferences, update };
}
