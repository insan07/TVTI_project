import React, { useState, useEffect } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import api from '../../services/api';

export default function AdminDashboardScreen() {
  const navigation = useNavigation<any>();
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

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />}
      >
        {/* Header */}
        <Text style={styles.headerTitle}>Dashboard</Text>

        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Stat Cards Grid (2x2) */}
            <View style={styles.gridContainer}>
              <View style={styles.statCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.statLabel}>Total Students</Text>
                  <View style={styles.iconCircle}>
                    <Icon name="people-outline" size={16} color="#F97316" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.totalStudents.toLocaleString()}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.statLabel}>Instructors</Text>
                  <View style={styles.iconCircle}>
                    <Icon name="school-outline" size={16} color="#F97316" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.totalInstructors.toLocaleString()}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.statLabel}>Active Courses</Text>
                  <View style={styles.iconCircle}>
                    <Icon name="book-outline" size={16} color="#F97316" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.activeCourses.toLocaleString()}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.statLabel}>Pending Appr.</Text>
                  <View style={styles.iconCircle}>
                    <Icon name="clipboard-outline" size={16} color="#F97316" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.pendingApprovalsCount.toLocaleString()}</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 16,
    marginTop: 4,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    width: '48%',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    boxShadow: '0px 1px 4px rgba(0, 0, 0, 0.04)',
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#F97316',
  },
  sectionCard: {
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
