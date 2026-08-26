import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { API_URL } from '../../config/constants';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';

export default function PdfViewerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const rawUrl: string = route.params?.pdfUrl || '';
  const title: string = route.params?.title || 'PDF Document';

  const [loading, setLoading] = useState(true);

  // 1. Resolve relative server URLs vs Cloudinary URLs
  let fullUrl = rawUrl.trim();
  if (fullUrl.startsWith('/uploads/')) {
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    fullUrl = `${baseUrl}${fullUrl}`;
  } else if (fullUrl.includes('cloudinary.com') && fullUrl.includes('/raw/upload/')) {
    // Transform Cloudinary raw download link to inline PDF view link
    fullUrl = fullUrl.replace('/raw/upload/', '/image/upload/fl_inline/');
  }

  // 2. Prepare Google Docs embed link for native mobile WebViews
  const isLocalHost = fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1') || fullUrl.includes('10.0.2.2');
  const embedUrl = (!isLocalHost && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://')))
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`
    : fullUrl;

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleExternalOpen = async () => {
    try {
      if (Platform.OS === 'web') {
        window.open(fullUrl, '_blank');
      } else {
        await Linking.openURL(fullUrl);
      }
    } catch (e) {
      console.warn('Failed to open PDF:', e);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {title}
        </Text>
        <TouchableOpacity style={styles.externalBtn} onPress={handleExternalOpen}>
          <Icon name="open-outline" size={20} color="#F58220" />
        </TouchableOpacity>
      </View>

      {/* Main Container */}
      <View style={styles.bodyContainer}>
        {/* PDF Document Header Card */}
        <View style={styles.previewCard}>
          <View style={styles.pdfIconCircle}>
            <Icon name="document-text" size={32} color="#F58220" />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.cardSubtitle}>PDF Document Ready</Text>
          </View>

          <TouchableOpacity style={styles.openButton} onPress={handleExternalOpen} activeOpacity={0.85}>
            <Icon name="eye-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.openButtonText}>Open PDF</Text>
          </TouchableOpacity>
        </View>

        {/* Embedded Viewer Container */}
        <View style={styles.webviewFrame}>
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
              <Text style={styles.loadingText}>Loading PDF Document...</Text>
            </View>
          )}

          {Platform.OS === 'web' ? (
            <iframe
              src={fullUrl}
              title={title}
              style={{ width: '100%', height: '100%', border: 'none' }}
              onLoad={() => setLoading(false)}
            />
          ) : (
            <WebView
              source={{ uri: embedUrl }}
              style={{ flex: 1 }}
              onLoadEnd={() => setLoading(false)}
              onError={() => setLoading(false)}
              startInLoadingState={false}
              scalesPageToFit={true}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              originWhitelist={['*']}
            />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  topHeaderBar: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    ...FONTS.bold,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: SPACING.sm,
  },
  externalBtn: {
    padding: SPACING.xs,
  },
  bodyContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  previewCard: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOW.sm,
  },
  pdfIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FFF3E6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardDetails: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0F172A',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  openButton: {
    backgroundColor: '#F58220',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  webviewFrame: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
    color: '#64748B',
    ...FONTS.medium,
  },
});
