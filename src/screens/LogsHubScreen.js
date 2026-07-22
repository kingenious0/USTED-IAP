import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Platform,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as Sharing from 'expo-sharing';
import { loadWeeklyLogs, lockWeek, loadLockedWeeks } from '../utils/storage';
import { generateWeekPdf } from '../utils/pdfGenerator';
import { uploadWeekPdfToStorage } from '../utils/supabase';

const DAYS_FULL = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TOTAL_WEEKS = 8;

const USTED_COLORS = {
  primary: '#8C033B',      // USTED Maroon / Paprika
  gold: '#D4AF37',         // USTED Gold
  background: '#F8F9FA',   // Off-white canvas
  cardBg: '#FFFFFF',       // Card Container White
  textPrimary: '#1E293B',  // Charcoal Headers
  textSecondary: '#64748B',// Soft Grey Labels
  frozenBg: '#FEF2F2',     // Subtle Soft Red/Maroon Tint for Frozen Cards
  frozenText: '#991B1B'    // Deep Red Frozen Badge Text
};

// ── Helper: truncate text for preview ─────────────────────────────────────────
const truncate = (str, len = 60) => {
  if (!str || str.trim() === '') return null;
  const clean = str.trim();
  return clean.length > len ? clean.substring(0, len) + '…' : clean;
};

// ── Lock Confirmation Modal ────────────────────────────────────────────────────
function LockConfirmModal({ visible, weekNumber, onConfirm, onCancel }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={mStyles.overlay}>
        <View style={mStyles.sheet}>
          <View style={mStyles.handle} />
          <Text style={mStyles.icon}>🔒</Text>
          <Text style={mStyles.title}>Lock Week {weekNumber}?</Text>
          <Text style={mStyles.body}>
            Once locked, this week's entries cannot be edited. Make sure all 5
            days are complete and accurate before proceeding.
          </Text>
          <TouchableOpacity style={mStyles.confirmBtn} onPress={onConfirm}>
            <Text style={mStyles.confirmBtnText}>LOCK & FREEZE WEEK {weekNumber}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mStyles.cancelBtn} onPress={onCancel}>
            <Text style={mStyles.cancelBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Day Card Row ───────────────────────────────────────────────────────────────
function DayCard({ day, content, isLocked, onEdit }) {
  const preview = truncate(content);
  const hasDraft = !!preview;

  return (
    <TouchableOpacity 
      style={[dcStyles.card, isLocked && dcStyles.cardLocked]}
      onPress={!isLocked ? onEdit : undefined}
      activeOpacity={isLocked ? 1 : 0.7}
    >
      <View style={dcStyles.left}>
        <Text style={dcStyles.dayLabel}>{day}</Text>
        {hasDraft ? (
          <Text style={dcStyles.preview} numberOfLines={2}>
            {preview}
          </Text>
        ) : (
          <Text style={dcStyles.empty}>No entry yet</Text>
        )}
      </View>
      <View style={dcStyles.right}>
        {hasDraft && !isLocked && (
          <View style={dcStyles.badge}>
            <Text style={dcStyles.badgeText}>Draft</Text>
          </View>
        )}
        {!isLocked ? (
          <View style={dcStyles.editBtn}>
            <Text style={dcStyles.editBtnText}>Edit Log</Text>
          </View>
        ) : (
          <View style={dcStyles.lockedTag}>
            <Text style={dcStyles.lockedTagText}>🔒 Locked</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ── Week Block ─────────────────────────────────────────────────────────────────
function WeekBlock({ weekNumber, logs, isLocked, onEditDay, onLockWeek, profile }) {
  const weekKey = `week_${weekNumber}`;
  const weekLogs = logs[weekKey] || {};
  const [savingPdf, setSavingPdf] = useState(false);

  const getEntryText = (entry) => {
    if (!entry) return '';
    if (typeof entry === 'string') return entry.trim();
    return (entry.activityText || entry.activity || '').trim();
  };
  const filledCount = DAYS_FULL.filter((d) => !!getEntryText(weekLogs[d])).length;
  const isComplete = filledCount === 5;

  // ── Dual-pipeline PDF save ────────────────────────────────────────────────
  const handleSaveWeekPdf = async () => {
    setSavingPdf(true);
    try {
      // Step 1 — render PDF to local file
      const pdfResult = await generateWeekPdf(weekNumber, weekLogs, profile);

      if (!pdfResult.success) {
        Alert.alert('PDF Error', pdfResult.error || 'Could not generate PDF.');
        return;
      }

      // Step 2 — run both pipelines simultaneously
      const [shareResult, uploadResult] = await Promise.allSettled([
        // Pipeline B — Local: open native share sheet / device download
        (async () => {
          if (pdfResult.uri) {
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              await Sharing.shareAsync(pdfResult.uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Week ${weekNumber} — Industrial Attachment Log`,
                UTI: 'com.adobe.pdf',
              });
            }
          }
          return { ok: true };
        })(),
        // Pipeline A — Cloud: upload to Supabase Storage
        uploadWeekPdfToStorage(weekNumber, pdfResult.uri, profile),
      ]);

      // Build result summary
      const cloudOk  = uploadResult.status === 'fulfilled' && uploadResult.value?.success;
      const cloudMsg = cloudOk
        ? `☁️ Cloud backup saved to:\n${uploadResult.value.path}`
        : `☁️ Cloud upload skipped${uploadResult.value?.error ? ':\n' + uploadResult.value.error : ' (Supabase not configured).'}` ;

      Alert.alert(
        '📥 Week Saved',
        `📱 PDF shared to device.\n\n${cloudMsg}`,
        [{ text: 'OK' }]
      );
    } catch (err) {
      Alert.alert('Export Failed', err.message || 'An unexpected error occurred.');
    } finally {
      setSavingPdf(false);
    }
  };

  return (
    <View style={[wbStyles.block, isLocked && wbStyles.blockLocked]}>
      {/* Week Header */}
      <View style={wbStyles.header}>
        <View style={wbStyles.headerLeft}>
          <Text style={wbStyles.weekLabel}>Week {weekNumber}</Text>
          <Text style={[wbStyles.weekCount, isLocked && wbStyles.weekCountLocked]}>
            {isLocked ? '🔒 Locked' : `${filledCount}/5 days`}
          </Text>
        </View>
        {isLocked && (
          <View style={wbStyles.lockedBadge}>
            <Text style={wbStyles.lockedBadgeText}>FROZEN</Text>
          </View>
        )}
      </View>

      {/* Progress bar */}
      {!isLocked && (
        <View style={wbStyles.progressBarBg}>
          <View
            style={[
              wbStyles.progressBarFill,
              { width: `${(filledCount / 5) * 100}%` },
              isComplete && wbStyles.progressBarComplete,
            ]}
          />
        </View>
      )}

      {/* Day Cards — only show days that have a saved entry */}
      {DAYS_FULL.filter((day) => !!getEntryText(weekLogs[day])).map((day) => {
        const entry = weekLogs[day];
        const contentText = entry
          ? (typeof entry === 'string' ? entry : (entry.activityText || entry.activity || ''))
          : '';
        return (
          <DayCard
            key={day}
            day={day}
            content={contentText}
            isLocked={isLocked}
            onEdit={() => onEditDay(weekNumber, day)}
          />
        );
      })}

      {/* ── Save as PDF — FROZEN weeks only ── */}
      {isLocked && (
        <TouchableOpacity
          style={[wbStyles.pdfBtn, savingPdf && wbStyles.pdfBtnBusy]}
          onPress={handleSaveWeekPdf}
          activeOpacity={0.8}
          disabled={savingPdf}
        >
          {savingPdf ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={wbStyles.pdfBtnIcon}>📥</Text>
          )}
          <Text style={wbStyles.pdfBtnText}>
            {savingPdf ? 'GENERATING...' : `Save Week ${weekNumber} as PDF`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Lock Banner — only show when week is complete and NOT locked */}
      {isComplete && !isLocked && (
        <TouchableOpacity style={wbStyles.lockBanner} onPress={onLockWeek}>
          <Text style={wbStyles.lockBannerText}>🔒 LOCK & FREEZE WEEK {weekNumber}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const LEVELS = ['100', '200', '300', '400'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => (currentYear - 2 + i).toString());
const WEEKS = Array.from({ length: 13 }, (_, i) => (i + 4).toString());

const PROGRAMMES_LIST = [
  // B.Sc. & B.Ed. & B.A. Degree Programmes
  "B.Sc. Accounting Education",
  "B.Sc. Administration (Accounting)",
  "B.Sc. Administration (Banking and Finance)",
  "B.Sc. Administration (Business Information Systems)",
  "B.Sc. Administration (Procurement and Supply Chain Management)",
  "B.Sc. Marketing",
  "B.Sc. Entrepreneurship Education",
  "B.Sc. Construction Technology and Management Education",
  "B.Sc. Wood Technology Education",
  "B.Sc. Mechanical Engineering Technology Education",
  "B.Sc. Automotive Engineering Technology Education",
  "B.Sc. Electrical and Electronics Engineering Education",
  "B.Sc. Welding and Fabrication Technology Education",
  "B.Sc. Information Technology Education",
  "B.Sc. Mathematics Education",
  "B.Sc. Catering and Hospitality Education",
  "B.Sc. Fashion Design and Textiles Education",
  "B.Ed. Applied Technology",
  "B.Ed. Design and Communication Technology",
  "B.Ed. Early Grade Education",
  "B.Ed. Upper Primary Education",
  "B.Ed. Junior High School Education",
  "B.A. English Education",
  "B.A. French Education",
  "B.A. Arabic Education",
  "B.A. Social Studies with Economics Education",

  // Diploma Programmes
  "Diploma in Accounting",
  "Diploma in Business Administration (Accounting Option)",
  "Diploma in Business Administration (Management Option)",
  "Diploma in Human Resource Management",
  "Diploma in Office Management and Computer Applications",
  "Diploma in Economics",
  "Diploma in Business Studies",
  "Diploma in Automotive Technology",
  "Diploma in Mechanical Engineering Technology",
  "Diploma in Electrical and Electronics Engineering Technology",
  "Diploma in Construction Technology",
  "Diploma in Fashion Design and Textiles Technology",
  "Diploma in Catering and Hospitality Technology"
];

// ── Select Input Helper ────────────────────────────────────────────────────────
function SelectInput({ label, value, options, onSelect, placeholder }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <TouchableOpacity 
        style={mStyles.inputContainer} 
        onPress={() => {
          setSearchQuery('');
          setModalVisible(true);
        }} 
        activeOpacity={0.7}
      >
        <Text style={[mStyles.input, { color: value ? '#1A1A1A' : '#9CA3AF' }]} numberOfLines={1}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={mStyles.dropdownOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={[mStyles.dropdownSheet, options.length > 8 && { maxHeight: '80%', height: '80%' }]}>
            <Text style={mStyles.dropdownTitle}>Select {label}</Text>
            {options.length > 8 && (
              <TextInput
                style={mStyles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#AAAAAA"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
            )}
            <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredOptions.map((opt) => (
                <TouchableOpacity 
                  key={opt} 
                  style={mStyles.dropdownItem}
                  onPress={() => {
                    onSelect(opt);
                    setModalVisible(false);
                  }}
                >
                  <Text style={mStyles.dropdownItemText}>{opt}</Text>
                </TouchableOpacity>
              ))}
              {filteredOptions.length === 0 && (
                <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>No matches found</Text>
              )}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Profile Edit Modal ─────────────────────────────────────────────────────────
function ProfileModal({ visible, profile, onClose, onSave, onLogout }) {
  const [name, setName] = useState(profile?.name || '');
  const [indexNumber, setIndexNumber] = useState(profile?.indexNumber || '');
  const [program, setProgram] = useState(profile?.program || '');
  const [level, setLevel] = useState(profile?.level || '');
  const [industryName, setIndustryName] = useState(profile?.industryName || '');
  const [industryLocation, setIndustryLocation] = useState(profile?.industryLocation || '');
  const [supervisorName, setSupervisorName] = useState(profile?.supervisorName || '');
  const [weeks, setWeeks] = useState(profile?.weeks ? String(profile.weeks) : '8');
  
  const parsedWel = profile?.welCommencement ? profile.welCommencement.split(' ') : [];
  const [welMonth, setWelMonth] = useState(parsedWel[0] || '');
  const [welYear, setWelYear] = useState(parsedWel[1] || '');

  useEffect(() => {
    setName(profile?.name || '');
    setIndexNumber(profile?.indexNumber || '');
    setProgram(profile?.program || '');
    setLevel(profile?.level || '');
    setIndustryName(profile?.industryName || '');
    setIndustryLocation(profile?.industryLocation || '');
    setSupervisorName(profile?.supervisorName || '');
    setWeeks(profile?.weeks ? String(profile.weeks) : '8');
    
    const wel = profile?.welCommencement ? profile.welCommencement.split(' ') : [];
    setWelMonth(wel[0] || '');
    setWelYear(wel[1] || '');
  }, [profile, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={mStyles.overlay}>
        <View style={[mStyles.sheet, { maxHeight: '90%' }]}>
          <View style={mStyles.handle} />
          <Text style={mStyles.title}>Edit Profile</Text>
          
          <ScrollView style={{ width: '100%', marginBottom: 16 }} showsVerticalScrollIndicator={false}>
            <Text style={[mStyles.label, { marginTop: 0 }]}>FULL NAME</Text>
            <View style={mStyles.inputContainer}>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Jane Doe" style={mStyles.input} />
            </View>
            
            <Text style={mStyles.label}>INDEX NUMBER</Text>
            <View style={mStyles.inputContainer}>
              <TextInput value={indexNumber} onChangeText={setIndexNumber} placeholder="e.g. 040922123" style={mStyles.input} />
            </View>

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={mStyles.label}>PROGRAM</Text>
                <SelectInput label="Program" value={program} options={PROGRAMMES_LIST} onSelect={setProgram} placeholder="Select Program" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={mStyles.label}>LEVEL</Text>
                <SelectInput label="Level" value={level} options={LEVELS} onSelect={setLevel} placeholder="Select Level" />
              </View>
            </View>

            <Text style={mStyles.label}>NAME OF INDUSTRY</Text>
            <View style={mStyles.inputContainer}>
              <TextInput value={industryName} onChangeText={setIndustryName} placeholder="e.g. Acme Corp" style={mStyles.input} />
            </View>

            <Text style={mStyles.label}>LOCATION OF INDUSTRY</Text>
            <View style={mStyles.inputContainer}>
              <TextInput value={industryLocation} onChangeText={setIndustryLocation} placeholder="e.g. Accra" style={mStyles.input} />
            </View>

            <Text style={mStyles.label}>NAME OF SUPERVISOR</Text>
            <View style={mStyles.inputContainer}>
              <TextInput value={supervisorName} onChangeText={setSupervisorName} placeholder="e.g. John Doe" style={mStyles.input} />
            </View>

            <Text style={mStyles.label}>WEL COMMENCEMENT (MONTH & YEAR)</Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <SelectInput label="Month" value={welMonth} options={MONTHS} onSelect={setWelMonth} placeholder="Select Month" />
              </View>
              <View style={{ flex: 1 }}>
                <SelectInput label="Year" value={welYear} options={YEARS} onSelect={setWelYear} placeholder="Select Year" />
              </View>
            </View>

            <Text style={mStyles.label}>ATTACHMENT DURATION</Text>
            <SelectInput label="Weeks" value={weeks ? `${weeks} Weeks` : ''} options={WEEKS} onSelect={setWeeks} placeholder="Select Duration" />

            <View style={{ height: 40 }} />
          </ScrollView>

          <TouchableOpacity 
            style={mStyles.confirmBtn} 
            onPress={() => {
              const welCommencement = (welMonth && welYear) ? `${welMonth} ${welYear}` : '';
              onSave({ 
                name, 
                indexNumber, 
                program, 
                level, 
                industryName, 
                industryLocation, 
                supervisorName, 
                welMonth,
                welYear,
                welCommencement, 
                weeks: parseInt(weeks, 10) 
              });
            }}
          >
            <Text style={mStyles.confirmBtnText}>SAVE PROFILE</Text>
          </TouchableOpacity>
          <TouchableOpacity style={mStyles.cancelBtn} onPress={onClose}>
            <Text style={mStyles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={mStyles.logoutBtn} 
            onPress={() => {
              Alert.alert(
                'Confirm Log Out',
                'Are you sure you want to log out? Local cache will be cleared. Your synced logs remain safe in the cloud.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Log Out', style: 'destructive', onPress: onLogout },
                ]
              );
            }}
          >
            <Text style={mStyles.logoutBtnText}>Log Out of Account</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function LogsHubScreen({ profile, onLogToday, onBack, onUpdateProfile, refreshKey, onLogout }) {
  const [allLogs, setAllLogs] = useState({});
  const [lockedWeeks, setLockedWeeks] = useState([]);
  const [lockModalWeek, setLockModalWeek] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const totalWeeks = profile?.weeks || TOTAL_WEEKS;

  const getEntryText = (entry) => {
    if (!entry) return '';
    if (typeof entry === 'string') return entry.trim();
    return (entry.activityText || entry.activity || '').trim();
  };

  // Determine the "active" week — first week that has < 5 entries or last week
  const getActiveWeek = useCallback((logs, locked) => {
    for (let w = 1; w <= totalWeeks; w++) {
      if (locked.includes(w)) continue;
      const wk = logs[`week_${w}`] || {};
      const filled = DAYS_FULL.filter((d) => !!getEntryText(wk[d])).length;
      if (filled < 5) return w;
    }
    return totalWeeks;
  }, [totalWeeks]);

  // Determine the next unfilled day in the active week
  const getNextUnfilledDay = useCallback((logs, weekNum) => {
    const wk = logs[`week_${weekNum}`] || {};
    for (const d of DAYS_FULL) {
      if (!getEntryText(wk[d])) {
        return d;
      }
    }
    return 'Mon';
  }, []);

  const loadData = useCallback(async () => {
    const [logs, locked] = await Promise.all([
      loadWeeklyLogs(),
      loadLockedWeeks(),
    ]);
    setAllLogs(logs);
    setLockedWeeks(locked);
  }, []);

  // Re-fetch every time screen gains focus (refreshKey changes when returning from editor)
  useEffect(() => {
    loadData();
  }, [loadData, refreshKey]);

  // Determine which weeks to actually render — only show weeks that have entries or are locked
  const weeksToShow = () => {
    const shown = new Set();
    for (let w = 1; w <= totalWeeks; w++) {
      const wk = allLogs[`week_${w}`] || {};
      const filled = DAYS_FULL.filter((d) => !!getEntryText(wk[d])).length;
      if (filled > 0 || lockedWeeks.includes(w)) shown.add(w);
    }
    return Array.from(shown).sort((a, b) => a - b);
  };

  const handleLockConfirm = async () => {
    if (!lockModalWeek) return;
    await lockWeek(lockModalWeek);
    setLockModalWeek(null);
    loadData();
  };

  const activeWeek = getActiveWeek(allLogs, lockedWeeks);
  const nextDay = getNextUnfilledDay(allLogs, activeWeek);
  const renderedWeeks = weeksToShow();

  // Total stats
  const totalLogged = Object.values(allLogs).reduce((acc, wk) => {
    return acc + DAYS_FULL.filter((d) => !!getEntryText(wk[d])).length;
  }, 0);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── App Bar ── */}
      <View style={styles.appBar}>
        <View style={styles.appBarCenter}>
          <Text style={styles.appBarTitle}>Activity Logger</Text>
          <Text style={styles.appBarSub} numberOfLines={1}>
            {profile?.indexNumber || 'Index Number'}
          </Text>
        </View>
        <View style={styles.statsPill}>
          <Text style={styles.statsPillText}>Week {activeWeek} Active</Text>
        </View>
        <TouchableOpacity onPress={() => setShowProfileModal(true)} style={styles.settingsBtn}>
          <Text style={styles.avatarText}>
            {profile?.name ? profile.name.split(' ').filter(Boolean).map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'ST'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Action Card ── */}
        <TouchableOpacity
          style={styles.heroCard}
          onPress={() => onLogToday(activeWeek, nextDay)}
          activeOpacity={0.85}
        >
          <View style={styles.heroCardLeft}>
            <Text style={styles.heroCardPlus}>+</Text>
          </View>
          <View style={styles.heroCardBody}>
            <Text style={styles.heroCardTitle}>Log Today's Activity</Text>
            <Text style={styles.heroCardSub}>
              Week {activeWeek} · {nextDay} · Tap to open log editor
            </Text>
          </View>
          <Text style={styles.heroCardArrow}>›</Text>
        </TouchableOpacity>

        {/* ── Section Label ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Log Ledger</Text>
          <Text style={styles.sectionSub}>
            {lockedWeeks.length} week{lockedWeeks.length !== 1 ? 's' : ''} locked · {totalWeeks - lockedWeeks.length} remaining
          </Text>
        </View>

        {/* ── Week Blocks ── */}
        {renderedWeeks.map((weekNum) => (
          <WeekBlock
            key={weekNum}
            weekNumber={weekNum}
            logs={allLogs}
            isLocked={lockedWeeks.includes(weekNum)}
            onEditDay={(wk, day) => onLogToday(wk, day)}
            onLockWeek={() => setLockModalWeek(weekNum)}
            profile={profile}
          />
        ))}

        {renderedWeeks.length === 0 && (
          <View style={styles.emptyLedger}>
            <Text style={styles.emptyLedgerIcon}>📋</Text>
            <Text style={styles.emptyLedgerText}>No logs yet.</Text>
            <Text style={styles.emptyLedgerSub}>
              Tap the card above to add your first entry.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Lock Confirm Modal ── */}
      <LockConfirmModal
        visible={lockModalWeek !== null}
        weekNumber={lockModalWeek}
        onConfirm={handleLockConfirm}
        onCancel={() => setLockModalWeek(null)}
      />

      {/* ── Profile Edit Modal ── */}
      <ProfileModal
        visible={showProfileModal}
        profile={profile}
        onClose={() => setShowProfileModal(false)}
        onSave={(updatedProfile) => {
          if (onUpdateProfile) onUpdateProfile(updatedProfile);
          setShowProfileModal(false);
        }}
        onLogout={() => {
          setShowProfileModal(false);
          if (onLogout) onLogout();
        }}
      />
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: USTED_COLORS.background,
  },
  appBar: {
    backgroundColor: USTED_COLORS.cardBg,
    paddingTop: Platform.OS === 'ios' ? 50 : StatusBar.currentHeight + 10 || 36,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, color: '#1A1A1A', lineHeight: 24 },
  appBarCenter: { flex: 1 },
  appBarTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: USTED_COLORS.textPrimary,
    letterSpacing: 0.2,
  },
  appBarSub: {
    fontSize: 13,
    color: USTED_COLORS.primary,
    fontWeight: '600',
    marginTop: 1,
  },
  statsPill: {
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statsPillText: { fontSize: 11, fontWeight: '700', color: '#B45309' },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: USTED_COLORS.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderWidth: 2,
    borderColor: USTED_COLORS.gold,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: USTED_COLORS.primary,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },

  // Hero Action Card
  heroCard: {
    backgroundColor: USTED_COLORS.primary,
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: USTED_COLORS.primary,
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  heroCardLeft: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroCardPlus: { fontSize: 24, color: '#FFFFFF', fontWeight: '300', lineHeight: 28 },
  heroCardBody: { flex: 1 },
  heroCardTitle: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },
  heroCardSub: { fontSize: 12, color: '#FDE68A', marginTop: 3 },
  heroCardArrow: { fontSize: 24, color: '#FFFFFF', opacity: 0.7, marginLeft: 8 },

  // Section header
  sectionHeader: { marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: USTED_COLORS.textPrimary },
  sectionSub: { fontSize: 12, color: USTED_COLORS.textSecondary, marginTop: 2 },

  // Empty ledger
  emptyLedger: { alignItems: 'center', paddingVertical: 60 },
  emptyLedgerIcon: { fontSize: 40, marginBottom: 12 },
  emptyLedgerText: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  emptyLedgerSub: { fontSize: 13, color: '#999999', textAlign: 'center' },
});

// Week block styles
const wbStyles = StyleSheet.create({
  block: {
    backgroundColor: USTED_COLORS.cardBg,
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  blockLocked: {
    backgroundColor: USTED_COLORS.frozenBg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: {},
  weekLabel: { fontSize: 15, fontWeight: '700', color: USTED_COLORS.textPrimary },
  weekCount: { fontSize: 12, color: USTED_COLORS.textSecondary, marginTop: 2 },
  weekCountLocked: { color: USTED_COLORS.frozenText },
  lockedBadge: {
    backgroundColor: USTED_COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lockedBadgeText: { fontSize: 10, fontWeight: '800', color: '#FFFFFF', letterSpacing: 1 },

  progressBarBg: {
    height: 3,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 16,
    marginBottom: 4,
    borderRadius: 2,
  },
  progressBarFill: {
    height: 3,
    backgroundColor: '#CCCCCC',
    borderRadius: 2,
  },
  progressBarComplete: { backgroundColor: USTED_COLORS.primary },

  emptyState: { padding: 20, alignItems: 'center' },
  emptyStateText: { fontSize: 13, color: '#BBBBBB' },

  lockBanner: {
    backgroundColor: USTED_COLORS.primary,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  lockBannerText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },

  // PDF download button (frozen weeks)
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: USTED_COLORS.primary,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 16,
    borderRadius: 12,
    height: 50,
  },
  pdfBtnBusy: { backgroundColor: '#555555' },
  pdfBtnIcon: { fontSize: 16 },
  pdfBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

// Day card styles
const dcStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  cardLocked: { backgroundColor: 'transparent' },
  left: { flex: 1, marginRight: 10 },
  dayLabel: { fontSize: 13, fontWeight: '700', color: USTED_COLORS.textPrimary, marginBottom: 4 },
  preview: { fontSize: 12, color: USTED_COLORS.textSecondary, lineHeight: 17 },
  empty: { fontSize: 12, color: '#CCCCCC', fontStyle: 'italic' },
  right: { alignItems: 'flex-end', gap: 6 },
  badge: {
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: '600', color: '#666666' },
  editBtn: {
    borderWidth: 1,
    borderColor: USTED_COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtnText: { fontSize: 11, fontWeight: '700', color: USTED_COLORS.primary },
  lockedTag: { paddingHorizontal: 4 },
  lockedTagText: { fontSize: 11, color: USTED_COLORS.frozenText, fontWeight: '600' },
});

// Modal styles
const mStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000060',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 28,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    marginBottom: 20,
  },
  icon: { fontSize: 36, marginBottom: 12 },
  title: { fontSize: 20, fontWeight: '800', color: '#1A1A1A', marginBottom: 10, textAlign: 'center' },
  body: {
    fontSize: 14,
    color: '#555555',
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 28,
  },
  confirmBtn: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  confirmBtnText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.8 },
  cancelBtn: {
    width: '100%',
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  cancelBtnText: { fontSize: 14, color: '#888888', fontWeight: '600' },
  logoutBtn: {
    width: '100%',
    paddingVertical: 14,
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#DC2626',
    backgroundColor: '#FFFFFF',
    marginTop: 6,
  },
  logoutBtnText: { fontSize: 13, color: '#DC2626', fontWeight: '700', letterSpacing: 0.5 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, marginTop: 16, fontWeight: '700' },
  inputContainer: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 14, minHeight: 48, justifyContent: 'center' },
  input: { fontSize: 16, color: '#1A1A1A' },
  dropdownOverlay: { flex: 1, backgroundColor: '#00000040', justifyContent: 'center', padding: 20 },
  dropdownSheet: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 20, maxHeight: '80%' },
  dropdownTitle: { fontSize: 16, fontWeight: '700', color: '#1A1A1A', marginBottom: 16, textAlign: 'center' },
  dropdownItem: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  dropdownItemText: { fontSize: 16, color: '#1A1A1A', textAlign: 'center' },
  searchInput: {
    height: 44,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#F8FAFC',
    marginBottom: 16,
  },
});
