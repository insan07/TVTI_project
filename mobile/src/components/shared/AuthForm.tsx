import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { authGlassStyles } from './AuthGlassSurface';
import { useAuthInputWebStyles } from './useAuthInputWebStyles';
import { useKeyboardFormFocus } from './KeyboardForm';
export { KeyboardScrollView as AuthFormScrollView } from './KeyboardForm';

export const AuthTextInput = forwardRef<TextInput, TextInputProps & { glass?: boolean }>(function AuthTextInput(
  { onFocus, onBlur, style, glass = false, ...props }, ref,
) {
  const inputRef = useRef<TextInput>(null);
  const focusInput = useKeyboardFormFocus();
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
