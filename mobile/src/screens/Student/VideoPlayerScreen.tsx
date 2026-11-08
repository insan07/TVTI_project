import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  ScrollView,
  Platform,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import YoutubeIframe from 'react-native-youtube-iframe';
import api from '../../services/api';
import { API_URL } from '../../config/constants';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import {
  enableNativeScreenCaptureProtection,
  disableNativeScreenCaptureProtection,
  hardenHtmlVideoElement,
  subscribeToScreenCaptureEvents,
} from '../../utils/screenCaptureProtection';

const WATERMARK_POSITIONS = [
  { top: 14, left: 16 },
  { top: 14, right: 16 },
  { bottom: 48, right: 16 },
  { bottom: 48, left: 16 },
  { top: 92, left: '28%' as any },
];

const formatUploadedTime = (dateStr?: string) => {
  if (!dateStr) return 'Upload date unknown';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Uploaded recently';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Uploaded just now';
  if (diffHours < 24) return `Uploaded ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  if (diffDays < 7) return `Uploaded ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;

  return `Uploaded on ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

export default function VideoPlayerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const auth = useContext(AuthContext);
  const videoId = route.params?.videoId;

  const [videoData, setVideoData] = useState<any>(null);
  const [notesUrl, setNotesUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [securityLockReason, setSecurityLockReason] = useState<string | null>(null);
  const [ytPlaying, setYtPlaying] = useState<boolean>(false);
  const [watermarkPosIdx, setWatermarkPosIdx] = useState<number>(0);

  const player = useVideoPlayer('', (p) => {
    p.loop = false;
  });

  const videoViewRef = useRef<any>(null);

  const lockPlaybackForSecurity = useCallback(
    (reason: string) => {
      try {
        player.pause();
      } catch (_) {}
      setYtPlaying(false);
      setSecurityLockReason(reason);
    },
    [player]
  );

  // 1. Enable Native OS Screen-Recording Block (Android FLAG_SECURE / iOS capture prevention) while screen is focused
  useFocusEffect(
    useCallback(() => {
      enableNativeScreenCaptureProtection();
      return () => {
        disableNativeScreenCaptureProtection();
      };
    }, [])
  );

  // 2. Subscribe to AppState, Web blur/visibility, keyboard shortcuts, and getDisplayMedia interception
  useEffect(() => {
    const unsubscribe = subscribeToScreenCaptureEvents((reason) => {
      lockPlaybackForSecurity(reason);
    });
    return () => {
      unsubscribe();
    };
  }, [lockPlaybackForSecurity]);

  // 3. Rotate dynamic anti-piracy student watermark position every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setWatermarkPosIdx((prev) => (prev + 1) % WATERMARK_POSITIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (videoData?.url && videoData.type !== 'youtube') {
      player.replace(videoData.url);
    }
  }, [videoData?.url]);

  useEffect(() => {
    if (Platform.OS === 'web' && videoViewRef.current?.nativeRef?.current) {
      const videoElement = videoViewRef.current.nativeRef.current;
      hardenHtmlVideoElement(videoElement, lockPlaybackForSecurity);
    }
  }, [videoData?.url, loading, lockPlaybackForSecurity]);

  useEffect(() => {
    if (videoId) {
      fetchVideoData();
    } else {
      setLoading(false);
    }
  }, [videoId]);

  const fetchVideoData = async () => {
    setLoading(true);
    try {
      const [streamRes, notesRes] = await Promise.allSettled([
        api.get(`/students/videos/${videoId}/stream-url`),
        api.get(`/students/videos/${videoId}/notes-url`),
      ]);

      if (streamRes.status === 'fulfilled') {
        setVideoData(streamRes.value.data);
      }

      if (notesRes.status === 'fulfilled') {
        setNotesUrl(notesRes.value.data.url);
      } else {
        setNotesUrl(null);
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  };

  const getYoutubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url?.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  if (loading) {
    return (
      <View style={[styles.center, isDark && { backgroundColor: '#0B0F19' }]}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const yTId = videoData?.type === 'youtube' && videoData?.url ? getYoutubeId(videoData.url) : null;
  const studentIdentity = auth?.user
    ? `${auth.user.name || 'Student'} • ${auth.user.index_number || auth.user.email || 'TVTI'}`
    : 'TVTI Protected Stream';

  return (
    <View style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]}>
      <ScreenBackground />
      <View style={{ paddingTop: insets.top }}>
        <ScreenHeader
          title="Video Player"
          subtitle={videoData?.title || 'Course Lesson'}
          showBack={true}
        />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Protected Video Player Frame */}
        <View
          style={[styles.videoContainer, Platform.OS === 'web' && ({ userSelect: 'none', WebkitUserSelect: 'none' } as any)]}
          {...({ onContextMenu: (e: any) => e.preventDefault() } as any)}
        >
          {videoData?.type === 'youtube' && yTId ? (
            <YoutubeIframe
              height={230}
              videoId={yTId}
              play={ytPlaying && !securityLockReason}
              onChangeState={(state: string) => {
                if (state === 'playing') setYtPlaying(true);
                else if (state === 'paused' || state === 'ended') setYtPlaying(false);
              }}
              initialPlayerParams={{
                modestbranding: true,
                rel: false,
                controls: true,
              }}
            />
          ) : videoData?.url ? (
            <VideoView
              ref={videoViewRef}
              style={styles.video}
              player={player}
              {...({
                allowsFullscreen: true,
                allowsPictureInPicture: false,
                contentFit: 'contain',
              } as any)}
            />
          ) : (
            <View style={styles.videoMockContainer}>
              <View style={styles.playButtonCircle}>
                <Icon name="play" size={32} color="#1A1A1A" style={{ marginLeft: 4 }} />
              </View>

              {/* Controls bar at bottom */}
              <View style={styles.controlsBar}>
                <Icon name="pause" size={18} color="#FFFFFF" style={{ marginRight: 10 }} />
                <View style={styles.progressTrack}>
                  <View style={styles.progressFill} />
                </View>
                <Text style={styles.timestampText}>14:20 / 45:00</Text>
                <Icon name="volume-high-outline" size={18} color="#FFFFFF" style={{ marginLeft: 10, marginRight: 8 }} />
                <Icon name="expand-outline" size={18} color="#FFFFFF" />
              </View>
            </View>
          )}

          {/* Dynamic Moving Anti-Piracy Student Watermark Overlay */}
          <View
            pointerEvents="none"
            style={[styles.watermarkOverlay, WATERMARK_POSITIONS[watermarkPosIdx]]}
          >
            <Text style={styles.watermarkText}>{studentIdentity}</Text>
          </View>

          {/* Security Blackout Shield when Screen Recording / Capture / Blur is Detected */}
          {securityLockReason ? (
            <View style={styles.securityBlackoutShield}>
              <View style={styles.securityIconBadge}>
                <Icon name="shield-half-outline" size={28} color="#F97316" />
              </View>
              <Text style={styles.securityBlackoutTitle}>Screen Recording & Capture Restricted</Text>
              <Text style={styles.securityBlackoutDesc}>{securityLockReason}</Text>
              <TouchableOpacity
                style={styles.resumePlaybackBtn}
                activeOpacity={0.85}
                onPress={() => setSecurityLockReason(null)}
              >
                <Icon name="play" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.resumePlaybackBtnText}>Resume Protected Video</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* DRM / Screen-Recording Protection Notice Bar */}
        <View style={[styles.drmNoticeBar, isDark && { backgroundColor: '#141B26', borderBottomColor: 'rgba(255,255,255,0.06)' }]}>
          <Icon name="lock-closed" size={13} color="#F58220" style={{ marginRight: 6 }} />
          <Text style={[styles.drmNoticeText, isDark && { color: '#94A3B8' }]}>
            Protected Stream • 3rd-party screen recording & capture are blocked
          </Text>
        </View>

        {/* Content Details Body */}
        <View style={styles.contentPadding}>
          {/* Title & Subtitle */}
          <Text style={[styles.videoTitle, isDark && { color: '#FFFFFF' }]}>
            {videoData?.title || 'Session Video'}
          </Text>
          {videoData?.module_name ? (
            <Text style={[styles.moduleSubtitle, isDark && { color: '#94A3B8' }]}>
              {videoData.module_name}
            </Text>
          ) : null}

          {/* Uploaded Time Row */}
          <View style={styles.uploadedTimeRow}>
            <Icon name="time-outline" size={15} color={isDark ? '#94A3B8' : '#71717A'} style={{ marginRight: 6 }} />
            <Text style={[styles.uploadedTimeText, isDark && { color: '#94A3B8' }]}>
              {formatUploadedTime(videoData?.createdAt || videoData?.uploaded_at)}
            </Text>
          </View>

          {/* Attached Notes Card */}
          {notesUrl && (
            <View style={[styles.notesCard, isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }]}>
              <View style={styles.notesCardHeaderRow}>
                <View style={[styles.pdfIconCircle, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
                  <Icon name="document-text-outline" size={22} color={isDark ? '#FB923C' : '#1A1A1A'} />
                </View>
                <View style={styles.notesTitleContainer}>
                  <Text style={[styles.notesCardTitle, isDark && { color: '#FFFFFF' }]}>Attached Notes</Text>
                  <Text style={[styles.notesCardSubtitle, isDark && { color: '#94A3B8' }]}>PDF Document</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.viewNotesButton, isDark && { backgroundColor: '#F97316' }]}
                activeOpacity={0.8}
                onPress={() => {
                  if (notesUrl) {
                    let url = notesUrl;
                    if (url.startsWith('/uploads/') || url.startsWith('/api/files/')) {
                      url = `${API_URL.replace(/\/api\/?$/, '')}${url}`;
                    }
                    if (Platform.OS === 'web') {
                      window.open(url, '_blank');
                    } else {
                      Linking.openURL(url).catch(() => {
                        Alert.alert('Error', 'Unable to open PDF notes');
                      });
                    }
                  }
                }}
              >
                <Icon name="document-text" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.viewNotesButtonText}>View Notes (PDF)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Session Overview Section */}
          <Text style={[styles.sectionTitle, isDark && { color: '#FFFFFF' }]}>Session Overview</Text>
          <Text style={[styles.overviewParagraph, isDark && { color: '#CBD5E1' }]}>
            {videoData?.description || 'No description available for this video.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
  topNotificationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xs,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  pageHeaderTitle: {
    fontSize: 18,
    color: '#1A1A1A',
    ...FONTS.bold,
  },
  bellBtn: {
    padding: SPACING.xs,
  },
  scrollContent: {
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    height: 230,
    backgroundColor: '#000000',
    position: 'relative',
    overflow: 'hidden',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  watermarkOverlay: {
    position: 'absolute',
    backgroundColor: 'rgba(15, 23, 42, 0.42)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.14)',
    zIndex: 20,
  },
  watermarkText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 10.5,
    ...FONTS.bold,
    letterSpacing: 0.4,
  },
  securityBlackoutShield: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#090D16',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    zIndex: 50,
  },
  securityIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(249, 115, 22, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(249, 115, 22, 0.3)',
  },
  securityBlackoutTitle: {
    color: '#FFFFFF',
    fontSize: 15.5,
    ...FONTS.bold,
    textAlign: 'center',
    marginBottom: 4,
  },
  securityBlackoutDesc: {
    color: '#94A3B8',
    fontSize: 12,
    ...FONTS.regular,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 17,
  },
  resumePlaybackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F58220',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
  },
  resumePlaybackBtnText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    ...FONTS.bold,
  },
  drmNoticeBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFEDD5',
  },
  drmNoticeText: {
    fontSize: 11.5,
    color: '#9A3412',
    ...FONTS.medium,
  },
  videoMockContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  playButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#475569',
    borderRadius: 2,
    marginRight: 10,
    overflow: 'hidden',
  },
  progressFill: {
    width: '32%',
    height: '100%',
    backgroundColor: '#F58220',
  },
  timestampText: {
    color: '#FFFFFF',
    fontSize: 11.5,
    ...FONTS.medium,
  },
  contentPadding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  videoTitle: {
    fontSize: 20,
    color: '#1A1A1A',
    ...FONTS.bold,
    lineHeight: 26,
    marginBottom: 4,
  },
  moduleSubtitle: {
    fontSize: 14,
    color: '#666666',
    ...FONTS.regular,
    marginBottom: 6,
  },
  uploadedTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  uploadedTimeText: {
    fontSize: 13.5,
    color: '#71717A',
    ...FONTS.medium,
  },
  notesCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.xxl,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  notesCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  pdfIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  notesTitleContainer: {
    flex: 1,
  },
  notesCardTitle: {
    fontSize: 16.5,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: 2,
  },
  notesCardSubtitle: {
    fontSize: 13,
    color: '#666666',
    ...FONTS.regular,
  },
  viewNotesButton: {
    backgroundColor: '#000000',
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewNotesButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    ...FONTS.bold,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: SPACING.sm,
  },
  overviewParagraph: {
    fontSize: 14,
    color: '#555555',
    ...FONTS.regular,
    lineHeight: 22,
  },
});

