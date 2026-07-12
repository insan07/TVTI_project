import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TextInput } from 'react-native';
import api from '../../services/api';
import { COLORS } from '../../config/theme';
import { Ionicons as Icon } from '@expo/vector-icons';

export default function MyStudentsScreen() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const res = await api.get('/instructors/my-students');
      setStudents(res.data);
    } catch (e) {
      console.warn('Failed to load students', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const term = search.toLowerCase();
    const nameMatch = s.student_id?.name?.toLowerCase().includes(term);
    const emailMatch = s.student_id?.email?.toLowerCase().includes(term);
    const batchMatch = s.batch_id?.name?.toLowerCase().includes(term);
    return nameMatch || emailMatch || batchMatch;
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Icon name="search" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search by student name or batch..." 
          value={search} 
          onChangeText={setSearch} 
        />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredStudents}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: 15, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="people-outline" size={60} color="#D1D5DB" />
              <Text style={styles.emptyText}>No assigned students found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.student_id?.name?.charAt(0)?.toUpperCase() || 'S'}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.student_id?.name || 'Unknown Student'}</Text>
                  <Text style={styles.email}>{item.student_id?.email || 'No email provided'}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.batchInfo}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.batch_id?.course_id?.title || 'Unknown Course'}</Text>
                </View>
                <Text style={styles.batchName}>Batch: {item.batch_id?.name}</Text>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', margin: 15, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#E5E7EB' },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16 },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { color: '#6B7280', fontSize: 16, marginTop: 15 },
  card: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 15, padding: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#1E3A8A' },
  info: { flex: 1 },
  name: { fontSize: 18, fontWeight: 'bold', color: '#1F2937' },
  email: { color: '#6B7280', fontSize: 14, marginTop: 2 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 12 },
  batchInfo: { flexDirection: 'column', alignItems: 'flex-start' },
  badge: { backgroundColor: '#FEF3C7', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8 },
  badgeText: { color: '#92400E', fontSize: 12, fontWeight: 'bold' },
  batchName: { color: '#4B5563', fontSize: 14, fontWeight: '500' }
});
