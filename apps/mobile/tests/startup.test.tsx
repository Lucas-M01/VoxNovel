import { render, screen } from '@testing-library/react-native';
import HomeRoute from '../app/index';

test('the initial route composes an accessible application title', async () => {
  await render(<HomeRoute />);
  expect(screen.getByRole('header', { name: 'VoxNovel' })).toBeOnTheScreen();
});
