import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Linking,
  ScrollView,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import YoutubeIframe from 'react-native-youtube-iframe';
import api from '../../services/api';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function VideoPlayerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const videoId = route.params?.videoId;

  const [videoData, setVideoData] = useState<any>(null);
  const [notesUrl, setNotesUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const player = useVideoPlayer('', (p) => {
    p.loop = false;
  });

  useEffect(() => {
    if (videoData?.url && videoData.type !== 'youtube') {
      player.replace(videoData.url);
    }
  }, [videoData?.url]);

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.secondary} />
      </View>
    );
  }

  const yTId = videoData?.type === 'youtube' && videoData?.url ? getYoutubeId(videoData.url) : null;

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>TVTI</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        {/* Video Player Frame */}
        <View style={styles.videoContainer}>
          {videoData?.type === 'youtube' && yTId ? (
            <YoutubeIframe height={230} videoId={yTId} />
          ) : videoData?.url ? (
            <VideoView style={styles.video} player={player} allowsFullscreen allowsPictureInPicture />
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
        </View>

        {/* Content Details Body */}
        <View style={styles.contentPadding}>
          {/* Title & Subtitle */}
          <Text style={styles.videoTitle}>
            {videoData?.title || 'Session Video'}
          </Text>
          {videoData?.module_name ? (
            <Text style={styles.moduleSubtitle}>
              {videoData.module_name}
            </Text>
          ) : null}

          {/* Warning Banner */}
          <View style={styles.warningBanner}>
            <Icon name="warning-outline" size={20} color="#D97706" style={{ marginRight: 10 }} />
            <Text style={styles.warningBannerText}>
              DOWNLOADING OR DISTRIBUTING THIS CONTENT IS STRICTLY PROHIBITED.
            </Text>
          </View>

          {/* Attached Notes Card */}
          {notesUrl && (
            <View style={styles.notesCard}>
              <View style={styles.notesCardHeaderRow}>
                <View style={styles.pdfIconCircle}>
                  <Icon name="document-text-outline" size={22} color="#1A1A1A" />
                </View>
                <View style={styles.notesTitleContainer}>
                  <Text style={styles.notesCardTitle}>Attached Notes</Text>
                  <Text style={styles.notesCardSubtitle}>PDF Document</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewNotesButton}
                activeOpacity={0.8}
                onPress={() => Linking.openURL(notesUrl)}
              >
                <Icon name="download-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.viewNotesButtonText}>View Notes (PDF)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Session Overview Section */}
          <Text style={styles.sectionTitle}>Session Overview</Text>
          <Text style={styles.overviewParagraph}>
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
  topHeaderBar: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  backBtn: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    ...FONTS.bold,
  },
  scrollContent: {
    flex: 1,
  },
  videoContainer: {
    width: '100%',
    height: 230,
    backgroundColor: '#000000',
  },
  video: {
    width: '100%',
    height: '100%',
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
    marginBottom: SPACING.lg,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.xl,
  },
  warningBannerText: {
    flex: 1,
    color: '#B45309',
    fontSize: 11.5,
    ...FONTS.bold,
    letterSpacing: 0.3,
    lineHeight: 16,
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

