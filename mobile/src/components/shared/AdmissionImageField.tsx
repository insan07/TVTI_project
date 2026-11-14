import React, { useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { usersSectionTheme } from './usersSectionTheme';

export default function AdmissionImageField({ label, value, onChange, onError, disabled }: { label: string; value: string; onChange: (value: string) => void; onError: (message: string) => void; disabled: boolean }) {
  const { isDark } = useTheme(); const theme = usersSectionTheme(isDark); const [picking, setPicking] = useState(false);
  const pick = async () => {
    setPicking(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.5, base64: true });
      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        if (!asset.base64) { onError('The image could not be read. Please choose another image.'); return; }
        const uri = `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`;
        if (uri.length > 3500000) { onError('Choose an image smaller than 2.5 MB.'); return; }
        onChange(uri);
      }
    } catch { onError('The image could not be opened. Please try again.'); }
    finally { setPicking(false); }
  };
  return <View style={styles.field}><Text style={[styles.label, { color: theme.muted }]}>{label}</Text>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Choose ${label.toLowerCase()}`} disabled={disabled || picking} onPress={pick} style={[styles.upload, { backgroundColor: theme.field, borderColor: theme.line }]}>
      {value ? <Image source={{ uri: value }} style={styles.preview} /> : <Icon name="image-outline" size={25} color={theme.accent} />}
      {picking ? <ActivityIndicator color={theme.accent} /> : <Text style={[styles.copy, { color: theme.text }]}>{value ? 'Change image' : 'Choose image'}</Text>}
    </TouchableOpacity>
    {!!value && <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Remove ${label.toLowerCase()}`} disabled={disabled} onPress={() => onChange('')} style={{ paddingVertical: 7 }}><Text style={[styles.copy, { color: theme.muted }]}>Remove image</Text></TouchableOpacity>}
  </View>;
}
const styles = StyleSheet.create({ field: { gap: 7 }, label: { ...FONTS.medium, fontSize: 12 }, upload: { minHeight: 72, borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }, preview: { width: 54, height: 54, borderRadius: 8 }, copy: { ...FONTS.medium, fontSize: 13 } });
