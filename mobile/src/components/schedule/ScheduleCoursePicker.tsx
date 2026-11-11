import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { communicationTheme } from '../shared/communicationTheme';
import { studentCommunicationSurface } from '../student/StudentHomeCard';

type Props = { batches: any[]; selectedBatchId: string | null; onSelect: (id: string | null) => void };
export default function ScheduleCoursePicker({ batches, selectedBatchId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const surface = [studentCommunicationSurface(isDark), styles.surface];
  const selected = batches.find(batch => batch._id === selectedBatchId);
  const label = selectedBatchId === null ? 'All courses' : selected?.course_id?.title || selected?.name || 'Select Course';
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Select course: ${label}`} accessibilityState={{ expanded: open }}
      onPress={() => setOpen(true)} activeOpacity={0.85} style={[surface, styles.selector]}>
      <Text numberOfLines={1} style={[styles.label, { color: theme.text }]}>{label}</Text>
      <Icon name="chevron-down" size={18} color={theme.muted} />
    </TouchableOpacity>
    <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close course selection" onPress={() => setOpen(false)} style={StyleSheet.absoluteFill} />
        <View accessibilityViewIsModal style={[surface, styles.modal]}>
          <View style={[styles.modalHeader, { borderColor: theme.line }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Select Course</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close course selection" onPress={() => setOpen(false)} style={styles.close}>
              <Icon name="close" size={20} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
            {[{ _id: null, name: 'All courses' }, ...batches].map(batch => {
              const checked = batch._id === selectedBatchId;
              const batchName = batch.batch_code || batch.code || batch.name || '';
              return <TouchableOpacity key={batch._id || 'all-courses'} accessibilityRole="radio" accessibilityState={{ checked }}
                onPress={() => { onSelect(batch._id); setOpen(false); }} activeOpacity={0.7}
                style={[surface, styles.option, checked && { backgroundColor: isDark ? 'rgba(245,130,32,0.12)' : '#FFF5EB', borderColor: COLORS.secondary }]}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[styles.optionTitle, { color: checked ? COLORS.secondary : theme.text }]}>{batch.course_id?.title || batch.name || 'Course'}</Text>
                  {batch._id !== null && !!batchName && <Text style={[styles.optionBatch, { color: theme.muted }]}>Batch: {batchName}</Text>}
                </View>
                {checked ? <View style={styles.check}><Icon name="checkmark" size={14} color="#FFFFFF" /></View>
                  : <Icon name="chevron-forward" size={16} color={theme.muted} />}
              </TouchableOpacity>;
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  surface: { borderRadius: 14 },
  selector: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, minHeight: 44 },
  label: { ...FONTS.extraBold, fontSize: 14.5, flex: 1, minWidth: 0 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  modal: { width: '100%', maxWidth: 420, padding: 18 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 12, marginBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  modalTitle: { ...FONTS.extraBold, fontSize: 18 },
  close: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 14, marginBottom: 10 },
  optionTitle: { ...FONTS.bold, fontSize: 14.5 },
  optionBatch: { ...FONTS.medium, fontSize: 12, marginTop: 2 },
  check: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.secondary, alignItems: 'center', justifyContent: 'center' },
});
