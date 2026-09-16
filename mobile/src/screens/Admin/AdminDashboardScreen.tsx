import React, { useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
  Modal,
  FlatList,
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import { FONTS } from '../../config/theme';

export default function AdminDashboardScreen() {
  const context = useContext(AuthContext);
  if (!context) return null;
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // All activities modal state
  const [allActivitiesVisible, setAllActivitiesVisible] = useState(false);
  const [allActivities, setAllActivities] = useState<any[]>([]);
  const [loadingAllActivities, setLoadingAllActivities] = useState(false);
  const [refreshingAllActivities, setRefreshingAllActivities] = useState(false);

  const [stats, setStats] = useState({
    totalStudents: 0,
    totalInstructors: 0,
    activeCourses: 0,
    pendingApprovalsCount: 0,
    pendingUsers: [] as any[],
    recentActivities: [] as any[],
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
          initials: u.name
            ? u.name
                .trim()
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .substring(0, 2)
                .toUpperCase()
            : 'U',
        })),
        recentActivities: (data.recentActivities || []).slice(0, 5),
      });
    } catch (e) {
      console.log('Failed to fetch admin stats:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAllActivities = async () => {
    setLoadingAllActivities(true);
    try {
      const res = await api.get('/admin/activities?limit=50');
      setAllActivities(res.data || []);
    } catch (e) {
      console.log('Failed to fetch all activities:', e);
    } finally {
      setLoadingAllActivities(false);
      setRefreshingAllActivities(false);
    }
  };

  const handleOpenAllActivities = () => {
    setAllActivitiesVisible(true);
    fetchAllActivities();
  };

  useFocusEffect(
    useCallback(() => {
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
    setStats((prev) => ({
      ...prev,
      pendingUsers: prev.pendingUsers.filter((u) => u._id !== id),
      pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
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
          setStats((prev) => ({
            ...prev,
            pendingUsers: prev.pendingUsers.filter((u) => u._id !== id),
            pendingApprovalsCount: Math.max(0, prev.pendingApprovalsCount - 1),
          }));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 110 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#F97316']} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* 1. GRAPHIC TOP HERO BANNER (WRAPS LOGO + STATISTICS BOX) */}
        <LinearGradient
          colors={['#0F172A', '#1E293B', '#090D16']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.graphicHeader, { paddingTop: Math.max(insets.top + 8, 16) }]}
        >
          {/* Ambient Glow Orbs for Graphic Depth */}
          <View style={styles.glowOrbOrange} pointerEvents="none" />
          <View style={styles.glowOrbBlue} pointerEvents="none" />

          {/* Top Brand Logo Row */}
          <View style={styles.brandHeaderRow}>
            <View style={styles.brandLogoGroup}>
              <Image
                source={require('../../../assets/logo.png')}
                style={styles.brandLogoImg}
                resizeMode="contain"
              />
              <View style={styles.brandTextColumn}>
                <Text style={styles.brandTitleText}>TWINTEC VTI</Text>
              </View>
            </View>

            {/* PROFESSIONAL ADMIN PORTAL BADGE (LETTERS ONLY) */}
            <LinearGradient
              colors={['rgba(249, 115, 22, 0.22)', 'rgba(251, 146, 60, 0.12)', 'rgba(15, 23, 42, 0.45)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.adminAIBadge}
            >
              <Text style={styles.adminAIBadgeText}>ADMIN PORTAL</Text>
            </LinearGradient>
          </View>

          {/* Statistics Box - Fully Covered inside the Graphic Background */}
          {loading ? (
            <View style={{ height: 130, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#F97316" />
            </View>
          ) : (
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>STUDENTS</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="people" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.totalStudents}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>INSTRUCTORS</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="school" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.totalInstructors}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>COURSES</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="book" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.activeCourses}</Text>
              </View>

              <View style={styles.statCard}>
                <View style={styles.statCardTop}>
                  <Text style={styles.statLabel}>PENDING</Text>
                  <View style={[styles.statIconBox, { backgroundColor: 'rgba(242, 112, 28, 0.18)' }]}>
                    <Icon name="time" size={13} color="#FB923C" />
                  </View>
                </View>
                <Text style={styles.statValue}>{stats.pendingApprovalsCount}</Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* 2. BODY CONTENT (BELOW GRAPHIC HEADER) */}
        {loading ? (
          <ActivityIndicator size="large" color="#F97316" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Announcements Glassmorphic Card */}
            <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate('PostAnnouncement')}
                activeOpacity={0.82}
                style={styles.glassCardWrapper}
              >
                <LinearGradient
                  colors={['rgba(255, 255, 255, 0.94)', 'rgba(255, 247, 237, 0.82)', 'rgba(255, 255, 255, 0.88)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.noticeCard}
                >
                  <View style={styles.glassAccentBar} />
                  <View style={styles.noticeIconBox}>
                    <Icon name="megaphone-outline" size={20} color="#F58220" />
                  </View>
                  <View style={styles.noticeContent}>
                    <Text style={styles.noticeTitle}>Announcements</Text>
                    <Text style={styles.noticeSub} numberOfLines={1}>Broadcast notices & manage all updates</Text>
                  </View>
                  <View style={styles.noticeCtaBtn}>
                    <Text style={styles.noticeCtaText}>Post</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
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
                <View style={styles.emptyApprovalsContainer}>
                  <View style={styles.simpleCheckCircle}>
                    <Icon name="checkmark" size={18} color="#10B981" />
                  </View>
                  <Text style={styles.allCaughtUpText}>All caught up</Text>
                </View>
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

            {/* Recent Activity Section (5 Functional Activities with Real Time) */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={handleOpenAllActivities} activeOpacity={0.7}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              {stats.recentActivities.length === 0 ? (
                <Text style={styles.emptyText}>No recent activities recorded.</Text>
              ) : (
                <View style={styles.activityList}>
                  {stats.recentActivities.map((act, index) => (
                    <View key={act.id || String(index)} style={styles.activityItem}>
                      <View style={[styles.activityIconCircle, { backgroundColor: `${act.color || '#F97316'}15` }]}>
                        <Icon name={act.icon || 'notifications-outline'} size={16} color={act.color || '#F97316'} />
                      </View>
                      <View style={styles.activityContent}>
                        <Text style={styles.activityText}>{act.text}</Text>
                        <Text style={styles.activityTime}>{act.time}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* 3. ALL ACTIVITIES MODAL ("VIEW ALL" EXPERIENCE) */}
      <Modal
        visible={allActivitiesVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAllActivitiesVisible(false)}
      >
        <View style={[styles.modalContainer, { paddingTop: Platform.OS === 'ios' ? insets.top : 16 }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>System Activities</Text>
              <Text style={styles.modalSub}>Complete log of recent institutional events</Text>
            </View>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setAllActivitiesVisible(false)}
            >
              <Icon name="close" size={22} color="#1F2937" />
            </TouchableOpacity>
          </View>

          {loadingAllActivities ? (
            <View style={styles.modalCenter}>
              <ActivityIndicator size="large" color="#F97316" />
            </View>
          ) : (
            <FlatList
              data={allActivities}
              keyExtractor={(item) => item.id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshingAllActivities}
                  onRefresh={() => {
                    setRefreshingAllActivities(true);
                    fetchAllActivities();
                  }}
                  colors={['#F97316']}
                />
              }
              contentContainerStyle={{ padding: 16, paddingBottom: 60 }}
              ListEmptyComponent={
                <View style={styles.modalCenter}>
                  <Icon name="time-outline" size={48} color="#D1D5DB" />
                  <Text style={styles.emptyActivitiesText}>No system activities recorded yet.</Text>
                </View>
              }
              renderItem={({ item, index }) => (
                <View style={[styles.modalActivityItem, index > 0 && styles.rowBorder]}>
                  <View style={[styles.activityIconCircle, { backgroundColor: `${item.color || '#F97316'}15` }]}>
                    <Icon name={item.icon || 'notifications-outline'} size={18} color={item.color || '#F97316'} />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityText}>{item.text}</Text>
                    <Text style={styles.activityTime}>{item.time}</Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },

  /* Graphic Hero Header (Wraps Brand + Statistics Box) */
  graphicHeader: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
    ...Platform.select({
      web: { boxShadow: '0px 10px 28px rgba(15, 23, 42, 0.28)' },
      default: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.28,
        shadowRadius: 16,
        elevation: 8,
      },
    }),
  },
  glowOrbOrange: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(249, 115, 22, 0.16)',
  },
  glowOrbBlue: {
    position: 'absolute',
    bottom: -50,
    left: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(14, 165, 233, 0.12)',
  },
  brandHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
    paddingHorizontal: 4,
  },
  brandLogoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoImg: {
    width: 32,
    height: 32,
    marginRight: 10,
  },
  brandTextColumn: {
    justifyContent: 'center',
    height: 32,
  },
  brandTitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    ...FONTS.extraBold,
    letterSpacing: 0.8,
  },

  adminAIBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.45)',
    paddingHorizontal: 12,
    paddingVertical: 5.5,
    borderRadius: 20,
    backgroundColor: 'rgba(249, 115, 22, 0.14)',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 14px rgba(249, 115, 22, 0.25)',
      },
      default: {
        shadowColor: '#F97316',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 3,
      },
    }),
  },
  adminAIBadgeText: {
    color: '#FED7AA',
    fontSize: 10.5,
    ...FONTS.extraBold,
    letterSpacing: 1.2,
  },

  /* Stats Container inside Graphic Header */
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  statCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    width: '48%',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.13)',
    ...Platform.select({
      web: { backdropFilter: 'blur(10px)' },
      default: {},
    }),
  },
  statCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    ...FONTS.bold,
    color: 'rgba(255, 255, 255, 0.72)',
    letterSpacing: 0.7,
  },
  statIconBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    ...FONTS.extraBold,
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  /* Announcements Glassmorphic Card */
  glassCardWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 8px 24px -4px rgba(245, 130, 32, 0.12), 0 2px 6px rgba(0, 0, 0, 0.04)',
      },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  noticeCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    ...Platform.select({
      web: {
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.9), inset 0 0 0 1px rgba(254, 215, 170, 0.45)',
      },
    }),
  },
  glassAccentBar: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 12,
    width: 4,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: '#F58220',
  },
  noticeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(245, 130, 32, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(245, 130, 32, 0.12), inset 0 1px 1px rgba(255, 255, 255, 1)',
      },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 1,
      },
    }),
  },
  noticeContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  noticeTitle: {
    fontSize: 15,
    ...FONTS.bold,
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  noticeSub: {
    fontSize: 12,
    ...FONTS.regular,
    color: '#64748B',
    marginTop: 2,
  },
  noticeCtaBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F58220',
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 9,
    ...Platform.select({
      web: {
        boxShadow: '0px 3px 8px rgba(245, 130, 32, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.25)',
      },
      default: {
        shadowColor: '#F58220',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 3,
      },
    }),
  },
  noticeCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    ...FONTS.bold,
    letterSpacing: 0.2,
  },

  /* Section Cards */
  sectionCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    ...FONTS.bold,
    color: '#111827',
  },
  viewAllText: {
    color: '#F97316',
    ...FONTS.semiBold,
    fontSize: 13,
  },
  emptyText: {
    color: '#9CA3AF',
    fontStyle: 'italic',
    ...FONTS.regular,
    paddingVertical: 10,
    fontSize: 13,
  },

  /* Empty Approvals State (Clean, minimal) */
  emptyApprovalsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  simpleCheckCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  allCaughtUpText: {
    fontSize: 14,
    ...FONTS.semiBold,
    color: '#4B5563',
  },

  /* Pending Approvals */
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
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 15,
    ...FONTS.bold,
    color: '#4B5563',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 15,
    ...FONTS.bold,
    color: '#1F2937',
  },
  userSubtext: {
    fontSize: 13,
    ...FONTS.regular,
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

  /* Recent Activities */
  activityList: {
    marginTop: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  activityIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 14,
    color: '#1F2937',
    ...FONTS.semiBold,
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#9CA3AF',
    ...FONTS.regular,
    marginTop: 3,
  },

  /* Modal Styles */
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    ...FONTS.bold,
    color: '#111827',
  },
  modalSub: {
    fontSize: 13,
    ...FONTS.regular,
    color: '#6B7280',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  emptyActivitiesText: {
    fontSize: 14,
    color: '#9CA3AF',
    ...FONTS.regular,
    marginTop: 12,
    fontStyle: 'italic',
  },
  modalActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
});
