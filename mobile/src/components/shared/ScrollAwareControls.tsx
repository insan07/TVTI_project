import React, { createContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import type { ScrollAwareController } from '../../hooks/useScrollAwareControls';

export const ScrollControlsFocusContext = createContext<{ onFocus: () => void; onBlur: () => void } | null>(null);

/** Measures natural content height so filters never clip and leave no gap when hidden. */
export default function ScrollAwareControls({ controls, children }: { controls: ScrollAwareController; children: React.ReactNode }) {
  const [height, setHeight] = useState<number | null>(null);
  const [hidden, setHidden] = useState(false);
  const hiddenRef = useRef(false);
  useEffect(() => {
    const listener = controls.progress.addListener(({ value }) => {
      const next = value <= 0;
      if (next !== hiddenRef.current) { hiddenRef.current = next; setHidden(next); }
    });
    return () => controls.progress.removeListener(listener);
  }, [controls.progress]);
  const focusHandlers = useMemo(() => ({ onFocus: controls.onFocus, onBlur: controls.onBlur }), [controls.onFocus, controls.onBlur]);
  const animatedStyle = useMemo(() => ({
    maxHeight: height === null ? undefined : controls.progress.interpolate({ inputRange: [0, 1], outputRange: [0, height] }),
    opacity: controls.progress,
    transform: [{ translateY: controls.progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }) }],
  }), [height, controls.progress]);
  return <ScrollControlsFocusContext.Provider value={focusHandlers}>
    <Animated.View testID="scroll-aware-controls" pointerEvents={hidden ? 'none' : 'auto'} accessibilityElementsHidden={hidden} importantForAccessibility={hidden ? 'no-hide-descendants' : 'auto'} aria-hidden={hidden}
      style={[styles.clip, animatedStyle]}>
      <View style={styles.content} onLayout={event => { const next = Math.ceil(event.nativeEvent.layout.height); if (next > 0) setHeight(previous => previous === next ? previous : next); }}>{children}</View>
    </Animated.View>
  </ScrollControlsFocusContext.Provider>;
}
const styles = StyleSheet.create({ clip: { width: '100%', flexShrink: 0, overflow: 'hidden' }, content: { width: '100%', flexShrink: 0 } });
