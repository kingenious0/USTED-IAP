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

export default function SupervisorScreen({ profile, onBack }) {
  const [allLogs, setAllLogs] = useState({});
  const [selectedWeek, setSelectedWeek] = useState(1);
  const totalWeeks = profile?.weeks || 0;

  useEffect(() => {
    (async () => {
      const logs = await loadWeeklyLogs();
      setAllLogs(logs);
    })();
  }, []);

  const weekKey = `week_${selectedWeek}`;
  const weekLogs = allLogs[weekKey] || {};
  const filledDays = DAYS.filter((d) => weekLogs[d]?.trim());

  const handleApprove = () => {
    Alert.alert(
      'Approve Week',
      `Approve Week ${selectedWeek} logs for ${profile?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', style: 'default', onPress: () => Alert.alert('Approved', `Week ${selectedWeek} has been approved.`) },
      ]
    );
  };

  const handleRequestRevision = () => {
    Alert.alert(
      'Request Revision',
      `Send revision request to ${profile?.name} for Week ${selectedWeek}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'default', onPress: () => Alert.alert('Sent', 'Revision request sent.') },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Supervisor Review Panel</Text>
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>SUPERVISOR</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Student Info Card */}
        <View style={styles.studentCard}>
          <View style={styles.studentAvatar}>
            <Text style={styles.studentAvatarText}>
              {profile?.name?.[0]?.toUpperCase() || 'S'}
            </Text>
          </View>
          <View style={styles.studentInfo}>
            <Text style={styles.studentName}>{profile?.name || 'Student'}</Text>
            <Text style={styles.studentMeta}>Index: {profile?.indexNumber || '—'}</Text>
            <Text style={styles.studentMeta}>Company: {profile?.company || '—'}</Text>
            <Text style={styles.studentMeta}>Attachment: {totalWeeks} weeks</Text>
          </View>
        </View>

        {/* Week Selector */}
        <View style={styles.weekSelector}>
          <Text style={styles.sectionLabel}>Select Week to Review</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.weekScroll}>
            {Array.from({ length: totalWeeks }, (_, i) => {
              const wk = `week_${i + 1}`;
              const days = allLogs[wk] || {};
              const filled = DAYS.filter((d) => days[d]?.trim()).length;
              const isSelected = selectedWeek === i + 1;
              return (
                <TouchableOpacity
                  key={wk}
                  style={[styles.weekChip, isSelected && styles.weekChipActive]}
                  onPress={() => setSelectedWeek(i + 1)}
                >
                  <Text style={[styles.weekChipText, isSelected && styles.weekChipTextActive]}>
                    W{i + 1}
                  </Text>
                  <Text style={[styles.weekChipSub, isSelected && styles.weekChipSubActive]}>
                    {filled}/5
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Daily Entries */}
        <View style={styles.entriesSection}>
          <Text style={styles.sectionLabel}>Week {selectedWeek} — Daily Entries</Text>
          {DAYS.map((day) => {
            const text = weekLogs[day];
            return (
              <View key={day} style={[styles.entryCard, !text?.trim() && styles.entryCardEmpty]}>
                <View style={styles.entryCardHeader}>
                  <Text style={styles.entryCardDay}>{day}</Text>
                  {text?.trim() ? (
                    <View style={styles.entryBadgeGreen}>
                      <Text style={styles.entryBadgeText}>LOGGED</Text>
                    </View>
                  ) : (
                    <View style={styles.entryBadgeGrey}>
                      <Text style={styles.entryBadgeText}>EMPTY</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.entryCardText}>
                  {text?.trim() || 'No entry recorded for this day.'}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Completion Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            {filledDays.length === 5
              ? `✓ All 5 days logged for Week ${selectedWeek}.`
              : `${filledDays.length}/5 days logged for Week ${selectedWeek}.`}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.revisionBtn} onPress={handleRequestRevision}>
            <Text style={styles.revisionBtnText}>Request Revision</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approveBtn} onPress={handleApprove}>
            <Text style={styles.approveBtnText}>Approve Week</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: { fontSize: 9, fontWeight: '700', color: '#FFFFFF' },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 50 },

  studentCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F7F7F7',
    borderRadius: 10,
    padding: 16,
    marginBottom: 24,
    gap: 14,
  },
  studentAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  studentAvatarText: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 },
  studentMeta: { fontSize: 12, color: '#666666', marginBottom: 2 },

  weekSelector: { marginBottom: 24 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 10 },
  weekScroll: { flexDirection: 'row' },
  weekChip: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    alignItems: 'center',
    minWidth: 52,
  },
  weekChipActive: { backgroundColor: '#1A1A1A', borderColor: '#1A1A1A' },
  weekChipText: { fontSize: 13, fontWeight: '700', color: '#333333' },
  weekChipTextActive: { color: '#FFFFFF' },
  weekChipSub: { fontSize: 10, color: '#AAAAAA', marginTop: 2 },
  weekChipSubActive: { color: '#AAAAAA' },

  entriesSection: { marginBottom: 20 },
  entryCard: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  entryCardEmpty: { backgroundColor: '#FAFAFA' },
  entryCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  entryCardDay: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  entryBadgeGreen: { backgroundColor: '#E8F5E9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  entryBadgeGrey: { backgroundColor: '#F0F0F0', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  entryBadgeText: { fontSize: 9, fontWeight: '700', color: '#555555' },
  entryCardText: { fontSize: 13, color: '#555555', lineHeight: 19 },

  summaryBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 14,
    marginBottom: 20,
  },
  summaryText: { fontSize: 13, color: '#333333', fontWeight: '600', textAlign: 'center' },

  actionRow: { flexDirection: 'row', gap: 12 },
  revisionBtn: {
    flex: 1,
    height: 48,
    borderWidth: 1.5,
    borderColor: '#1A1A1A',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  revisionBtnText: { fontSize: 13, fontWeight: '700', color: '#1A1A1A' },
  approveBtn: {
    flex: 1,
    height: 48,
    backgroundColor: '#1A1A1A',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveBtnText: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
});
