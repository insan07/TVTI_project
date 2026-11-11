import { Platform, AppState } from 'react-native';
import * as ScreenCapture from 'expo-screen-capture';

const PROTECTION_KEY = 'tvti_student_video_drm';
let users = 0;
let protectedScreen = false;
let transition: Promise<unknown> = Promise.resolve();

// Share one native lock across overlapping navigation focus transitions.
export function enableNativeScreenCaptureProtection(): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(true);
  users += 1;
  const pending = transition.then(async () => {
    if (!users) return false;
    if (!protectedScreen) {
      try {
        await ScreenCapture.preventScreenCaptureAsync(PROTECTION_KEY);
        protectedScreen = true;
      } catch { return false; }
      if (Platform.OS === 'ios') {
        try { await ScreenCapture.enableAppSwitcherProtectionAsync(1); } catch { /* Optional app-switcher blur. */ }
      }
    }
    return protectedScreen;
  });
  transition = pending.catch(() => {});
  return pending;
}

export function disableNativeScreenCaptureProtection(): Promise<void> {
  if (Platform.OS === 'web') return Promise.resolve();
  users = Math.max(0, users - 1);
  const pending = transition.then(async () => {
    if (users || !protectedScreen) return;
    try {
      await ScreenCapture.allowScreenCaptureAsync(PROTECTION_KEY);
      protectedScreen = false;
      if (Platform.OS === 'ios') {
        await ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => {});
      }
    } catch { /* Retain the conservative locked state if release fails. */ }
  });
  transition = pending.catch(() => {});
  return pending;
}

/** Removes browser save/cast/PiP controls; this is a UI restriction, not DRM. */
export function hardenHtmlVideoElement(video: any, onRestrictedAction?: (reason: string) => void): () => void {
  if (!video || Platform.OS !== 'web') return () => {};
  video.setAttribute('controlsList', 'nodownload noremoteplayback');
  video.disablePictureInPicture = true;
  video.disableRemotePlayback = true;
  const prevent = (event: any) => event.preventDefault();
  const onPip = () => {
    video.pause();
    if (typeof document !== 'undefined') {
      (document as any).exitPictureInPicture?.().catch(() => {});
    }
    onRestrictedAction?.('Picture-in-Picture is unavailable for this lesson.');
  };
  video.addEventListener('contextmenu', prevent);
  video.addEventListener('dragstart', prevent);
  video.addEventListener('enterpictureinpicture', onPip);
  return () => {
    video.removeEventListener('contextmenu', prevent);
    video.removeEventListener('dragstart', prevent);
    video.removeEventListener('enterpictureinpicture', onPip);
  };
}

/** Observe lifecycle events without claiming to detect other apps' recorders. */
export function subscribeToScreenCaptureEvents(onPause: (reason: string) => void, onFocusRestored?: () => void): () => void {
  const subscription = AppState.addEventListener('change', state => {
    if (state !== 'active') onPause('Playback paused while the app is in the background.');
    else onFocusRestored?.();
  });
  if (Platform.OS !== 'web' || typeof window === 'undefined') return () => subscription.remove();
  const visibility = () => {
    if (document.visibilityState !== 'visible') onPause('Playback paused while this tab is hidden.');
    else onFocusRestored?.();
  };
  const blur = () => {
    // Clicking the embedded player transfers focus to its iframe.
    if (document.activeElement?.tagName !== 'IFRAME') onPause('Playback paused while this window is inactive.');
  };
  const shortcut = (event: KeyboardEvent) => {
    if (event.key === 'PrintScreen' || (event.metaKey && event.shiftKey && ['3', '4', '5'].includes(event.key))) {
      event.preventDefault();
      onPause('Playback paused after a screen capture shortcut.');
    }
  };
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('blur', blur);
  window.addEventListener('focus', onFocusRestored || noop);
  window.addEventListener('keydown', shortcut, true);
  return () => {
    subscription.remove();
    document.removeEventListener('visibilitychange', visibility);
    window.removeEventListener('blur', blur);
    window.removeEventListener('focus', onFocusRestored || noop);
    window.removeEventListener('keydown', shortcut, true);
  };
}
const noop = () => {};
