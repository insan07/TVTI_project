import React, { useCallback, useContext, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { COLORS, FONTS } from '../../config/theme';
import ScreenBackground from '../../components/shared/ScreenBackground';
import MainPageHeader from '../../components/shared/MainPageHeader';
import CustomDropdown from '../../components/shared/CustomDropdown';
import WhatsAppOptionsMenu from '../../components/shared/WhatsAppOptionsMenu';
import { ManagementButton, ManagementCard, ManagementEmpty, ManagementField, ManagementSearch, ManagementSheet, managementStyles } from '../../components/shared/CourseBatchUI';
import { communicationTheme } from '../../components/shared/communicationTheme';
import { floatingTabBarClearance } from '../../components/navigation/floatingTabBarLayout';
import ScrollAwareControls from '../../components/shared/ScrollAwareControls';
import useScrollAwareControls from '../../hooks/useScrollAwareControls';

type Notice = { _id: string; title: string; message: string; createdAt: string; batch_id?: string | { _id: string; name?: string }; posted_by?: { name?: string } };
const emptyForm = { batch_id: 'all', title: '', message: '' };
const batchId = (notice: Notice) => typeof notice.batch_id === 'string' ? notice.batch_id : notice.batch_id?._id;
const dateLabel = (value: string) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }); };

export default function PostAnnouncementScreen() {
  const auth = useContext(AuthContext);
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  const insets = useSafeAreaInsets();
  const clearance = floatingTabBarClearance(insets.bottom);
  const [batches, setBatches] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [batchError, setBatchError] = useState('');
  const [audience, setAudience] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Notice | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleting, setDeleting] = useState<Notice | null>(null);
  const [feedback, setFeedback] = useState<{ title: string; message: string } | null>(null);
  const request = useRef(0);
  const mutation = useRef(false);
  const controls = useScrollAwareControls(`${audience}:${search}`);
  const load = useCallback(async () => {
    const current = ++request.current;
    const [history, batchList] = await Promise.allSettled([
      api.get('/announcements/my'), api.get(auth?.userRole === 'admin' ? '/admin/batches' : '/instructors/my-batches'),
    ]);
    if (current !== request.current) return;
    if (history.status === 'fulfilled') { setAnnouncements(history.value.data || []); setError(''); }
    else setError('Could not load announcements. Please try again.');
    if (batchList.status === 'fulfilled') { setBatches(batchList.value.data || []); setBatchError(''); }
    else setBatchError('Batch audiences could not be loaded. Try again before publishing.');
    setLoading(false); setRefreshing(false);
  }, [auth?.userRole]);
  useFocusEffect(useCallback(() => { void load(); return () => { request.current++; }; }, [load]));
  const options = [{ label: 'All students', value: 'all' }, ...batches.map(batch => ({ label: batch.name || 'Batch', value: batch._id, subtext: batch.course_id?.title }))];
  const filterOptions = [{ label: 'All announcements', value: 'all' }, { label: 'All-student announcements', value: 'global' }, ...options.slice(1)];
  const shown = announcements.filter(notice => (audience === 'all' || (audience === 'global' ? !batchId(notice) : batchId(notice) === audience)) && `${notice.title} ${notice.message}`.toLowerCase().includes(search.toLowerCase().trim()))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const openForm = (notice?: Notice) => {
    setEditing(notice || null); setForm(notice ? { batch_id: batchId(notice) || 'all', title: notice.title, message: notice.message } : { ...emptyForm, batch_id: audience !== 'all' && audience !== 'global' ? audience : 'all' });
    setFormError(''); setFormOpen(true);
  };
  const save = async () => {
    if (mutation.current) return;
    if (!form.title.trim() || !form.message.trim()) { setFormError('Enter a title and message.'); return; }
    if (batchError) { setFormError(batchError); return; }
    mutation.current = true; setBusy(true); setFormError('');
    try {
      const payload = { title: form.title.trim(), message: form.message.trim(), batch_id: form.batch_id === 'all' ? null : form.batch_id };
      const response = editing ? await api.put(`/announcements/${editing._id}`, payload) : await api.post('/announcements', payload);
      const notice = { ...response.data, batch_id: form.batch_id === 'all' ? null : batches.find(batch => batch._id === form.batch_id) || form.batch_id };
      setAnnouncements(previous => editing ? previous.map(item => item._id === editing._id ? notice : item) : [notice, ...previous]);
      setFormOpen(false); setFeedback({ title: editing ? 'Announcement updated' : 'Announcement published', message: editing ? 'Your changes have been saved.' : 'The announcement is now available to the selected audience.' });
    } catch (failure: any) { setFormError(failure.response?.data?.message || 'Could not save the announcement. Please try again.'); }
    finally { mutation.current = false; setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || mutation.current) return;
    mutation.current = true; setBusy(true);
    try {
      await api.delete(`/announcements/${deleting._id}`);
      setAnnouncements(previous => previous.filter(notice => notice._id !== deleting._id));
      setDeleting(null); setFeedback({ title: 'Announcement deleted', message: 'The announcement has been removed.' });
    } catch (failure: any) { setDeleting(null); setFeedback({ title: 'Could not delete', message: failure.response?.data?.message || 'Please try again.' }); }
    finally { mutation.current = false; setBusy(false); }
  };
  const targetLabel = (notice: Notice) => !batchId(notice) ? 'All students' : typeof notice.batch_id === 'object' && notice.batch_id?.name ? notice.batch_id.name : batches.find(batch => batch._id === batchId(notice))?.name || 'Batch announcement';
  return <View style={[styles.screen, { backgroundColor: theme.background }]}>
    <ScreenBackground />
    <MainPageHeader showBack={auth?.userRole === 'admin'} title="Announcements" subtitle="Notices and updates for your students" plainBack />
    <ScrollAwareControls controls={controls}>
      <View style={styles.toolbar}>
        <CustomDropdown appearance="management" placeholder="Announcement audience" iconName="people-outline" items={filterOptions} selectedValue={audience} onValueChange={setAudience} containerStyle={{ flex: 1 }} />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Filter announcements" onPress={() => setFiltersOpen(true)} style={[styles.roundButton, { borderColor: theme.line, backgroundColor: theme.surface }]}><Icon name="options-outline" size={20} color={search ? COLORS.secondary : theme.text} /></TouchableOpacity>
      </View>
    </ScrollAwareControls>
    <FlatList data={shown} keyExtractor={notice => notice._id} onScroll={controls.onScroll} scrollEventThrottle={16}
      contentContainerStyle={[styles.content, { paddingBottom: clearance + 90 }]} showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} tintColor={COLORS.secondary} />}
      ListHeaderComponent={<View style={styles.countRow}><Text style={[styles.count, { color: theme.muted }]}>{shown.length} {shown.length === 1 ? 'announcement' : 'announcements'}</Text>{!!search && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')}><Text style={styles.link}>Clear search</Text></TouchableOpacity>}</View>}
      ListEmptyComponent={loading ? <ActivityIndicator color={COLORS.secondary} style={{ padding: 32 }} /> : <ManagementEmpty title={error ? 'Announcements unavailable' : 'No announcements'} message={error || (search || audience !== 'all' ? 'Try another audience or clear your search.' : 'Use the add button to publish your first notice.')} retry={error ? () => { setLoading(true); void load(); } : undefined} />}
      renderItem={({ item }) => <ManagementCard title={item.title} headerAction={<WhatsAppOptionsMenu accessibilityLabel={`Options for ${item.title}`} options={[{ id: 'edit', label: 'Edit announcement', onPress: () => openForm(item) }, { id: 'delete', label: 'Delete announcement', destructive: true, onPress: () => setDeleting(item) }]} />}>
        <View style={styles.metadata}><Icon name="people-outline" size={15} color={COLORS.secondary} /><Text style={[styles.audience, { color: theme.text }]}>{targetLabel(item)}</Text></View>
        <Text style={[styles.message, { color: theme.text }]}>{item.message}</Text>
        <View style={[styles.cardFooter, { borderColor: theme.line }]}><Text style={[styles.caption, { color: theme.muted }]}>{dateLabel(item.createdAt)}</Text>{!!item.posted_by?.name && <Text numberOfLines={1} style={[styles.author, { color: theme.muted }]}>{item.posted_by.name}</Text>}</View>
      </ManagementCard>} />
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Create announcement" onPress={() => openForm()} style={[managementStyles.fab, { bottom: clearance + 12 }]}><Icon name="add" size={28} color="#FFFFFF" /></TouchableOpacity>
    <ManagementSheet visible={filtersOpen} title="Filter announcements" onClose={() => setFiltersOpen(false)} footer={<ManagementButton title="Done" onPress={() => setFiltersOpen(false)} />}>
      <ManagementSearch value={search} onChangeText={setSearch} placeholder="Search announcements" />
      <View style={{ height: 16 }} /><CustomDropdown label="Audience" appearance="management" items={filterOptions} selectedValue={audience} onValueChange={setAudience} />
      <View style={{ height: 16 }} /><ManagementButton title="Reset filters" secondary onPress={() => { setSearch(''); setAudience('all'); }} />
    </ManagementSheet>
    <ManagementSheet visible={formOpen} title={editing ? 'Edit announcement' : 'New announcement'} busy={busy} onClose={() => setFormOpen(false)} footer={<><ManagementButton title="Cancel" secondary disabled={busy} onPress={() => setFormOpen(false)} /><ManagementButton title={editing ? 'Save changes' : 'Publish'} busy={busy} disabled={!!batchError} onPress={save} /></>}>
      {!!batchError && <><Text accessibilityRole="alert" style={styles.error}>{batchError}</Text><ManagementButton title="Reload audiences" secondary onPress={() => void load()} /></>}
      <CustomDropdown label="Audience" appearance="management" items={options.some(option => option.value === form.batch_id) ? options : [...options, { label: 'Current batch', value: form.batch_id }]} selectedValue={form.batch_id} onValueChange={value => setForm(previous => ({ ...previous, batch_id: value }))} containerStyle={{ marginBottom: 16 }} />
      <ManagementField label="Title" value={form.title} onChangeText={title => setForm(previous => ({ ...previous, title }))} placeholder="Announcement title" />
      <ManagementField label="Message" value={form.message} onChangeText={message => setForm(previous => ({ ...previous, message }))} multiline placeholder="Write your announcement" />
      {!!formError && <Text accessibilityRole="alert" style={styles.error}>{formError}</Text>}
    </ManagementSheet>
    <ManagementSheet visible={!!deleting} title="Delete announcement?" busy={busy} onClose={() => setDeleting(null)} footer={<><ManagementButton title="Cancel" secondary disabled={busy} onPress={() => setDeleting(null)} /><ManagementButton title="Delete" busy={busy} onPress={remove} /></>}><Text style={[styles.message, { color: theme.text }]}>Remove “{deleting?.title}” from the selected students’ announcements?</Text></ManagementSheet>
    <ManagementSheet visible={!!feedback} title={feedback?.title || ''} onClose={() => setFeedback(null)} footer={<ManagementButton title="Done" onPress={() => setFeedback(null)} />}><Text style={[styles.message, { color: theme.text }]}>{feedback?.message}</Text></ManagementSheet>
  </View>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10, width: '100%', maxWidth: 1100, alignSelf: 'center' },
  roundButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 20, width: '100%', maxWidth: 1100, alignSelf: 'center' }, countRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6, paddingBottom: 12 }, count: { ...FONTS.medium, fontSize: 12 },
  metadata: { flexDirection: 'row', alignItems: 'center', gap: 7 }, audience: { ...FONTS.medium, fontSize: 12, flex: 1 }, message: { ...FONTS.regular, fontSize: 14, lineHeight: 22 },
  cardFooter: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }, caption: { ...FONTS.regular, fontSize: 11 }, author: { ...FONTS.regular, fontSize: 11, flexShrink: 1 },
  link: { ...FONTS.medium, color: COLORS.secondary, fontSize: 12 }, error: { ...FONTS.regular, color: '#DC2626', fontSize: 13, lineHeight: 20, marginBottom: 12 },
});
