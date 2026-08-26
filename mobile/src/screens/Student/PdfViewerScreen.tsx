import React, { useState } from 'react';
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
  const [hasError, setHasError] = useState(false);

  // 1. Resolve relative server URLs vs absolute URLs
  const getFullPdfUrl = (urlStr: string): string => {
    if (!urlStr) return '';
    let trimmed = urlStr.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    const baseUrl = API_URL.replace(/\/api\/?$/, '');
    if (trimmed.startsWith('/')) {
      return `${baseUrl}${trimmed}`;
    }
    return `${baseUrl}/${trimmed}`;
  };

  const fullUrl = getFullPdfUrl(rawUrl);

  // 2. Prepare Google Docs embed link for native mobile WebViews
  const isLocalHost =
    fullUrl.includes('localhost') ||
    fullUrl.includes('127.0.0.1') ||
    fullUrl.includes('10.0.2.2') ||
    fullUrl.includes('192.168.');

  const embedUrl =
    !isLocalHost && (fullUrl.startsWith('http://') || fullUrl.startsWith('https://'))
      ? `https://docs.google.com/viewer?url=${encodeURIComponent(fullUrl)}&embedded=true`
      : fullUrl;

  const handleExternalOpen = async () => {
    try {
      if (Platform.OS === 'web') {
        window.open(fullUrl, '_blank');
      } else {
        const canOpen = await Linking.canOpenURL(fullUrl);
        if (canOpen) {
          await Linking.openURL(fullUrl);
        } else {
          window.open(fullUrl, '_blank');
        }
      }
    } catch (e) {
      console.warn('Failed to open PDF externally:', e);
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
          <Icon name="open-outline" size={22} color="#F58220" />
        </TouchableOpacity>
      </View>

      {/* Main Container */}
      <View style={styles.bodyContainer}>
        {/* PDF Document Header Card */}
        <View style={styles.previewCard}>
          <View style={styles.pdfIconCircle}>
            <Icon name="document-text" size={28} color="#F58220" />
          </View>
          <View style={styles.cardDetails}>
            <Text style={styles.cardTitle} numberOfLines={1}>{title}</Text>
            <Text style={styles.cardSubtitle}>PDF Document</Text>
          </View>

          <TouchableOpacity style={styles.openButton} onPress={handleExternalOpen} activeOpacity={0.85}>
            <Icon name="eye-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.openButtonText}>Open External</Text>
          </TouchableOpacity>
        </View>

        {/* Embedded Viewer Container */}
        <View style={styles.webviewFrame}>
          {loading && !hasError && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={COLORS.secondary} />
              <Text style={styles.loadingText}>Loading PDF Document...</Text>
            </View>
          )}

          {hasError ? (
            <View style={styles.errorContainer}>
              <Icon name="alert-circle-outline" size={48} color="#EF4444" />
              <Text style={styles.errorTitle}>Unable to preview PDF directly</Text>
              <Text style={styles.errorSubtitle}>
                Tap below to open or download the PDF file using your system viewer.
              </Text>
              <TouchableOpacity style={styles.retryOpenButton} onPress={handleExternalOpen}>
                <Icon name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.retryOpenButtonText}>View / Download PDF</Text>
              </TouchableOpacity>
            </View>
          ) : Platform.OS === 'web' ? (
            <object
              data={fullUrl}
              type="application/pdf"
              style={{ width: '100%', height: '100%', border: 'none' }}
              onLoad={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setHasError(true);
              }}
            >
              <iframe
                src={fullUrl}
                title={title}
                style={{ width: '100%', height: '100%', border: 'none' }}
                onLoad={() => setLoading(false)}
              />
            </object>
          ) : (
            <WebView
              source={{ uri: embedUrl }}
              style={{ flex: 1 }}
              onLoadEnd={() => setLoading(false)}
              onError={() => {
                setLoading(false);
                setHasError(true);
              }}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    ...SHADOW.sm,
  },
  pdfIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 10,
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
    fontSize: 14.5,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  openButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FFFFFF',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#0F172A',
    marginTop: 12,
    marginBottom: 6,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  retryOpenButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  retryOpenButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
