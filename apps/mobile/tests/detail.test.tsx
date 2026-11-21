import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createHttpResource } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import { keys } from '@core/keys';
import type { Novel } from '@core/api/schemas';
import DetailScreen from '@screens/detail-screen';
import { memoryFiles } from './local-files';
import { readerNovel, readerQueryClient, jsonResponse } from './reader-fixture';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));

function setup() {
  const client = readerQueryClient(); const storage = createLocalStorage(memoryFiles().files);
  const first = readerNovel.sources[0]; if (!first) throw new Error('Missing fixture source');
  let novel: Novel = { ...readerNovel, sources: [first, { ...first, id: '33333333-3333-4333-8333-333333333333', provider: 'Second', current_chapter: 3 }] };
  const transport = jest.fn(async (url: string, init: RequestInit) => {
    if (init.method === 'PATCH' && url.endsWith('/progress')) {
      const value = Number(JSON.parse(String(init.body)).chapter);
      novel = { ...novel, current_chapter: value, sources: novel.sources.map(item => item.id === novel.active_source_id ? { ...item, current_chapter: value } : item) };
    } else if (init.method === 'PATCH') {
      const id = String(JSON.parse(String(init.body)).source_id); const next = novel.sources.find(item => item.id === id);
      if (!next) return jsonResponse({}, 404);
      novel = { ...novel, active_source_id: id, current_chapter: next.current_chapter };
    } else if (init.method === 'DELETE') {
      if (!url.includes('/sources/')) return jsonResponse(undefined, 204);
      novel = { ...novel, sources: novel.sources.filter(item => !url.endsWith(item.id)) };
    }
    return jsonResponse(novel);
  });
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  return { client, storage, request, transport, initial: novel };
}

test('detail validates edited progress and source switching restores that source chapter', async () => {
  const data = setup(); const navigate = jest.fn(); const add = jest.fn();
  await data.storage.saveLibrary([data.initial]); data.client.setQueryData(keys.library(), { novels: [data.initial], offline: false });
  try {
    await render(<QueryClientProvider client={data.client}><DetailScreen id={readerNovel.id} services={data} onNavigate={navigate} onAddSource={add} onDeleted={() => {}} /></QueryClientProvider>);
    await fireEvent.press(await screen.findByRole('button', { name: 'Editar capítulo' }));
    await fireEvent.changeText(screen.getByLabelText('Novo capítulo'), '6');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar capítulo' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Informe um capítulo entre 1 e 5.');
    expect(data.transport.mock.calls.filter(([, init]) => init.method === 'PATCH')).toHaveLength(0);
    await fireEvent.changeText(screen.getByLabelText('Novo capítulo'), '4');
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar capítulo' }));
    await screen.findByRole('button', { name: 'Editar capítulo' });
    await fireEvent.press(screen.getByRole('button', { name: 'Usar Second' }));
    await waitFor(() => expect(screen.getByLabelText('Second · Ativa')).toBeOnTheScreen());
    expect(screen.getByText('Capítulo 3 de 5')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'Continuar leitura' }));
    expect(navigate).toHaveBeenCalledWith('reading', expect.objectContaining({ current_chapter: 3 }));
    expect((await data.storage.readLibrary())?.[0]?.sources[0]?.current_chapter).toBe(4);
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar fonte' }));
    expect(add).toHaveBeenCalledWith(expect.objectContaining({ current_chapter: 3 }));
    await screen.unmount();
  } finally { data.client.clear(); }
}, 60000);

test('source removal requires confirmation and the final source remains protected', async () => {
  const data = setup();
  try {
    await render(<QueryClientProvider client={data.client}><DetailScreen id={readerNovel.id} services={data} onNavigate={() => {}} onAddSource={() => {}} onDeleted={() => {}} /></QueryClientProvider>);
    await fireEvent.press(await screen.findByRole('button', { name: 'Remover fonte Second' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(data.transport.mock.calls.some(([, init]) => init.method === 'DELETE')).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: 'Remover fonte Second' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Confirmar remoção' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Usar Second' })).toBeNull());
    expect(screen.getByRole('button', { name: 'Remover fonte Synthetic' })).toBeDisabled();
    await screen.unmount();
  } finally { data.client.clear(); }
}, 60000);
