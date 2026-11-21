import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors } from '@ui/presentation';

type Props = { message: string; background?: string | undefined; textColor?: string | undefined };
export function LoadingMessage({ message, background = colors.background, textColor = colors.text }: Props) {
  return <View style={[styles.center, { backgroundColor: background }]} accessible accessibilityRole="progressbar"
    accessibilityState={{ busy: true }} accessibilityLabel={message}>
    <ActivityIndicator size="large" color={textColor} />
    <Text style={{ color: textColor, fontSize: 14 }}>{message}</Text>
  </View>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
});
