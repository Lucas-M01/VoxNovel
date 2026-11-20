import { Text, View } from 'react-native';
import { colors, presentation as styles } from '@ui/presentation';
export default function SplashScreen() {
  return <View style={[styles.page, { alignItems: 'center', justifyContent: 'center', gap: 20 }]}>
    <View style={{ backgroundColor: colors.accent, borderRadius: 24, width: 88, height: 88, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: colors.background, fontSize: 48, fontWeight: '700' }}>V</Text></View>
    <Text accessibilityRole="header" style={styles.title}>VoxNovel</Text>
    <Text style={styles.subtitle}>Suas histórias, no seu ritmo.</Text>
  </View>;
}
