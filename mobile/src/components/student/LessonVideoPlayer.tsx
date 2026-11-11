import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LessonVideoHandle, LessonVideoProps } from './LessonVideoPlayer.types';

export default forwardRef<LessonVideoHandle, LessonVideoProps>(function LessonVideoPlayer(props, ref) {
  const latest = useRef(props);
  latest.current = props;
  const player = useVideoPlayer(null, p => {
    p.loop = false;
    p.muted = props.muted;
    p.playbackRate = props.playbackRate;
    p.timeUpdateEventInterval = 0.25;
    p.allowsExternalPlayback = false;
    p.staysActiveInBackground = false;
    p.showNowPlayingNotification = false;
  });
  useImperativeHandle(ref, () => ({
    play: () => player.play(), pause: () => player.pause(),
    seekTo: seconds => { player.currentTime = seconds; },
    setMuted: muted => { player.muted = muted; },
  }), [player]);
  useEffect(() => { player.playbackRate = props.playbackRate; }, [player, props.playbackRate]);
  useEffect(() => {
    let active = true;
    const subscriptions = [
      player.addListener('statusChange', ({ status }) => {
        if (!active) return;
        if (status === 'readyToPlay') latest.current.onReady();
        if (status === 'error') latest.current.onError();
      }),
      player.addListener('playingChange', ({ isPlaying }) => { if (active) latest.current.onPlaying(isPlaying); }),
      player.addListener('sourceLoad', ({ duration }) => {
        if (!active) return;
        player.currentTime = Math.min(latest.current.startTime, duration);
        latest.current.onProgress(player.currentTime, duration);
      }),
      player.addListener('timeUpdate', ({ currentTime }) => { if (active) latest.current.onProgress(currentTime, player.duration); }),
      player.addListener('playToEnd', () => { if (active) latest.current.onPlaying(false); }),
    ];
    player.replaceAsync(props.url).then(() => { if (active) player.pause(); }).catch(() => { if (active) latest.current.onError(); });
    return () => { active = false; player.pause(); subscriptions.forEach(subscription => subscription.remove()); };
  }, [props.url, player]);
  return <VideoView player={player} style={{ width: '100%', height: '100%' }} nativeControls={false}
    contentFit="contain" fullscreenOptions={{ enable: false }} allowsPictureInPicture={false}
    startsPictureInPictureAutomatically={false} surfaceType="textureView" />;
});
