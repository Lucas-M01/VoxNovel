import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { VoiceGroup } from '@core/tts-service';
import { Button } from '@ui/button';
import { Dialog } from '@ui/dialog';
import { Icon } from '@ui/icon';
import { colors, presentation } from '@ui/presentation';

type Props = { visible: boolean; onClose: () => void; groups: VoiceGroup[]; selected: string | null; onSelect: (voiceId: string) => void };

export function VoicePicker({ visible, onClose, groups, selected, onSelect }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null);
  function close() {
    setExpanded(null);
    onClose();
  }
  return <Dialog title="Escolher voz" visible={visible} onClose={close} closeTitle="Fechar vozes">
    {groups.length ? groups.map(group => {
      const open = expanded === group.code;
      return <View key={group.code} style={styles.group}>
        <Pressable accessibilityRole="button" accessibilityLabel={group.name} accessibilityState={{ expanded: open }} style={styles.language}
          onPress={() => setExpanded(open ? null : group.code)}>
          <View style={styles.label}>
            <Text style={styles.languageName}>{group.name}</Text>
            <Text style={presentation.subtitle}>{group.voices.length} {group.voices.length === 1 ? 'voz' : 'vozes'}</Text>
          </View>
          <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
        </Pressable>
        {open ? <View style={styles.options}>{group.voices.map(voice =>
          <Button key={voice.identifier} title={`${voice.name} (${voice.quality})`} caption={voice.name}
            trailingIcon={selected === voice.identifier ? 'check' : undefined} selected={selected === voice.identifier}
            style={[styles.voice, selected === voice.identifier && styles.selectedVoice]} labelStyle={styles.voiceLabel} onPress={() => { onSelect(voice.identifier); close(); }} />
        )}</View> : null}
      </View>;
    }) : <Text style={presentation.subtitle}>Nenhuma voz disponível nos idiomas habilitados.</Text>}
  </Dialog>;
}

const styles = StyleSheet.create({
  group: { borderWidth: 1, borderColor: '#36364D', borderRadius: 10, overflow: 'hidden' },
  language: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, minHeight: 48, gap: 10 },
  label: { flex: 1 },
  languageName: { color: colors.text, fontWeight: '700', fontSize: 14 },
  options: { gap: 6, padding: 8, paddingTop: 0 },
  voice: { justifyContent: 'flex-start', backgroundColor: '#27273A' },
  selectedVoice: { backgroundColor: '#5149CA' },
  voiceLabel: { flex: 1, textAlign: 'left' },
});
