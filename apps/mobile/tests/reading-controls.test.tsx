import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { readingPreferencesSchema, useReadingPreferences } from '@core/reading-preferences';
import { ReadingControls } from '@features/reader/reading-controls';
import { Button } from '@ui/button';
import { ErrorMessage } from '@ui/error-message';
import { ProgressBar } from '@ui/progress-bar';

function PreferencesHarness() {
  const { preferences, update } = useReadingPreferences();
  return <View><Text testID="preferences">{JSON.stringify(preferences)}</Text><ReadingControls preferences={preferences} onChange={update} /></View>;
}

test('reading controls select existing preferences and keep them only for this mounted session', async () => {
  await render(<PreferencesHarness />);
  expect(JSON.parse(screen.getByTestId('preferences').props.children)).toEqual(readingPreferencesSchema.parse({}));
  await fireEvent.press(screen.getByRole('button', { name: 'Personalização' }));
  for (const name of ['23', 'Serif', 'Claro', '2', '85%', 'Rápida']) await fireEvent.press(screen.getByRole('button', { name }));
  expect(screen.getByRole('button', { name: 'Claro' }).props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
  expect(screen.queryByRole('button', { name: 'Claro' })).toBeNull();
  await fireEvent.press(screen.getByRole('button', { name: 'Ocultar controles' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Iniciar rolagem automática' }));
  expect(JSON.parse(screen.getByTestId('preferences').props.children)).toMatchObject({ sizeIndex: 4, fontIndex: 1, themeIndex: 3, spacingIndex: 3, widthIndex: 3, scrollSpeedIndex: 2, autoScroll: true, controlsVisible: false });
  await screen.unmount();
  await render(<PreferencesHarness />);
  expect(JSON.parse(screen.getByTestId('preferences').props.children)).toEqual(readingPreferencesSchema.parse({}));
}, 20000);

test('busy and disabled actions remain accessible and cannot fire', async () => {
  const action = jest.fn();
  await render(<View><Button title="Ocupado" onPress={action} busy /><Button title="Indisponível" onPress={action} disabled /></View>);
  expect(screen.getByRole('button', { name: 'Ocupado' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Ocupado' }).props.accessibilityState.busy).toBe(true);
  await fireEvent.press(screen.getByRole('button', { name: 'Ocupado' }));
  await fireEvent.press(screen.getByRole('button', { name: 'Indisponível' }));
  expect(action).not.toHaveBeenCalled();
});

test('error messages expose an alert and an explicit retry action', async () => {
  const retry = jest.fn();
  await render(<ErrorMessage message="Não foi possível carregar o capítulo." onRetry={retry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível carregar o capítulo.');
  await fireEvent.press(screen.getByRole('button', { name: 'Tentar novamente' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test.each([[1, 4, 25], [-1, 4, 0], [10, 4, 100], [1, 0, 0], [NaN, 3, 0]])('progress remains bounded for %s/%s', async (current, total, expected) => {
  await render(<ProgressBar label="Progresso" current={current} total={total} />);
  expect(screen.getByRole('progressbar', { name: 'Progresso' }).props.accessibilityValue.now).toBe(expected);
});

test('invalid preference indices cannot enter session state', () => {
  for (const patch of [{ sizeIndex: 5 }, { fontIndex: -1 }, { widthIndex: 4 }, { spacingIndex: NaN }]) {
    expect(readingPreferencesSchema.safeParse(patch).success).toBe(false);
  }
});
