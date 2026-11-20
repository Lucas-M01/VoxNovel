import { formatReadingText } from '@core/chapter-format';
import { splitSentences } from '@core/tts-service';
import { activeSource, sourceChapterUrl } from '@core/chapter-source';
import { readerNovel } from './reader-fixture';

test('visual formatting extracts only a combined novel/chapter heading and preserves paragraphs/dialogue', () => {
  expect(formatReadingText(' Livro sintético - Capítulo 2: Teste\n\n Um parágrafo.\n— Um diálogo.\n"Outro diálogo."\n\'Mais uma fala.')).toEqual({
    novelTitle: 'Livro sintético', chapterTitle: 'Capítulo 2: Teste', paragraphs: [
      { text: 'Um parágrafo.', dialogue: false }, { text: '— Um diálogo.', dialogue: true },
      { text: '"Outro diálogo."', dialogue: true }, { text: "'Mais uma fala.", dialogue: true },
    ],
  });
});

test('preserves the observed visual-only deduplication, footer and separator removal', () => {
  const text = ['Capítulo 1', 'Capítulo 2', 'Texto igual.', 'TEXTO IGUAL.', 'Toque no meio da tela', 'Se você encontrar algum erro', 'Um relatório foi emitido.', '-', '--', '---', '----', 'Último parágrafo.'].join('\n');
  expect(formatReadingText(text).paragraphs.map(paragraph => paragraph.text)).toEqual(['Capítulo 1', 'Texto igual.', '----', 'Último parágrafo.']);
});

test('does not apply visual deduplication to speech or invent a heading for ordinary first lines', () => {
  const text = 'Uma frase.\nUma frase.';
  expect(splitSentences(text)).toHaveLength(2);
  expect(formatReadingText(text)).toEqual({ novelTitle: '', chapterTitle: '', paragraphs: [{ text: 'Uma frase.', dialogue: false }] });
  expect(formatReadingText('')).toEqual({ novelTitle: '', chapterTitle: '', paragraphs: [] });
  expect(formatReadingText('Chapter 1: Plain heading').chapterTitle).toBe('');
});

test('source URLs preserve the ordered identifiers already supplied by the backend', () => {
  const source = activeSource(readerNovel);
  if (!source) throw new Error('Expected source');
  expect(sourceChapterUrl(source, 2)).toBe('https://example.org/chapter-2');
  expect(sourceChapterUrl({ ...source, chapter_ids: [501, 900] }, 2)).toBe('https://example.org/chapter-900');
  expect(sourceChapterUrl({ ...source, chapter_ids: [501] }, 2)).toBeNull();
  expect(sourceChapterUrl({ ...source, chapter_url_pattern: null }, 2)).toBe(source.url_base);
  expect(() => sourceChapterUrl(source, 0)).toThrow();
  expect(activeSource({ ...readerNovel, sources: [], active_source_id: null })).toBeNull();
});
