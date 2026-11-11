import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { LessonYouTubeHandle, LessonYouTubeProps } from './LessonYouTubePlayer.types';

// Use the supported IFrame API directly on web: the library's web shim ignores
// navigation restrictions and does not implement its imperative playback methods.
export default forwardRef<LessonYouTubeHandle, LessonYouTubeProps>(function LessonYouTubePlayer(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<any>(null);
  const latest = useRef(props);
  latest.current = props;
  useImperativeHandle(ref, () => ({ seekTo: seconds => player.current?.seekTo(seconds, true) }), []);
  useEffect(() => {
    let active = true;
    let progress: ReturnType<typeof setInterval> | undefined;
    let initialized = false;
    let hasReady = false;
    const frame = document.createElement('iframe');
    const params = new URLSearchParams({ enablejsapi: '1', origin: window.location.origin,
      controls: '0', fs: '0', disablekb: '1', playsinline: '1', rel: '0', start: String(Math.floor(props.startTime)) });
    frame.title = 'Lesson video';
    // No popups, downloads, fullscreen, or top-level navigation permissions.
    // Provider branding stays visible; it must not be obscured by overlays.
    frame.sandbox.add('allow-scripts', 'allow-same-origin');
    frame.allow = 'autoplay; encrypted-media';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.style.cssText = 'width:100%;height:100%;border:0;display:block';
    frame.src = `https://www.youtube.com/embed/${props.videoId}?${params}`;
    host.current?.appendChild(frame);
    if (!(window as any).YT?.Player && !document.getElementById('tvti-youtube-api')) {
      const script = document.createElement('script');
      script.id = 'tvti-youtube-api';
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
    const bootstrap = setInterval(() => {
      if (!active || initialized || !(window as any).YT?.Player) return;
      initialized = true;
      clearInterval(bootstrap);
      player.current = new (window as any).YT.Player(frame, { events: {
        onReady: () => {
          if (!active) return;
          hasReady = true;
          latest.current.onReady();
          latest.current.onRates(player.current.getAvailablePlaybackRates?.() || [1]);
          player.current.setPlaybackRate?.(latest.current.playbackRate);
          if (latest.current.muted) player.current.mute();
          if (latest.current.playing) player.current.playVideo();
          progress = setInterval(() => {
            if (active && player.current?.getCurrentTime) {
              latest.current.onProgress(player.current.getCurrentTime(), player.current.getDuration());
            }
          }, 500);
        },
        onStateChange: ({ data }: { data: number }) => {
          if (!active) return;
          if (data === 1) latest.current.onPlaying(true);
          if (data === 0 || data === 2) latest.current.onPlaying(false);
        },
        onError: () => { if (active) latest.current.onError(); },
        onPlaybackRateChange: ({ data }: { data: number }) => { if (active) latest.current.onRateChange(data); },
      } });
    }, 100);
    const timeout = setTimeout(() => {
      if (active && !hasReady) latest.current.onError();
    }, 20000);
    return () => {
      active = false;
      clearInterval(bootstrap);
      clearInterval(progress);
      clearTimeout(timeout);
      player.current?.destroy?.();
      player.current = null;
      frame.remove();
    };
  }, [props.videoId]);
  useEffect(() => {
    const current = player.current;
    if (!current?.playVideo) return;
    if (props.playing) current.playVideo(); else current.pauseVideo();
  }, [props.playing]);
  useEffect(() => {
    const current = player.current;
    if (!current?.mute) return;
    if (props.muted) current.mute(); else current.unMute();
  }, [props.muted]);
  useEffect(() => { player.current?.setPlaybackRate?.(props.playbackRate); }, [props.playbackRate]);
  return React.createElement('div', { ref: host, style: { width: '100%', height: props.height } });
});
