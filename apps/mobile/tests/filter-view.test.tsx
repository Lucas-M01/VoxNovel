import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { z } from 'zod';
import { filterStateSchema } from '@core/api/schemas';
import { createHttpResource } from '@core/http-resource';
import FiltersScreen from '@screens/filters-screen';
import { filterInputSchema } from '@features/filters/filter-input';
import { jsonResponse, readerQueryClient } from './reader-fixture';

function setup() {
  let state = filterStateSchema.parse({ words: ['igual'], phrases: ['duas palavras'], regex: ['igual'], updated_at: '2026-11-20T00:00:00Z' });
  const term = z.object({ kind: z.enum(['words', 'phrases', 'regex']), value: z.string() });
  const transport = jest.fn(async (url: string, init: RequestInit) => {
    if (url.endsWith('/term')) {
      const input = term.parse(JSON.parse(String(init.body)));
      state = { ...state, [input.kind]: init.method === 'DELETE' ? state[input.kind].filter(value => value !== input.value) : [...new Set([...state[input.kind], input.value])] };
    } else if (init.method === 'DELETE') state = { ...state, words: [], phrases: [], regex: [] };
    return jsonResponse(state);
  });
  return { client: readerQueryClient(), request: createHttpResource({ baseUrl: () => 'https://api.example', transport }), transport, state: () => state };
}

test('adding a phrase and removing an identical regex preserves the word of the same name', async () => {
  const data = setup();
  try {
    await render(<QueryClientProvider client={data.client}><FiltersScreen request={data.request} /></QueryClientProvider>);
    await screen.findByRole('button', { name: 'Remover regex: igual' });
    await fireEvent.press(screen.getByRole('button', { name: 'Frase' }));
    await fireEvent.changeText(screen.getByLabelText('Novo filtro'), '  nova frase  ');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar filtro' }));
    await screen.findByRole('button', { name: 'Remover frase: nova frase' });
    expect(data.state().phrases).toEqual(['duas palavras', 'nova frase']);
    await fireEvent.press(screen.getByRole('button', { name: 'Remover regex: igual' }));
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Remover regex: igual' })).toBeNull());
    expect(data.state().words).toEqual(['igual']);
    expect(data.state().regex).toEqual([]);
    await screen.unmount();
  } finally { data.client.clear(); }
}, 20000);

test('invalid regex receives inline feedback without an HTTP mutation', async () => {
  const data = setup();
  try {
    await render(<QueryClientProvider client={data.client}><FiltersScreen request={data.request} /></QueryClientProvider>);
    await screen.findByRole('button', { name: 'Remover palavra: igual' });
    await fireEvent.press(screen.getByRole('button', { name: 'Regex' }));
    await fireEvent.changeText(screen.getByLabelText('Novo filtro'), '(');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar filtro' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Expressão regular inválida.');
    expect(data.transport).toHaveBeenCalledTimes(1);
    await screen.unmount();
  } finally { data.client.clear(); }
});

test('clear all requires confirmation and preserves genuinely empty lists', async () => {
  const data = setup();
  try {
    await render(<QueryClientProvider client={data.client}><FiltersScreen request={data.request} /></QueryClientProvider>);
    await screen.findByRole('button', { name: 'Remover palavra: igual' });
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar todos' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Cancelar' }));
    expect(data.state().words).toEqual(['igual']);
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar todos' }));
    await fireEvent.press(screen.getByRole('button', { name: 'Limpar' }));
    expect(await screen.findByText('Nenhum filtro configurado.')).toBeOnTheScreen();
    expect(data.state()).toMatchObject({ words: [], phrases: [], regex: [] });
    await screen.unmount();
  } finally { data.client.clear(); }
}, 20000);

test('HTTP failure exposes a retry action and a mutation failure keeps current data', async () => {
  const data = setup(); let failRead = true;
  const request = createHttpResource({ baseUrl: () => 'https://api.example', transport: async (_url, init) => {
    if (failRead || init.method !== 'GET') return jsonResponse({}, 503);
    return jsonResponse(data.state());
  } });
  try {
    await render(<QueryClientProvider client={data.client}><FiltersScreen request={request} /></QueryClientProvider>);
    await screen.findByRole('alert'); failRead = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
    await screen.findByRole('button', { name: 'Remover palavra: igual' });
    await fireEvent.changeText(screen.getByLabelText('Novo filtro'), 'novo');
    await fireEvent.press(screen.getByRole('button', { name: 'Adicionar filtro' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('O serviço está ocupado ou indisponível. Tente novamente.');
    expect(screen.getByRole('button', { name: 'Remover palavra: igual' })).toBeOnTheScreen();
    await screen.unmount();
  } finally { data.client.clear(); }
});

test('input schema keeps term types explicit and validates whitespace and expression syntax', () => {
  expect(filterInputSchema.parse({ kind: 'phrases', value: '  duas palavras  ' })).toEqual({ kind: 'phrases', value: 'duas palavras' });
  expect(filterInputSchema.safeParse({ kind: 'regex', value: '(' }).success).toBe(false);
  expect(filterInputSchema.safeParse({ kind: 'words', value: ' ' }).success).toBe(false);
});
