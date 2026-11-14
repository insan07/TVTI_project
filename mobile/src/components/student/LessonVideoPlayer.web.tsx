import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { hardenHtmlVideoElement } from '../../utils/screenCaptureProtection';
import { LessonVideoHandle, LessonVideoProps } from './LessonVideoPlayer.types';

export default forwardRef<LessonVideoHandle, LessonVideoProps>(function LessonVideoPlayer(props, ref) {
  const video = useRef<HTMLVideoElement>(null);
  const latest = useRef(props);
  latest.current = props;
  useImperativeHandle(ref, () => ({
    play: () => { video.current?.play().catch(() => latest.current.onError()); },
    pause: () => video.current?.pause(),
    seekTo: seconds => { if (video.current) video.current.currentTime = seconds; },
    setMuted: muted => { if (video.current) video.current.muted = muted; },
  }), []);
  useEffect(() => {
    const element = video.current;
    const cleanup = hardenHtmlVideoElement(element, reason => latest.current.onRestrictedAction(reason));
    return () => { element?.pause(); cleanup(); };
  }, []);
  useEffect(() => { if (video.current) video.current.playbackRate = props.playbackRate; }, [props.playbackRate]);
  const progress = () => {
    if (video.current) props.onProgress(video.current.currentTime, Number.isFinite(video.current.duration) ? video.current.duration : 0);
  };
  return React.createElement('video', {
    ref: video, src: props.url, controls: false, playsInline: true, preload: 'metadata', muted: props.muted,
    disablePictureInPicture: true, disableRemotePlayback: true, controlsList: 'nodownload noremoteplayback nofullscreen',
    style: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
    onLoadedMetadata: () => {
      if (video.current) video.current.currentTime = Math.min(props.startTime, video.current.duration || 0);
      progress();
      // Metadata-only preload may never emit canplay until the user starts it.
      props.onReady();
    },
    onCanPlay: props.onReady, onDurationChange: progress, onTimeUpdate: progress,
    onPlay: () => props.onPlaying(true), onPause: () => props.onPlaying(false), onEnded: () => props.onPlaying(false),
    onError: props.onError,
    onContextMenu: (event: React.MouseEvent) => event.preventDefault(),
  });
});
