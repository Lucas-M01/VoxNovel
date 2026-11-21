import { useContext, type ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { Button } from '@ui/button';

type Confirmation = { title: string; onPress: () => void; variant: 'danger' | 'primary'; busy?: boolean; disabled?: boolean };
type Props = { title: string; visible: boolean; onClose: () => void; children: ReactNode; confirm?: Confirmation; closeTitle?: string; placement?: 'center' | 'bottom' };
export function Dialog({ title, visible, onClose, children, confirm, closeTitle = 'Fechar', placement = 'center' }: Props) {
  const { height } = useWindowDimensions();
  const compact = height < 440;
  const insets = useContext(SafeAreaInsetsContext);
  function close() { if (!confirm?.busy) onClose(); }
  return (
    <Modal visible={visible} transparent supportedOrientations={['portrait', 'portrait-upside-down', 'landscape']} animationType="slide" onRequestClose={close}>
      <View style={[styles.backdrop, placement === 'bottom' && styles.bottom, compact && styles.compactBackdrop,
        compact && { paddingLeft: Math.max(12, insets?.left ?? 0), paddingRight: Math.max(12, insets?.right ?? 0) }]}>
        <View style={[styles.panel, placement === 'bottom' && styles.sheet, compact && styles.compactPanel]} accessibilityViewIsModal>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {confirm ? <View style={styles.actions}>
            <Button title={closeTitle} onPress={close} style={styles.action} disabled={confirm.busy ?? false} />
            <Button {...confirm} style={styles.action} />
          </View> : <Button title={closeTitle} onPress={close} />}
        </View>
      </View>
    </Modal>
  );
}
const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 20, backgroundColor: '#00000099' },
  bottom: { justifyContent: 'flex-end', padding: 0 },
  compactBackdrop: { paddingVertical: 8 },
  compactPanel: { padding: 12, gap: 8, maxWidth: 640, maxHeight: '100%', alignSelf: 'center', width: '100%' },
  scroll: { flexGrow: 0, flexShrink: 1 },
  body: { gap: 12 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 0, borderBottomRightRadius: 0, paddingBottom: 32 },
  panel: { backgroundColor: '#1E1E2E', borderRadius: 12, padding: 20, gap: 16, maxHeight: '90%' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: { flexGrow: 1, flexBasis: 108 },
  title: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
