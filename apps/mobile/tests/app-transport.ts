import { z } from 'zod';
import type { Novel } from '@core/api/schemas';
import type { HttpTransport } from '@core/http-resource';

export const appNovel: Novel = {
  id: '11111111-1111-4111-8111-111111111111', title: 'Livro de demonstração', slug: 'demo', current_chapter: 1, image_url: null, total_chapters: 3,
  active_source_id: '22222222-2222-4222-8222-222222222222', updated_at: '2026-11-20T00:00:00Z',
  sources: [{ id: '22222222-2222-4222-8222-222222222222', novel_id: '11111111-1111-4111-8111-111111111111', provider: 'Synthetic', title: 'Livro de demonstração', url_base: 'https://example.org/book', chapter_url_pattern: 'https://example.org/chapter-{cap}', current_chapter: 1, updated_at: '2026-11-20T00:00:00Z' }],
};
let novel = appNovel;
let filters = { words: ['synthetic'], phrases: [], regex: [], updated_at: appNovel.updated_at };
const term = z.object({ kind: z.enum(['words', 'phrases', 'regex']), value: z.string() });
const progress = z.object({ chapter: z.number().int().positive() });
const response = (value: unknown, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(value) ?? '' });
export function resetAppTransport() { appTransport.mockClear(); novel = appNovel; filters = { words: ['synthetic'], phrases: [], regex: [], updated_at: appNovel.updated_at }; }
const respond: HttpTransport = async (url, init) => {
  const parsed = new URL(url); const path = parsed.pathname.replace('/api/v1', '');
  if (path === '/novels') return response([novel]);
  if (path === `/novels/${novel.id}`) return response(novel);
  if (path.endsWith('/progress')) {
    const input = progress.parse(JSON.parse(String(init.body)));
    novel = { ...novel, current_chapter: input.chapter, sources: novel.sources.map(item => item.id === novel.active_source_id ? { ...item, current_chapter: input.chapter } : item) };
    return response(novel);
  }
  if (path === '/chapters/text') {
    const chapter = Number(parsed.searchParams.get('chapter'));
    return response({ chapter, url: `https://example.org/chapter-${chapter}`, text: `Capítulo ${chapter}\nTexto de demonstração ${chapter}. Outra frase.` });
  }
  if (path === '/settings') return response({ speed: 1, updated_at: appNovel.updated_at });
  if (path === '/sources/search' || path === '/sources/identify') {
    const metadata = { provider: 'Synthetic', title: novel.title, slug: novel.slug, url_base: 'https://example.org/book', chapter_url_pattern: 'https://example.org/chapter-{cap}', chapter_ids: null, total_chapters: 3, image_url: null, authors: [], genres: [], rating: null };
    return response(path.endsWith('/search') ? { name: 'demo', results: [metadata] } : metadata);
  }
  if (path.startsWith('/filters')) {
    if (path.endsWith('/term')) {
      const input = term.parse(JSON.parse(String(init.body)));
      filters = { ...filters, [input.kind]: init.method === 'DELETE' ? filters[input.kind].filter(value => value !== input.value) : [...filters[input.kind], input.value] };
    } else if (init.method === 'DELETE') filters = { ...filters, words: [], phrases: [], regex: [] };
    return response(filters);
  }
  if (path.startsWith('/downloads/') && init.method === 'DELETE') return response({ removed: [] });
  return response({}, 404);
};

export const appTransport = jest.fn(respond);
