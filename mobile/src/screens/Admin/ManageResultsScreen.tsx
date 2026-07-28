import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView
} from 'react-native';
import CustomDropdown from '../../components/shared/CustomDropdown';
import api from '../../services/api';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons as Icon } from '@expo/vector-icons';

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
  const [submitting, setSubmitting] = useState(false);

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
      const sData = Array.isArray(studentsRes.data)
        ? studentsRes.data.map(item => item.student_id ? { ...item.student_id, _enrollmentId: item._id } : item)
        : [];
      setStudents(sData);
      setResults(resultsRes.data || []);
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

  const calculateGrade = (pct: number) => {
    if (pct >= 85) return 'A+';
    if (pct >= 75) return 'A';
    if (pct >= 65) return 'B';
    if (pct >= 50) return 'C';
    if (pct >= 40) return 'PASS';
    return 'FAIL';
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

  const handleAddResult = async () => {
    if (!assessmentName.trim() || !maxMarks || !marksObtained) {
      Alert.alert('Validation Error', 'Please fill all assessment fields');
      return;
    }
    const max = parseFloat(maxMarks);
    const obtained = parseFloat(marksObtained);
    if (isNaN(max) || max <= 0 || isNaN(obtained) || obtained < 0 || obtained > max) {
      Alert.alert('Validation Error', 'Marks obtained must be between 0 and Max Marks');
      return;
    }

    const percentage = (obtained / max) * 100;
    setSubmitting(true);

    try {
      await api.post('/admin/results', {
        student_id: selectedStudent._id,
        batch_id: selectedBatch,
        assessment_name: assessmentName.trim(),
        marks: percentage
      });
      Alert.alert('Success', 'Assessment mark published successfully!');
      setAssessmentName('');
      setMarksObtained('');
      fetchBatchDetails(selectedBatch); // refresh
    } catch (e: any) {
      console.warn(e);
      Alert.alert('Error', e.response?.data?.message || 'Failed to add result');
    } finally {
      setSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return 'S';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const studentResults = results.filter(
    r => r.student_id?._id === selectedStudent?._id || r.student_id === selectedStudent?._id
  );

  // Stats Calculations
  const totalEvaluationsCount = results.length;
  const overallBatchAverage = results.length > 0
    ? (results.reduce((sum, r) => sum + (r.marks || 0), 0) / results.length).toFixed(1)
    : '0.0';

  // For Bulk View
  const uniqueAssessments = Array.from(new Set(results.map(r => r.assessment_name)));

  const renderBulkView = () => (
    <ScrollView style={{ flex: 1 }} horizontal showsHorizontalScrollIndicator={true}>
      <View style={styles.tableContainer}>
        {/* Table Header */}
        <View style={styles.tableHeaderRow}>
          <Text style={[styles.tableCell, styles.tableHeaderCell, { width: 170 }]}>Student Name & Reg No</Text>
          {uniqueAssessments.map(a => (
            <Text key={a as string} style={[styles.tableCell, styles.tableHeaderCell, { width: 120, textAlign: 'center' }]}>
              {a as string}
            </Text>
          ))}
          <Text style={[styles.tableCell, styles.tableHeaderCell, { width: 100, textAlign: 'center' }]}>Overall Avg</Text>
        </View>

        {/* Table Body */}
        {students.length === 0 ? (
          <Text style={styles.emptyText}>No students in this batch.</Text>
        ) : (
          students.map(student => {
            const sResults = results.filter(
              r => r.student_id?._id === student._id || r.student_id === student._id
            );
            const totalMarks = sResults.reduce((sum, r) => sum + (r.marks || 0), 0);
            const avg = sResults.length > 0 ? (totalMarks / sResults.length).toFixed(1) : '-';

            return (
              <TouchableOpacity
                key={student._id}
                style={styles.tableDataRow}
                onPress={() => openStudentModal(student)}
              >
                <View style={{ width: 170, paddingRight: 8 }}>
                  <Text style={styles.tableStudentName} numberOfLines={1}>{student.name}</Text>
                  <Text style={styles.tableStudentSub}>Reg No: {student.index_number || student.nic || 'N/A'}</Text>
                </View>
                {uniqueAssessments.map(a => {
                  const res = sResults.find(r => r.assessment_name === a);
                  return (
                    <View key={a as string} style={{ width: 120, alignItems: 'center' }}>
                      {res ? (
                        <View style={[styles.gradeChip, { backgroundColor: getGradeColor(res.grade) }]}>
                          <Text style={styles.gradeChipText}>{res.marks.toFixed(0)}% ({res.grade || calculateGrade(res.marks)})</Text>
                        </View>
                      ) : (
                        <Text style={styles.tableDashText}>-</Text>
                      )}
                    </View>
                  );
                })}
                <View style={{ width: 100, alignItems: 'center' }}>
                  <Text style={styles.tableAvgText}>{avg !== '-' ? `${avg}%` : '-'}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );

  // Live calculation preview in modal
  const maxN = parseFloat(maxMarks) || 100;
  const obtN = parseFloat(marksObtained) || 0;
  const livePct = maxN > 0 && marksObtained.trim() !== '' ? Math.min(100, Math.max(0, (obtN / maxN) * 100)) : null;
  const liveGrade = livePct !== null ? calculateGrade(livePct) : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Title Header */}
      <View style={styles.topHeader}>
        <Text style={styles.pageTitle}>Academic Results</Text>
        <Text style={styles.pageSubtitle}>Manage and publish evaluation marks for vocational batches.</Text>
      </View>

      {/* Controls Bar: Batch Dropdown & Toggle Button */}
      <View style={styles.controlsBar}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <CustomDropdown
            placeholder="Select Batch..."
            iconName="layers-outline"
            items={batches.map(b => ({
              label: b.name || b.course_id?.title || 'Batch',
              value: b._id,
              subtext: b.course_id?.title ? `Course: ${b.course_id.title}` : undefined
            }))}
            selectedValue={selectedBatch}
            onValueChange={setSelectedBatch}
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <TouchableOpacity
          style={[styles.toggleBtn, isBulkView && styles.toggleBtnActive]}
          onPress={() => setIsBulkView(!isBulkView)}
        >
          <Icon name={isBulkView ? 'list-outline' : 'grid-outline'} size={18} color={isBulkView ? '#FFFFFF' : '#374151'} style={{ marginRight: 6 }} />
          <Text style={[styles.toggleBtnText, isBulkView && styles.toggleBtnTextActive]}>
            {isBulkView ? 'List View' : 'Bulk View'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Batch Overview Banner */}
      <View style={styles.overviewBanner}>
        <View style={styles.overviewStat}>
          <Text style={styles.overviewStatVal}>{students.length}</Text>
          <Text style={styles.overviewStatLbl}>TOTAL STUDENTS</Text>
        </View>
        <View style={styles.overviewStatDivider} />
        <View style={styles.overviewStat}>
          <Text style={styles.overviewStatVal}>{totalEvaluationsCount}</Text>
          <Text style={styles.overviewStatLbl}>EVALUATIONS</Text>
        </View>
        <View style={styles.overviewStatDivider} />
        <View style={styles.overviewStat}>
          <Text style={styles.overviewStatVal}>{overallBatchAverage}%</Text>
          <Text style={styles.overviewStatLbl}>CLASS AVG</Text>
        </View>
      </View>

      {/* Main Content Area */}
      {loading ? (
        <ActivityIndicator size="large" color="#000000" style={{ marginTop: 40 }} />
      ) : isBulkView ? (
        renderBulkView()
      ) : (
        <FlatList
          data={students}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingBottom: 60 }}
          ListEmptyComponent={<Text style={styles.emptyText}>No students in this batch.</Text>}
          renderItem={({ item }) => {
            const sResults = results.filter(
              r => r.student_id?._id === item._id || r.student_id === item._id
            );
            const avg = sResults.length > 0
              ? (sResults.reduce((sum, r) => sum + (r.marks || 0), 0) / sResults.length).toFixed(1)
              : null;

            return (
              <TouchableOpacity
                style={styles.studentCard}
                onPress={() => openStudentModal(item)}
                activeOpacity={0.7}
              >
                <View style={styles.avatarBox}>
                  <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentSub}>Reg No: {item.index_number || item.nic || 'N/A'}</Text>
                  <Text style={styles.evalCountText}>{sResults.length} Assessment{sResults.length === 1 ? '' : 's'} recorded</Text>
                </View>

                <View style={styles.studentRightAction}>
                  {avg ? (
                    <View style={styles.avgBadge}>
                      <Text style={styles.avgBadgeVal}>{avg}%</Text>
                      <Text style={styles.avgBadgeLbl}>Avg</Text>
                    </View>
                  ) : (
                    <Text style={styles.noResultsText}>No marks</Text>
                  )}
                  <View style={styles.addMarkIconBtn}>
                    <Icon name="add-circle" size={24} color="#000000" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* STUDENT EVALUATION & ADD MARKS MODAL */}
      {/* ========================================================================= */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{selectedStudent?.name}</Text>
                <Text style={styles.modalSub}>Reg No: {selectedStudent?.index_number || selectedStudent?.nic || 'N/A'}</Text>
              </View>
              <TouchableOpacity style={styles.closeModalIconBtn} onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color="#4B5563" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
              {/* Form to Add New Result */}
              <View style={styles.addFormCard}>
                <Text style={styles.formTitle}>Publish New Assessment Result</Text>

                <Text style={styles.inputLabel}>Assessment Title *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Engine Overhaul Practical Exam"
                  placeholderTextColor="#9CA3AF"
                  value={assessmentName}
                  onChangeText={setAssessmentName}
                />

                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Max Marks *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="100"
                      placeholderTextColor="#9CA3AF"
                      value={maxMarks}
                      keyboardType="numeric"
                      onChangeText={setMaxMarks}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Marks Obtained *</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 85"
                      placeholderTextColor="#9CA3AF"
                      value={marksObtained}
                      keyboardType="numeric"
                      onChangeText={setMarksObtained}
                    />
                  </View>
                </View>

                {/* Live Grade Preview */}
                {livePct !== null && (
                  <View style={styles.livePreviewRow}>
                    <Text style={styles.livePreviewLabel}>Calculated Score:</Text>
                    <Text style={styles.livePreviewVal}>{livePct.toFixed(1)}%</Text>
                    <View style={[styles.liveGradeBadge, { backgroundColor: getGradeColor(liveGrade || '') }]}>
                      <Text style={styles.liveGradeText}>{liveGrade}</Text>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.6 }]}
                  onPress={handleAddResult}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitBtnText}>Publish Marks</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* List of Existing Results for Student */}
              <Text style={styles.sectionTitle}>Recorded Assessments ({studentResults.length})</Text>
              {studentResults.length === 0 ? (
                <Text style={styles.emptyText}>No evaluation marks recorded yet.</Text>
              ) : (
                studentResults.map(item => (
                  <View key={item._id} style={styles.resultItemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.resName}>{item.assessment_name}</Text>
                      <Text style={styles.resDate}>Recorded: {new Date(item.createdAt || Date.now()).toLocaleDateString()}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.resScoreText}>{item.marks.toFixed(1)} / 100</Text>
                      <View style={[styles.gradeChip, { backgroundColor: getGradeColor(item.grade) }]}>
                        <Text style={styles.gradeChipText}>{item.grade || calculateGrade(item.marks)}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}

              <View style={{ height: 30 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  topHeader: {
    paddingTop: 8,
    paddingBottom: 10,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000000',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  controlsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#000000',
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  overviewBanner: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
  },
  overviewStatVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  overviewStatLbl: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#9CA3AF',
    marginTop: 2,
  },
  overviewStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#374151',
  },
  studentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  avatarBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: 'bold',
    color: '#1E40AF',
    fontSize: 15,
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
  },
  studentSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  evalCountText: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  studentRightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avgBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignItems: 'center',
  },
  avgBadgeVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#059669',
  },
  avgBadgeLbl: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#059669',
  },
  noResultsText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  addMarkIconBtn: {
    padding: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 40,
    fontSize: 14,
  },

  /* BULK VIEW TABLE STYLES */
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: 40,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tableCell: {
    fontSize: 12,
    color: '#374151',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    color: '#111827',
    fontSize: 12,
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  tableStudentName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#111827',
  },
  tableStudentSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  gradeChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  gradeChipText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  tableDashText: {
    color: '#9CA3AF',
    fontSize: 14,
  },
  tableAvgText: {
    fontWeight: 'bold',
    fontSize: 13,
    color: '#111827',
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalSub: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  closeModalIconBtn: {
    padding: 6,
  },
  addFormCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 6,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#1F2937',
    marginBottom: 4,
  },
  livePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  livePreviewLabel: {
    fontSize: 12,
    color: '#1E40AF',
    marginRight: 6,
  },
  livePreviewVal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginRight: 10,
  },
  liveGradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveGradeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 11,
  },
  submitBtn: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 10,
  },
  resultItemRow: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  resDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  resScoreText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
});
