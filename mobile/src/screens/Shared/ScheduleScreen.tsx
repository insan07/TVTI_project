import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

import { SafeAreaView } from 'react-native-safe-area-context';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleScreen() {
  const { user } = useContext(AuthContext) as any;
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Mon');

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    setLoading(true);
    try {
      const endpoint = user.role === 'student' ? 'students' : 'instructors';
      const res = await api.get(`/${endpoint}/my-schedule`);
      setBatches(res.data);
    } catch (e) {
      console.warn('Failed to fetch schedule', e);
    } finally {
      setLoading(false);
    }
  };

  const daySessions = batches.filter(b => b.schedule_json?.days?.includes(selectedDay));

  const renderSession = ({ item }: { item: any }) => (
    <View style={styles.card}>
      <View style={styles.timeTag}>
        <Text style={styles.timeText}>TBD</Text> 
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.courseTitle}>{item.course_id?.title}</Text>
        {user.role === 'student' ? (
          <Text style={styles.infoText}>Instructor: {item.instructor_ids?.map((i:any)=>i.name).join(', ') || 'TBD'}</Text>
        ) : (
          <View>
            <Text style={styles.infoText}>Batch ID: {item._id.toString().slice(-4)}</Text>
            <Text style={styles.infoText}>Students: {item.enrolled_count} / {item.capacity}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.calendarStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS.map(day => (
            <TouchableOpacity key={day} style={[styles.dayBtn, selectedDay === day && styles.dayBtnActive]} onPress={() => setSelectedDay(day)}>
              <Text style={[styles.dayText, selectedDay === day && styles.dayTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? <ActivityIndicator size="large" color="#2563EB" style={{marginTop: 50}} /> : (
        <FlatList
          data={daySessions}
          keyExtractor={i => i._id}
          renderItem={renderSession}
          contentContainerStyle={{paddingBottom: 20}}
          ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 40}}>No classes scheduled for {selectedDay}.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  calendarStrip: { backgroundColor: '#fff', paddingVertical: 15, paddingHorizontal: 10, elevation: 2 },
  dayBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginHorizontal: 4 },
  dayBtnActive: { backgroundColor: '#2563EB' },
  dayText: { fontWeight: '600', color: '#6B7280' },
  dayTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 16, borderRadius: 12, elevation: 2, flexDirection: 'row', overflow: 'hidden' },
  timeTag: { backgroundColor: '#DBEAFE', paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', width: 80 },
  timeText: { color: '#1D4ED8', fontWeight: 'bold', textAlign: 'center' },
  cardContent: { padding: 16, flex: 1 },
  courseTitle: { fontSize: 16, fontWeight: 'bold', color: '#1F2937', marginBottom: 4 },
  infoText: { color: '#4B5563', fontSize: 14 }
});
