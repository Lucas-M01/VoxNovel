import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

type Props = { title: string; onPress: () => void; disabled?: boolean; busy?: boolean; selected?: boolean; style?: StyleProp<ViewStyle> };
export function Button({ title, onPress, disabled = false, busy = false, selected = false, style }: Props) {
  const blocked = disabled || busy;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: blocked, busy, selected }}
      disabled={blocked} onPress={onPress} style={[styles.button, selected ? styles.selected : null, blocked ? styles.disabled : null, style]}>
      {busy ? <ActivityIndicator color="#FFFFFF" /> : null}
      <Text style={styles.label}>{title}</Text>
    </Pressable>
  );
}
const styles = StyleSheet.create({
  button: { backgroundColor: '#1E1E2E', borderRadius: 8, padding: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  selected: { backgroundColor: '#6C63FF' }, disabled: { opacity: 0.45 }, label: { color: '#FFFFFF', fontSize: 14 },
});
