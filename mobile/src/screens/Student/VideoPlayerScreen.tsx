import React, { useState, useEffect, useRef, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, Pressable, ScrollView, Platform, AppState } from 'react-native';
import LessonVideoPlayer from '../../components/student/LessonVideoPlayer';
import { LessonVideoHandle } from '../../components/student/LessonVideoPlayer.types';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../../services/api';
import { COLORS, FONTS } from '../../config/theme';
import ScreenHeader from '../../components/shared/ScreenHeader';
import ScreenBackground from '../../components/shared/ScreenBackground';
import { useTheme } from '../../context/ThemeContext';
import { AuthContext } from '../../context/AuthContext';
import LessonYouTubePlayer from '../../components/student/LessonYouTubePlayer';
import { LessonYouTubeHandle } from '../../components/student/LessonYouTubePlayer.types';
import { youtubeVideoId, playbackTime } from '../../utils/lessonPlayback';
import { enableNativeScreenCaptureProtection, disableNativeScreenCaptureProtection, subscribeToScreenCaptureEvents } from '../../utils/screenCaptureProtection';

type Lesson = { url: string; type: 'youtube' | 'video'; title?: string; topic?: string };

export default function VideoPlayerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const auth = useContext(AuthContext);
  const videoId = route.params?.videoId;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [notesUrl, setNotesUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [protectionAttempt, setProtectionAttempt] = useState(0);
  const [protection, setProtection] = useState<'waiting' | 'ready' | 'failed'>('waiting');
  const [focused, setFocused] = useState(false);
  const [lockReason, setLockReason] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [width, setWidth] = useState(0);
  const [seekWidth, setSeekWidth] = useState(0);
  const videoView = useRef<LessonVideoHandle>(null);
  const youtube = useRef<LessonYouTubeHandle>(null);
  const focusedRef = useRef(false);
  const lockedRef = useRef(false);
  const timeRef = useRef(0);
  const isYoutube = lesson?.type === 'youtube';
  const youtubeId = isYoutube && lesson ? youtubeVideoId(lesson.url) : null;
  const allowed = focused && protection === 'ready' && !lockReason && !error;
  const allowedRef = useRef(false);
  allowedRef.current = allowed;
  const height = Math.max(isYoutube ? 200 : 180, width * 9 / 16);
  const foreground = isDark ? '#F5F5F5' : COLORS.primary;
  const secondary = isDark ? '#A5A5A5' : '#707070';
  const border = isDark ? '#303030' : '#E8E8E8';

  const pauseAndLock = useCallback((reason: string) => {
    lockedRef.current = true;
    videoView.current?.pause();
    setPlaying(false);
    setReady(false);
    setLockReason(reason);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    focusedRef.current = true;
    setFocused(true);
    setProtection('waiting');
    enableNativeScreenCaptureProtection().then(success => {
      if (active) setProtection(success ? 'ready' : 'failed');
    }).catch(() => { if (active) setProtection('failed'); });
    const unsubscribe = subscribeToScreenCaptureEvents(pauseAndLock);
    return () => {
      active = false;
      focusedRef.current = false;
      setFocused(false);
      videoView.current?.pause();
      setPlaying(false);
      unsubscribe();
      void disableNativeScreenCaptureProtection();
    };
  }, [pauseAndLock, protectionAttempt]));

  useEffect(() => {
    let active = true;
    videoView.current?.pause();
    setPlaying(false);
    setReady(false);
    setTime(0);
    timeRef.current = 0;
    setDuration(0);
    setLesson(null);
    setNotesUrl(null);
    setError(null);
    setLoading(true);
    if (!videoId) {
      setLoading(false);
      setError('Choose a lesson from Uploads to start watching.');
      return () => { active = false; };
    }
    Promise.allSettled([
      api.get(`/students/videos/${videoId}/stream-url`),
      api.get(`/students/videos/${videoId}/notes-url`),
    ]).then(([stream, notes]) => {
      if (!active) return;
      if (stream.status === 'fulfilled' && stream.value.data?.url) {
        const data = stream.value.data;
        if (data.type === 'youtube' && !youtubeVideoId(data.url)) setError('This video link is unavailable. Please contact your instructor.');
        else setLesson(data);
      } else {
        const status = stream.status === 'rejected' ? stream.reason?.response?.status : null;
        setError(status === 403 ? 'This lesson is available to enrolled students only.' : 'We could not load this lesson. Check your connection and try again.');
      }
      if (notes.status === 'fulfilled') setNotesUrl(notes.value.data?.url || null);
      setLoading(false);
    });
    return () => { active = false; };
  }, [videoId, reload]);

  const seek = (seconds: number) => {
    if (!allowed || !ready || !duration) return;
    const target = Math.min(duration, Math.max(0, seconds));
    if (isYoutube) youtube.current?.seekTo(target); else videoView.current?.seekTo(target);
    timeRef.current = target;
    setTime(target);
  };
  const togglePlay = () => {
    if (!allowed || !ready || lockedRef.current) return;
    if (isYoutube) {
      if (!playing && duration && time >= duration - 0.25) seek(0);
      setPlaying(!playing);
    } else {
      if (playing) videoView.current?.pause();
      else { if (duration && time >= duration - 0.25) videoView.current?.seekTo(0); videoView.current?.play(); }
    }
  };
  const resume = () => {
    if (!focusedRef.current || AppState.currentState === 'background' || AppState.currentState === 'inactive') return;
    if (Platform.OS === 'web' && document.visibilityState !== 'visible') return;
    lockedRef.current = false;
    setLockReason(null);
    // Resuming restores the player; the student explicitly presses Play.
  };
  const control = (name: React.ComponentProps<typeof Icon>['name'], label: string, onPress: () => void, primary = false) => (
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={!allowed || !ready}
      onPress={onPress} style={[styles.control, primary && styles.play, (!allowed || !ready) && styles.disabled]}>
      <Icon name={name} size={primary ? 22 : 21} color={primary ? '#FFFFFF' : foreground} />
    </TouchableOpacity>
  );
  const identity = auth?.user?.index_number || auth?.user?.name || 'TVTI Student';

  return <View style={[styles.screen, { backgroundColor: isDark ? '#111111' : '#F7F7F7' }]}>
    <ScreenBackground />
    <View style={{ paddingTop: insets.top }}><ScreenHeader title="Watch lesson" showBack /></View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, { backgroundColor: isDark ? '#1B1B1B' : '#FFFFFF', borderColor: border }]}
        onLayout={event => setWidth(Math.max(0, event.nativeEvent.layout.width - 2))}>
        <View style={[styles.viewport, { height }]} {...(Platform.OS === 'web' ? { onContextMenu: (event: any) => event.preventDefault() } : {})}>
          {loading || protection === 'waiting' ? <View style={styles.center}><ActivityIndicator color={COLORS.secondary} size="large" /></View>
            : protection === 'failed' ? <View style={styles.message}>
              <Icon name="shield-outline" size={30} color={COLORS.secondary} />
              <Text style={styles.messageTitle}>Protection unavailable</Text>
              <Text style={styles.messageText}>Reopen the app or try again to watch this lesson securely.</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => setProtectionAttempt(value => value + 1)} style={styles.messageButton}><Text style={styles.buttonText}>Try again</Text></TouchableOpacity>
            </View>
            : error ? <View style={styles.message}>
              <Icon name="play-circle-outline" size={32} color={COLORS.secondary} />
              <Text style={styles.messageTitle}>Lesson unavailable</Text>
              <Text style={styles.messageText}>{error}</Text>
              {!!videoId && <TouchableOpacity accessibilityRole="button" onPress={() => setReload(value => value + 1)} style={styles.messageButton}><Text style={styles.buttonText}>Try again</Text></TouchableOpacity>}
            </View>
            : lockReason ? <View style={styles.message}>
              <Icon name="pause-circle-outline" size={32} color={COLORS.secondary} />
              <Text style={styles.messageTitle}>Lesson paused</Text>
              <Text style={styles.messageText}>{lockReason}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={resume} style={styles.messageButton}><Text style={styles.buttonText}>Return to lesson</Text></TouchableOpacity>
            </View>
            : allowed && lesson ? isYoutube && youtubeId ? <LessonYouTubePlayer key={`${videoId}-${reload}`} ref={youtube}
              videoId={youtubeId} height={height} playing={playing} muted={muted} startTime={timeRef.current}
              onReady={() => setReady(true)} onPlaying={value => {
                if (!allowedRef.current || lockedRef.current) { setPlaying(false); return; }
                setPlaying(value);
              }} onProgress={(seconds, total) => { timeRef.current = seconds; setTime(seconds); setDuration(total); }}
              onError={() => { setPlaying(false); setError('This YouTube lesson is unavailable or cannot be embedded. Please contact your instructor.'); }} />
              : <>
                <LessonVideoPlayer ref={videoView} url={lesson.url} startTime={timeRef.current} muted={muted}
                  onReady={() => setReady(true)} onPlaying={value => {
                    if (value && (!allowedRef.current || lockedRef.current)) { videoView.current?.pause(); return; }
                    setPlaying(value);
                  }} onProgress={(seconds, total) => { timeRef.current = seconds; setTime(seconds); setDuration(total); }}
                  onError={() => { setPlaying(false); setError('This video could not be played. Please try again.'); }}
                  onRestrictedAction={pauseAndLock} />
                <View pointerEvents="none" style={styles.watermark}><Text style={styles.watermarkText}>TVTI · {identity}</Text></View>
                {!ready && <View pointerEvents="none" style={styles.center}><ActivityIndicator color={COLORS.secondary} /></View>}
              </> : null}
        </View>
        <View style={styles.details}>
          <View style={styles.controls}>
            {control(playing ? 'pause' : 'play', playing ? 'Pause lesson' : 'Play lesson', togglePlay, true)}
            {control('play-back-outline', 'Rewind 10 seconds', () => seek(time - 10))}
            {control('play-forward-outline', 'Forward 10 seconds', () => seek(time + 10))}
            <Text style={[styles.time, { color: secondary }]}>{playbackTime(time)} / {playbackTime(duration)}</Text>
            {control(muted ? 'volume-mute-outline' : 'volume-high-outline', muted ? 'Unmute lesson' : 'Mute lesson', () => { videoView.current?.setMuted(!muted); setMuted(!muted); })}
          </View>
          {Platform.OS === 'web' ? React.createElement('input', {
            type: 'range', 'aria-label': 'Lesson progress', min: 0, max: duration || 1, step: 0.1, value: time,
            disabled: !allowed || !ready || !duration,
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => seek(Number(event.target.value)),
            style: { width: '100%', height: 28, margin: 0, accentColor: COLORS.secondary, cursor: 'pointer' },
          }) : <Pressable accessibilityRole="adjustable" accessibilityLabel="Lesson progress"
            accessibilityValue={{ min: 0, max: Math.max(1, Math.floor(duration)), now: Math.floor(time) }}
            accessibilityActions={[{ name: 'increment', label: 'Forward 10 seconds' }, { name: 'decrement', label: 'Rewind 10 seconds' }]}
            onAccessibilityAction={event => seek(time + (event.nativeEvent.actionName === 'increment' ? 10 : -10))}
            disabled={!allowed || !ready || !duration} onLayout={event => setSeekWidth(event.nativeEvent.layout.width)}
            onPress={event => { if (seekWidth) seek(event.nativeEvent.locationX / seekWidth * duration); }} style={styles.seekHit}>
            <View pointerEvents="none" style={[styles.track, { backgroundColor: border }]}><View style={[styles.progress, { width: `${duration ? Math.min(100, time / duration * 100) : 0}%` }]} /></View>
          </Pressable>}
          <View style={[styles.lessonInfo, { borderColor: border }]}>
            <Text style={styles.eyebrow} numberOfLines={2}>{lesson?.topic || 'COURSE LESSON'}</Text>
            <Text style={[styles.title, { color: foreground }]}>{lesson?.title || (loading ? 'Loading lesson…' : 'Video lesson')}</Text>
            <View style={styles.privateRow}><Icon name="shield-checkmark-outline" size={14} color={COLORS.secondary} /><Text style={[styles.caption, { color: secondary }]}>Private lesson · TVTI students</Text></View>
          </View>
        </View>
      </View>
      {!!notesUrl && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Open lesson notes" activeOpacity={0.75}
        onPress={() => navigation.navigate('PdfViewer', { pdfUrl: notesUrl, title: lesson?.title ? `${lesson.title} · Notes` : 'Lesson notes' })}
        style={[styles.notes, { backgroundColor: isDark ? '#1B1B1B' : '#FFFFFF', borderColor: border }]}>
        <View style={styles.notesIcon}><Icon name="document-text-outline" size={23} color={COLORS.secondary} /></View>
        <View style={styles.notesCopy}><Text style={[styles.notesTitle, { color: foreground }]}>Lesson notes</Text><Text style={[styles.caption, { color: secondary }]}>Read alongside this lesson</Text></View>
        <Icon name="arrow-forward" size={19} color={foreground} />
      </TouchableOpacity>}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 12, gap: 16, width: '100%', maxWidth: 1040, alignSelf: 'center' },
  card: { borderWidth: 1, borderRadius: 14, overflow: 'hidden' },
  viewport: { backgroundColor: '#080808', overflow: 'hidden' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1, padding: 18, gap: 9, alignItems: 'center', justifyContent: 'center' },
  messageTitle: { ...FONTS.semiBold, color: '#FFFFFF', fontSize: 16 },
  messageText: { ...FONTS.regular, color: '#BBBBBB', fontSize: 12, lineHeight: 18, textAlign: 'center', maxWidth: 420 },
  messageButton: { marginTop: 3, backgroundColor: COLORS.secondary, borderRadius: 7, paddingHorizontal: 17, paddingVertical: 9 },
  buttonText: { ...FONTS.semiBold, color: '#FFFFFF', fontSize: 12 },
  details: { paddingHorizontal: 16 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 12 },
  control: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  play: { backgroundColor: COLORS.secondary, borderRadius: 9, marginRight: 4 },
  disabled: { opacity: 0.4 },
  time: { ...FONTS.medium, fontSize: 11, flex: 1, textAlign: 'right', marginRight: 4, fontVariant: ['tabular-nums'] },
  seekHit: { height: 28, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: COLORS.secondary },
  lessonInfo: { paddingTop: 14, paddingBottom: 20, borderTopWidth: 1, gap: 8 },
  eyebrow: { ...FONTS.semiBold, color: COLORS.secondary, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...FONTS.bold, fontSize: 21, lineHeight: 30 },
  privateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  caption: { ...FONTS.regular, fontSize: 11, lineHeight: 18 },
  watermark: { position: 'absolute', bottom: 12, right: 12, opacity: 0.5 },
  watermarkText: { ...FONTS.medium, color: '#FFFFFF', fontSize: 10 },
  notes: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 1, borderRadius: 12 },
  notesIcon: { width: 42, height: 46, backgroundColor: 'rgba(245,130,32,0.08)', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  notesCopy: { flex: 1, gap: 3 },
  notesTitle: { ...FONTS.semiBold, fontSize: 14 },
});
