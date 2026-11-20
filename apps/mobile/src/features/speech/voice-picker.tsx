import { Modal, SectionList, Text, View } from 'react-native';
import type { Voice } from '@core/tts-service';
import { Button } from '@ui/button';

type Props = { visible: boolean; onClose: () => void; groups: { code: string; name: string; voices: Voice[] }[]; selected: string | null; onSelect: (voiceId: string) => void };
export function VoicePicker({ visible, onClose, groups, selected, onSelect }: Props) {
  return <Modal visible={visible} onRequestClose={onClose}>
    <View style={{ flex: 1, backgroundColor: '#0F0F1A', padding: 24, gap: 12 }}>
      <Text accessibilityRole="header" style={{ color: '#FFFFFF', fontSize: 18 }}>Escolher voz</Text>
      <Button title="Fechar vozes" onPress={onClose} />
      <SectionList sections={groups.map(group => ({ title: group.name, data: group.voices }))}
        keyExtractor={voice => voice.identifier}
        renderSectionHeader={({ section }) => <Text accessibilityRole="header" style={{ color: '#CCCCCC' }}>{section.title}</Text>}
        renderItem={({ item }) => <Button title={`${item.name} (${item.quality})`} selected={selected === item.identifier} onPress={() => { onSelect(item.identifier); onClose(); }} />}
        ListEmptyComponent={<Text style={{ color: '#CCCCCC' }}>Nenhuma voz encontrada</Text>} />
    </View>
  </Modal>;
}
