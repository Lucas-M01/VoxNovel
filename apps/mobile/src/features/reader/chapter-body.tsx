import { StyleSheet, Text, View } from 'react-native';
import { fonts, fontSizes, spacings, themes, widths, type ReadingPreferences } from '@core/reading-preferences';
import type { ReadingContent } from '@core/chapter-format';

type Props = { content: ReadingContent; novelTitle: string; chapter: number; preferences: ReadingPreferences };
export function ChapterBody({ content, novelTitle, chapter, preferences }: Props) {
  const theme = themes[preferences.themeIndex];
  const size = fontSizes[preferences.sizeIndex] ?? 18;
  const fontFamily = fonts[preferences.fontIndex]?.family;
  return <View style={{ width: `${(widths[preferences.widthIndex] ?? 0.9) * 100}%`, alignSelf: 'center' }}>
    <View style={styles.heading}>
      <Text style={[styles.novelTitle, { color: theme?.text }]}>{content.novelTitle || novelTitle}</Text>
      <Text accessibilityRole="header" style={[styles.chapterTitle, { color: theme?.text, fontSize: size * 1.6, fontFamily }]}>
        {content.chapterTitle || `Capítulo ${chapter}`}
      </Text>
    </View>
    {content.paragraphs.map((paragraph, index) => <Text key={index} style={{
      textAlign: 'justify', letterSpacing: 0, marginLeft: paragraph.dialogue ? 18 : 0,
      color: theme?.text, fontSize: size, fontFamily, marginBottom: size * 0.9, lineHeight: size * (spacings[preferences.spacingIndex] ?? 1.8),
    }}>{paragraph.text}</Text>)}
  </View>;
}
const styles = StyleSheet.create({ heading: { marginBottom: 24 }, novelTitle: { fontSize: 12, marginBottom: 8, textAlign: 'center' }, chapterTitle: { textAlign: 'center' } });
