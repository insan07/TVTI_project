import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import CustomDropdown from '../../components/shared/CustomDropdown';
import api from '../../services/api';

export default function ResultsScreen() {
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
    if (results.length === 0) return '0.0';
    const total = results.reduce((sum, r) => sum + r.marks, 0);
    return (total / results.length).toFixed(1);
  };

  const getGradeColor = (grade: string) => {
    if (!grade) return '#6B7280';
    const g = grade.toUpperCase();
    if (g.startsWith('A')) return '#10B981';
    if (g.startsWith('B')) return '#3B82F6';
    if (g.startsWith('C')) return '#F59E0B';
    if (g === 'PASS') return '#6B7280';
    return '#EF4444';
  };

  return (
    <View style={styles.container}>
      <CustomDropdown
        label="Filter by Course / Batch"
        placeholder="All Enrolled Batches"
        iconName="funnel-outline"
        items={[
          { label: 'All Enrolled Batches', value: 'all', subtext: 'View overall marks across all courses' },
          ...batches.map(b => ({
            label: `${b.course_id?.title || 'Course'} (${b.name || 'Batch'})`,
            value: b._id,
            subtext: `Batch: ${b.name || 'Batch'}`
          }))
        ]}
        selectedValue={selectedBatch}
        onValueChange={handleBatchChange}
        containerStyle={{ marginBottom: 16 }}
      />

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Overall Academic Average</Text>
        <Text style={styles.summaryValue}>{calculateAverage()}%</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No evaluation results found.</Text>}
          renderItem={({ item }) => (
            <View style={styles.resultCard}>
              <View style={styles.resultInfo}>
                <Text style={styles.assessmentName}>{item.assessment_name}</Text>
                <Text style={styles.courseSubtitle}>
                  {item.batch_id?.course_id?.title || item.batch_id?.name || 'Vocational Assessment'}
                </Text>
                <Text style={styles.marks}>Marks: {Number(item.marks).toFixed(1)} / 100</Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.grade) }]}>
                <Text style={styles.gradeText}>{item.grade || 'Pass'}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  pickerContainer: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#4B5563', marginBottom: 6 },
  pickerWrapper: { backgroundColor: '#fff', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB' },
  summaryCard: { backgroundColor: '#1E3A8A', padding: 20, borderRadius: 14, alignItems: 'center', marginBottom: 16, elevation: 2 },
  summaryTitle: { color: '#BFDBFE', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 34, fontWeight: 'bold' },
  resultCard: { backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', elevation: 1 },
  resultInfo: { flex: 1, marginRight: 10 },
  assessmentName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 2 },
  courseSubtitle: { fontSize: 12, color: '#6B7280', marginBottom: 4 },
  marks: { fontSize: 13, color: '#374151', fontWeight: '500' },
  gradeBadge: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  gradeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 }
});
