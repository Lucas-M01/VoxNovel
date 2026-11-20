import { StyleSheet } from 'react-native';

export const colors = { background: '#0F0F1A', surface: '#1E1E2E', text: '#F5F3FF', muted: '#AAA9BE', accent: '#9C95FF', border: '#353348' };
export const presentation = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 20, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '600' },
  text: { color: colors.text, fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: colors.surface, padding: 18, borderRadius: 16, gap: 12, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  input: { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, minHeight: 48, fontSize: 16 },
  cover: { width: 80, height: 112, borderRadius: 8, backgroundColor: colors.border },
});
