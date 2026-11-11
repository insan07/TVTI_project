import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, Platform, AppState, Modal, Pressable } from 'react-native';
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
import LessonYouTubePlayer from '../../components/student/LessonYouTubePlayer';
import { LessonYouTubeHandle } from '../../components/student/LessonYouTubePlayer.types';
import { youtubeVideoId, playbackTime, DEFAULT_PLAYBACK_SPEEDS, availablePlaybackSpeeds } from '../../utils/lessonPlayback';
import { enableNativeScreenCaptureProtection, disableNativeScreenCaptureProtection, subscribeToScreenCaptureEvents } from '../../utils/screenCaptureProtection';

type Lesson = { url: string; type: 'youtube' | 'video'; title?: string; topic?: string };

export default function VideoPlayerScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
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
  const [overlayVisible, setOverlayVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [youtubeRates, setYoutubeRates] = useState([1]);
  const [speedOpen, setSpeedOpen] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [width, setWidth] = useState(0);
  const [seekWidth, setSeekWidth] = useState(0);
  const seeking = useRef(false);
  const pendingSeek = useRef<{ target: number; at: number } | null>(null);
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

  useEffect(() => { if (!playing) setOverlayVisible(true); }, [playing]);
  useEffect(() => {
    if (!playing || !overlayVisible) return;
    const timer = setTimeout(() => setOverlayVisible(false), 2000);
    return () => clearTimeout(timer);
  }, [playing, overlayVisible]);

  const pauseAndLock = useCallback((reason: string) => {
    lockedRef.current = true;
    videoView.current?.pause();
    setPlaying(false);
    setReady(false);
    setSpeedOpen(false);
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
    setPlaybackRate(1);
    setYoutubeRates([1]);
    timeRef.current = 0;
    pendingSeek.current = null;
    seeking.current = false;
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

  const updateProgress = (seconds: number, total: number) => {
    if (Number.isFinite(total) && total > 0) setDuration(total);
    if (!Number.isFinite(seconds) || seeking.current) return;
    const pending = pendingSeek.current;
    if (pending && Date.now() - pending.at < 1800 && Math.abs(seconds - pending.target) > 1.5) return;
    pendingSeek.current = null;
    timeRef.current = seconds;
    setTime(seconds);
  };
  const seek = (seconds: number) => {
    if (!allowed || !ready || !duration) return;
    if (!Number.isFinite(seconds)) return;
    const target = Math.min(duration, Math.max(0, seconds));
    pendingSeek.current = { target, at: Date.now() };
    if (isYoutube) youtube.current?.seekTo(target); else videoView.current?.seekTo(target);
    timeRef.current = target;
    setTime(target);
  };
  const togglePlay = () => {
    if (!allowed || !ready || lockedRef.current) return;
    if (isYoutube) {
      if (!playing && duration && time >= duration) seek(0);
      setPlaying(!playing);
    } else {
      if (playing) videoView.current?.pause();
      else { if (duration && time >= duration) videoView.current?.seekTo(0); videoView.current?.play(); }
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
      <Icon name={name} size={primary ? 26 : 21} color={primary ? '#FFFFFF' : foreground} />
    </TouchableOpacity>
  );

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
              videoId={youtubeId} height={height} playing={playing} muted={muted} startTime={timeRef.current} playbackRate={playbackRate}
              onRates={rates => setYoutubeRates(availablePlaybackSpeeds(rates))}
              onRateChange={rate => { if (Number.isFinite(rate) && rate > 0) setPlaybackRate(rate); }}
              onReady={() => setReady(true)} onPlaying={value => {
                if (!allowedRef.current || lockedRef.current) { setPlaying(false); return; }
                setPlaying(value);
              }} onProgress={updateProgress}
              onError={() => { setPlaying(false); setError('This YouTube lesson is unavailable or cannot be embedded. Please contact your instructor.'); }} />
              : <>
                <LessonVideoPlayer ref={videoView} url={lesson.url} startTime={timeRef.current} muted={muted} playbackRate={playbackRate}
                  onReady={() => setReady(true)} onPlaying={value => {
                    if (value && (!allowedRef.current || lockedRef.current)) { videoView.current?.pause(); return; }
                    setPlaying(value);
                  }} onProgress={updateProgress}
                  onError={() => { setPlaying(false); setError('This video could not be played. Please try again.'); }}
                  onRestrictedAction={pauseAndLock} />
                {ready && playing && !overlayVisible && <TouchableOpacity accessibilityRole="button" accessibilityLabel="Show playback controls"
                  style={StyleSheet.absoluteFill} onPress={() => setOverlayVisible(true)} />}
                {ready && (!playing || overlayVisible) && <TouchableOpacity accessibilityRole="button" accessibilityLabel={playing ? 'Pause video' : 'Play video'}
                  onPress={togglePlay} activeOpacity={0.85} style={styles.centerPlay}>
                  <Icon name={playing ? 'pause' : 'play'} size={30} color="#FFFFFF" />
                </TouchableOpacity>}
                {!ready && <View pointerEvents="none" style={styles.center}><ActivityIndicator color={COLORS.secondary} /></View>}
              </> : null}
        </View>
        <View style={styles.details}>
          <View style={styles.controls}>
            <View style={styles.controlsSpacer} />
            {control('play-back-outline', 'Rewind 10 seconds', () => seek(time - 10))}
            {control(playing ? 'pause' : 'play', playing ? 'Pause lesson' : 'Play lesson', togglePlay, true)}
            {control('play-forward-outline', 'Forward 10 seconds', () => seek(time + 10))}
            {control(muted ? 'volume-mute-outline' : 'volume-high-outline', muted ? 'Unmute lesson' : 'Mute lesson', () => { videoView.current?.setMuted(!muted); setMuted(!muted); })}
          </View>
          <View style={styles.timelineMeta}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Playback speed: ${playbackRate}x`}
              disabled={!allowed || !ready} onPress={() => setSpeedOpen(true)} style={[styles.speedButton, { borderColor: border }, (!allowed || !ready) && styles.disabled]}>
              <Text style={[styles.speedLabel, { color: foreground }]}>{playbackRate}×</Text><Icon name="chevron-down" size={12} color={secondary} />
            </TouchableOpacity>
            <Text style={[styles.time, { color: secondary }]}>{playbackTime(time)} / {playbackTime(duration)}</Text>
          </View>
          {Platform.OS === 'web' ? React.createElement('input', {
            type: 'range', 'aria-label': 'Lesson progress', min: 0, max: duration || 1, step: 0.1, value: time,
            disabled: !allowed || !ready || !duration,
            onPointerDown: () => { seeking.current = true; },
            onPointerUp: () => { seeking.current = false; },
            onPointerCancel: () => { seeking.current = false; },
            onBlur: () => { seeking.current = false; },
            onChange: (event: React.ChangeEvent<HTMLInputElement>) => seek(Number(event.target.value)),
            style: { width: '100%', height: 28, margin: 0, accentColor: COLORS.secondary, cursor: 'pointer' },
          }) : <View accessible accessibilityRole="adjustable" accessibilityLabel="Lesson progress"
            accessibilityValue={{ min: 0, max: Math.max(1, Math.floor(duration)), now: Math.floor(time) }}
            accessibilityActions={[{ name: 'increment', label: 'Forward 10 seconds' }, { name: 'decrement', label: 'Rewind 10 seconds' }]}
            onAccessibilityAction={event => seek(time + (event.nativeEvent.actionName === 'increment' ? 10 : -10))}
            onStartShouldSetResponder={() => !!(allowed && ready && duration)} onMoveShouldSetResponder={() => !!(allowed && ready && duration)}
            onResponderGrant={event => { seeking.current = true; if (seekWidth) seek(event.nativeEvent.locationX / seekWidth * duration); }}
            onResponderMove={event => { if (seekWidth) seek(event.nativeEvent.locationX / seekWidth * duration); }}
            onResponderRelease={event => { if (seekWidth) seek(event.nativeEvent.locationX / seekWidth * duration); seeking.current = false; }}
            onResponderTerminate={() => { seeking.current = false; }} onLayout={event => setSeekWidth(event.nativeEvent.layout.width)}
            style={styles.seekHit}>
            <View pointerEvents="none" style={[styles.track, { backgroundColor: border }]}><View style={[styles.progress, { width: `${duration ? Math.min(100, time / duration * 100) : 0}%` }]} /></View>
          </View>}
          <View style={[styles.lessonInfo, { borderColor: border }]}>
            <Text style={styles.eyebrow} numberOfLines={2}>{lesson?.topic || 'COURSE LESSON'}</Text>
            <Text style={[styles.title, { color: foreground }]}>{lesson?.title || (loading ? 'Loading lesson…' : 'Video lesson')}</Text>
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
    <Modal visible={speedOpen && allowed} transparent animationType="fade" onRequestClose={() => setSpeedOpen(false)}>
      <View style={styles.speedBackdrop}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Close playback speed" onPress={() => setSpeedOpen(false)} />
        <View accessibilityViewIsModal style={[styles.speedMenu, { backgroundColor: isDark ? '#1B1B1B' : '#FFFFFF', borderColor: border }]}>
          <View style={styles.speedMenuHeader}><Text style={[styles.speedMenuTitle, { color: foreground }]}>Playback speed</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Close speed menu" onPress={() => setSpeedOpen(false)} style={styles.control}><Icon name="close" size={21} color={foreground} /></TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 340 }}>
            {(isYoutube ? youtubeRates : DEFAULT_PLAYBACK_SPEEDS).map(rate => <TouchableOpacity key={rate} accessibilityRole="radio"
              accessibilityLabel={rate === 1 ? 'Normal speed, 1x' : `${rate}x speed`} accessibilityState={{ checked: playbackRate === rate }}
              onPress={() => { setPlaybackRate(rate); setSpeedOpen(false); }} style={[styles.speedOption, { borderColor: border }]}>
              <Text style={[styles.speedOptionLabel, { color: playbackRate === rate ? COLORS.secondary : foreground }]}>{rate === 1 ? 'Normal' : `${rate}×`}</Text>
              {playbackRate === rate && <Icon name="checkmark" size={20} color={COLORS.secondary} />}
            </TouchableOpacity>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
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
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 12 },
  controlsSpacer: { width: 40 },
  centerPlay: { position: 'absolute', top: '50%', left: '50%', marginTop: -29, marginLeft: -29, width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(245,130,32,0.92)', justifyContent: 'center', alignItems: 'center' },
  control: { width: 40, height: 44, alignItems: 'center', justifyContent: 'center' },
  play: { backgroundColor: COLORS.secondary, borderRadius: 12, width: 50, height: 48 },
  disabled: { opacity: 0.4 },
  time: { ...FONTS.medium, fontSize: 11, textAlign: 'right', fontVariant: ['tabular-nums'] },
  timelineMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  speedButton: { flexDirection: 'row', gap: 6, alignItems: 'center', borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, minHeight: 32 },
  speedLabel: { ...FONTS.semiBold, fontSize: 11 },
  speedBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  speedMenu: { width: '100%', maxWidth: 340, borderWidth: 1, borderRadius: 14, paddingHorizontal: 18, paddingBottom: 12 },
  speedMenuHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
  speedMenuTitle: { ...FONTS.semiBold, fontSize: 16 },
  speedOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 46, borderTopWidth: 1 },
  speedOptionLabel: { ...FONTS.medium, fontSize: 14 },
  seekHit: { height: 28, justifyContent: 'center' },
  track: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progress: { height: '100%', backgroundColor: COLORS.secondary },
  lessonInfo: { paddingTop: 14, paddingBottom: 20, borderTopWidth: 1, gap: 8 },
  eyebrow: { ...FONTS.semiBold, color: COLORS.secondary, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  title: { ...FONTS.bold, fontSize: 21, lineHeight: 30 },
  caption: { ...FONTS.regular, fontSize: 11, lineHeight: 18 },
  notes: { flexDirection: 'row', alignItems: 'center', gap: 13, padding: 16, borderWidth: 1, borderRadius: 12 },
  notesIcon: { width: 42, height: 46, backgroundColor: 'rgba(245,130,32,0.08)', alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  notesCopy: { flex: 1, gap: 3 },
  notesTitle: { ...FONTS.semiBold, fontSize: 14 },
});
