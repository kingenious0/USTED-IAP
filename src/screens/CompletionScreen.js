import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  StatusBar,
  Alert,
  Animated,
} from 'react-native';
import { loadWeeklyLogs, loadLockedWeeks } from '../utils/storage';
import { generatePdf } from '../utils/pdfGenerator';
import { USTED_THEME } from '../utils/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
const TOTAL_WEEKS = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────
const getEntryText = (entry) => {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  return (entry.activityText || entry.activity || '').trim();
};

const pad = (n) => String(n).padStart(2, '0');

const generateRefId = (profile) => {
  const idx = (profile?.indexNumber || '000000').replace(/\D/g, '').slice(-6);
  const ts = Date.now().toString(36).toUpperCase().slice(-5);
  return `UIAP-${idx}-${ts}`;
};

// ── Sub-Components ────────────────────────────────────────────────────────────
function MetricCard({ label, value, sub, accent }) {
  return (
    <View style={[mc.card, accent && mc.cardAccent]}>
      <Text style={[mc.label, accent && mc.labelAccent]}>{label}</Text>
      <Text style={[mc.value, accent && mc.valueAccent]}>{value}</Text>
      <Text style={[mc.sub, accent && mc.subAccent]}>{sub}</Text>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  cardAccent: {
    backgroundColor: '#1A1A1A',
    borderColor: '#1A1A1A',
  },
  label: {
    fontSize: 9,
    fontWeight: '700',
    color: '#AAAAAA',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
    textAlign: 'center',
  },
  labelAccent: { color: '#888888' },
  value: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
    textAlign: 'center',
  },
  valueAccent: { color: '#FFFFFF' },
  sub: {
    fontSize: 9,
    color: '#BBBBBB',
    textAlign: 'center',
  },
  subAccent: { color: '#666666' },
});

// ── Week Bar Chart ────────────────────────────────────────────────────────────
function WeekBarChart({ allLogs, totalWeeks }) {
  const weeks = Array.from({ length: totalWeeks }, (_, i) => {
    const wk = `week_${i + 1}`;
    const days = allLogs[wk] || {};
    const filled = DAYS.filter((d) => !!getEntryText(days[d])).length;
    return { label: `W${i + 1}`, filled, pct: Math.round((filled / 5) * 100) };
  });

  return (
    <View style={bc.wrapper}>
      {/* Y-axis labels */}
      <View style={bc.yAxis}>
        {['100%', '60%', '20%'].map((v) => (
          <Text key={v} style={bc.yLabel}>{v}</Text>
        ))}
      </View>
      {/* Bars */}
      <View style={bc.chartArea}>
        {/* Grid lines */}
        <View style={[bc.gridLine, { bottom: '20%' }]} />
        <View style={[bc.gridLine, { bottom: '60%' }]} />
        <View style={[bc.gridLine, { bottom: '100%' }]} />
        {/* Bars */}
        {weeks.map(({ label, filled, pct }) => (
          <View key={label} style={bc.barCol}>
            <Text style={bc.pctLabel}>{pct > 0 ? `${pct}%` : ''}</Text>
            <View style={bc.barTrack}>
              <View
                style={[
                  bc.barFill,
                  { height: `${Math.max(pct, 0)}%` },
                  pct === 100 && bc.barFillComplete,
                  pct > 0 && pct < 100 && bc.barFillPartial,
                ]}
              />
            </View>
            <Text style={bc.barLabel}>{label}</Text>
            <Text style={bc.barDays}>{filled}/5</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const bc = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    height: 140,
    marginTop: 8,
  },
  yAxis: {
    width: 32,
    justifyContent: 'space-between',
    paddingBottom: 36,
    paddingTop: 16,
    alignItems: 'flex-end',
    paddingRight: 4,
  },
  yLabel: { fontSize: 8, color: '#CCCCCC' },
  chartArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEEEEE',
    paddingHorizontal: 4,
    paddingBottom: 24,
    position: 'relative',
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F5F5F5',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  pctLabel: {
    fontSize: 7,
    color: '#AAAAAA',
    marginBottom: 2,
  },
  barTrack: {
    width: '60%',
    height: 72,
    backgroundColor: '#F2F2F2',
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#CCCCCC',
    borderRadius: 4,
  },
  barFillPartial: { backgroundColor: '#888888' },
  barFillComplete: { backgroundColor: '#1A1A1A' },
  barLabel: {
    fontSize: 9,
    color: '#888888',
    marginTop: 4,
    fontWeight: '600',
  },
  barDays: { fontSize: 7, color: '#CCCCCC' },
});

// ── Metadata Row ──────────────────────────────────────────────────────────────
function MetaRow({ label, value, mono }) {
  return (
    <View style={mr.row}>
      <Text style={mr.label}>{label}</Text>
      <Text style={[mr.value, mono && mr.mono]}>{value}</Text>
    </View>
  );
}

const mr = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  label: { fontSize: 12, color: '#888888', fontWeight: '500', flex: 1 },
  value: { fontSize: 12, color: '#1A1A1A', fontWeight: '700', textAlign: 'right', flex: 1.4 },
  mono: { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontSize: 11 },
});

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function CompletionScreen({ profile, onBack }) {
  const [allLogs, setAllLogs] = useState({});
  const [lockedWeeks, setLockedWeeks] = useState([]);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const totalWeeks = profile?.weeks || TOTAL_WEEKS;

  useEffect(() => {
    (async () => {
      const [logs, locked] = await Promise.all([
        loadWeeklyLogs(),
        loadLockedWeeks(),
      ]);
      setAllLogs(logs);
      setLockedWeeks(locked);
    })();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  // ── Computed stats ────────────────────────────────────────────────────────
  const totalEntries = Object.keys(allLogs).reduce((acc, wk) => {
    const weekDays = allLogs[wk] || {};
    return acc + DAYS.filter((d) => !!getEntryText(weekDays[d])).length;
  }, 0);

  const totalPossible = totalWeeks * 5;
  const completionPct = totalPossible > 0
    ? Math.min(100, Math.round((totalEntries / totalPossible) * 100))
    : 0;

  const completedWeeks = Array.from({ length: totalWeeks }, (_, i) => {
    const wk = `week_${i + 1}`;
    return DAYS.every((d) => !!getEntryText(allLogs[wk]?.[d]));
  }).filter(Boolean).length;

  const requiredSections = totalWeeks;
  const sectionsComplete = completedWeeks;
  const isReady = completionPct === 100;

  // Timestamp
  const now = new Date();
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())} UTC`;
  const refId = generateRefId(profile);

  const handleDownloadPDF = async () => {
    const doGenerate = async () => {
      setGeneratingPdf(true);
      try {
        const result = await generatePdf(profile, allLogs);
        if (!result.success) {
          Alert.alert(
            'Export Failed',
            result.error || 'Could not generate PDF. Please try again.',
            [{ text: 'OK' }]
          );
        }
      } catch (e) {
        Alert.alert('Export Failed', e.message || 'An unexpected error occurred.', [{ text: 'OK' }]);
      } finally {
        setGeneratingPdf(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('This action will freeze all logs and generate the final PDF report. Edits cannot be undone. Are you sure you want to proceed?')) {
        await doGenerate();
      }
    } else {
      Alert.alert(
        'Freeze & Generate PDF',
        'This action will freeze all logs and generate the final PDF report. Edits cannot be undone. Are you sure you want to proceed?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Freeze & Generate',
            onPress: doGenerate
          }
        ]
      );
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── Top Bar ── */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <View style={styles.topBarCenter}>
          <Text style={styles.topBarTitle}>USTED INDUSTRIAL ATTACHMENT PORTAL</Text>
          <Text style={styles.topBarSub}>Cumulative Completion View</Text>
        </View>
        <View style={[styles.statusDot, isReady && styles.statusDotReady]} />
      </View>

      <Animated.ScrollView
        style={[styles.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Page Title ── */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Attachment{'\n'}Completion Report</Text>
          <View style={[styles.statusPill, isReady ? styles.statusPillReady : styles.statusPillPending]}>
            <Text style={styles.statusPillText}>
              {isReady ? '✓ VERIFIED' : '○ IN PROGRESS'}
            </Text>
          </View>
        </View>

        {/* ── 3-Column Summary Matrix ── */}
        <View style={styles.metricRow}>
          <MetricCard
            label="Completion Status"
            value={`${completionPct}%`}
            sub="All log entries"
            accent={isReady}
          />
          <MetricCard
            label="Required Sections"
            value={`${sectionsComplete}/${requiredSections}`}
            sub="Weeks complete"
          />
          <MetricCard
            label="Export Readiness"
            value={isReady ? 'Ready' : 'Pending'}
            sub={isReady ? '✓ PDF unlocked' : 'Logs incomplete'}
          />
        </View>

        {/* ── Historical Summary Bar Chart ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Weekly Completion Graph</Text>
            <Text style={styles.sectionBadge}>{totalEntries} / {totalPossible} days</Text>
          </View>
          <Text style={styles.sectionSub}>
            Completion milestones per week — 5 days = 100%
          </Text>
          <WeekBarChart allLogs={allLogs} totalWeeks={totalWeeks} />
        </View>

        {/* ── Global Progress Bar ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Overall Progress</Text>
            <Text style={styles.sectionBadge}>{completionPct}%</Text>
          </View>
          <View style={styles.globalBarTrack}>
            <View style={[styles.globalBarFill, { width: `${completionPct}%` }]} />
          </View>
          <Text style={styles.globalBarCaption}>
            {totalEntries} entries logged across {completedWeeks} complete week{completedWeeks !== 1 ? 's' : ''} · {totalPossible - totalEntries} remaining
          </Text>
        </View>

        {/* ── Official Closeout Metadata Grid ── */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Official Closeout Details</Text>
            <Text style={styles.metaIcon}>🔒</Text>
          </View>
          <Text style={styles.sectionSub}>
            System-validated variables included in the official print document.
          </Text>

          <MetaRow label="Document Type" value="Attachment Closeout Report" />
          <MetaRow label="Reference Closeout ID" value={refId} mono />
          <MetaRow label="Student Name" value={profile?.name || '—'} />
          <MetaRow label="Index Number" value={profile?.indexNumber || '—'} mono />
          <MetaRow label="Programme" value={profile?.program || '—'} />
          <MetaRow label="Level" value={profile?.level || '—'} />
          <MetaRow label="Industry / Company" value={profile?.industryName || profile?.company || '—'} />
          <MetaRow label="Industry Location" value={profile?.industryLocation || '—'} />
          <MetaRow label="Supervisor" value={profile?.supervisorName || '—'} />
          <MetaRow label="WEL Commencement" value={profile?.welCommencement || '—'} />
          <MetaRow label="Duration (Weeks)" value={`${totalWeeks} weeks`} />
          <MetaRow label="Weeks Locked / Frozen" value={`${lockedWeeks.length} of ${totalWeeks}`} />
          <MetaRow label="Verification Status" value={isReady ? 'COMPLETE ✓' : 'IN PROGRESS'} />
          <MetaRow label="Timestamp Validation" value={timestamp} mono />
        </View>

        {/* ── Compliance Note ── */}
        <View style={styles.noteRow}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            This closeout report satisfies USTED WEL documentation requirements. Retain the PDF for departmental submission and audit compliance.
          </Text>
        </View>

        <View style={{ height: 120 }} />
      </Animated.ScrollView>

      {/* ── Anchored PDF CTA Button ── */}
      <View style={styles.ctaAnchor}>
        <TouchableOpacity
          style={[styles.ctaBtn, (!isReady || generatingPdf) && styles.ctaBtnDimmed]}
          onPress={handleDownloadPDF}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaBtnIcon}>📥</Text>
          <Text style={styles.ctaBtnText}>
            {generatingPdf ? 'GENERATING DOCUMENT...' : 'FREEZE WEEK & GENERATE PDF'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.ctaCaption}>
          Compiles and downloads the official paper-compliant document format layout.
        </Text>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: USTED_THEME.background },

  topBar: {
    backgroundColor: USTED_THEME.surface,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
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
    borderColor: USTED_THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: { fontSize: 22, color: USTED_THEME.textPrimary, lineHeight: 24 },
  topBarCenter: { flex: 1 },
  topBarTitle: { fontSize: 10, fontWeight: '800', color: USTED_THEME.textPrimary, letterSpacing: 0.4 },
  topBarSub: { fontSize: 11, color: USTED_THEME.textSecondary, marginTop: 2 },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#CCCCCC',
  },
  statusDotReady: { backgroundColor: '#22C55E' },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 24 },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: USTED_THEME.textPrimary,
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    marginTop: 4,
  },
  statusPillReady: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  statusPillPending: { backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E0E0E0' },
  statusPillText: { fontSize: 10, fontWeight: '800', color: USTED_THEME.textPrimary, letterSpacing: 0.5 },

  metricRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },

  sectionCard: {
    backgroundColor: USTED_THEME.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: USTED_THEME.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: USTED_THEME.textPrimary },
  sectionBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: USTED_THEME.textSecondary,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  metaIcon: { fontSize: 16 },
  sectionSub: { fontSize: 11, color: USTED_THEME.textSecondary, marginBottom: 12 },

  globalBarTrack: {
    height: 10,
    backgroundColor: '#EEEEEE',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  globalBarFill: {
    height: '100%',
    backgroundColor: USTED_THEME.primary,
    borderRadius: 5,
  },
  globalBarCaption: { fontSize: 11, color: USTED_THEME.textSecondary },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    marginBottom: 8,
  },
  noteIcon: { fontSize: 14, marginTop: 1 },
  noteText: { flex: 1, fontSize: 11, color: '#92400E', lineHeight: 16 },

  // ── Anchored CTA ──
  ctaAnchor: {
    backgroundColor: USTED_THEME.surface,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    borderTopWidth: 1,
    borderTopColor: USTED_THEME.border,
  },
  ctaBtn: {
    backgroundColor: USTED_THEME.primary,
    borderRadius: 12,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 8,
  },
  ctaBtnDimmed: { backgroundColor: '#888888' },
  ctaBtnIcon: { fontSize: 18 },
  ctaBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ctaCaption: {
    fontSize: 10,
    color: USTED_THEME.textSecondary,
    textAlign: 'center',
    lineHeight: 15,
  },
});
