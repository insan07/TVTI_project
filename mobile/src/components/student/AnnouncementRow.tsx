import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { FONTS } from '../../config/theme';
import { useTheme } from '../../context/ThemeContext';
import { communicationTheme } from '../shared/communicationTheme';

export type Announcement = {
  _id: string;
  title: string;
  message: string;
  createdAt?: string;
  batch_id?: { name?: string } | null;
  posted_by?: { name?: string; role?: string } | null;
};

type Props = { announcement: Announcement; dateLabel: string; divided?: boolean; compact?: boolean; onPress: () => void };

export default function AnnouncementRow({ announcement, dateLabel, divided, compact = false, onPress }: Props) {
  const { isDark } = useTheme();
  const theme = communicationTheme(isDark);
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Read announcement: ${announcement.title}`}
      onPress={onPress}
      activeOpacity={0.65}
      style={[styles.row, compact && { paddingVertical: 12, gap: 10 }, divided && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.line }]}
    >
      <View style={styles.content}>
        <View style={styles.metadata}>
          <Text style={[styles.metadataText, { color: theme.muted }]}>{dateLabel}</Text>
          {announcement.batch_id?.name && (
            <Text style={[styles.metadataText, { color: theme.muted }]} numberOfLines={1}>{announcement.batch_id.name}</Text>
          )}
        </View>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={2}>{announcement.title}</Text>
        <Text style={[styles.preview, { color: theme.muted }]} numberOfLines={1}>{announcement.message}</Text>
      </View>
      <Icon name="arrow-forward" size={17} color={theme.text} style={styles.arrow} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 22 },
  content: { flex: 1, minWidth: 0 },
  metadata: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginBottom: 8 },
  metadataText: { fontSize: 11, lineHeight: 16, ...FONTS.regular, flexShrink: 1 },
  title: { fontSize: 16, lineHeight: 23, ...FONTS.semiBold, letterSpacing: -0.2 },
  preview: { fontSize: 13, lineHeight: 20, ...FONTS.regular, marginTop: 5 },
  arrow: { alignSelf: 'center', transform: [{ rotate: '-45deg' }] },
});
