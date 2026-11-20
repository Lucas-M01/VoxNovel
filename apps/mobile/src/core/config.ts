import { z } from 'zod';

const apiUrlSchema = z.httpUrl().refine(value => {
  try {
    const url = new URL(value);
    return !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
});

export function apiBaseUrl(value = process.env.EXPO_PUBLIC_API_URL): string {
  const result = apiUrlSchema.safeParse(value);
  if (!result.success) {
    throw new Error('Configure EXPO_PUBLIC_API_URL com o endereço HTTP da API.');
  }
  return result.data.replace(/\/+$/, '');
}

// Scraping and translation can take longer than an ordinary API request.
export const apiTimeoutMs = 180_000;
