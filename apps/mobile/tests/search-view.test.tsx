import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { metadataSchema } from '@core/api/schemas';
import { createHttpResource } from '@core/http-resource';
import SearchScreen from '@screens/search-screen';
import { readerNovel, readerQueryClient, jsonResponse } from './reader-fixture';

const meta = metadataSchema.parse({ provider: 'Synthetic', title: 'Livro sintético', slug: 'synthetic', url_base: 'https://example.org/book', image_url: null, total_chapters: 5, chapter_url_pattern: null, chapter_ids: null, authors: [], rating: null, genres: [] });

test('name search supports source selection, validates chapter and opens a newly created novel', async () => {
  const client = readerQueryClient(); const open = jest.fn();
  const transport = jest.fn(async (url: string, init: RequestInit) => {
    if (url.includes('/sources/search')) return jsonResponse({ name: 'Livro', results: [meta] });
    if (init.method === 'GET') return jsonResponse([]);
    return jsonResponse(readerNovel);
  });
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  try {
    await render(<QueryClientProvider client={client}><SearchScreen request={request} onOpen={open} /></QueryClientProvider>);
    await fireEvent.changeText(screen.getByLabelText('Nome da obra'), 'Livro');
    await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Selecionar Synthetic' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    await screen.findByLabelText('Capítulo inicial');
    await fireEvent.changeText(screen.getByLabelText('Capítulo inicial'), '6');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar leitura' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Esta obra possui apenas 5 capítulos.');
    expect(open).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('Capítulo inicial'), '2');
    await fireEvent.press(screen.getByRole('button', { name: 'Iniciar leitura' }));
    await screen.findByText('Capítulo inicial');
    await waitFor(() => expect(open).toHaveBeenCalledWith(readerNovel));
    expect(transport.mock.calls.filter(([, init]) => init.method === 'POST')).toHaveLength(1);
    await screen.unmount();
  } finally { client.clear(); }
}, 60000);

test('URL validation and duplicate dialog allow opening the existing novel without writing', async () => {
  const client = readerQueryClient(); const open = jest.fn();
  const transport = jest.fn(async (url: string) => jsonResponse(url.includes('/identify') ? meta : [readerNovel]));
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  try {
    await render(<QueryClientProvider client={client}><SearchScreen request={request} onOpen={open} /></QueryClientProvider>);
    await fireEvent.press(screen.getByRole('button', { name: 'Por URL' }));
    await fireEvent.changeText(screen.getByLabelText('URL da obra'), 'invalid');
    await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Confira a URL informada.');
    expect(transport).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText('URL da obra'), 'https://example.org/book');
    await fireEvent.press(screen.getByRole('button', { name: 'Buscar' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Selecionar Synthetic' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar' }));
    expect(await screen.findByRole('button', { name: 'Adicionar fonte à obra' })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: 'Abrir obra existente' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith(readerNovel));
    expect(transport).toHaveBeenCalledTimes(2);
    await screen.unmount();
  } finally { client.clear(); }
}, 60000);
