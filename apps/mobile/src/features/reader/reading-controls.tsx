import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import { fonts, fontSizes, spacings, themes, widths, scrollSpeeds, type ReadingPreferences } from '@core/reading-preferences';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { Icon } from '@ui/icon';

type FieldsProps = { preferences: ReadingPreferences; onChange: (patch: Partial<ReadingPreferences>) => void };
type Props = FieldsProps & { visible: boolean; onClose: () => void; children?: ReactNode };
function Choices({ label, options, selected, onSelect }: { label: string; options: string[]; selected: number; onSelect: (index: number) => void }) {
  return <View style={styles.group}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.row}>{options.map((name, index) =>
      <Button key={name} title={name} style={styles.chip} labelStyle={styles.chipLabel} selected={selected === index} onPress={() => onSelect(index)} />
    )}</View>
  </View>;
}

export function ReadingPreferencesFields({ preferences, onChange }: FieldsProps) {
  const theme = themes[preferences.themeIndex] ?? themes[0];
  const size = fontSizes[preferences.sizeIndex] ?? 18;
  return <>
    <Choices label="Fonte" options={fonts.map(font => font.name)} selected={preferences.fontIndex} onSelect={fontIndex => onChange({ fontIndex })} />
    <Choices label="Espaçamento" options={['Apertado', 'Normal', 'Confortável', 'Amplo']} selected={preferences.spacingIndex} onSelect={spacingIndex => onChange({ spacingIndex })} />
    <Choices label="Rolagem automática" options={scrollSpeeds.map(speed => speed.name)} selected={preferences.scrollSpeedIndex} onSelect={scrollSpeedIndex => onChange({ scrollSpeedIndex })} />
    <View style={styles.group}>
      <Text style={styles.label}>Tamanho da fonte</Text>
      <View style={styles.sizes}>
        <Text style={styles.label}>A−</Text>
        {fontSizes.map((value, index) => <Pressable key={value} accessibilityRole="button" accessibilityLabel={String(value)}
          accessibilityState={{ selected: preferences.sizeIndex === index }} onPress={() => onChange({ sizeIndex: index })} style={styles.sizeButton}>
          <View style={[styles.dot, preferences.sizeIndex === index && styles.activeDot]} />
        </Pressable>)}
        <Text style={styles.larger}>A+</Text>
      </View>
    </View>
    <Choices label="Largura do texto" options={['Total', 'Normal', 'Confortável', 'Focada']} selected={preferences.widthIndex} onSelect={widthIndex => onChange({ widthIndex })} />
    <View style={[styles.preview, { backgroundColor: theme?.background }]}>
      <Text style={{ width: `${(widths[preferences.widthIndex] ?? 1) * 100}%`, alignSelf: 'center', color: theme?.text, fontSize: size, fontFamily: fonts[preferences.fontIndex]?.family, lineHeight: size * (spacings[preferences.spacingIndex] ?? 1.8) }}>
        Este é um exemplo de leitura. Ajuste fonte, espaçamento e largura até encontrar o conforto ideal.
      </Text>
    </View>
    <View style={styles.group}>
      <Text style={styles.label}>Tema</Text>
      <View style={styles.row}>{themes.map((option, index) => {
        const selected = preferences.themeIndex === index;
        return <Pressable key={option.name} accessibilityRole="button" accessibilityLabel={option.name} accessibilityState={{ selected }}
          onPress={() => onChange({ themeIndex: index })} style={[styles.theme, { backgroundColor: option.background }, selected && styles.activeTheme]}>
          <Text style={[styles.chipLabel, { color: option.text }]}>{option.name}</Text>
          {selected ? <View style={styles.check}><Icon name="check" size={12} color="#A9A3FF" /></View> : null}
        </Pressable>;
      })}</View>
    </View>
  </>;
}

export function ReadingControls({ visible, onClose, preferences, onChange, children }: Props) {
  return <Dialog title="Personalização" placement="bottom" visible={visible} onClose={onClose}>
    {children}
    <ReadingPreferencesFields preferences={preferences} onChange={onChange} />
  </Dialog>;
}

const styles = StyleSheet.create({
  group: { gap: 6 },
  label: { color: '#CCCCCC', fontSize: 13 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderRadius: 18, paddingVertical: 6, paddingHorizontal: 10, minHeight: 36 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  sizes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  larger: { color: '#CCCCCC', fontSize: 20 },
  sizeButton: { width: 36, height: 44, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#777787' },
  activeDot: { backgroundColor: '#A9A3FF', transform: [{ scale: 1.4 }] },
  preview: { padding: 14, borderRadius: 8 },
  theme: { flexGrow: 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#49495C' },
  activeTheme: { borderColor: '#A9A3FF' },
  check: { position: 'absolute', right: 2, top: 2 },
});
