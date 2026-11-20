import { render, screen } from '@testing-library/react-native';
import SplashScreen from '@screens/splash-screen';

test('startup presents an accessible brand before the library mounts', async () => {
  await render(<SplashScreen />);
  expect(screen.getByRole('header', { name: 'VoxNovel' })).toBeOnTheScreen();
});
