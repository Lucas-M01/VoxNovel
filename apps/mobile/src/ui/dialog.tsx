import type { ReactNode } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { Button } from '@ui/button';

type Props = { title: string; visible: boolean; onClose: () => void; children: ReactNode };
export function Dialog({ title, visible, onClose, children }: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}><View style={styles.panel} accessibilityViewIsModal>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        {children}
        <Button title="Fechar" onPress={onClose} />
      </View></View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#00000099' },
  panel: { backgroundColor: '#1E1E2E', borderRadius: 12, padding: 20, gap: 16, maxHeight: '90%' },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
