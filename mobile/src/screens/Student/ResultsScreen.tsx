import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';

export default function ResultsScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/students/batches');
      setBatches(res.data);
      if (res.data.length > 0) {
        setSelectedBatch(res.data[0]._id);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to load batches');
    }
  };

  useEffect(() => {
    if (selectedBatch) {
      fetchResults(selectedBatch);
    }
  }, [selectedBatch]);

  const fetchResults = async (batchId: string) => {
    setLoading(true);
    try {
      const res = await api.get(`/students/my-results?batchId=${batchId}`);
      setResults(res.data);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = () => {
    if (results.length === 0) return 0;
    const total = results.reduce((sum, r) => sum + r.marks, 0);
    return (total / results.length).toFixed(2);
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return '#10B981';
      case 'B': return '#3B82F6';
      case 'C': return '#F59E0B';
      case 'Pass': return '#6B7280';
      default: return '#EF4444';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pickerContainer}>
        <Text style={styles.label}>Select Batch</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedBatch}
            onValueChange={(val) => setSelectedBatch(val)}
          >
            {batches.map(b => (
              <Picker.Item key={b._id} label={b.course_id?.title || 'Unknown Course'} value={b._id} />
            ))}
          </Picker>
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Overall Average</Text>
        <Text style={styles.summaryValue}>{calculateAverage()}%</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          ListEmptyComponent={<Text style={styles.emptyText}>No results available for this batch.</Text>}
          renderItem={({ item }) => (
            <View style={styles.resultCard}>
              <View style={styles.resultInfo}>
                <Text style={styles.assessmentName}>{item.assessment_name}</Text>
                <Text style={styles.marks}>{item.marks.toFixed(1)} / 100</Text>
              </View>
              <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(item.grade) }]}>
                <Text style={styles.gradeText}>{item.grade}</Text>
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
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  pickerWrapper: { backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  summaryCard: { backgroundColor: '#2563EB', padding: 20, borderRadius: 12, alignItems: 'center', marginBottom: 16 },
  summaryTitle: { color: '#BFDBFE', fontSize: 14, fontWeight: '600', marginBottom: 4 },
  summaryValue: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  resultCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  resultInfo: { flex: 1 },
  assessmentName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  marks: { fontSize: 14, color: '#6B7280' },
  gradeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  gradeText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 20 }
});
