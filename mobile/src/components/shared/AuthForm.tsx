import React, {
  createContext, forwardRef, useCallback, useContext, useEffect,
  useImperativeHandle, useRef, useState,
} from 'react';
import {
  Keyboard, Platform, ScrollView, StyleSheet, TextInput, View,
  type ScrollViewProps, type TextInputProps, type ViewStyle,
} from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { authGlassStyles } from './AuthGlassSurface';
import { getAuthInputScrollOffset } from './authKeyboard';
import { useAuthInputWebStyles } from './useAuthInputWebStyles';

const FocusContext = createContext<(input: TextInput | null) => void>(() => {});

export const AuthFormScrollView = forwardRef<ScrollView, ScrollViewProps>(function AuthFormScrollView(
  { children, onLayout, onContentSizeChange, onScroll, ...props }, ref,
) {
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput | null>(null);
  const offsetRef = useRef(0);
  const keyboardTopRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useImperativeHandle(ref, () => scrollRef.current!);

  const revealInput = useCallback(() => {
    if (Platform.OS === 'web') return;
    clearTimeout(timerRef.current);
    // Measure after keyboard resize and the screen's keyboard layout have settled.
    timerRef.current = setTimeout(() => {
      const input = inputRef.current;
      const scroll = scrollRef.current;
      if (!input || !scroll) return;
      scroll.getNativeScrollRef()?.measureInWindow((_x, viewTop, _width, viewHeight) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (inputRef.current !== input || viewHeight <= 0 || inputHeight <= 0) return;
          const bottom = Math.min(viewTop + viewHeight, keyboardTopRef.current ?? Infinity);
          if (bottom <= viewTop) return;
          const next = getAuthInputScrollOffset(offsetRef.current, viewTop, bottom, inputTop, inputHeight);
          if (Math.abs(next - offsetRef.current) > 1) scroll.scrollTo({ y: next, animated: true });
        });
      });
    }, 80);
  }, []);

  const focusInput = useCallback((input: TextInput | null) => {
    inputRef.current = input;
    if (input) revealInput();
  }, [revealInput]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const show = Keyboard.addListener('keyboardDidShow', event => {
      keyboardTopRef.current = event.endCoordinates.screenY;
      revealInput();
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTopRef.current = undefined;
      clearTimeout(timerRef.current);
    });
    return () => {
      show.remove();
      hide.remove();
      clearTimeout(timerRef.current);
    };
  }, [revealInput]);

  return (
    <FocusContext.Provider value={focusInput}>
      <ScrollView
        {...props}
        ref={scrollRef}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        scrollEventThrottle={16}
        onScroll={event => {
          offsetRef.current = event.nativeEvent.contentOffset.y;
          onScroll?.(event);
        }}
        onLayout={event => {
          onLayout?.(event);
          revealInput();
        }}
        onContentSizeChange={(width, height) => {
          onContentSizeChange?.(width, height);
          revealInput();
        }}
      >
        {children}
      </ScrollView>
    </FocusContext.Provider>
  );
});

export const AuthTextInput = forwardRef<TextInput, TextInputProps & { glass?: boolean }>(function AuthTextInput(
  { onFocus, onBlur, style, glass = false, ...props }, ref,
) {
  const inputRef = useRef<TextInput>(null);
  const focusInput = useContext(FocusContext);
  const { isDark } = useTheme();
  const [focused, setFocused] = useState(false);
  useImperativeHandle(ref, () => inputRef.current!);
  useAuthInputWebStyles();

  // The glass belongs to the whole field, including its icon and padding.
  // Keep the editable element transparent even when the browser autofills it.
  const flatStyle = StyleSheet.flatten(style) ?? {};
  const {
    color, fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, lineHeight,
    textAlign, textAlignVertical, padding, paddingTop, paddingBottom,
    paddingLeft, paddingRight, paddingHorizontal, paddingVertical,
    ...containerStyle
  } = flatStyle;

  const input = (
    <TextInput
      {...props}
      {...(Platform.OS === 'web' ? { dataSet: { authInput: 'true' } } : {})}
      ref={inputRef}
      underlineColorAndroid="transparent"
      selectionColor="#FF5E14"
      style={[
        glass ? {
          flex: 1,
          minWidth: 0,
          minHeight: 46,
          color, fontFamily, fontSize, fontStyle, fontWeight, letterSpacing, lineHeight,
          textAlign, textAlignVertical, padding, paddingTop, paddingBottom,
          paddingLeft, paddingRight, paddingHorizontal, paddingVertical,
        } : style,
        { backgroundColor: 'transparent' },
      ]}
      onFocus={event => {
        setFocused(true);
        focusInput(inputRef.current);
        onFocus?.(event);
      }}
      onBlur={event => {
        setFocused(false);
        focusInput(null);
        onBlur?.(event);
      }}
    />
  );

  if (!glass) return input;

  return (
    <View style={[
      containerStyle as ViewStyle,
      isDark ? authGlassStyles.inputDark : authGlassStyles.inputLight,
      focused && (isDark ? authGlassStyles.inputFocusedDark : authGlassStyles.inputFocusedLight),
    ]}>
      {input}
    </View>
  );
});
