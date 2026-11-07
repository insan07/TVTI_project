import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const WEEKDAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const TIME_PRESETS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'
];

const HOURS = Array.from({ length: 13 }, (_, i) => String(i + 8).padStart(2, '0')); // 08 to 20
const MINUTES = ['00', '15', '30', '45'];

/* -------------------------------------------------------------------------- */
/*                              MONTH PICKER MODAL                            */
/* -------------------------------------------------------------------------- */
export interface MonthPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMonth: (year: number, month: number) => void;
  selectedYear?: number;
  selectedMonth?: number; // 0-11
  isDark?: boolean;
  title?: string;
}

export function MonthPickerModal({
  visible,
  onClose,
  onSelectMonth,
  selectedYear = new Date().getFullYear(),
  selectedMonth = new Date().getMonth(),
  isDark = false,
  title = 'Select Month & Year',
}: MonthPickerModalProps) {
  const [year, setYear] = useState(selectedYear);

  useEffect(() => {
    if (visible) {
      setYear(selectedYear);
    }
  }, [visible, selectedYear]);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  const handleMonthPress = (monthIdx: number) => {
    onSelectMonth(year, monthIdx);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, isDark && styles.modalOverlayDark]}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
              {/* Header */}
              <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
                <View>
                  <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{title}</Text>
                  <Text style={[styles.modalSubtitle, isDark && { color: '#94A3B8' }]}>Choose a month to view schedule</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDark && styles.closeBtnDark]}>
                  <Icon name="close" size={20} color={isDark ? '#FFFFFF' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Year Stepper Bar */}
              <View style={[styles.yearStepperRow, isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }]}>
                <TouchableOpacity
                  style={styles.stepperArrowBtn}
                  onPress={() => setYear(y => y - 1)}
                  activeOpacity={0.7}
                >
                  <Icon name="chevron-back" size={20} color="#F58220" />
                </TouchableOpacity>

                <View style={styles.yearDisplay}>
                  <Icon name="calendar-outline" size={16} color="#F58220" style={{ marginRight: 6 }} />
                  <Text style={[styles.yearDisplayText, isDark && { color: '#FFFFFF' }]}>{year}</Text>
                </View>

                <TouchableOpacity
                  style={styles.stepperArrowBtn}
                  onPress={() => setYear(y => y + 1)}
                  activeOpacity={0.7}
                >
                  <Icon name="chevron-forward" size={20} color="#F58220" />
                </TouchableOpacity>
              </View>

              {/* 3x4 Month Grid */}
              <View style={styles.monthPillsGrid}>
                {MONTH_NAMES.map((mName, idx) => {
                  const isSelected = year === selectedYear && idx === selectedMonth;
                  const isCurrent = year === currentYear && idx === currentMonth;

                  return (
                    <TouchableOpacity
                      key={mName}
                      style={[
                        styles.monthGridItem,
                        isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                        isCurrent && !isSelected && { borderColor: '#F58220', borderWidth: 1.5 },
                        isSelected && styles.monthGridItemSelected,
                      ]}
                      onPress={() => handleMonthPress(idx)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.monthGridItemText,
                          isDark && { color: '#F1F5F9' },
                          isCurrent && !isSelected && { color: '#F58220', fontWeight: 'bold' },
                          isSelected && styles.monthGridItemTextSelected,
                        ]}
                      >
                        {mName}
                      </Text>
                      {isCurrent && !isSelected && (
                        <View style={styles.currentMonthDot} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                               DATE PICKER MODAL                            */
/* -------------------------------------------------------------------------- */
export interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (date: Date) => void;
  selectedDate?: Date;
  minDate?: Date;
  isDark?: boolean;
  title?: string;
}

export function DatePickerModal({
  visible,
  onClose,
  onSelectDate,
  selectedDate = new Date(),
  minDate,
  isDark = false,
  title = 'Pick Practical Date',
}: DatePickerModalProps) {
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth());
  const [activeDate, setActiveDate] = useState(selectedDate);

  useEffect(() => {
    if (visible) {
      setCurrentYear(selectedDate.getFullYear());
      setCurrentMonth(selectedDate.getMonth());
      setActiveDate(selectedDate);
    }
  }, [visible, selectedDate]);

  const changeMonth = (offset: number) => {
    let nextM = currentMonth + offset;
    let nextY = currentYear;
    if (nextM > 11) {
      nextM = 0;
      nextY += 1;
    } else if (nextM < 0) {
      nextM = 11;
      nextY -= 1;
    }
    setCurrentMonth(nextM);
    setCurrentYear(nextY);
  };

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
  const blanks = Array.from({ length: startOffset }).map((_, i) => {
    const prevD = prevMonthLastDay - startOffset + 1 + i;
    return (
      <View key={`b-${i}`} style={[styles.calCell, styles.calCellBlank]}>
        <Text style={styles.calCellTextMuted}>{prevD}</Text>
      </View>
    );
  });

  const days = Array.from({ length: daysInMonth }).map((_, i) => {
    const d = i + 1;
    const cellDate = new Date(currentYear, currentMonth, d);
    cellDate.setHours(0, 0, 0, 0);

    const isPast = minDate ? cellDate.getTime() < minDate.getTime() : cellDate.getTime() < today.getTime();
    const isToday = cellDate.getTime() === today.getTime();
    const isSelected =
      cellDate.getDate() === activeDate.getDate() &&
      cellDate.getMonth() === activeDate.getMonth() &&
      cellDate.getFullYear() === activeDate.getFullYear();

    return (
      <TouchableOpacity
        key={`d-${d}`}
        disabled={isPast}
        style={[
          styles.calCell,
          isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255,255,255,0.06)' },
          isPast && styles.calCellDisabled,
          isSelected && styles.calCellSelected,
        ]}
        onPress={() => {
          setActiveDate(cellDate);
        }}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.calCellText,
            isDark && { color: '#F1F5F9' },
            isToday && !isSelected && { color: '#F58220', fontWeight: 'bold' },
            isPast && styles.calCellTextDisabled,
            isSelected && styles.calCellTextSelected,
          ]}
        >
          {d}
        </Text>
        {isToday && !isSelected && <View style={styles.todayIndicatorDot} />}
      </TouchableOpacity>
    );
  });

  const handleConfirm = () => {
    onSelectDate(activeDate);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, isDark && styles.modalOverlayDark]}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
              {/* Header */}
              <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
                <View>
                  <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{title}</Text>
                  <Text style={[styles.modalSubtitle, isDark && { color: '#94A3B8' }]}>
                    Selected: {activeDate.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDark && styles.closeBtnDark]}>
                  <Icon name="close" size={20} color={isDark ? '#FFFFFF' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Month Navigator Bar */}
              <View style={[styles.monthNavRow, isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }]}>
                <TouchableOpacity style={styles.stepperArrowBtn} onPress={() => changeMonth(-1)}>
                  <Icon name="chevron-back" size={20} color="#F58220" />
                </TouchableOpacity>
                <Text style={[styles.monthNavTitle, isDark && { color: '#FFFFFF' }]}>
                  {MONTH_NAMES[currentMonth]} {currentYear}
                </Text>
                <TouchableOpacity style={styles.stepperArrowBtn} onPress={() => changeMonth(1)}>
                  <Icon name="chevron-forward" size={20} color="#F58220" />
                </TouchableOpacity>
              </View>

              {/* Quick Preset Buttons */}
              <View style={styles.quickPresetRow}>
                <TouchableOpacity
                  style={[styles.quickChip, isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }]}
                  onPress={() => {
                    const t = new Date();
                    setActiveDate(t);
                    setCurrentYear(t.getFullYear());
                    setCurrentMonth(t.getMonth());
                  }}
                >
                  <Text style={[styles.quickChipText, isDark && { color: '#CBD5E1' }]}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickChip, isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }]}
                  onPress={() => {
                    const tom = new Date();
                    tom.setDate(tom.getDate() + 1);
                    setActiveDate(tom);
                    setCurrentYear(tom.getFullYear());
                    setCurrentMonth(tom.getMonth());
                  }}
                >
                  <Text style={[styles.quickChipText, isDark && { color: '#CBD5E1' }]}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickChip, isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }]}
                  onPress={() => {
                    const nextW = new Date();
                    nextW.setDate(nextW.getDate() + 7);
                    setActiveDate(nextW);
                    setCurrentYear(nextW.getFullYear());
                    setCurrentMonth(nextW.getMonth());
                  }}
                >
                  <Text style={[styles.quickChipText, isDark && { color: '#CBD5E1' }]}>Next Week</Text>
                </TouchableOpacity>
              </View>

              {/* Weekday Row */}
              <View style={[styles.calWeekdayRow, isDark && { backgroundColor: '#1E293B' }]}>
                {WEEKDAY_NAMES.map((wd, idx) => (
                  <Text
                    key={wd}
                    style={[
                      styles.calWeekdayText,
                      isDark && { color: '#94A3B8' },
                      (idx === 5 || idx === 6) && { color: '#F97316' }
                    ]}
                  >
                    {wd}
                  </Text>
                ))}
              </View>

              {/* Calendar Grid */}
              <View style={styles.calGrid}>
                {blanks}
                {days}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.modalCancelBtn, isDark && styles.modalCancelBtnDark]} onPress={onClose}>
                  <Text style={[styles.modalCancelBtnText, isDark && { color: '#94A3B8' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirm}>
                  <Icon name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalConfirmBtnText}>Apply Date</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                               TIME PICKER MODAL                            */
/* -------------------------------------------------------------------------- */
export interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectTime: (time: string) => void;
  selectedTime?: string; // "09:00"
  isDark?: boolean;
  title?: string;
}

export function TimePickerModal({
  visible,
  onClose,
  onSelectTime,
  selectedTime = '09:00',
  isDark = false,
  title = 'Select Practical Time',
}: TimePickerModalProps) {
  const [hour, setHour] = useState('09');
  const [minute, setMinute] = useState('00');

  useEffect(() => {
    if (visible && selectedTime) {
      const parts = selectedTime.split(':');
      if (parts.length === 2) {
        setHour(parts[0].padStart(2, '0'));
        setMinute(parts[1].padStart(2, '0'));
      }
    }
  }, [visible, selectedTime]);

  const handlePreset = (timeStr: string) => {
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      setHour(parts[0]);
      setMinute(parts[1]);
    }
  };

  const handleConfirm = () => {
    onSelectTime(`${hour}:${minute}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.modalOverlay, isDark && styles.modalOverlayDark]}>
          <TouchableWithoutFeedback>
            <View style={[styles.modalCard, isDark && styles.modalCardDark]}>
              {/* Header */}
              <View style={[styles.modalHeader, isDark && styles.modalHeaderDark]}>
                <View>
                  <Text style={[styles.modalTitle, isDark && { color: '#FFFFFF' }]}>{title}</Text>
                  <Text style={[styles.modalSubtitle, isDark && { color: '#94A3B8' }]}>Pick session start or end time</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={[styles.closeBtn, isDark && styles.closeBtnDark]}>
                  <Icon name="close" size={20} color={isDark ? '#FFFFFF' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Big Digital Clock Display */}
              <View style={[styles.clockDisplayContainer, isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' }]}>
                <Icon name="time-outline" size={24} color="#F58220" style={{ marginRight: 10 }} />
                <Text style={styles.clockDigitText}>{hour}</Text>
                <Text style={styles.clockColonText}>:</Text>
                <Text style={styles.clockDigitText}>{minute}</Text>
                <Text style={[styles.clockAmpmText, isDark && { color: '#94A3B8' }]}>
                  {parseInt(hour, 10) >= 12 ? 'PM' : 'AM'}
                </Text>
              </View>

              {/* Hour & Minute Selectors */}
              <View style={styles.timeSpinnersRow}>
                {/* Hours column */}
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.sectionHeading, isDark && { color: '#94A3B8' }]}>HOUR</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 6 }}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {HOURS.map(h => (
                        <TouchableOpacity
                          key={h}
                          style={[
                            styles.timeUnitChip,
                            isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                            hour === h && styles.timeUnitChipActive,
                          ]}
                          onPress={() => setHour(h)}
                        >
                          <Text style={[styles.timeUnitChipText, isDark && { color: '#FFFFFF' }, hour === h && styles.timeUnitChipTextActive]}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Minutes column */}
                <View style={{ width: 140 }}>
                  <Text style={[styles.sectionHeading, isDark && { color: '#94A3B8' }]}>MINUTES</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginVertical: 6 }}>
                    {MINUTES.map(m => (
                      <TouchableOpacity
                        key={m}
                        style={[
                          styles.timeUnitChip,
                          isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                          minute === m && styles.timeUnitChipActive,
                        ]}
                        onPress={() => setMinute(m)}
                      >
                        <Text style={[styles.timeUnitChipText, isDark && { color: '#FFFFFF' }, minute === m && styles.timeUnitChipTextActive]}>
                          {m}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>

              {/* Quick Presets Grid */}
              <Text style={[styles.sectionHeading, { marginTop: 12 }, isDark && { color: '#94A3B8' }]}>COMMON PRESETS</Text>
              <View style={styles.presetsGrid}>
                {TIME_PRESETS.map(preset => {
                  const isActive = `${hour}:${minute}` === preset;
                  return (
                    <TouchableOpacity
                      key={preset}
                      style={[
                        styles.presetChip,
                        isDark && { backgroundColor: '#1E293B', borderColor: 'rgba(255,255,255,0.08)' },
                        isActive && styles.presetChipActive,
                      ]}
                      onPress={() => handlePreset(preset)}
                    >
                      <Text style={[styles.presetChipText, isDark && { color: '#CBD5E1' }, isActive && styles.presetChipTextActive]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Footer */}
              <View style={styles.modalFooter}>
                <TouchableOpacity style={[styles.modalCancelBtn, isDark && styles.modalCancelBtnDark]} onPress={onClose}>
                  <Text style={[styles.modalCancelBtnText, isDark && { color: '#94A3B8' }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleConfirm}>
                  <Icon name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.modalConfirmBtnText}>Apply Time</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/*                                PICKER FIELD                                */
/* -------------------------------------------------------------------------- */
export interface PickerFieldProps {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Icon.glyphMap | string;
  isDark?: boolean;
  disabled?: boolean;
  placeholder?: string;
  rightIcon?: keyof typeof Icon.glyphMap | string | null;
  containerStyle?: any;
}

export function PickerField({
  label,
  onPress,
  icon,
  isDark = false,
  disabled = false,
  placeholder = 'Select...',
  rightIcon = 'chevron-down',
  containerStyle,
}: PickerFieldProps) {
  const displayLabel = label || placeholder;
  const isPlaceholder = !label;

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.pickerFieldContainer,
        isDark && styles.pickerFieldContainerDark,
        disabled && { opacity: 0.5 },
        containerStyle,
      ]}
    >
      <View style={styles.pickerFieldLeft}>
        {!!icon && (
          <Icon
            name={icon as any}
            size={18}
            color="#F58220"
            style={styles.pickerFieldIcon}
          />
        )}
        <Text
          style={[
            styles.pickerFieldText,
            isDark && styles.pickerFieldTextDark,
            isPlaceholder && styles.pickerFieldPlaceholder,
          ]}
          numberOfLines={1}
        >
          {displayLabel}
        </Text>
      </View>
      {!!rightIcon && (
        <Icon
          name={rightIcon as any}
          size={16}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
      )}
    </TouchableOpacity>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   STYLES                                   */
/* -------------------------------------------------------------------------- */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalOverlayDark: {
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Platform.select({
      web: {
        boxShadow: '0 20px 50px -12px rgba(15, 23, 42, 0.25)',
      },
      default: {
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      }
    }),
  },
  modalCardDark: {
    backgroundColor: '#141B26',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 14,
  },
  modalHeaderDark: {
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  closeBtnDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },

  /* Year Stepper & Month Nav */
  yearStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  stepperArrowBtn: {
    padding: 8,
    borderRadius: 8,
  },
  yearDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  yearDisplayText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  monthPillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'space-between',
  },
  monthGridItem: {
    width: '31%',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  monthGridItemSelected: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  monthGridItemText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#334155',
  },
  monthGridItemTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  currentMonthDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F58220',
  },

  /* Date Picker Styles */
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  monthNavTitle: {
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  quickPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  quickChip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quickChipText: {
    fontSize: 11.5,
    fontWeight: '600',
    color: '#475569',
  },
  calWeekdayRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingVertical: 6,
    marginBottom: 4,
  },
  calWeekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  calGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calCell: {
    width: '14.285%',
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginVertical: 1,
  },
  calCellBlank: {
    opacity: 0.25,
  },
  calCellDisabled: {
    opacity: 0.35,
  },
  calCellSelected: {
    backgroundColor: '#F58220',
  },
  calCellText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
  },
  calCellTextDisabled: {
    color: '#94A3B8',
  },
  calCellTextSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  calCellTextMuted: {
    fontSize: 12,
    color: '#94A3B8',
  },
  todayIndicatorDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F58220',
    marginTop: 1,
  },

  /* Time Picker Styles */
  clockDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFEDD5',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 14,
  },
  clockDigitText: {
    fontSize: 34,
    fontWeight: '800',
    color: '#EA580C',
    fontVariant: ['tabular-nums'],
  },
  clockColonText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#EA580C',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  clockAmpmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#C2410C',
    marginLeft: 8,
    marginTop: 10,
  },
  timeSpinnersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  sectionHeading: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.6,
  },
  timeUnitChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
  },
  timeUnitChipActive: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  timeUnitChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  timeUnitChipTextActive: {
    color: '#FFFFFF',
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    marginBottom: 16,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  presetChipActive: {
    backgroundColor: '#F58220',
    borderColor: '#F58220',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },

  /* Modal Footer */
  modalFooter: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalCancelBtnText: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#64748B',
  },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F58220',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: { boxShadow: '0 4px 14px rgba(245, 130, 32, 0.35)' },
      default: { elevation: 3 }
    }),
  },
  modalConfirmBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  /* PickerField Styles */
  pickerFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  pickerFieldContainerDark: {
    backgroundColor: '#1E293B',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  pickerFieldLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pickerFieldIcon: {
    marginRight: 10,
  },
  pickerFieldText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  pickerFieldTextDark: {
    color: '#F8FAFC',
  },
  pickerFieldPlaceholder: {
    color: '#94A3B8',
    fontWeight: '400',
  },
});
