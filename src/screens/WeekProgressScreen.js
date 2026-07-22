import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from 'react-native';
import { saveWeeklyLog, loadWeeklyLogs, syncToCloud } from '../utils/storage';
import { USTED_THEME } from '../utils/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Generate time options (07:00 AM – 08:00 PM)
const TIME_OPTIONS = [];
for (let hour = 7; hour <= 20; hour++) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  const hourStr = displayHour < 10 ? `0${displayHour}` : `${displayHour}`;
  TIME_OPTIONS.push(`${hourStr}:00 ${period}`);
  TIME_OPTIONS.push(`${hourStr}:30 ${period}`);
}

// ── Custom Dropdown ────────────────────────────────────────────────────────────
const CustomDropdown = ({ value, options, onSelect, placeholder }) => {
  const [visible, setVisible] = useState(false);
  return (
    <View style={styles.dropdownContainer}>
      <TouchableOpacity style={styles.dropdownButton} onPress={() => setVisible(true)}>
        <Text style={[styles.dropdownButtonText, !value && { color: '#AAAAAA' }]}>
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownIcon}>▼</Text>
      </TouchableOpacity>
      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            <ScrollView showsVerticalScrollIndicator keyboardShouldPersistTaps="handled">
              {options.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[styles.dropdownItem, value === opt && styles.dropdownItemActive]}
                  onPress={() => { onSelect(opt); setVisible(false); }}
                >
                  <Text style={[styles.dropdownItemText, value === opt && styles.dropdownItemTextActive]}>
                    {opt}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ── Screen ─────────────────────────────────────────────────────────────────────
export default function WeekProgressScreen({
  profile,
  currentWeek,
  initialDay,
  onWeekChange,
  onViewProgress,
  onBack,
  role,
}) {
  const [selectedDay, setSelectedDay] = useState(initialDay || 'Mon');

  // Form fields
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [activityText, setActivityText] = useState('');
  const [learningOutcome, setLearningOutcome] = useState('');
  const [skillsDemonstrated, setSkillsDemonstrated] = useState('');
  const [remarks, setRemarks] = useState('');

  const [allLogs, setAllLogs] = useState({});
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const weekKey = `week_${currentWeek}`;

  // Load all logs from storage
  useEffect(() => {
    (async () => {
      const logs = await loadWeeklyLogs();
      setAllLogs(logs);
    })();
  }, []);

  // When day or week changes, populate fields from saved data
  useEffect(() => {
    const dayData = allLogs[weekKey]?.[selectedDay] || {};
    setStartTime(dayData.startTime || '');
    setEndTime(dayData.endTime || '');
    setActivityText(dayData.activityText || '');
    setLearningOutcome(dayData.learningOutcome || '');
    setSkillsDemonstrated(dayData.skillsDemonstrated || '');
    setRemarks(dayData.remarks || '');
  }, [selectedDay, weekKey, allLogs]);

  const handleDaySelect = (day) => {
    setSelectedDay(day);
    setStatusMessage('');
  };

  const showStatus = (msg) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const getCurrentLogData = () => ({
    startTime,
    endTime,
    activityText,
    learningOutcome: activityText, // Save same text to learningOutcome to preserve both
    skillsDemonstrated,
    remarks,
  });

  /**
   * Single unified save action:
   *   1. Persists to local AsyncStorage (draft cache)
   *   2. Silently attempts background cloud sync — no user decision needed
   *   3. Navigates back to the hub ledger view
   */
  const handleSaveLog = useCallback(async () => {
    setSaving(true);
    const logData = getCurrentLogData();

    // Step 1 — local persist
    await saveWeeklyLog(weekKey, selectedDay, logData);
    setAllLogs((prev) => ({
      ...prev,
      [weekKey]: { ...(prev[weekKey] || {}), [selectedDay]: logData },
    }));

    // Step 2 — Attempt cloud sync and show feedback
    const payload = {
      student_name: profile?.name,
      index_number: profile?.indexNumber,
      company: profile?.company,
      week: currentWeek,
      day: selectedDay,
      start_time: startTime,
      end_time: endTime,
      activity: activityText,
      learning_outcome: activityText, // sync combined text
      skills_demonstrated: skillsDemonstrated,
      remarks,
      submitted_at: new Date().toISOString(),
    };
    
    let syncResult;
    try {
      syncResult = await syncToCloud(payload);
    } catch (e) {
      syncResult = { success: false, message: e.message || String(e) };
    }

    setSaving(false);

    if (syncResult && syncResult.success) {
      showStatus('✓ Saved & Synced to Database!');
    } else if (syncResult && syncResult.mock) {
      showStatus('✓ Saved locally (Mock Client)');
    } else {
      showStatus(`✓ Saved locally (Offline/Cloud Error)`);
    }

    // Step 3 — return to hub ledger
    setTimeout(() => { if (onBack) onBack(); }, 1500);
  }, [
    weekKey, selectedDay, startTime, endTime,
    activityText, skillsDemonstrated, remarks,
    profile, currentWeek, onBack,
  ]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Text style={styles.backBtnText}>‹</Text>
          </TouchableOpacity>
        ) : null}
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>USTED INDUSTRIAL ATTACHMENT PORTAL</Text>
          {profile?.name ? (
            <Text style={styles.topBarName} numberOfLines={1}>{profile.name}</Text>
          ) : null}
        </View>
        {role ? (
          <Text style={styles.roleBadge}>{role.toUpperCase()}</Text>
        ) : null}
      </View>

      {/* ── Scrollable Form ── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Daily Log Entry</Text>
          <Text style={styles.pageSubtitle}>
            Week {currentWeek} · Fill in your activity for the selected day.
          </Text>
        </View>

        <View style={styles.divider} />

        {/* ── Form Body ── */}
        <View style={styles.formContainer}>

          {/* Key Tasks & Activities (Learning Outcome) combined as main field */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Describe key tasks/activities performed for the day (Learning Outcome)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={5}
                placeholder="Describe what you worked on today…"
                placeholderTextColor="#AAAAAA"
                value={activityText}
                onChangeText={setActivityText}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Day Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Day of Week</Text>
            <View style={styles.inputBox}>
              <CustomDropdown
                value={selectedDay}
                options={DAYS}
                onSelect={handleDaySelect}
                placeholder="Select Day"
              />
            </View>
          </View>

          {/* Start Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Start Time</Text>
            <View style={styles.inputBox}>
              <CustomDropdown
                value={startTime}
                options={TIME_OPTIONS}
                onSelect={setStartTime}
                placeholder="Start Time"
              />
            </View>
          </View>

          {/* End Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>End Time</Text>
            <View style={styles.inputBox}>
              <CustomDropdown
                value={endTime}
                options={TIME_OPTIONS}
                onSelect={setEndTime}
                placeholder="End Time"
              />
            </View>
          </View>

          {/* Skills Demonstrated */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Skills Demonstrated</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g., Problem Solving, Communication"
                placeholderTextColor="#AAAAAA"
                value={skillsDemonstrated}
                onChangeText={setSkillsDemonstrated}
              />
            </View>
          </View>

          {/* Remarks */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Remarks / Issues Faced (Optional)</Text>
            <View style={styles.inputBox}>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={3}
                placeholder="Any challenges, blockers, or extra notes?"
                placeholderTextColor="#AAAAAA"
                value={remarks}
                onChangeText={setRemarks}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        {/* Status feedback */}
        {statusMessage ? (
          <Text style={styles.statusMsg}>{statusMessage}</Text>
        ) : null}

        {/* ── Single Primary CTA ── */}
        <View style={styles.ctaWrapper}>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSaveLog}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {saving ? 'SAVING…' : 'SAVE DAILY LOG DRAFT'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.ctaHint}>
            Your entry is saved locally and synced to the cloud automatically.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: USTED_THEME.background,
  },

  // Top bar
  topBar: {
    backgroundColor: USTED_THEME.surface,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: USTED_THEME.border,
  },
  backBtnText: {
    fontSize: 20,
    color: USTED_THEME.textPrimary,
    lineHeight: 22,
  },
  topBarCenter: { flex: 1 },
  topBarTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: USTED_THEME.textPrimary,
    letterSpacing: 0.3,
  },
  topBarName: {
    fontSize: 12,
    color: USTED_THEME.textSecondary,
    marginTop: 1,
  },
  roleBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: USTED_THEME.textSecondary,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  // Page header
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: USTED_THEME.textPrimary,
    marginBottom: 6,
  },
  pageSubtitle: {
    fontSize: 13,
    color: USTED_THEME.textSecondary,
    lineHeight: 19,
  },

  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
    marginHorizontal: 20,
  },

  // Form layout
  formContainer: {
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginVertical: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: USTED_THEME.textPrimary,
    marginBottom: 8,
    letterSpacing: 0.1,
  },

  // Input container box
  inputBox: {
    borderWidth: 1.5,
    borderColor: USTED_THEME.border,
    borderRadius: 8,
    backgroundColor: USTED_THEME.surface,
    overflow: 'hidden',
  },

  // Text inputs
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: USTED_THEME.textPrimary,
    height: 44,
  },
  textArea: {
    padding: 12,
    fontSize: 14,
    color: USTED_THEME.textPrimary,
    minHeight: 100,
    lineHeight: 21,
  },

  // Dropdown
  dropdownContainer: {},
  dropdownButton: {
    paddingHorizontal: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownButtonText: {
    fontSize: 14,
    color: USTED_THEME.textPrimary,
  },
  dropdownIcon: {
    fontSize: 12,
    color: USTED_THEME.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 20,
  },
  dropdownMenu: {
    backgroundColor: USTED_THEME.surface,
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 300,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemActive: {
    backgroundColor: '#F5F5F5',
  },
  dropdownItemText: {
    fontSize: 15,
    color: USTED_THEME.textPrimary,
  },
  dropdownItemTextActive: {
    fontWeight: '700',
    color: USTED_THEME.primary,
  },

  // Status message
  statusMsg: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },

  // Single primary CTA
  ctaWrapper: {
    paddingHorizontal: 20,
    marginTop: 24,
    alignItems: 'center',
  },
  saveBtn: {
    width: '100%',
    height: 54,
    backgroundColor: USTED_THEME.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: USTED_THEME.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1.2,
  },
  ctaHint: {
    marginTop: 10,
    fontSize: 11,
    color: USTED_THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
  },
});
