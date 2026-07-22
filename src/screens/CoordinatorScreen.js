import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { loadWeeklyLogs } from '../utils/storage';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export default function CoordinatorScreen({ profile, onBack }) {
  const [allLogs, setAllLogs] = useState({});
  const totalWeeks = profile?.weeks || 0;

  useEffect(() => {
    (async () => {
      const logs = await loadWeeklyLogs();
      setAllLogs(logs);
    })();
  }, []);

  const totalPossible = totalWeeks * 5;
  const totalFilled = Object.keys(allLogs).reduce((acc, wk) => {
    return acc + DAYS.filter((d) => allLogs[wk]?.[d]?.trim()).length;
  }, 0);
  const completionPct = totalPossible > 0 ? Math.round((totalFilled / totalPossible) * 100) : 0;
  const weeksData = Array.from({ length: totalWeeks }, (_, i) => {
    const wk = `week_${i + 1}`;
    const days = allLogs[wk] || {};
    const filled = DAYS.filter((d) => days[d]?.trim()).length;
    return { week: i + 1, filled, complete: filled === 5 };
  });
  const completedWeeks = weeksData.filter((w) => w.complete).length;

  const handleExportReport = () => {
    Alert.alert('Export Report', 'Full coordinator report export will be available in the final deployment.');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Coordinator Dashboard</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>COORDINATOR</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Student Overview Card */}
        <View style={styles.overviewCard}>
          <Text style={styles.overviewTitle}>Student Overview</Text>
          <View style={styles.overviewRow}>
            <OverviewStat label="Student" value={profile?.name || '—'} />
            <OverviewStat label="Index No." value={profile?.indexNumber || '—'} />
          </View>
          <View style={styles.overviewRow}>
            <OverviewStat label="Company" value={profile?.company || '—'} />
            <OverviewStat label="Duration" value={`${totalWeeks} wks`} />
          </View>
        </View>

        {/* Progress Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Attachment Progress</Text>
          <View style={styles.progressStats}>
            <ProgressStat label="Overall" value={`${completionPct}%`} color="#1A1A1A" />
            <ProgressStat label="Weeks Done" value={`${completedWeeks}/${totalWeeks}`} color="#1A1A1A" />
            <ProgressStat label="Days Logged" value={`${totalFilled}/${totalPossible}`} color="#1A1A1A" />
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${completionPct}%` }]} />
          </View>
          <Text style={styles.progressHint}>{completionPct}% of attachment period logged</Text>
        </View>

        {/* Week-by-Week Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Week-by-Week Breakdown</Text>
          {weeksData.map((w) => (
            <View key={w.week} style={styles.weekRow}>
              <Text style={styles.weekRowLabel}>Week {w.week}</Text>
              <View style={styles.weekRowTrack}>
                <View
                  style={[
                    styles.weekRowFill,
                    { width: `${Math.round((w.filled / 5) * 100)}%` },
                    w.complete && styles.weekRowFillComplete,
                  ]}
                />
              </View>
              <Text style={styles.weekRowCount}>{w.filled}/5</Text>
              {w.complete && <Text style={styles.weekRowCheck}>✓</Text>}
            </View>
          ))}
        </View>

        {/* Compliance Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Compliance Summary</Text>
          <View style={styles.complianceRow}>
            <ComplianceItem
              label="Log Completeness"
              status={completionPct >= 80 ? 'Pass' : 'Incomplete'}
              pass={completionPct >= 80}
            />
            <ComplianceItem
              label="Min. Weeks Required"
              status={totalWeeks >= 4 ? 'Met' : 'Review'}
              pass={totalWeeks >= 4}
            />
            <ComplianceItem
              label="Profile Verified"
              status={profile?.name ? 'Pass' : 'Missing'}
              pass={!!profile?.name}
            />
          </View>
        </View>

        {/* Export Button */}
        <View style={styles.exportSection}>
          <TouchableOpacity style={styles.exportBtn} onPress={handleExportReport}>
            <Text style={styles.exportBtnText}>EXPORT COORDINATOR REPORT</Text>
          </TouchableOpacity>
          <Text style={styles.exportHint}>
            Exports a full PDF report including all weekly entries and compliance data.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

function OverviewStat({ label, value }) {
  return (
    <View style={styles.overviewStat}>
      <Text style={styles.overviewStatLabel}>{label}</Text>
      <Text style={styles.overviewStatValue}>{value}</Text>
    </View>
  );
}

function ProgressStat({ label, value, color }) {
  return (
    <View style={styles.progressStatBox}>
      <Text style={[styles.progressStatValue, { color }]}>{value}</Text>
      <Text style={styles.progressStatLabel}>{label}</Text>
    </View>
  );
}

function ComplianceItem({ label, status, pass }) {
  return (
    <View style={styles.complianceItem}>
      <View style={[styles.complianceDot, pass ? styles.complianceDotPass : styles.complianceDotFail]} />
      <Text style={styles.complianceLabel}>{label}</Text>
      <Text style={[styles.complianceStatus, pass ? styles.compliancePass : styles.complianceFail]}>
        {status}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFFFF' },
  topBar: {
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: { marginRight: 10 },
  backBtnText: { fontSize: 16, color: '#1A1A1A', fontWeight: '600' },
  topBarTitle: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', flex: 1 },
  roleBadge: {
    backgroundColor: '#2C2C2C',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 50 },

  overviewCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    padding: 18,
    marginBottom: 16,
  },
  overviewTitle: { fontSize: 14, fontWeight: '700', color: '#FFFFFF', marginBottom: 12, opacity: 0.7 },
  overviewRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  overviewStat: { flex: 1 },
  overviewStatLabel: { fontSize: 10, color: '#AAAAAA', marginBottom: 2 },
  overviewStatValue: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  sectionCard: {
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', marginBottom: 12 },

  progressStats: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  progressStatBox: { alignItems: 'center' },
  progressStatValue: { fontSize: 20, fontWeight: '800' },
  progressStatLabel: { fontSize: 11, color: '#888888', marginTop: 2 },

  progressTrack: {
    height: 6,
    backgroundColor: '#EEEEEE',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: { height: '100%', backgroundColor: '#1A1A1A', borderRadius: 3 },
  progressHint: { fontSize: 11, color: '#AAAAAA' },

  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  weekRowLabel: { fontSize: 12, fontWeight: '600', color: '#555555', width: 52 },
  weekRowTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  weekRowFill: { height: '100%', backgroundColor: '#CCCCCC', borderRadius: 4 },
  weekRowFillComplete: { backgroundColor: '#1A1A1A' },
  weekRowCount: { fontSize: 11, color: '#888888', width: 28 },
  weekRowCheck: { fontSize: 13, color: '#1A1A1A', fontWeight: '700', width: 16 },

  complianceRow: { gap: 10 },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    gap: 10,
  },
  complianceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  complianceDotPass: { backgroundColor: '#1A1A1A' },
  complianceDotFail: { backgroundColor: '#CCCCCC' },
  complianceLabel: { flex: 1, fontSize: 13, color: '#555555' },
  complianceStatus: { fontSize: 12, fontWeight: '700' },
  compliancePass: { color: '#1A1A1A' },
  complianceFail: { color: '#AAAAAA' },

  exportSection: { marginTop: 4 },
  exportBtn: {
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  exportBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.5 },
  exportHint: { fontSize: 11, color: '#AAAAAA', textAlign: 'center' },
});
