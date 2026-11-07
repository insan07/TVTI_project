import { Platform, AppState, AppStateStatus } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';

const PROTECTION_KEY = 'tvti_student_video_drm';

/**
 * Enables native OS-level screen recording and screenshot blocking (Android FLAG_SECURE & iOS UIScreen capture prevention)
 */
export async function enableNativeScreenCaptureProtection(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const expoScreenCapture = requireOptionalNativeModule<any>('ExpoScreenCapture');
    if (expoScreenCapture?.preventScreenCapture) {
      await expoScreenCapture.preventScreenCapture(PROTECTION_KEY);
    }
  } catch (err) {
    // Fallback silent ignore if native module is unavailable in custom runtime
  }
}

/**
 * Releases native OS-level screen recording and screenshot blocking when leaving the protected screen
 */
export async function disableNativeScreenCaptureProtection(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const expoScreenCapture = requireOptionalNativeModule<any>('ExpoScreenCapture');
    if (expoScreenCapture?.allowScreenCapture) {
      await expoScreenCapture.allowScreenCapture(PROTECTION_KEY);
    }
  } catch (err) {
    // Fallback silent ignore
  }
}

/**
 * Hardens an HTML5 <video> DOM element against downloading, Picture-in-Picture, Remote Playback, and right-click saving
 */
export function hardenHtmlVideoElement(videoEl: any, onSecurityTrigger?: (reason: string) => void): void {
  if (!videoEl || Platform.OS !== 'web') return;
  try {
    videoEl.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
    videoEl.setAttribute('disablePictureInPicture', 'true');
    videoEl.setAttribute('disableRemotePlayback', 'true');
    videoEl.disablePictureInPicture = true;
    videoEl.disableRemotePlayback = true;
    videoEl.oncontextmenu = (e: any) => {
      e.preventDefault();
      return false;
    };
    videoEl.ondragstart = (e: any) => {
      e.preventDefault();
      return false;
    };
    videoEl.addEventListener?.('enterpictureinpicture', () => {
      try {
        videoEl.pause?.();
        if (typeof document !== 'undefined' && (document as any).exitPictureInPicture) {
          (document as any).exitPictureInPicture().catch(() => {});
        }
      } catch (_) {}
      onSecurityTrigger?.('Picture-in-Picture is disabled for protected student videos.');
    });
  } catch (_) {}
}

/**
 * Subscribes to native AppState and Web focus/visibility/shortcut/getDisplayMedia events to block 3rd-party recorders
 */
export function subscribeToScreenCaptureEvents(onCaptureAttemptOrBlur: (reason: string) => void, onFocusRestored?: () => void): () => void {
  const cleanups: Array<() => void> = [];

  // 1. Mobile & Cross-Platform AppState listener (triggers when pulling down Control Center/Notification Shade to start a 3rd-party recorder)
  const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState !== 'active') {
      onCaptureAttemptOrBlur('Playback paused while app is in background or system overlay is active.');
    } else {
      onFocusRestored?.();
    }
  });
  cleanups.push(() => appStateSub.remove());

  // 2. Web-specific anti-recording & anti-capture protections
  if (Platform.OS === 'web' && typeof window !== 'undefined' && typeof document !== 'undefined') {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') {
        onCaptureAttemptOrBlur('Playback paused because the video tab lost visibility.');
      }
    };

    const handleWindowBlur = () => {
      // Check if focus moved to an embedded YouTube iframe inside the same page; if so, allow playback
      const activeEl = document.activeElement;
      if (activeEl && activeEl.tagName === 'IFRAME') {
        return;
      }
      onCaptureAttemptOrBlur('Playback paused while window is out of focus to prevent 3rd-party screen recording.');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = (e.key || '').toLowerCase();
      const isPrintScreen = e.key === 'PrintScreen' || e.keyCode === 44;
      const isDevTools =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c', 's', 'r', '3', '4', '5'].includes(key)) ||
        ((e.ctrlKey || e.metaKey) && ['u', 's', 'p'].includes(key)) ||
        (e.metaKey && e.altKey && key === 'r');

      if (isPrintScreen || isDevTools) {
        e.preventDefault();
        e.stopPropagation();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('Screen capture of TVTI student videos is strictly prohibited.').catch(() => {});
          }
        } catch (_) {}
        onCaptureAttemptOrBlur('Screen capture or recording shortcut detected. Video playback has been locked.');
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('Screen capture of TVTI student videos is strictly prohibited.').catch(() => {});
          }
        } catch (_) {}
        onCaptureAttemptOrBlur('Screenshot attempt blocked. Video playback has been locked.');
      }
    };

    // Block browser-based 3rd-party screen capture / tab recording APIs (getDisplayMedia)
    let originalGetDisplayMedia: any = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getDisplayMedia = async () => {
        onCaptureAttemptOrBlur('3rd-party browser screen recording attempt blocked.');
        throw new DOMException('Screen recording of protected course videos is not permitted.', 'NotAllowedError');
      };
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);

    // Continuous document.hasFocus() check (catches Windows Game Bar Win+G, Snipping Tool overlay, macOS Screenshot bar, ShareX)
    const focusInterval = setInterval(() => {
      if (document.visibilityState !== 'visible') {
        onCaptureAttemptOrBlur('Playback paused because the video tab is hidden.');
        return;
      }
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) {
        const activeEl = document.activeElement;
        if (activeEl && activeEl.tagName === 'IFRAME') {
          return;
        }
        onCaptureAttemptOrBlur('System screen-capture overlay or background recorder detected. Playback locked.');
      }
    }, 400);

    cleanups.push(() => {
      clearInterval(focusInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
      if (originalGetDisplayMedia && navigator.mediaDevices) {
        navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
      }
    });
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

