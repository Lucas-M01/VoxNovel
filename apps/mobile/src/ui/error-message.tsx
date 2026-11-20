import { Text, View } from 'react-native';
import { Button } from '@ui/button';

type Props = { message: string; onRetry?: (() => void) | undefined };
export function ErrorMessage({ message, onRetry }: Props) {
  return <View><Text accessibilityRole="alert" style={{ color: '#FF5555', fontSize: 14 }}>{message}</Text>
    {onRetry ? <Button title="Tentar novamente" onPress={onRetry} /> : null}
  </View>;
}
