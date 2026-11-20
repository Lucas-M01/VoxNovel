import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { fonts, fontSizes, spacings, themes, widths, scrollSpeeds, type ReadingPreferences } from '@core/reading-preferences';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';

type Props = { preferences: ReadingPreferences; onChange: (patch: Partial<ReadingPreferences>) => void };
function Choices({ label, options, selected, onSelect }: { label: string; options: string[]; selected: number; onSelect: (index: number) => void }) {
  return <View style={{ gap: 8 }}><Text style={{ color: '#CCCCCC' }}>{label}</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{options.map((name, index) =>
      <Button key={name} title={name} selected={selected === index} onPress={() => onSelect(index)} />
    )}</View>
  </View>;
}
export function ReadingControls({ preferences, onChange }: Props) {
  const [visible, setVisible] = useState(false);
  return <View style={{ gap: 8 }}>
    <Button title="Personalização" onPress={() => setVisible(true)} />
    <Button title={preferences.controlsVisible ? 'Ocultar controles' : 'Mostrar controles'} onPress={() => onChange({ controlsVisible: !preferences.controlsVisible })} />
    <Button title={preferences.autoScroll ? 'Parar rolagem automática' : 'Iniciar rolagem automática'} onPress={() => onChange({ autoScroll: !preferences.autoScroll })} />
    <Dialog title="Personalização" visible={visible} onClose={() => setVisible(false)}>
      <ScrollView contentContainerStyle={{ gap: 16 }}>
        <Choices label="Tamanho" options={fontSizes.map(String)} selected={preferences.sizeIndex} onSelect={sizeIndex => onChange({ sizeIndex })} />
        <Choices label="Fonte" options={fonts.map(font => font.name)} selected={preferences.fontIndex} onSelect={fontIndex => onChange({ fontIndex })} />
        <Choices label="Tema" options={themes.map(theme => theme.name)} selected={preferences.themeIndex} onSelect={themeIndex => onChange({ themeIndex })} />
        <Choices label="Espaçamento" options={spacings.map(String)} selected={preferences.spacingIndex} onSelect={spacingIndex => onChange({ spacingIndex })} />
        <Choices label="Largura" options={widths.map(value => `${Math.round(value * 100)}%`)} selected={preferences.widthIndex} onSelect={widthIndex => onChange({ widthIndex })} />
        <Choices label="Velocidade da rolagem" options={scrollSpeeds.map(speed => speed.name)} selected={preferences.scrollSpeedIndex} onSelect={scrollSpeedIndex => onChange({ scrollSpeedIndex })} />
      </ScrollView>
    </Dialog>
  </View>;
}
