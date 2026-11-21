import { Image, StyleSheet, View } from 'react-native';
import splashArt from '@screens/splash-art.png';

export default function SplashScreen() {
  return <View accessible accessibilityRole="header" accessibilityLabel="VoxNovel" style={styles.page}>
    <Image source={splashArt} resizeMode="cover" style={styles.image} />
  </View>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#0F172A' },
  image: { width: '100%', height: '100%' },
});
