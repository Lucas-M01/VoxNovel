import { View } from 'react-native';

type Props = { current: number; total: number; label: string };
export function ProgressBar({ current, total, label }: Props) {
  const fraction = Number.isFinite(current) && Number.isFinite(total) && total > 0 ? Math.max(0, Math.min(1, current / total)) : 0;
  const percent = Math.round(fraction * 100);
  return <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityValue={{ min: 0, max: 100, now: percent }}
    style={{ backgroundColor: '#1E1E2E', height: 4, borderRadius: 2 }}>
    <View style={{ backgroundColor: '#6C63FF', height: 4, borderRadius: 2, width: `${percent}%` }} />
  </View>;
}
