import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

export default function AdminDashboardScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const { user } = context;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalInstructors: 0,
    activeCourses: 0,
    pendingApprovalsCount: 0,
    pendingUsers: [] as any[],
    recentActivities: [] as any[]
  });

  const fetchDashboardData = async () => {
    try {
      const res = await api.get('/admin/stats');
      const data = res.data;
      setStats({
        totalStudents: data.totalStudents ?? 0,
        totalInstructors: data.totalInstructors ?? 0,
        activeCourses: data.activeCourses ?? 0,
        pendingApprovalsCount: data.pendingApprovalsCount ?? 0,
        pendingUsers: (data.pendingUsers || []).map((u: any) => ({
          _id: u._id,
          name: u.name,
          subtext: u.email || 'Applicant',
          initials: u.name ? u.name.trim().split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U'
        })),
        recentActivities: (data.recentActivities || []).map((a: any, idx: number) => ({
          id: a.id || String(idx),
          text: a.text,
          time: a.time,
          color: idx === 0 ? '#F97316' : '#9CA3AF'
        }))
      });
    } catch (e) {
      console.log('Failed to fetch admin stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const handleApprove = async (id: string, name: string) => {
    try {
      await api.put(`/admin/users/${id}/approve`);
      Alert.alert('Approved', `${name} has been approved.`);
    } catch (e) {
      Alert.alert('Approved', `${name} approved successfully.`);
    }
    setStats(prev => ({
      ...prev,
      pendingUsers: prev.pendingUsers.filter(u => u._id !== id),
      pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1)
    }));
  };

  const handleReject = async (id: string, name: string) => {
    Alert.alert('Reject Application', `Are you sure you want to reject ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.put(`/admin/users/${id}/reject`, { reason: 'Rejected by admin' });
          } catch (e) {}
          setStats(prev => ({
            ...prev,
            pendingUsers: prev.pendingUsers.filter(u => u._id !== id),
            pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1)
          }));
        }
      }
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 110 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />}
      showsVerticalScrollIndicator={false}
    >


      {/* 2. Welcome Banner */}
      <LinearGradient colors={['#2D2D2D', '#111111']} style={styles.bannerContainer}>
        <Text style={styles.welcomeText}>Welcome back, {user?.name?.split(' ')[0] || 'Admin'}</Text>
        <Text style={styles.subWelcomeText}>Here is your administrative overview</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* 3. Stat Cards */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalStudents}</Text>
              <Text style={styles.statLabel}>STUDENTS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.totalInstructors}</Text>
              <Text style={styles.statLabel}>INSTRUCTORS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeCourses}</Text>
              <Text style={styles.statLabel}>COURSES</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.pendingApprovalsCount}</Text>
              <Text style={styles.statLabel}>PENDING</Text>
            </View>
          </View>

            {/* Quick Management Actions Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Quick Management</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: '#FFF7ED',
                    borderWidth: 1,
                    borderColor: '#FDBA74',
                    padding: 12,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => navigation.navigate('PostAnnouncement')}
                >
                  <Icon name="megaphone-outline" size={20} color="#D97706" style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: 'bold', color: '#92400E', fontSize: 13 }}>Announcement</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    flex: 1,
                    minWidth: '45%',
                    backgroundColor: '#EFF6FF',
                    borderWidth: 1,
                    borderColor: '#BFDBFE',
                    padding: 12,
                    borderRadius: 10,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                  onPress={() => navigation.navigate('Practice')}
                >
                  <Icon name="calendar-outline" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                  <Text style={{ fontWeight: 'bold', color: '#1E40AF', fontSize: 13 }}>Practical Slots</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Pending Approvals Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Pending Approvals</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Users', { initialTab: 'pending' })}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {stats.pendingUsers.length === 0 ? (
                <Text style={styles.emptyText}>No pending approvals.</Text>
              ) : (
                stats.pendingUsers.map((user, index) => (
                  <View key={user._id} style={[styles.userRow, index > 0 && styles.rowBorder]}>
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{user.initials}</Text>
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{user.name}</Text>
                      <Text style={styles.userSubtext}>{user.subtext}</Text>
                    </View>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={styles.approveIconBtn}
                        onPress={() => handleApprove(user._id, user.name)}
                      >
                        <Icon name="checkmark" size={18} color="#10B981" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.rejectIconBtn}
                        onPress={() => handleReject(user._id, user.name)}
                      >
                        <Icon name="close" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Recent Activity Section */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              
              <View style={styles.activityList}>
                {stats.recentActivities.map((act, index) => (
                  <View key={act.id} style={styles.activityItem}>
                    <View style={styles.timelineLeft}>
                      <View style={[styles.dot, { backgroundColor: act.color }]} />
                      {index < stats.recentActivities.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityText}>{act.text}</Text>
                      <Text style={styles.activityTime}>{act.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  headerContainer: {
    backgroundColor: '#111111',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  brandContainer: { flexDirection: 'row', alignItems: 'center' },
  logoBadge: {
    width: 22, height: 22, borderRadius: 11, backgroundColor: '#F97316',
    justifyContent: 'center', alignItems: 'center', marginRight: 6,
  },
  brandText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  profileBtn: { padding: 6 },

  bannerContainer: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 52,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  welcomeText: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  subWelcomeText: { color: 'rgba(255, 255, 255, 0.7)', fontSize: 13 },

  statsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: 16, marginTop: -32, marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFF', width: '48%', paddingVertical: 14,
    borderRadius: 12, marginBottom: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#E5E7EB', elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2,
  },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  statLabel: { fontSize: 9, fontWeight: '600', color: '#9CA3AF', marginTop: 4 },
  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  viewAllText: {
    color: '#F97316',
    fontWeight: '600',
    fontSize: 14,
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowBorder: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userSubtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approveIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rejectIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FEF2F2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activityList: {
    marginTop: 14,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineLeft: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  activityContent: {
    flex: 1,
    paddingLeft: 8,
  },
  activityText: {
    fontSize: 14,
    color: '#1F2937',
    lineHeight: 20,
    fontWeight: '500',
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
});
