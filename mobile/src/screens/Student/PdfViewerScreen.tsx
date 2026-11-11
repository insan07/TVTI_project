import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRoute } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Asset } from 'expo-asset';
import { File, Paths } from 'expo-file-system';
import { StorageAccessFramework, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { API_URL } from '../../config/constants';
import { COLORS, FONTS } from '../../config/theme';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';
import { storage } from '../../utils/storage';
import { resolvePdfUrl, pdfBase64, isPdfFile, pdfFileName } from '../../utils/pdfReader';
import PdfReaderSurface from '../../components/student/PdfReaderSurface';

let templatePromise: Promise<string> | null = null;
function loadTemplate(): Promise<string> {
  if (!templatePromise) templatePromise = (async () => {
    const asset = Asset.fromModule(require('../../../assets/pdf-reader.html'));
    await asset.downloadAsync();
    if (Platform.OS !== 'web' && asset.localUri) return new File(asset.localUri).text();
    const response = await fetch(asset.uri);
    if (!response.ok) throw new Error('The document reader is unavailable. Please reopen the app.');
    return response.text();
  })().catch(error => { templatePromise = null; throw error; });
  return templatePromise;
}

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const rawUrl = String(route.params?.pdfUrl || '');
  const title = String(route.params?.title || 'Lesson notes');
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [command, setCommand] = useState(0);
  const [saving, setSaving] = useState(false);
  const [canDownload, setCanDownload] = useState(false);
  const documentBytes = useRef<Uint8Array | null>(null);
  const foreground = isDark ? '#F5F5F5' : COLORS.primary;
  const secondary = isDark ? '#A0A0A0' : '#737373';
  const border = isDark ? '#323232' : '#E6E6E6';

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    setHtml(''); setError(null); setLoading(true); setPage(1); setPages(0); setZoom(1); setCommand(0);
    setCanDownload(false); documentBytes.current = null;
    (async () => {
      try {
        const url = resolvePdfUrl(rawUrl, API_URL);
        const headers: Record<string, string> = {};
        // Never forward the student's access token to third-party document hosts.
        if (new URL(url).origin === new URL(API_URL).origin) {
          const token = await storage.getItem('token');
          if (token) headers.Authorization = `Bearer ${token}`;
        }
        const [template, response] = await Promise.all([
          loadTemplate(), fetch(url, { signal: controller.signal, headers, credentials: 'omit' }),
        ]);
        if (!response.ok) throw new Error(response.status === 403 || response.status === 401
          ? 'You do not have access to these notes. Contact your instructor.'
          : 'These notes could not be loaded. Check your connection and try again.');
        const bytes = new Uint8Array(await response.arrayBuffer());
        if (!isPdfFile(bytes)) throw new Error('The attached file is not a readable PDF. Ask your instructor to check the upload.');
        if (active) { documentBytes.current = bytes; setCanDownload(true); setHtml(template.replace('__PDF_DATA__', pdfBase64(bytes))); }
      } catch (failure: any) {
        if (active) { setError(failure.name === 'AbortError' ? 'The document took too long to load. Check your connection and try again.' : failure.message || 'Unable to open these notes.'); setLoading(false); }
      } finally { clearTimeout(timeout); }
    })();
    return () => { active = false; clearTimeout(timeout); controller.abort(); };
  }, [rawUrl, attempt]);

  useEffect(() => {
    if (!html || !loading) return;
    const timeout = setTimeout(() => { setError('The document reader took too long to respond. Please try again.'); setLoading(false); }, 45000);
    return () => clearTimeout(timeout);
  }, [html, loading]);

  const changePage = (next: number) => { setPage(next); setCommand(value => value + 1); };
  const changeZoom = (next: number) => { setZoom(next); setCommand(value => value + 1); };
  const downloadDocument = async () => {
    const bytes = documentBytes.current;
    if (!bytes || saving) return;
    setSaving(true);
    try {
      const name = pdfFileName(title);
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
        const link = document.createElement('a'); link.href = url; link.download = name;
        document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else if (Platform.OS === 'android') {
        const permission = await StorageAccessFramework.requestDirectoryPermissionsAsync();
        if (!permission.granted) return;
        const uri = await StorageAccessFramework.createFileAsync(permission.directoryUri, name, 'application/pdf');
        await writeAsStringAsync(uri, pdfBase64(bytes), { encoding: EncodingType.Base64 });
        Alert.alert('Document saved', 'Your PDF was saved in the selected folder.');
      } else {
        if (!(await Sharing.isAvailableAsync())) throw new Error('Saving documents is unavailable on this device.');
        const file = new File(Paths.cache, name); file.write(bytes);
        await Sharing.shareAsync(file.uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save document' });
      }
    } catch (failure: any) { Alert.alert('Unable to save document', failure.message || 'Please try again.'); }
    finally { setSaving(false); }
  };

  const button = (icon: React.ComponentProps<typeof Icon>['name'], label: string, action: () => void, disabled: boolean) =>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={action} disabled={disabled}
      style={[styles.toolButton, disabled && { opacity: 0.3 }]}><Icon name={icon} size={20} color={foreground} /></TouchableOpacity>;

  return <View style={[styles.screen, { backgroundColor: isDark ? '#111111' : '#F7F7F7' }]}>
    <ScreenBackground />
    <View style={{ paddingTop: insets.top }}><ScreenHeader title="Lesson notes" showBack /></View>
    <View style={[styles.content, { paddingBottom: insets.bottom + 16 }]}>
      <View style={[styles.reader, { backgroundColor: isDark ? '#1B1B1B' : '#FFFFFF', borderColor: border }]}>
        <View style={[styles.heading, { borderColor: border }]}>
          <Text style={[styles.title, { color: foreground, flex: 1 }]} numberOfLines={2}>{title}</Text>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Download document" disabled={!canDownload || saving}
            onPress={downloadDocument} style={[styles.download, (!canDownload || saving) && { opacity: 0.4 }]}>
            {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Icon name="download-outline" size={18} color="#FFFFFF" />}
            <Text style={styles.downloadLabel}>Download</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.toolbar, { borderColor: border }]}>
          <View style={styles.toolGroup}>
            {button('chevron-back', 'Previous page', () => changePage(Math.max(1, page - 1)), page <= 1 || !pages || !!error)}
            <Text accessibilityLiveRegion="polite" style={[styles.pageLabel, { color: foreground }]}>Page {page} / {pages || '—'}</Text>
            {button('chevron-forward', 'Next page', () => changePage(Math.min(pages, page + 1)), page >= pages || !pages || !!error)}
          </View>
          <View style={styles.toolGroup}>
            {button('remove', 'Zoom out', () => changeZoom(Math.max(0.75, zoom - 0.25)), zoom <= 0.75 || !pages || !!error)}
            <Text style={[styles.zoomLabel, { color: secondary }]}>{Math.round(zoom * 100)}%</Text>
            {button('add', 'Zoom in', () => changeZoom(Math.min(2, zoom + 0.25)), zoom >= 2 || !pages || !!error)}
          </View>
        </View>
        <View style={[styles.pages, { backgroundColor: isDark ? '#141414' : '#F0F0F0' }]}>
          {!!html && !error && <PdfReaderSurface key={`${rawUrl}-${attempt}`} html={html} page={page} zoom={zoom} command={command} onMessage={message => {
            if (message.type === 'loaded' && message.pages) setPages(message.pages);
            if (message.type === 'ready') { setLoading(false); if (message.pages) setPages(message.pages); }
            if (message.type === 'page' && message.page) setPage(message.page);
            if (message.type === 'error') { setError(message.message || 'These notes could not be displayed.'); setLoading(false); }
          }} />}
          {loading && !error && <View style={[styles.overlay, { backgroundColor: isDark ? '#141414' : '#F0F0F0' }]}><ActivityIndicator size="large" color={COLORS.secondary} /><Text style={[styles.help, { color: secondary }]}>Opening your notes…</Text></View>}
          {!!error && <View style={styles.error}>
            <Icon name="document-text-outline" size={35} color={COLORS.secondary} />
            <Text style={[styles.errorTitle, { color: foreground }]}>Notes unavailable</Text>
            <Text style={[styles.help, { color: secondary }]}>{error}</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Retry loading notes" style={styles.retry} onPress={() => setAttempt(value => value + 1)}><Text style={styles.retryLabel}>Try again</Text></TouchableOpacity>
          </View>}
        </View>
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flex: 1, width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 12 },
  reader: { flex: 1, borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  heading: { padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1 },
  download: { flexDirection: 'row', gap: 6, backgroundColor: COLORS.secondary, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  downloadLabel: { ...FONTS.semiBold, fontSize: 11, color: '#FFFFFF' },
  title: { ...FONTS.semiBold, fontSize: 15, lineHeight: 22 },
  toolbar: { paddingHorizontal: 8, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  toolGroup: { flexDirection: 'row', alignItems: 'center' },
  toolButton: { width: 36, height: 40, alignItems: 'center', justifyContent: 'center' },
  pageLabel: { ...FONTS.medium, fontSize: 11, minWidth: 70, textAlign: 'center' },
  zoomLabel: { ...FONTS.medium, fontSize: 11, minWidth: 34, textAlign: 'center' },
  pages: { flex: 1, overflow: 'hidden' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 12 },
  help: { ...FONTS.regular, fontSize: 12, lineHeight: 20, textAlign: 'center', maxWidth: 380 },
  error: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 12 },
  errorTitle: { ...FONTS.semiBold, fontSize: 17 },
  retry: { backgroundColor: COLORS.secondary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8, marginTop: 6 },
  retryLabel: { ...FONTS.semiBold, color: '#FFFFFF', fontSize: 12 },
});
