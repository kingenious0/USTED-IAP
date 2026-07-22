import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { saveStudentProfile } from '../utils/storage';
import { USTED_THEME } from '../utils/theme';


// ── Picker Data ────────────────────────────────────────────────────────────────
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const LEVELS = ['100', '200', '300', '400'];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 10 }, (_, i) => String(currentYear - 2 + i));

const WEEKS = Array.from({ length: 13 }, (_, i) => String(i + 4)); // 4 to 16 weeks

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

// ── Main Screen ────────────────────────────────────────────────────────────────
export default function SetupScreen({ onComplete, onCancel }) {
  const [form, setForm] = useState({
    name: '',
    indexNumber: '',
    program: '',
    level: '',
    industryName: '',
    industryLocation: '',
    supervisorName: '',
    welMonth: '',
    welYear: '',
    weeks: '8', // Default to 8 weeks
  });
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Picker modal state
  const [picker, setPicker] = useState({
    visible: false,
    field: null,   // 'level' | 'welMonth' | 'welYear' | 'weeks' | 'program'
    options: [],
    title: '',
  });

  const set = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }));

  const openPicker = (field, options, title) => {
    setSearchQuery('');
    setPicker({ visible: true, field, options, title });
  };

  const selectPickerItem = (value) => {
    setForm((prev) => ({ ...prev, [picker.field]: value }));
    setPicker({ visible: false, field: null, options: [], title: '' });
    setSearchQuery('');
  };

  const handleSubmit = async () => {
    const {
      name, indexNumber, program, level,
      industryName, industryLocation, supervisorName,
      welMonth, welYear, weeks,
    } = form;

    if (
      !name.trim() || !indexNumber.trim() || !program.trim() || !level ||
      !industryName.trim() || !industryLocation.trim() || !supervisorName.trim() ||
      !welMonth || !welYear || !weeks
    ) {
      Alert.alert('Incomplete Profile', 'Please fill in all fields before continuing.');
      return;
    }

    setLoading(true);
    try {
      const profile = {
        name: name.trim(),
        indexNumber: indexNumber.trim(),
        program: program.trim(),
        level,
        industryName: industryName.trim(),
        industryLocation: industryLocation.trim(),
        supervisorName: supervisorName.trim(),
        welMonth,
        welYear,
        welCommencement: (welMonth && welYear) ? `${welMonth} ${welYear}` : '',
        weeks: parseInt(weeks, 10),
        createdAt: new Date().toISOString(),
      };

      await saveStudentProfile(profile);
      onComplete(profile);
    } catch (err) {
      console.error('[SetupScreen] Error submitting profile:', err);
      Alert.alert('Error', 'An unexpected error occurred while saving your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* ── 390px Mobile Viewport ── */}
      <KeyboardAvoidingView
        style={styles.mobileFrame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onCancel} style={styles.topBarCancel} activeOpacity={0.7}>
            <Text style={styles.topBarCancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.topBarTitle}>USTED PORTAL</Text>
        </View>

        {/* Scrollable Form */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Welcome, setup your log sheet!</Text>
            <Text style={styles.headerSubtitle}>
              Complete your student profile. These will be used to generate your daily log sheet.
            </Text>
          </View>

          {/* ── Form ──────────────────────────────────────────── */}
          <View style={styles.form}>

            {/* 1. Student's Full Name */}
            <Field
              label="Student's Full Name"
              placeholder="Enter your full name"
              value={form.name}
              onChangeText={set('name')}
              autoCapitalize="words"
            />

            {/* 2. Index Number */}
            <Field
              label="Index Number"
              placeholder="e.g., 1234567890"
              value={form.indexNumber}
              onChangeText={set('indexNumber')}
              keyboardType="numeric"
            />

            {/* 3. Program & Level — side by side */}
            <View>
              <Text style={styles.fieldLabel}>Program &amp; Level</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={[styles.fieldInput, styles.rowInputWide, styles.selectorBtn]}
                  onPress={() => openPicker('program', PROGRAMMES_LIST, 'Select Program')}
                  activeOpacity={0.7}
                >
                  <Text style={form.program ? styles.selectorText : styles.selectorPlaceholder} numberOfLines={1}>
                    {form.program || 'Select Program'}
                  </Text>
                  <Text style={styles.selectorCaret}>▾</Text>
                </TouchableOpacity>
                {/* Level Selector */}
                <TouchableOpacity
                  style={[styles.fieldInput, styles.rowInputNarrow, styles.selectorBtn]}
                  onPress={() => openPicker('level', LEVELS, 'Select Level')}
                  activeOpacity={0.7}
                >
                  <Text style={form.level ? styles.selectorText : styles.selectorPlaceholder}>
                    {form.level || 'Level'}
                  </Text>
                  <Text style={styles.selectorCaret}>▾</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHint}>e.g., "BSc IT" and Level 300</Text>
            </View>

            {/* 4. Name of Industry */}
            <Field
              label="Name of Industry"
              placeholder="e.g., Vodafone Ghana Ltd"
              value={form.industryName}
              onChangeText={set('industryName')}
              autoCapitalize="words"
            />

            {/* 5. Location of Industry */}
            <Field
              label="Location of Industry"
              placeholder="e.g., Accra, Greater Accra"
              value={form.industryLocation}
              onChangeText={set('industryLocation')}
              autoCapitalize="words"
            />

            {/* 6. Name of Supervisor */}
            <Field
              label="Name of Supervisor"
              placeholder="e.g., Mr. Kofi Mensah"
              value={form.supervisorName}
              onChangeText={set('supervisorName')}
              autoCapitalize="words"
            />

            {/* 7. WEL Commencement — Month & Year selectors */}
            <View>
              <Text style={styles.fieldLabel}>WEL Commencement</Text>
              <View style={styles.row}>
                {/* Month Selector */}
                <TouchableOpacity
                  style={[styles.fieldInput, styles.rowInputWide, styles.selectorBtn]}
                  onPress={() => openPicker('welMonth', MONTHS, 'Select Month')}
                  activeOpacity={0.7}
                >
                  <Text style={form.welMonth ? styles.selectorText : styles.selectorPlaceholder}>
                    {form.welMonth || 'Month'}
                  </Text>
                  <Text style={styles.selectorCaret}>▾</Text>
                </TouchableOpacity>

                {/* Year Selector */}
                <TouchableOpacity
                  style={[styles.fieldInput, styles.rowInputNarrow, styles.selectorBtn]}
                  onPress={() => openPicker('welYear', YEARS, 'Select Year')}
                  activeOpacity={0.7}
                >
                  <Text style={form.welYear ? styles.selectorText : styles.selectorPlaceholder}>
                    {form.welYear || 'Year'}
                  </Text>
                  <Text style={styles.selectorCaret}>▾</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.fieldHint}>Month and year your attachment begins</Text>
            </View>

            {/* 8. Number of Weeks */}
            <View>
              <Text style={styles.fieldLabel}>Attachment Duration</Text>
              <TouchableOpacity
                style={[styles.fieldInput, styles.selectorBtn]}
                onPress={() => openPicker('weeks', WEEKS, 'Select Attachment Duration')}
                activeOpacity={0.7}
              >
                <Text style={form.weeks ? styles.selectorText : styles.selectorPlaceholder}>
                  {form.weeks ? `${form.weeks} Weeks` : 'Select Weeks'}
                </Text>
                <Text style={styles.selectorCaret}>▾</Text>
              </TouchableOpacity>
              <Text style={styles.fieldHint}>Total number of weeks for the attachment (e.g. 8 weeks)</Text>
            </View>

          </View>
        </ScrollView>

        {/* ── Full-Width CTA Footer ─────────────────────────── */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.ctaButton, loading && styles.ctaButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.ctaButtonText}>
              {loading ? 'SAVING...' : 'CREATE MY DAILY LOG'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── Picker Modal ─────────────────────────────────────── */}
      <Modal
        visible={picker.visible}
        transparent
        animationType="slide"
        onRequestClose={() => setPicker({ ...picker, visible: false })}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPicker({ ...picker, visible: false })}
        >
          <View style={[styles.modalSheet, picker.field === 'program' && { maxHeight: '80%', height: '80%' }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>{picker.title}</Text>
            {picker.options.length > 8 && (
              <TextInput
                style={styles.searchInput}
                placeholder="Search..."
                placeholderTextColor="#AAAAAA"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
                autoCorrect={false}
              />
            )}
            <FlatList
              data={picker.options.filter(opt => opt.toLowerCase().includes(searchQuery.toLowerCase()))}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = form[picker.field] === item;
                return (
                  <TouchableOpacity
                    style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                    onPress={() => selectPickerItem(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                      {item}
                    </Text>
                    {isSelected && <Text style={styles.pickerCheck}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={() => (
                <Text style={{ textAlign: 'center', color: '#999', marginVertical: 20 }}>No matching items</Text>
              )}
            />
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setPicker({ ...picker, visible: false })}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ── Reusable text field ────────────────────────────────────────────────────────
function Field({ label, placeholder, value, onChangeText, keyboardType, autoCapitalize }) {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[
          styles.fieldInput,
          isFocused && { borderColor: USTED_THEME.primary }
        ]}
        placeholder={placeholder}
        placeholderTextColor={USTED_THEME.textSecondary}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        autoCapitalize={autoCapitalize || 'sentences'}
        returnKeyType="next"
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const SCREEN_W = Dimensions.get('window').width;
const MOBILE_W = Math.min(SCREEN_W, 390);

const styles = StyleSheet.create({
  // Outer shell — fills entire screen, centers the mobile frame
  outerContainer: {
    flex: 1,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  // 390px mobile frame
  mobileFrame: {
    width: MOBILE_W,
    flex: 1,
    backgroundColor: USTED_THEME.background,
    // subtle shadow on wider screens (web/tablet)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: SCREEN_W > 420 ? 0.12 : 0,
    shadowRadius: 16,
    elevation: SCREEN_W > 420 ? 6 : 0,
  },

  // Top bar
  topBar: {
    backgroundColor: USTED_THEME.surface,
    paddingTop: Platform.OS === 'ios' ? 50 : 36,
    paddingBottom: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  topBarCancel: {
    position: 'absolute',
    left: 20,
    bottom: 10,
  },
  topBarCancelText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: USTED_THEME.textPrimary,
    letterSpacing: 0.6,
    textAlign: 'center',
  },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 24,
    backgroundColor: USTED_THEME.background,
  },

  // Header
  header: { marginBottom: 28 },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: USTED_THEME.textPrimary,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: USTED_THEME.textSecondary,
    lineHeight: 20,
  },

  // Form
  form: { gap: 14 },
  fieldGroup: { marginVertical: 14 },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: USTED_THEME.textPrimary,
    marginBottom: 7,
  },
  fieldInput: {
    height: 50,
    borderWidth: 1.5,
    borderColor: USTED_THEME.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    color: USTED_THEME.textPrimary,
    backgroundColor: USTED_THEME.surface,
  },
  fieldHint: {
    fontSize: 11,
    color: USTED_THEME.textSecondary,
    marginTop: 5,
  },

  // Row layout (side-by-side)
  row: { flexDirection: 'row', gap: 10 },
  rowInputWide: { flex: 2 },
  rowInputNarrow: { flex: 1 },

  // Selector button (replaces TextInput for pickers)
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
  },
  selectorText: { fontSize: 14, color: USTED_THEME.textPrimary, flex: 1 },
  selectorPlaceholder: { fontSize: 14, color: USTED_THEME.textSecondary, flex: 1 },
  selectorCaret: { fontSize: 12, color: USTED_THEME.textSecondary, marginLeft: 4 },

  // ── Footer / CTA ─────────────────────────────────────────
  footer: {
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingTop: 12,
    backgroundColor: USTED_THEME.background,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  ctaButton: {
    width: '100%',
    backgroundColor: USTED_THEME.primary,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Shadow details
    shadowColor: USTED_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  ctaButtonDisabled: {
    backgroundColor: '#CCCCCC',
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.2,
  },

  // ── Picker Modal ─────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  modalSheet: {
    width: MOBILE_W,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '60%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDDDDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 12,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  pickerItemActive: { backgroundColor: '#F7F7F7', borderRadius: 6, paddingHorizontal: 8 },
  pickerItemText: { flex: 1, fontSize: 15, color: '#333333' },
  pickerItemTextActive: { fontWeight: '700', color: '#1A1A1A' },
  pickerCheck: { fontSize: 15, color: '#1A1A1A', fontWeight: '700' },
  modalCancelBtn: {
    marginTop: 12,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDDDDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { fontSize: 14, color: '#888888', fontWeight: '600' },
  searchInput: {
    height: 46,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#1A1A1A',
    backgroundColor: '#F8FAFC',
    marginBottom: 12,
  },
});
