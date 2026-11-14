import { KeyboardAvoidingView, KeyboardScrollView as ScrollView, KeyboardTextInput as TextInput } from './KeyboardForm';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import api from '../../services/api';
import { FONTS, COLORS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';
import CustomDropdown from './CustomDropdown';
import ManagementDialog from './ManagementDialog';
import { youtubeVideoId } from '../../utils/lessonPlayback';

const MAX_BYTES = 100 * 1024 * 1024;
type Picked = DocumentPicker.DocumentPickerAsset;
export default function InstructorUploadForm({ initialBatch, onClose, onSaved }: { initialBatch?: string; onClose: () => void; onSaved: (batchId: string) => void }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark);
  const [kind, setKind] = useState<'video' | 'pdf'>('video'), [source, setSource] = useState<'youtube' | 'file'>('youtube');
  const [batches, setBatches] = useState<any[]>([]), [topics, setTopics] = useState<string[]>([]), [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState(initialBatch || ''), [topic, setTopic] = useState(''), [newTopic, setNewTopic] = useState(''), [title, setTitle] = useState(''), [url, setUrl] = useState('');
  const [video, setVideo] = useState<Picked | null>(null), [notes, setNotes] = useState<Picked | null>(null), [pdf, setPdf] = useState<Picked | null>(null);
  const [saving, setSaving] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState('');
  const busy = useRef(false), topicRequest = useRef(0);
  useEffect(() => { let active = true; api.get('/instructors/my-batches').then(response => { if (active) setBatches((response.data || []).filter((item: any) => item.status === 'active')); }).catch(() => { if (active) setError('Assigned batches could not be loaded. Close this form and try again.'); }).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, []);
  useEffect(() => {
    const request = ++topicRequest.current; setTopics([]); setTopic('');
    if (batch) api.get(`/instructors/batches/${batch}/topics`).then(response => { if (request === topicRequest.current) setTopics(response.data || []); }).catch(() => {});
    return () => { topicRequest.current += 1; };
  }, [batch]);
  const pick = async (isVideo: boolean, setter: (asset: Picked) => void) => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: isVideo ? ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-matroska'] : 'application/pdf', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets[0];
      if ((file.size || 0) > MAX_BYTES) { setError('Choose a file smaller than 100 MB.'); return; }
      if (!(isVideo ? /\.(mp4|mov|webm|mkv|avi)$/i : /\.pdf$/i).test(file.name)) { setError(isVideo ? 'Choose a supported video file.' : 'Choose a PDF document.'); return; }
      setter(file);
    } catch { setError('The file could not be selected. Please try again.'); }
  };
  const attach = async (data: FormData, key: string, asset: Picked) => {
    if (Platform.OS === 'web') {
      const file = asset.file || await (await fetch(asset.uri)).blob();
      data.append(key, file, asset.name);
    } else data.append(key, { uri: asset.uri, name: asset.name, type: asset.mimeType || (key === 'video' ? 'video/mp4' : 'application/pdf') } as any);
  };
  const submit = async () => {
    if (busy.current) return; Keyboard.dismiss();
    if (!batch) { setError('Select an active batch.'); return; }
    if (!(newTopic.trim() || topic.trim())) { setError('Choose an existing module or enter a module name.'); return; }
    if (!title.trim()) { setError('Enter an upload title.'); return; }
    if (kind === 'video' && source === 'youtube' && !youtubeVideoId(url.trim())) { setError('Enter a valid YouTube video URL.'); return; }
    if (kind === 'video' && source === 'file' && !video || kind === 'pdf' && !pdf) { setError(kind === 'pdf' ? 'Select a PDF document.' : 'Select a video file.'); return; }
    busy.current = true; setSaving(true);
    try {
      const data = new FormData(); data.append('batch_id', batch); data.append('topic', newTopic.trim() || topic.trim()); data.append('title', title.trim()); data.append('order_index', '0');
      if (kind === 'video') { if (source === 'youtube') data.append('youtube_url', url.trim()); else await attach(data, 'video', video!); if (notes) await attach(data, 'notes', notes); }
      else await attach(data, 'material', pdf!);
      const response = await api.post(kind === 'video' ? '/instructors/videos' : '/instructors/materials', data, { timeout: 180000 });
      setSuccess(`${kind === 'video' ? 'Video lesson' : 'PDF document'} published successfully.${response.data.notification_sent === false ? ' The upload is saved, but student notifications could not be sent.' : ' Students in this batch can now view it in Uploads.'}`);
    } catch (failure: any) { setError(failure.response?.data?.message || 'The upload could not be completed. Your form is saved here; check your connection and try again.'); }
    finally { busy.current = false; setSaving(false); }
  };
  const input = (label: string, value: string, change: (value: string) => void, placeholder: string) => <View style={styles.field}><Text style={[styles.label, { color: theme.muted }]}>{label}</Text><TextInput accessibilityLabel={label} editable={!saving} value={value} onChangeText={change} placeholder={placeholder} autoCapitalize={label.includes('URL') ? 'none' : 'sentences'} placeholderTextColor={theme.muted} style={[styles.input, { color: theme.text, backgroundColor: theme.field, borderColor: theme.line }]} /></View>;
  const file = (label: string, asset: Picked | null, setter: (asset: Picked | null) => void, isVideo = false) => <View style={styles.field}><Text style={[styles.label, { color: theme.muted }]}>{label}</Text><View style={[styles.file, { backgroundColor: theme.field, borderColor: theme.line }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose ${label}`} disabled={saving} style={styles.fileButton} onPress={() => { void pick(isVideo, setter); }}><Icon name={isVideo ? 'videocam-outline' : 'document-text-outline'} size={24} color={theme.accent} /><Text style={[styles.fileText, { color: theme.text }]}>{asset?.name || 'Choose file'}</Text></TouchableOpacity>{asset && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${label}`} disabled={saving} onPress={() => setter(null)} style={styles.close}><Icon name="close" size={19} color={theme.muted} /></TouchableOpacity>}</View><Text style={[styles.help, { color: theme.muted }]}>Maximum 100 MB</Text></View>;
  return <Modal visible transparent animationType="slide" onRequestClose={() => { if (!saving && !success) onClose(); }}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.line }]}>
      <View style={[styles.header, { borderBottomColor: theme.line }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Close upload form" disabled={saving} onPress={onClose} style={styles.close}><Icon name="chevron-back" size={23} color={theme.text} /></TouchableOpacity><Text style={[styles.heading, { color: theme.text }]}>New Upload</Text></View>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        <View style={styles.choices}>{(['video', 'pdf'] as const).map(value => <TouchableOpacity key={value} accessibilityRole="button" accessibilityLabel={value === 'video' ? 'Upload video lesson' : 'Upload PDF document'} disabled={saving} onPress={() => setKind(value)} style={[styles.choice, { backgroundColor: kind === value ? '#171717' : theme.field, borderColor: theme.line }]}><Icon name={value === 'video' ? 'play-circle-outline' : 'document-text-outline'} size={20} color={kind === value ? '#FFFFFF' : theme.text} /><Text style={[styles.choiceText, { color: kind === value ? '#FFFFFF' : theme.text }]}>{value === 'video' ? 'Video' : 'PDF'}</Text></TouchableOpacity>)}</View>
        {loading ? <ActivityIndicator color={theme.accent} /> : <CustomDropdown appearance="management" label="Target batch" selectedValue={batch} placeholder="Choose an assigned batch" items={batches.map(item => ({ value: item._id, label: item.name, subtext: item.course_id?.title }))} onValueChange={value => { if (!saving) setBatch(value); }} />}
        {!loading && !batches.length && <Text style={[styles.help, { color: theme.muted }]}>An admin must assign you to an active batch before you can publish.</Text>}
        {!!topics.length && <CustomDropdown appearance="management" label="Existing module" placeholder="Choose a module" selectedValue={topic} items={topics.map(value => ({ value, label: value }))} onValueChange={value => { if (!saving) { setTopic(value); setNewTopic(''); } }} />}
        {input('Module name', newTopic, setNewTopic, topics.length ? 'Or create a new module' : 'e.g. Electrical Safety')}
        {input('Upload title', title, setTitle, kind === 'pdf' ? 'Document title' : 'Video lesson title')}
        {kind === 'video' ? <><CustomDropdown appearance="management" label="Video source" selectedValue={source} items={[{ value: 'youtube', label: 'YouTube link' }, { value: 'file', label: 'Video file' }]} onValueChange={value => { if (!saving) setSource(value as any); }} />{source === 'youtube' ? input('YouTube URL', url, setUrl, 'https://www.youtube.com/watch?v=…') : file('Video file', video, setVideo, true)}{file('Lesson notes (optional PDF)', notes, setNotes)}</> : file('PDF document', pdf, setPdf)}
      </ScrollView>
      <View style={[styles.footer, { borderTopColor: theme.line }]}><TouchableOpacity accessibilityRole="button" accessibilityLabel="Publish upload" disabled={saving || loading || !batches.length} onPress={() => { void submit(); }} style={[styles.publish, { backgroundColor: COLORS.secondary, opacity: saving || loading || !batches.length ? 0.5 : 1 }]}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.publishText}>Publish {kind === 'pdf' ? 'PDF' : 'video'}</Text>}</TouchableOpacity></View>
    </View>
    <ManagementDialog inline visible={!!error} title="Unable to upload" message={error} type="error" onConfirm={() => setError('')} />
    <ManagementDialog inline visible={!!success} title="Upload published" message={success} type="success" confirmText="Done" onConfirm={() => onSaved(batch)} />
  </KeyboardAvoidingView></Modal>;
}
const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' }, card: { width: '100%', maxWidth: 650, maxHeight: '94%', borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden', flexShrink: 1 }, header: { flexDirection: 'row', alignItems: 'center', padding: 6, borderBottomWidth: StyleSheet.hairlineWidth }, heading: { ...FONTS.bold, fontSize: 18 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, body: { padding: 18, gap: 16 }, field: { gap: 7 }, label: { ...FONTS.medium, fontSize: 12 }, input: { ...FONTS.regular, minHeight: 46, fontSize: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10, paddingHorizontal: 12 }, choices: { flexDirection: 'row', gap: 10 }, choice: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: StyleSheet.hairlineWidth, borderRadius: 10 }, choiceText: { ...FONTS.medium, fontSize: 13 }, file: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth }, fileButton: { flex: 1, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12 }, fileText: { ...FONTS.medium, fontSize: 13, flex: 1 }, help: { ...FONTS.regular, fontSize: 11, lineHeight: 17 }, footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth }, publish: { minHeight: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, publishText: { ...FONTS.bold, color: '#FFFFFF', fontSize: 14 },
});
