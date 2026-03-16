import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useProfile } from '../hooks/useProfile';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

const SettingRow = ({ icon, title, subtitle, onPress, showArrow = true }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress}>
    <View style={styles.settingIcon}>
      <Text style={styles.settingEmoji}>{icon}</Text>
    </View>
    <View style={styles.settingInfo}>
      <Text style={styles.settingTitle}>{title}</Text>
      {subtitle && <Text style={styles.settingSub}>{subtitle}</Text>}
    </View>
    {showArrow && <Text style={styles.settingArrow}>›</Text>}
  </TouchableOpacity>
);

const ProfileScreen = ({ navigation }) => {
  const { logout } = useAuth();
  const {
    profile,
    riskScore,
    riskLabel,
    emergencyFund,
    connectedAccounts,
    loading,
    refreshing,
    onRefresh,
  } = useProfile();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            navigation.replace('Auth');
          },
        },
      ]
    );
  };

  const riskColor = riskScore < 40 ? '#4effd6' : riskScore < 70 ? '#ffd166' : '#ff6b6b';
  const initials = (profile.name || 'Sarthak Negi')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#7c6aff" colors={['#7c6aff']} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editBtn}>
            <Text style={styles.editIcon}>✏️</Text>
          </TouchableOpacity>
        </View>

        {/* Avatar & Info */}
        <View style={styles.profileCard}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <Text style={styles.profileName}>{profile.name || 'Sarthak Negi'}</Text>
          <Text style={styles.profileEmail}>{profile.email || 'sarthak@unispend.com'}</Text>
          <View style={styles.memberBadge}>
            <Text style={styles.memberText}>🥇 Gold Member</Text>
          </View>
        </View>

        {/* Risk Score Gauge */}
        <View style={styles.riskCard}>
          <Text style={styles.cardTitle}>Risk Score</Text>
          <View style={styles.riskGauge}>
            <View style={styles.riskCircleOuter}>
              <View style={styles.riskCircleInner}>
                <Text style={[styles.riskScoreText, { color: riskColor }]}>{riskScore}</Text>
                <Text style={styles.riskOutOf}>/100</Text>
              </View>
            </View>
            <View style={[styles.riskIndicator, {
              backgroundColor: riskColor,
              transform: [{ rotate: `${(riskScore / 100) * 360}deg` }],
            }]} />
          </View>
          <Text style={[styles.riskLabel, { color: riskColor }]}>{riskLabel}</Text>
          <Text style={styles.riskDesc}>Based on your portfolio and spending patterns</Text>
        </View>

        {/* Emergency Fund */}
        <View style={styles.emergencyCard}>
          <View style={styles.emergencyHeader}>
            <Text style={styles.cardTitle}>Emergency Fund</Text>
            <Text style={styles.emergencyTarget}>
              ₹{emergencyFund.current.toLocaleString()} / ₹{emergencyFund.target.toLocaleString()}
            </Text>
          </View>
          <View style={styles.emergencyBarBg}>
            <LinearGradient
              colors={['#4effd6', '#2cb5a0']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.emergencyBarFill, {
                width: `${Math.min((emergencyFund.current / emergencyFund.target) * 100, 100)}%`,
              }]}
            />
          </View>
          <Text style={styles.emergencyPct}>
            {Math.round((emergencyFund.current / emergencyFund.target) * 100)}% of goal reached
          </Text>
        </View>

        {/* Connected Accounts */}
        <View style={styles.accountsCard}>
          <Text style={styles.cardTitle}>Connected Accounts</Text>
          {connectedAccounts.map((account, idx) => (
            <View key={idx} style={styles.accountRow}>
              <View style={[styles.accountIcon, { backgroundColor: account.color + '22' }]}>
                <Text style={styles.accountEmoji}>{account.icon}</Text>
              </View>
              <View style={styles.accountInfo}>
                <Text style={styles.accountName}>{account.name}</Text>
                <Text style={styles.accountType}>{account.type}</Text>
              </View>
              <View style={styles.accountStatus}>
                <View style={[styles.statusDot, { backgroundColor: account.connected ? '#4effd6' : '#ff6b6b' }]} />
                <Text style={[styles.statusText, { color: account.connected ? '#4effd6' : '#ff6b6b' }]}>
                  {account.connected ? 'Active' : 'Disconnected'}
                </Text>
              </View>
            </View>
          ))}
          <TouchableOpacity style={styles.addAccountBtn}>
            <Text style={styles.addAccountIcon}>+</Text>
            <Text style={styles.addAccountText}>Link Another Account</Text>
          </TouchableOpacity>
        </View>

        {/* Settings */}
        <Text style={styles.sectionTitle}>Settings</Text>
        <View style={styles.settingsGroup}>
          <SettingRow icon="🔔" title="Notifications" subtitle="Alerts & Reminders" />
          <SettingRow icon="🔒" title="Security" subtitle="Password, 2FA" />
          <SettingRow icon="💳" title="Payment Methods" subtitle="Manage cards" />
          <SettingRow icon="🌙" title="Appearance" subtitle="Dark Mode" />
          <SettingRow icon="📊" title="Data & Privacy" subtitle="Export your data" />
          <SettingRow icon="❓" title="Help & Support" subtitle="FAQs & Contact" />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutIcon}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Unispend v1.0.0</Text>

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 54 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20,
  },
  headerTitle: { color: '#f0efff', fontSize: 24, fontWeight: '700' },
  editBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#17171f',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  editIcon: { fontSize: 16 },
  profileCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 28, alignItems: 'center', marginBottom: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  avatarLarge: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#7c6aff',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
    borderWidth: 3, borderColor: 'rgba(124, 106, 255, 0.4)',
  },
  avatarInitials: { color: '#fff', fontSize: 28, fontWeight: '700' },
  profileName: { color: '#f0efff', fontSize: 22, fontWeight: '700', marginBottom: 4 },
  profileEmail: { color: '#8884a8', fontSize: 14, marginBottom: 12 },
  memberBadge: {
    backgroundColor: 'rgba(255, 209, 102, 0.12)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6,
  },
  memberText: { color: '#ffd166', fontSize: 13, fontWeight: '600' },
  riskCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 24, alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  cardTitle: { color: '#f0efff', fontSize: 16, fontWeight: '700', marginBottom: 16 },
  riskGauge: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 12 },
  riskCircleOuter: {
    width: 110, height: 110, borderRadius: 55, borderWidth: 10,
    borderColor: 'rgba(124, 106, 255, 0.15)', alignItems: 'center', justifyContent: 'center',
  },
  riskCircleInner: { alignItems: 'center' },
  riskScoreText: { fontSize: 32, fontWeight: '700' },
  riskOutOf: { color: '#8884a8', fontSize: 12 },
  riskIndicator: {
    position: 'absolute', width: 12, height: 12, borderRadius: 6, top: 0,
  },
  riskLabel: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  riskDesc: { color: '#8884a8', fontSize: 12, textAlign: 'center' },
  emergencyCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginBottom: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  emergencyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  emergencyTarget: { color: '#4effd6', fontSize: 13, fontWeight: '700' },
  emergencyBarBg: { height: 8, backgroundColor: '#2a2a3a', borderRadius: 4, marginBottom: 8 },
  emergencyBarFill: { height: 8, borderRadius: 4 },
  emergencyPct: { color: '#8884a8', fontSize: 12 },
  accountsCard: {
    backgroundColor: '#17171f', borderRadius: 20, padding: 20, marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  accountRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  accountIcon: {
    width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  accountEmoji: { fontSize: 18 },
  accountInfo: { flex: 1 },
  accountName: { color: '#f0efff', fontSize: 14, fontWeight: '600' },
  accountType: { color: '#8884a8', fontSize: 12, marginTop: 1 },
  accountStatus: { flexDirection: 'row', alignItems: 'center' },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600' },
  addAccountBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 14, marginTop: 8,
  },
  addAccountIcon: { color: '#7c6aff', fontSize: 18, marginRight: 8 },
  addAccountText: { color: '#7c6aff', fontSize: 14, fontWeight: '600' },
  sectionTitle: { color: '#f0efff', fontSize: 18, fontWeight: '700', marginBottom: 14 },
  settingsGroup: {
    backgroundColor: '#17171f', borderRadius: 20, overflow: 'hidden', marginBottom: 24,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  settingIcon: {
    width: 38, height: 38, borderRadius: 10, backgroundColor: '#1e1e28',
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
  settingEmoji: { fontSize: 16 },
  settingInfo: { flex: 1 },
  settingTitle: { color: '#f0efff', fontSize: 14, fontWeight: '600' },
  settingSub: { color: '#8884a8', fontSize: 12, marginTop: 1 },
  settingArrow: { color: '#8884a8', fontSize: 22, fontWeight: '300' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.08)', borderRadius: 16,
    paddingVertical: 16, borderWidth: 1, borderColor: 'rgba(255, 107, 107, 0.2)', marginBottom: 16,
  },
  logoutIcon: { fontSize: 18, marginRight: 8 },
  logoutText: { color: '#ff6b6b', fontSize: 16, fontWeight: '700' },
  versionText: { color: '#8884a8', fontSize: 12, textAlign: 'center', marginBottom: 10 },
});

export default ProfileScreen;
