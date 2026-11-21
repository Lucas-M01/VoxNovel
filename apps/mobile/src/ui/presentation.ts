import { StyleSheet } from 'react-native';

export const colors = { background: '#0F0F1A', surface: '#1E1E2E', text: '#FFFFFF', muted: '#9A9AAA', accent: '#6C63FF', border: '#252538' };
export const presentation = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  title: { color: colors.text, fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  heading: { color: colors.text, fontSize: 18, fontWeight: '600' },
  text: { color: colors.text, fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: colors.surface, padding: 14, borderRadius: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  input: { color: colors.text, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, minHeight: 44, fontSize: 14 },
  cover: { width: 80, height: 112, borderRadius: 8, backgroundColor: colors.border },
});
