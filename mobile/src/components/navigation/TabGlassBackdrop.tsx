import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { BlurTargetView } from 'expo-blur';
import { useIsFocused } from '@react-navigation/native';

type BlurTarget = React.RefObject<View | null>;
const BackdropContext = createContext<{
  target?: BlurTarget;
  setTarget: React.Dispatch<React.SetStateAction<BlurTarget | undefined>>;
}>({ setTarget: () => {} });

export function TabGlassBackdropProvider({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<BlurTarget>();
  const value = useMemo(() => ({ target, setTarget }), [target]);
  return <BackdropContext.Provider value={value}>{children}</BackdropContext.Provider>;
}

/** Android blur samples the focused scene, never the tab bar itself. */
export function TabSceneBackdrop({ children }: { children: React.ReactNode }) {
  const ref = useRef<View>(null);
  const focused = useIsFocused();
  const { setTarget } = useContext(BackdropContext);

  useEffect(() => {
    if (Platform.OS !== 'android' || !focused) return;
    setTarget(ref);
    return () => setTarget(current => current === ref ? undefined : current);
  }, [focused, setTarget]);

  return Platform.OS === 'android'
    ? <BlurTargetView ref={ref} style={{ flex: 1 }}>{children}</BlurTargetView>
    : <>{children}</>;
}

export function useTabGlassBackdrop() {
  return useContext(BackdropContext).target;
}
