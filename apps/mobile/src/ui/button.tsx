import { ActivityIndicator, Pressable, StyleSheet, Text, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Icon, type IconName } from '@ui/icon';
import { colors } from '@ui/presentation';

type Props = {
  title: string;
  caption?: string;
  icon?: IconName;
  trailingIcon?: IconName | undefined;
  iconColor?: string | undefined;
  iconSize?: number;
  iconOnly?: boolean;
  stacked?: boolean;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  selected?: boolean;
  variant?: 'primary' | 'quiet' | 'danger';
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
};

export function Button({ title, caption = title, icon, trailingIcon, iconColor, iconSize, iconOnly = false, stacked = false, onPress, disabled = false, busy = false, selected = false, variant, style, labelStyle }: Props) {
  const blocked = disabled || busy;
  return <Pressable accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled: blocked, busy, selected }}
    disabled={blocked} onPress={onPress} style={[styles.button, stacked && styles.stacked, iconOnly && styles.iconOnly, variant && styles[variant], selected && styles.primary, blocked && styles.disabled, style]}>
    {busy ? <ActivityIndicator color={iconColor ?? colors.text} /> : icon ? <Icon name={icon} color={iconColor} size={iconSize} /> : null}
    {iconOnly ? null : <Text style={[styles.label, variant === 'danger' && styles.dangerLabel, labelStyle]}>{caption}</Text>}
    {trailingIcon ? <Icon name={trailingIcon} color={iconColor} size={iconSize} /> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  button: { backgroundColor: colors.surface, borderRadius: 10, padding: 10, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  iconOnly: { minWidth: 44, padding: 0 },
  stacked: { flexDirection: 'column', gap: 6 },
  primary: { backgroundColor: colors.accent },
  quiet: { backgroundColor: 'transparent' },
  danger: { backgroundColor: '#FF555514', borderWidth: 1, borderColor: '#FF5555' },
  dangerLabel: { color: '#FF7777' },
  disabled: { opacity: 0.45 },
  label: { color: colors.text, fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
