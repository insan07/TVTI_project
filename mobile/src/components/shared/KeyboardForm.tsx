import React, { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useRef } from 'react';
import {
  Keyboard, KeyboardAvoidingView as NativeKeyboardAvoidingView, Platform,
  ScrollView as NativeScrollView, TextInput as NativeTextInput,
  type KeyboardEvent, type KeyboardAvoidingViewProps, type ScrollViewProps, type TextInputProps,
} from 'react-native';
import { getAuthInputScrollOffset } from './authKeyboard';

const ignoreFocus = () => {};
const InputFocusContext = createContext<(input: NativeTextInput | null) => void>(ignoreFocus);
export const useKeyboardFormFocus = () => useContext(InputFocusContext);

/** Avoid only the keyboard's overlap; Android's existing adjustResize can still resize the window. */
export function KeyboardAvoidingView({ behavior, ...props }: KeyboardAvoidingViewProps) {
  return <InputFocusContext.Provider value={ignoreFocus}><NativeKeyboardAvoidingView {...props} behavior={Platform.OS === 'web' ? undefined : behavior ?? 'padding'} /></InputFocusContext.Provider>;
}

export type KeyboardScrollView = NativeScrollView;
export const KeyboardScrollView = forwardRef<NativeScrollView, ScrollViewProps>(function KeyboardScrollView(
  { children, onLayout, onContentSizeChange, onScroll, horizontal, style, ...props }, ref,
) {
  const scrollRef = useRef<NativeScrollView>(null);
  const inputRef = useRef<NativeTextInput | null>(null);
  const offsetRef = useRef(0);
  const keyboardTop = useRef<number | undefined>(Platform.OS === 'web' ? undefined : Keyboard.metrics()?.screenY);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useImperativeHandle(ref, () => scrollRef.current!);
  const reveal = useCallback(() => {
    if (Platform.OS === 'web' || horizontal) return;
    clearTimeout(timer.current);
    // Wait for both the modal/window resize and its scroll viewport to settle.
    timer.current = setTimeout(() => {
      const input = inputRef.current, scroll = scrollRef.current;
      if (!input || !scroll || !input.isFocused()) return;
      scroll.getNativeScrollRef()?.measureInWindow((_x, top, _width, height) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (inputRef.current !== input || !input.isFocused() || height <= 0 || inputHeight <= 0) return;
          const bottom = Math.min(top + height, keyboardTop.current ?? Infinity);
          if (bottom <= top) return;
          const next = getAuthInputScrollOffset(offsetRef.current, top, bottom, inputTop, inputHeight);
          if (Math.abs(next - offsetRef.current) > 1) scroll.scrollTo({ y: next, animated: true });
        });
      });
    }, 80);
  }, [horizontal]);
  const focus = useCallback((input: NativeTextInput | null) => { inputRef.current = input; if (input) reveal(); else clearTimeout(timer.current); }, [reveal]);
  useEffect(() => {
    if (Platform.OS === 'web' || horizontal) return;
    const shown = (event: KeyboardEvent) => {
      keyboardTop.current = event.endCoordinates.screenY > 0 ? event.endCoordinates.screenY : undefined;
      reveal();
    };
    const subscriptions = [
      Keyboard.addListener('keyboardDidShow', shown),
      Keyboard.addListener('keyboardDidHide', () => { keyboardTop.current = undefined; clearTimeout(timer.current); }),
      ...(Platform.OS === 'ios' ? [Keyboard.addListener('keyboardWillChangeFrame', shown)] : []),
    ];
    return () => { subscriptions.forEach(subscription => subscription.remove()); clearTimeout(timer.current); };
  }, [horizontal, reveal]);
  const scroll = <NativeScrollView {...props} ref={scrollRef} horizontal={horizontal}
    style={[{ flexShrink: 1 }, style]} keyboardShouldPersistTaps={props.keyboardShouldPersistTaps ?? 'handled'}
    keyboardDismissMode={props.keyboardDismissMode ?? (Platform.OS === 'web' ? 'none' : Platform.OS === 'ios' ? 'interactive' : 'on-drag')}
    scrollEventThrottle={props.scrollEventThrottle ?? 16}
    onScroll={event => { offsetRef.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}
    onLayout={event => { onLayout?.(event); reveal(); }}
    onContentSizeChange={(width, height) => { onContentSizeChange?.(width, height); reveal(); }}>{children}</NativeScrollView>;
  // A horizontal picker must not swallow the parent vertical form's focus context.
  return horizontal ? scroll : <InputFocusContext.Provider value={focus}>{scroll}</InputFocusContext.Provider>;
});

export type KeyboardTextInput = NativeTextInput;
export const KeyboardTextInput = forwardRef<NativeTextInput, TextInputProps>(function KeyboardTextInput({ onFocus, onBlur, ...props }, ref) {
  const input = useRef<NativeTextInput>(null);
  const focus = useKeyboardFormFocus();
  useImperativeHandle(ref, () => input.current!);
  return <NativeTextInput {...props} ref={input} onFocus={event => { focus(input.current); onFocus?.(event); }}
    onBlur={event => { focus(null); onBlur?.(event); }} />;
});
