import { Dimensions } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { createHttpResource } from '@core/http-resource';
import { createLocalStorage } from '@core/local-storage';
import { keys } from '@core/keys';
import { deleteLibraryNovel, libraryOptions } from '@features/library/library-data';
import LibraryScreen from '@screens/library-screen';
import { memoryFiles } from './local-files';
import { readerNovel, readerQueryClient, jsonResponse } from './reader-fixture';
import { flushSpeech } from './speech-driver';

jest.mock('@react-native-community/netinfo', () => jest.requireActual('@react-native-community/netinfo/jest/netinfo-mock.js'));

jest.mock('@core/native-speech', () => {
  const { speechDriver, voice } = jest.requireActual<typeof import('./speech-driver')>('./speech-driver');
  return { nativeSpeech: speechDriver([voice('Voz Reino Unido', 'en-GB')]).driver };
});

function setup(fail = false) {
  const memory = memoryFiles(); const storage = createLocalStorage(memory.files); const client = readerQueryClient();
  const transport = jest.fn(async (_url: string, init: RequestInit) => fail ? jsonResponse({}, 503) : init.method === 'DELETE' ? jsonResponse(undefined, 204) : jsonResponse([readerNovel]));
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport });
  return { storage, client, transport, request };
}

test('library shows saved offline entries and prevents deletion without an online list', async () => {
  const data = setup(true); await data.storage.saveLibrary([readerNovel]);
  await data.storage.saveChapter({ novelId: readerNovel.id, sourceId: readerNovel.active_source_id ?? '' }, 1, 'Texto local.');
  const open = jest.fn();
  try {
    await render(<QueryClientProvider client={data.client}><LibraryScreen services={data} onOpen={open} onSearch={() => {}} onFilters={() => {}} /></QueryClientProvider>);
    expect(await screen.findByText('Offline · exibindo a biblioteca salva no aparelho.')).toBeOnTheScreen();
    expect(await screen.findByLabelText('1 capítulo offline')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: `Remover ${readerNovel.title}` })).toBeDisabled();
    await fireEvent.press(screen.getByRole('button', { name: `Abrir ${readerNovel.title}` }));
    expect(open).toHaveBeenCalledWith(readerNovel);
    await expect(deleteLibraryNovel(data.client, readerNovel, data)).rejects.toThrow('Conecte-se');
    expect(data.transport).toHaveBeenCalledTimes(1);
    await screen.unmount();
  } finally { data.client.clear(); }
}, 60000);

test('library refresh orders descending progress and deletion requires confirmation before clearing cache', async () => {
  const data = setup(); const later = { ...readerNovel, id: '33333333-3333-4333-8333-333333333333', title: 'Outro livro', slug: 'other', sources: [], active_source_id: null, current_chapter: 4 };
  data.transport.mockImplementation(async (_url, init) => init.method === 'DELETE' ? jsonResponse(undefined, 204) : jsonResponse([readerNovel, later]));
  try {
    await render(<QueryClientProvider client={data.client}><LibraryScreen services={data} onOpen={() => {}} onSearch={() => {}} onFilters={() => {}} /></QueryClientProvider>);
    await screen.findByRole('button', { name: 'Abrir Outro livro' });
    expect(screen.getAllByRole('button').filter(node => String(node.props.accessibilityLabel).startsWith('Abrir ')).map(node => node.props.accessibilityLabel)).toEqual(['Abrir Outro livro', `Abrir ${readerNovel.title}`]);
    await fireEvent.press(screen.getByRole('button', { name: `Remover ${readerNovel.title}` }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(data.transport.mock.calls.some(([, init]) => init.method === 'DELETE')).toBe(false);
    await fireEvent.press(screen.getByRole('button', { name: `Remover ${readerNovel.title}` }));
    const confirm = screen.getByRole('button', { name: 'Confirmar remoção' });
    expect(confirm).toHaveStyle({ borderColor: '#FF5555' });
    await fireEvent.press(confirm);
    await waitFor(() => expect(screen.queryByRole('button', { name: `Abrir ${readerNovel.title}` })).toBeNull());
    expect(await data.storage.readLibrary()).toEqual([later]);
    await screen.unmount();
  } finally { data.client.clear(); }
}, 60000);

test('late cancelled list response cannot replace the latest list or disk cache', async () => {
  const data = setup(); let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; }); let calls = 0;
  data.transport.mockImplementation(async () => { calls += 1; if (calls === 1) { await pending; return jsonResponse([readerNovel]); } return jsonResponse([]); });
  try {
    const first = data.client.fetchQuery(libraryOptions(data)); void first.catch(() => {});
    await data.client.cancelQueries({ queryKey: keys.library() });
    expect(await data.client.fetchQuery(libraryOptions(data))).toEqual({ novels: [], offline: false });
    release(); await flushSpeech();
    expect(data.client.getQueryData(keys.library())).toEqual({ novels: [], offline: false });
    expect(await data.storage.readLibrary()).toEqual([]);
  } finally { release(); data.client.clear(); }
});

test('library renders without toSorted and sorts a copy of the query data', async () => {
  const data = setup();
  const later = { ...readerNovel, id: '33333333-3333-4333-8333-333333333333', title: 'Outro livro', slug: 'other', sources: [], active_source_id: null, current_chapter: 4 };
  const descriptor = Object.getOwnPropertyDescriptor(Array.prototype, 'toSorted');
  Object.defineProperty(Array.prototype, 'toSorted', { configurable: true, writable: true, value: undefined });
  data.transport.mockImplementation(async () => jsonResponse([readerNovel, later]));
  try {
    await render(<QueryClientProvider client={data.client}><LibraryScreen services={data} onOpen={() => {}} onSearch={() => {}} onFilters={() => {}} /></QueryClientProvider>);
    await screen.findByRole('button', { name: 'Abrir Outro livro' });
    expect(screen.getAllByRole('button').filter(node => String(node.props.accessibilityLabel).startsWith('Abrir ')).map(node => node.props.accessibilityLabel)).toEqual(['Abrir Outro livro', `Abrir ${readerNovel.title}`]);
    expect(data.client.getQueryData(keys.library())).toEqual({ novels: [readerNovel, later], offline: false });
    await screen.unmount();
  } finally {
    data.client.clear();
    if (descriptor) Object.defineProperty(Array.prototype, 'toSorted', descriptor);
    else Reflect.deleteProperty(Array.prototype, 'toSorted');
  }
});

test('empty saved library remains a usable offline result while missing cache remains an error', async () => {
  const data = setup(true);
  try {
    await expect(data.client.fetchQuery(libraryOptions(data))).rejects.toThrow('indisponível');
    await data.storage.saveLibrary([]);
    await expect(data.client.fetchQuery(libraryOptions(data))).resolves.toEqual({ novels: [], offline: true });
  } finally { data.client.clear(); }
});

test('the library counts only offline chapters from the active source', async () => {
  const data = setup();
  const first = readerNovel.sources[0];
  if (!first) throw new Error('Missing source fixture');
  const other = { ...first, id: '33333333-3333-4333-8333-333333333333', provider: 'Outra fonte' };
  const novel = { ...readerNovel, sources: [first, other] };
  const otherScope = { novelId: novel.id, sourceId: other.id };
  const activeScope = { novelId: novel.id, sourceId: first.id };
  await data.storage.saveChapter(otherScope, 1, 'Texto de outra fonte.');
  data.transport.mockResolvedValue(jsonResponse([novel]));
  try {
    await render(<QueryClientProvider client={data.client}><LibraryScreen services={data} onOpen={() => {}} onSearch={() => {}} onFilters={() => {}} /></QueryClientProvider>);
    await waitFor(() => expect(data.client.getQueryData(keys.localChapters(activeScope))).toEqual([]));
    expect(screen.queryByLabelText('1 capítulo offline')).toBeNull();
    expect(await data.storage.listChapters(otherScope)).toEqual([1]);
    await screen.unmount();
  } finally { data.client.clear(); }
}, 20000);

test('library preferences save reading and speech defaults together', async () => {
  const data = setup();
  try {
    await render(<QueryClientProvider client={data.client}><LibraryScreen services={data} onOpen={() => {}} onSearch={() => {}} onFilters={() => {}} /></QueryClientProvider>);
    await fireEvent.press(await screen.findByRole('button', { name: 'Preferências' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Sépia' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Ouvir' }));
    expect(screen.queryByRole('button', { name: '2.25x' })).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: '2x' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Outros idiomas no player' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Inglês (Reino Unido)' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Salvar preferências' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Salvar preferências' })).toBeNull());
    expect(await data.storage.readPreferences()).toMatchObject({ reading: { themeIndex: 2 }, speechRate: 2, extraVoiceLocales: ['en-gb'] });
    await screen.unmount();
  } finally { data.client.clear(); }
}, 20000);

test('the initial library loader hides empty and action states until the request settles', async () => {
  const data = setup();
  let release = () => {};
  const loading = new Promise<void>(resolve => { release = resolve; });
  data.transport.mockImplementation(async () => { await loading; return jsonResponse([]); });
  try {
    await render(<QueryClientProvider client={data.client}><LibraryScreen services={data} onOpen={() => {}} onSearch={() => {}} onFilters={() => {}} /></QueryClientProvider>);
    expect(screen.getByText('Carregando obras…')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Adicionar obra' })).toBeNull();
    expect(screen.queryByText('Nenhuma obra ainda')).toBeNull();
    await act(async () => { release(); });
    expect(await screen.findByText('Nenhuma obra ainda')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Adicionar obra' })).toBeOnTheScreen();
    await screen.unmount();
  } finally { release(); data.client.clear(); }
}, 20000);

test('rotating the library shows each cover beside the source and chapter information', async () => {
  const data = setup();
  const window = Dimensions.get('window'); const screenSize = Dimensions.get('screen');
  const title = `Abrir ${readerNovel.title}`;
  const props = { services: data, onOpen: jest.fn(), onSearch: () => {}, onFilters: () => {} };
  try {
    Dimensions.set({ window: { ...window, width: 390, height: 820 }, screen: screenSize });
    await render(<QueryClientProvider client={data.client}><LibraryScreen {...props} /></QueryClientProvider>);
    expect(await screen.findByRole('button', { name: title })).not.toHaveStyle({ flexDirection: 'row' });
    await act(async () => { Dimensions.set({ window: { ...window, width: 820, height: 390 }, screen: screenSize }); });
    expect(await screen.findByRole('button', { name: title })).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getByText('Synthetic')).toBeOnTheScreen();
    expect(screen.getByText('Cap. 1/5')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: title }));
    expect(props.onOpen).toHaveBeenCalledWith(readerNovel);
    await act(async () => { Dimensions.set({ window: { ...window, width: 390, height: 820 }, screen: screenSize }); });
    expect(await screen.findByRole('button', { name: title })).not.toHaveStyle({ flexDirection: 'row' });
    await screen.unmount();
  } finally {
    Dimensions.set({ window, screen: screenSize });
    data.client.clear();
  }
});
