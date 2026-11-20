import { StyleSheet, Text, View } from 'react-native';
import { fonts, fontSizes, spacings, themes, widths, type ReadingPreferences } from '@core/reading-preferences';
import type { ReadingContent } from '@core/chapter-format';

type Props = { content: ReadingContent; preferences: ReadingPreferences };
export function ChapterBody({ content, preferences }: Props) {
  const theme = themes[preferences.themeIndex];
  const size = fontSizes[preferences.sizeIndex] ?? 18;
  const fontFamily = fonts[preferences.fontIndex]?.family;
  return <View style={{ width: `${(widths[preferences.widthIndex] ?? 0.9) * 100}%`, alignSelf: 'center' }}>
    {content.chapterTitle ? <View style={styles.heading}>
      {content.novelTitle ? <Text style={[styles.novelTitle, { color: theme?.text }]}>{content.novelTitle}</Text> : null}
      <Text accessibilityRole="header" style={{ color: theme?.text, fontSize: size * 1.6, fontFamily }}>{content.chapterTitle}</Text>
    </View> : null}
    {content.paragraphs.map((paragraph, index) => <Text key={index} style={{
      textAlign: 'justify', letterSpacing: 0, marginLeft: paragraph.dialogue ? 18 : 0,
      color: theme?.text, fontSize: size, fontFamily, marginBottom: size * 0.9, lineHeight: size * (spacings[preferences.spacingIndex] ?? 1.8),
    }}>{paragraph.text}</Text>)}
  </View>;
}
const styles = StyleSheet.create({ heading: { marginBottom: 24 }, novelTitle: { fontSize: 12, marginBottom: 8 } });
