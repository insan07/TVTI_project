import { useCallback, useEffect, useRef } from 'react';
import { Animated, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

/** The My Students interaction: 220 ms collapse on down-scroll, reveal on up-scroll. */
export default function useScrollAwareControls(resetKey?: unknown) {
  const progress = useRef(new Animated.Value(1)).current;
  const shown = useRef(true), focused = useRef(false), lastY = useRef(0);
  const animate = useCallback((next: boolean) => {
    if (shown.current === next) return;
    shown.current = next;
    // Like My Students, reverse immediately from the current animated value.
    // Keep visibility in a ref so scrolling never rerenders the screen or its list.
    Animated.timing(progress, { toValue: next ? 1 : 0, duration: 220, useNativeDriver: false }).start();
  }, [progress]);
  const show = useCallback(() => { animate(true); }, [animate]);
  const onFocus = useCallback(() => { focused.current = true; show(); }, [show]);
  const onBlur = useCallback(() => { focused.current = false; }, []);
  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (focused.current) return;
    const y = event.nativeEvent.contentOffset.y, delta = y - lastY.current;
    if (y <= 15) animate(true);
    else if (delta > 8 && y > 35) animate(false);
    else if (delta < -8) animate(true);
    lastY.current = y;
  }, [animate]);
  useEffect(show, [resetKey, show]);
  useFocusEffect(useCallback(() => {
    progress.stopAnimation(); progress.setValue(1); shown.current = true; lastY.current = 0;
    return () => { focused.current = false; progress.stopAnimation(); };
  }, [progress]));
  return { progress, onScroll, onFocus, onBlur, show };
}

export type ScrollAwareController = ReturnType<typeof useScrollAwareControls>;
