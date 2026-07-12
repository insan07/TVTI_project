import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Alert, TouchableOpacity, Modal, TextInput, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ManageResultsScreen() {
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Form State
  const [assessmentName, setAssessmentName] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [marksObtained, setMarksObtained] = useState('');

  // Bulk View Toggle
  const [isBulkView, setIsBulkView] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const res = await api.get('/admin/batches');
      setBatches(res.data);
      if (res.data.length > 0) setSelectedBatch(res.data[0]._id);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to load batches');
    }
  };

  useEffect(() => {
    if (selectedBatch) {
      fetchBatchDetails(selectedBatch);
    }
  }, [selectedBatch]);

  const fetchBatchDetails = async (batchId: string) => {
    setLoading(true);
    try {
      const [studentsRes, resultsRes] = await Promise.all([
        api.get(`/admin/batches/${batchId}/students`),
        api.get(`/admin/batches/${batchId}/results`)
      ]);
      setStudents(studentsRes.data);
      setResults(resultsRes.data);
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to load batch data');
    } finally {
      setLoading(false);
    }
  };

  const openStudentModal = (student: any) => {
    setSelectedStudent(student);
    setAssessmentName('');
    setMaxMarks('100');
    setMarksObtained('');
    setModalVisible(true);
  };

  const handleAddResult = async () => {
    if (!assessmentName || !maxMarks || !marksObtained) {
      Alert.alert('Validation Error', 'Please fill all fields');
      return;
    }
    const max = parseFloat(maxMarks);
    const obtained = parseFloat(marksObtained);
    if (max <= 0 || obtained < 0 || obtained > max) {
      Alert.alert('Validation Error', 'Invalid marks');
      return;
    }

    const percentage = (obtained / max) * 100;

    try {
      await api.post('/admin/results', {
        student_id: selectedStudent._id,
        batch_id: selectedBatch,
        assessment_name: assessmentName,
        marks: percentage
      });
      Alert.alert('Success', 'Result added successfully');
      setAssessmentName('');
      setMarksObtained('');
      fetchBatchDetails(selectedBatch); // refresh
    } catch (e) {
      console.warn(e);
      Alert.alert('Error', 'Failed to add result');
    }
  };

  const studentResults = results.filter(r => r.student_id?._id === selectedStudent?._id || r.student_id === selectedStudent?._id);

  // For Bulk View
  const uniqueAssessments = Array.from(new Set(results.map(r => r.assessment_name)));

  const renderBulkView = () => (
    <ScrollView horizontal>
      <View>
        <View style={styles.tableRow}>
          <Text style={[styles.tableCell, styles.tableHeaderCell, { width: 150 }]}>Student Name</Text>
          {uniqueAssessments.map(a => (
            <Text key={a as string} style={[styles.tableCell, styles.tableHeaderCell]}>{a as string}</Text>
          ))}
          <Text style={[styles.tableCell, styles.tableHeaderCell]}>Average</Text>
        </View>
        
        {students.map(student => {
          const sResults = results.filter(r => r.student_id?._id === student._id || r.student_id === student._id);
          const totalMarks = sResults.reduce((sum, r) => sum + r.marks, 0);
          const avg = sResults.length > 0 ? (totalMarks / sResults.length).toFixed(1) : '-';

          return (
            <View key={student._id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: 150 }]}>{student.name}</Text>
              {uniqueAssessments.map(a => {
                const res = sResults.find(r => r.assessment_name === a);
                return (
                  <Text key={a as string} style={styles.tableCell}>
                    {res ? `${res.marks.toFixed(1)}% (${res.grade})` : '-'}
                  </Text>
                );
              })}
              <Text style={[styles.tableCell, { fontWeight: 'bold' }]}>{avg !== '-' ? `${avg}%` : '-'}</Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.pickerContainer}>
          <Text style={styles.label}>Select Batch</Text>
          <View style={styles.pickerWrapper}>
            <Picker selectedValue={selectedBatch} onValueChange={setSelectedBatch}>
              {batches.map(b => (
                <Picker.Item key={b._id} label={b.course_id?.title || 'Unknown Course'} value={b._id} />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.toggleBtn} 
          onPress={() => setIsBulkView(!isBulkView)}
        >
          <Text style={styles.toggleBtnText}>{isBulkView ? 'List View' : 'Bulk View'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 20 }} />
      ) : isBulkView ? (
        renderBulkView()
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item._id}
          ListEmptyComponent={<Text style={styles.emptyText}>No students in this batch.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.studentCard} onPress={() => openStudentModal(item)}>
              <View>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.studentEmail}>{item.email}</Text>
              </View>
              <Text style={styles.viewBtn}>Manage</Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Modal for Student Results */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedStudent?.name}'s Results</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtn}>Close</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addForm}>
            <Text style={styles.formTitle}>Add Assessment</Text>
            <TextInput
              style={styles.input}
              placeholder="Assessment Name (e.g. Midterm)"
              value={assessmentName}
              onChangeText={setAssessmentName}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 8 }]}
                placeholder="Max Marks"
                value={maxMarks}
                keyboardType="numeric"
                onChangeText={setMaxMarks}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="Marks Obtained"
                value={marksObtained}
                keyboardType="numeric"
                onChangeText={setMarksObtained}
              />
            </View>
            <TouchableOpacity style={styles.submitBtn} onPress={handleAddResult}>
              <Text style={styles.submitBtnText}>Add Result</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Existing Results</Text>
          <FlatList
            data={studentResults}
            keyExtractor={r => r._id}
            ListEmptyComponent={<Text style={styles.emptyText}>No results yet.</Text>}
            renderItem={({ item }) => (
              <View style={styles.resultItem}>
                <Text style={styles.resName}>{item.assessment_name}</Text>
                <View style={styles.resDetails}>
                  <Text style={styles.resMarks}>{item.marks.toFixed(1)}%</Text>
                  <Text style={styles.resGrade}>{item.grade}</Text>
                </View>
              </View>
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 16 },
  pickerContainer: { flex: 1, marginRight: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#4B5563', marginBottom: 8 },
  pickerWrapper: { backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden' },
  toggleBtn: { backgroundColor: '#4B5563', padding: 12, borderRadius: 8, height: 48, justifyContent: 'center' },
  toggleBtnText: { color: '#fff', fontWeight: 'bold' },
  studentCard: { backgroundColor: '#fff', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  studentEmail: { fontSize: 14, color: '#6B7280' },
  viewBtn: { color: '#2563EB', fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 20 },
  
  // Modal
  modalContainer: { flex: 1, backgroundColor: '#F9FAFB', padding: 20, paddingTop: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1F2937' },
  closeBtn: { fontSize: 16, color: '#EF4444', fontWeight: 'bold' },
  
  addForm: { backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 20, elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#374151' },
  input: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 8, marginBottom: 12, color: '#1F2937' },
  row: { flexDirection: 'row' },
  submitBtn: { backgroundColor: '#2563EB', padding: 14, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginBottom: 12 },
  resultItem: { backgroundColor: '#fff', padding: 16, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  resName: { fontSize: 16, fontWeight: 'bold', color: '#374151' },
  resDetails: { flexDirection: 'row', alignItems: 'center' },
  resMarks: { fontSize: 16, color: '#6B7280', marginRight: 12 },
  resGrade: { fontSize: 16, fontWeight: 'bold', color: '#10B981' },

  // Table
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 12 },
  tableCell: { width: 100, fontSize: 14, color: '#374151', paddingHorizontal: 8 },
  tableHeaderCell: { fontWeight: 'bold', color: '#1F2937' },
});
