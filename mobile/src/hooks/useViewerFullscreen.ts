import { useCallback, useEffect, useRef, useState } from 'react';
import { BackHandler, Platform, View } from 'react-native';
import * as Orientation from 'expo-screen-orientation';

/** Expand the existing viewer so its player, page and progress never remount. */
export default function useViewerFullscreen(landscape = false) {
  const host = useRef<View>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const exit = useCallback(() => {
    if (Platform.OS === 'web' && document.fullscreenElement === (host.current as unknown as Element)) void document.exitFullscreen().catch(() => {});
    setFullscreen(false);
  }, []);
  const enter = useCallback(() => {
    setFullscreen(true);
    if (Platform.OS === 'web') {
      const element = host.current as unknown as HTMLElement;
      // Browsers without the API still get an edge-to-edge viewer with an exit control.
      if (element?.requestFullscreen) void element.requestFullscreen().catch(() => {});
    }
  }, []);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const changed = () => { if (!document.fullscreenElement) setFullscreen(false); };
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') exit(); };
    document.addEventListener('fullscreenchange', changed); window.addEventListener('keydown', key);
    return () => { document.removeEventListener('fullscreenchange', changed); window.removeEventListener('keydown', key); if (document.fullscreenElement === (host.current as unknown as Element)) void document.exitFullscreen().catch(() => {}); };
  }, [exit]);
  useEffect(() => {
    if (!fullscreen || Platform.OS === 'web') return;
    let active = true, previous = Orientation.OrientationLock.PORTRAIT_UP;
    const restore = () => Orientation.lockAsync(previous).catch(() => {});
    const rotation = (async () => {
      try {
        previous = await Orientation.getOrientationLockAsync();
        if (active) await Orientation.lockAsync(landscape ? Orientation.OrientationLock.LANDSCAPE : Orientation.OrientationLock.DEFAULT);
      } catch { /* Fullscreen still works on devices with fixed display orientation. */ }
    })();
    const back = BackHandler.addEventListener('hardwareBackPress', () => { exit(); return true; });
    return () => { active = false; back.remove(); void rotation.then(restore); };
  }, [fullscreen, landscape, exit]);
  return { host, fullscreen, enter, exit, toggle: fullscreen ? exit : enter };
}
