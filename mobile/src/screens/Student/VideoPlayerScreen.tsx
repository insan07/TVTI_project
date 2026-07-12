import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Linking } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import YoutubeIframe from 'react-native-youtube-iframe';
import api from '../../services/api';
import { useRoute } from '@react-navigation/native';

import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';

export default function VideoPlayerScreen() {
  const route = useRoute<any>();
  const { videoId } = route.params;

  const [videoData, setVideoData] = useState<any>(null);
  const [notesUrl, setNotesUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const player = useVideoPlayer('', p => {
    p.loop = false;
  });

  useEffect(() => {
    if (videoData?.url && videoData.type !== 'youtube') {
      player.replace(videoData.url);
    }
  }, [videoData?.url]);

  useEffect(() => {
    fetchVideoData();
  }, [videoId]);

  const fetchVideoData = async () => {
    setLoading(true);
    try {
      const [streamRes, notesRes] = await Promise.allSettled([
        api.get(`/students/videos/${videoId}/stream-url`),
        api.get(`/students/videos/${videoId}/notes-url`)
      ]);

      if (streamRes.status === 'fulfilled') {
        setVideoData(streamRes.value.data);
      } else {
        Alert.alert('Error', 'Unable to load video. Ensure you are enrolled.');
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
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;
  if (!videoData) return <View style={styles.center}><Text style={styles.errorText}>Failed to load video</Text></View>;

  const yTId = videoData.type === 'youtube' ? getYoutubeId(videoData.url) : null;

  return (
    <View style={styles.container}>
      <View style={styles.videoContainer}>
        {videoData.type === 'youtube' && yTId ? (
          <YoutubeIframe height={250} videoId={yTId} />
        ) : (
          <VideoView style={styles.video} player={player} allowsFullscreen allowsPictureInPicture />
        )}
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.title}>Session Video</Text>
        <Text style={styles.warningText}>Downloading or distributing this content is strictly prohibited.</Text>

        {notesUrl && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>Attached Notes</Text>
            <TouchableOpacity style={styles.notesBtn} onPress={() => Linking.openURL(notesUrl)}>
              <Text style={styles.notesBtnText}>View Notes (PDF)</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { color: COLORS.textMuted, ...FONTS.regular },
  videoContainer: { width: '100%', height: 250, backgroundColor: '#000' },
  video: { width: '100%', height: '100%' },
  detailsContainer: { flex: 1, backgroundColor: COLORS.surface, padding: SPACING.xl },
  title: { fontSize: 20, ...FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  warningText: { color: COLORS.error, fontSize: 12, fontStyle: 'italic', marginBottom: SPACING.xl },
  notesSection: { marginTop: SPACING.xl, padding: SPACING.lg, backgroundColor: COLORS.surfaceAlt, borderRadius: RADIUS.md },
  notesTitle: { fontSize: 16, ...FONTS.bold, color: COLORS.textPrimary, marginBottom: SPACING.md },
  notesBtn: { backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: RADIUS.md, alignItems: 'center' },
  notesBtnText: { color: COLORS.textOnPrimary, ...FONTS.bold }
});
