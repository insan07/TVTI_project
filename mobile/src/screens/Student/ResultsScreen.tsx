import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import CustomDropdown from '../../components/shared/CustomDropdown';
import api from '../../services/api';
import { COLORS, FONTS, SPACING, RADIUS, SHADOW } from '../../config/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ResultsScreen() {
  const insets = useSafeAreaInsets();
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
    fetchResults('all');
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data || []);
    } catch (e) {
      console.warn('Failed to load batches', e);
    }
  };

  const fetchResults = async (batchId: string) => {
    setLoading(true);
    try {
      const url = batchId && batchId !== 'all' ? `/students/my-results?batchId=${batchId}` : '/students/my-results';
      const res = await api.get(url);
      setResults(res.data || []);
    } catch (e) {
      console.warn('Failed to load results', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchChange = (val: string) => {
    setSelectedBatch(val);
    fetchResults(val);
  };

  const calculateAverage = () => {
    if (results.length === 0) return '0';
    const total = results.reduce((sum, r) => sum + r.marks, 0);
    return Math.round(total / results.length).toString();
  };

  return (
    <View style={styles.container}>
      {/* Top Header Bar */}
      <View style={[styles.topHeaderBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerIconButton} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}>
          <Icon name="menu-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Results</Text>
        <View style={styles.headerRightIconContainer}>
          <Icon name="document-text" size={18} color="#60A5FA" />
        </View>
      </View>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false} bounces={false}>
        <View style={styles.contentPadding}>
          {/* Select Batch Dropdown */}
          <Text style={styles.selectBatchLabel}>SELECT BATCH</Text>
          <CustomDropdown
            placeholder="Select Batch to View Results"
            items={[
              { label: 'All Batches', value: 'all', subtext: 'View overall marks' },
              ...batches.map((b) => ({
                label: `${b.course_id?.title || 'Course'} (${b.name || 'Batch'})`,
                value: b._id,
                subtext: `Batch: ${b.name || 'Batch'}`,
              })),
            ]}
            selectedValue={selectedBatch}
            onValueChange={handleBatchChange}
            containerStyle={styles.dropdownContainer}
          />

          {/* Overall Average Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Overall Average</Text>

            <View style={styles.gaugeContainer}>
              <View style={styles.gaugeCircle}>
                <Text style={styles.gaugePercentText}>{calculateAverage()}%</Text>
              </View>
            </View>

            <Text style={styles.percentileSubtitleText}>
              {results.length > 0
                ? `Total Assessments Recorded: ${results.length}`
                : 'No assessment results recorded yet.'}
            </Text>
          </View>

          {/* Assessment History Section */}
          <Text style={styles.sectionTitle}>Assessment History</Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.secondary} style={{ marginTop: 30 }} />
          ) : results.length > 0 ? (
            results.map((item, idx) => (
              <View key={item._id || idx} style={styles.assessmentCard}>
                <View style={styles.assessmentTopRow}>
                  <Text style={styles.assessmentTitle}>{item.assessment_name}</Text>
                  <View style={styles.marksContainer}>
                    <Text style={styles.marksObtained}>{Number(item.marks).toFixed(1)}</Text>
                    <Text style={styles.marksMax}> / 100</Text>
                  </View>
                </View>

                <View style={styles.assessmentBottomRow}>
                  <View style={styles.dateRow}>
                    <Icon name="calendar-outline" size={14} color="#777" style={{ marginRight: 4 }} />
                    <Text style={styles.dateText}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: '2-digit', year: 'numeric' }) : ''}
                    </Text>
                  </View>

                  <View style={styles.gradeBadge}>
                    <Text style={styles.gradeBadgeText}>
                      {item.grade ? `${item.grade.startsWith('A') ? '✔ ' : ''}${item.grade}` : 'A'}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: '#888888', ...FONTS.regular, textAlign: 'center', marginVertical: SPACING.lg }}>
              No assessment results found.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6F8',
  },
  topHeaderBar: {
    backgroundColor: '#000000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerIconButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    ...FONTS.bold,
  },
  headerRightIconContainer: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
  },
  contentPadding: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
  },
  selectBatchLabel: {
    fontSize: 12,
    color: '#555555',
    ...FONTS.bold,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  dropdownContainer: {
    marginBottom: SPACING.xl,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  summaryCardTitle: {
    fontSize: 18,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: SPACING.lg,
  },
  gaugeContainer: {
    marginBottom: SPACING.lg,
  },
  gaugeCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: '#F58220',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6F8',
  },
  gaugePercentText: {
    fontSize: 32,
    color: '#F58220',
    ...FONTS.bold,
  },
  percentileSubtitleText: {
    fontSize: 13,
    color: '#666666',
    ...FONTS.regular,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
    lineHeight: 19,
  },
  sectionTitle: {
    fontSize: 18,
    color: '#1A1A1A',
    ...FONTS.bold,
    marginBottom: SPACING.md,
  },
  assessmentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOW.sm,
    borderWidth: 1,
    borderColor: '#EFEFEF',
  },
  assessmentTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  assessmentTitle: {
    fontSize: 16.5,
    color: '#1A1A1A',
    ...FONTS.bold,
    flex: 1,
    marginRight: SPACING.sm,
  },
  marksContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  marksObtained: {
    fontSize: 20,
    color: '#1A1A1A',
    ...FONTS.bold,
  },
  marksMax: {
    fontSize: 15,
    color: '#999999',
    ...FONTS.bold,
  },
  assessmentBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 13,
    color: '#666666',
    ...FONTS.regular,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gradeBadgeText: {
    fontSize: 14,
    color: '#1A1A1A',
    ...FONTS.bold,
  },
});

