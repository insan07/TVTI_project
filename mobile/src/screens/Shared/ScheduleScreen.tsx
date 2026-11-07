import React, { useState, useEffect, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ScreenBackground from '../../components/shared/ScreenBackground';
import ScreenHeader from '../../components/shared/ScreenHeader';
import { FONTS } from '../../config/theme';

import { SafeAreaView } from 'react-native-safe-area-context';
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ScheduleScreen() {
  const { user } = useContext(AuthContext) as any;
  const { isDark } = useTheme();
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
    <View style={[
      styles.card,
      isDark && { backgroundColor: '#141B26', borderColor: 'rgba(255, 255, 255, 0.08)' }
    ]}>
      <View style={[styles.timeTag, isDark && { backgroundColor: 'rgba(249, 115, 22, 0.15)' }]}>
        <Text style={[styles.timeText, isDark && { color: '#FB923C' }]}>TBD</Text> 
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.courseTitle, isDark && { color: '#FFFFFF' }]}>{item.course_id?.title}</Text>
        {user.role === 'student' ? (
          <Text style={[styles.infoText, isDark && { color: '#94A3B8' }]}>Instructor: {item.instructor_ids?.map((i:any)=>i.name).join(', ') || 'TBD'}</Text>
        ) : (
          <View>
            <Text style={[styles.infoText, isDark && { color: '#94A3B8' }]}>Batch ID: {item._id.toString().slice(-4)}</Text>
            <Text style={[styles.infoText, isDark && { color: '#94A3B8' }]}>Students: {item.enrolled_count} / {item.capacity}</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDark && { backgroundColor: '#0B0F19' }]} edges={['top']}>
      <ScreenBackground />
      <ScreenHeader title="Weekly Schedule" subtitle="View scheduled classes & sessions" showBack={true} />
      <View style={[styles.calendarStrip, isDark && { backgroundColor: '#141B26', borderBottomColor: 'rgba(255, 255, 255, 0.08)' }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {DAYS.map(day => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayBtn,
                isDark && { backgroundColor: 'rgba(255, 255, 255, 0.05)' },
                selectedDay === day && styles.dayBtnActive,
              ]}
              onPress={() => setSelectedDay(day)}
            >
              <Text style={[styles.dayText, isDark && { color: '#94A3B8' }, selectedDay === day && styles.dayTextActive]}>{day}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? <ActivityIndicator size="large" color="#F97316" style={{marginTop: 50}} /> : (
        <FlatList
          data={daySessions}
          keyExtractor={i => i._id}
          renderItem={renderSession}
          contentContainerStyle={{paddingBottom: 20}}
          ListEmptyComponent={
            <Text style={[{textAlign: 'center', marginTop: 40, color: '#6B7280'}, isDark && { color: '#94A3B8' }]}>
              No classes scheduled for {selectedDay}.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  calendarStrip: { backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  dayBtn: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginHorizontal: 4 },
  dayBtnActive: { backgroundColor: '#F97316' },
  dayText: { fontWeight: '600', color: '#6B7280', fontSize: 13 },
  dayTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', flexDirection: 'row', overflow: 'hidden' },
  timeTag: { backgroundColor: 'rgba(249, 115, 22, 0.1)', paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', width: 75 },
  timeText: { color: '#EA580C', fontWeight: 'bold', textAlign: 'center', fontSize: 13 },
  cardContent: { padding: 14, flex: 1 },
  courseTitle: { fontSize: 15, fontWeight: 'bold', color: '#0F172A', marginBottom: 4 },
  infoText: { color: '#64748B', fontSize: 13, marginTop: 2 }
});
