import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  ViewStyle
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { COLORS, RADIUS, SPACING, SHADOW } from '../../config/theme';

export interface DropdownItem {
  label: string;
  value: string;
  subtext?: string;
  icon?: string;
}

interface CustomDropdownProps {
  label?: string;
  placeholder?: string;
  items: DropdownItem[];
  selectedValue: string;
  onValueChange: (value: string) => void;
  iconName?: keyof typeof Icon.glyphMap;
  containerStyle?: ViewStyle;
  searchable?: boolean;
}

export default function CustomDropdown({
  label,
  placeholder = 'Select an option',
  items,
  selectedValue,
  onValueChange,
  iconName,
  containerStyle,
  searchable = true
}: CustomDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchText, setSearchText] = useState('');

  const selectedItem = items.find(i => i.value === selectedValue);

  const filteredItems = items.filter(
    i =>
      i.label.toLowerCase().includes(searchText.toLowerCase()) ||
      (i.subtext && i.subtext.toLowerCase().includes(searchText.toLowerCase()))
  );

  const handleSelect = (val: string) => {
    onValueChange(val);
    setModalVisible(false);
    setSearchText('');
  };

  return (
    <View style={[styles.wrapper, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <TouchableOpacity
        style={styles.triggerButton}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <View style={styles.triggerLeft}>
          {iconName ? (
            <Icon name={iconName} size={18} color={COLORS.primary} style={styles.leftIcon} />
          ) : null}
          <Text
            style={[
              styles.triggerText,
              !selectedItem && styles.placeholderText
            ]}
            numberOfLines={1}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </Text>
        </View>
        <View style={styles.chevronBg}>
          <Icon name="chevron-down" size={16} color="#4B5563" />
        </View>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="fade" transparent={true}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalCard}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Search Input */}
            {searchable && items.length > 4 ? (
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={16} color="#9CA3AF" style={{ marginRight: 6 }} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor="#9CA3AF"
                  value={searchText}
                  onChangeText={setSearchText}
                />
                {searchText.length > 0 ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Icon name="close-circle" size={16} color="#9CA3AF" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* Options List */}
            <FlatList
              data={filteredItems}
              keyExtractor={item => item.value}
              style={{ maxHeight: 320 }}
              contentContainerStyle={{ paddingVertical: 4 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No matching options found</Text>
              }
              renderItem={({ item }) => {
                const isSelected = item.value === selectedValue;
                return (
                  <TouchableOpacity
                    style={[
                      styles.optionItem,
                      isSelected && styles.selectedOptionItem
                    ]}
                    onPress={() => handleSelect(item.value)}
                  >
                    <View style={styles.optionContent}>
                      {item.icon ? (
                        <Icon
                          name={item.icon as any}
                          size={18}
                          color={isSelected ? COLORS.primary : '#6B7280'}
                          style={{ marginRight: 10 }}
                        />
                      ) : null}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.optionLabel,
                            isSelected && styles.selectedOptionLabel
                          ]}
                        >
                          {item.label}
                        </Text>
                        {item.subtext ? (
                          <Text style={styles.optionSubtext}>{item.subtext}</Text>
                        ) : null}
                      </View>
                    </View>
                    {isSelected ? (
                      <Icon name="checkmark-circle" size={20} color={COLORS.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  triggerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    height: 48,
    ...SHADOW.sm,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  leftIcon: {
    marginRight: 8,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  placeholderText: {
    color: '#9CA3AF',
    fontWeight: '400',
  },
  chevronBg: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    ...SHADOW.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeBtn: {
    padding: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#1F2937',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 13,
    paddingVertical: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  selectedOptionItem: {
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  selectedOptionLabel: {
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  optionSubtext: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
});
