import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import YoutubeIframe, { YoutubeIframeRef } from 'react-native-youtube-iframe';
import { allowLessonPlayerNavigation } from '../../utils/lessonPlayback';
import { LessonYouTubeHandle, LessonYouTubeProps } from './LessonYouTubePlayer.types';

export default forwardRef<LessonYouTubeHandle, LessonYouTubeProps>(function LessonYouTubePlayer(props, ref) {
  const iframe = useRef<YoutubeIframeRef>(null);
  const callbacks = useRef(props);
  callbacks.current = props;
  const [ready, setReady] = useState(false);
  useImperativeHandle(ref, () => ({ seekTo: seconds => iframe.current?.seekTo(seconds, true) }), []);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    let busy = false;
    const interval = setInterval(async () => {
      if (busy || !iframe.current) return;
      busy = true;
      try {
        const result = await Promise.race([
          Promise.all([iframe.current.getCurrentTime(), iframe.current.getDuration()]),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 3000)),
        ]);
        if (active && result) callbacks.current.onProgress(result[0], result[1]);
      } catch {
        if (active) callbacks.current.onError();
      } finally { busy = false; }
    }, 1000);
    return () => { active = false; clearInterval(interval); };
  }, [ready]);
  return <YoutubeIframe
    ref={iframe}
    height={props.height}
    videoId={props.videoId}
    play={props.playing}
    mute={props.muted}
    onReady={() => { setReady(true); props.onReady(); }}
    onError={props.onError}
    onChangeState={(state: string) => {
      if (state === 'playing') props.onPlaying(true);
      if (state === 'paused' || state === 'ended') props.onPlaying(false);
    }}
    initialPlayerParams={{ controls: false, preventFullScreen: true, rel: false, start: props.startTime }}
    webViewProps={{
      onShouldStartLoadWithRequest: (request: { url: string }) => allowLessonPlayerNavigation(request.url),
      onOpenWindow: () => {},
      setSupportMultipleWindows: false,
      allowsFullscreenVideo: false,
      allowsPictureInPictureMediaPlayback: false,
      allowsBackForwardNavigationGestures: false,
      onFileDownload: () => {},
      onError: props.onError,
    }}
  />;
});
