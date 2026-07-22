import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { supabase, isMockClient } from './supabase';

// NetInfo is not supported on web — use a safe shim
const getNetworkState = async () => {
  if (Platform.OS === 'web') {
    return { isConnected: typeof navigator !== 'undefined' ? navigator.onLine : true };
  }
  try {
    const NetInfo = require('@react-native-community/netinfo').default;
    return await NetInfo.fetch();
  } catch (_e) {
    return { isConnected: true };
  }
};

const KEYS = {
  STUDENT_PROFILE: 'u_iap_student_profile',
  WEEKLY_LOGS: 'u_iap_weekly_logs',
  SYNC_QUEUE: 'u_iap_sync_queue',
};

// ─── Student Profile ────────────────────────────────────────────────────────

export const saveStudentProfile = async (profile) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const profileWithUser = {
      ...profile,
      userId: user ? user.id : null,
    };

    // 1. Save locally
    await AsyncStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(profileWithUser));

    // 2. Sync to Supabase
    if (!isMockClient && profile && profile.indexNumber) {
      try {
        const payload = {
          user_id: user ? user.id : null,
          index_number: profile.indexNumber,
          name: profile.name,
          program: profile.program,
          level: profile.level,
          industry_name: profile.industryName,
          industry_location: profile.industryLocation,
          supervisor_name: profile.supervisorName,
          wel_month: profile.welMonth,
          wel_year: profile.welYear,
          wel_commencement: profile.welCommencement || '',
          weeks: profile.weeks,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase.from('student_profiles').upsert([payload]);
        if (error) throw error;
      } catch (cloudErr) {
        console.error('[saveStudentProfile] Supabase sync failed:', cloudErr);
      }
    }

    return { success: true };
  } catch (e) {
    console.error('saveStudentProfile error:', e);
    return { success: false, error: e.message };
  }
};

export const loadStudentProfile = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.STUDENT_PROFILE);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

// ─── Weekly Logs ────────────────────────────────────────────────────────────

export const saveWeeklyLog = async (weekKey, dayKey, logData) => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WEEKLY_LOGS);
    const logs = raw ? JSON.parse(raw) : {};
    if (!logs[weekKey]) logs[weekKey] = {};
    logs[weekKey][dayKey] = logData;
    await AsyncStorage.setItem(KEYS.WEEKLY_LOGS, JSON.stringify(logs));
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export const loadWeeklyLogs = async () => {
  try {
    const raw = await AsyncStorage.getItem(KEYS.WEEKLY_LOGS);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
};

// ─── Sync Queue ─────────────────────────────────────────────────────────────

const addToSyncQueue = async (payload) => {
  const raw = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
  const queue = raw ? JSON.parse(raw) : [];
  queue.push({ ...payload, queuedAt: new Date().toISOString() });
  await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
};

export const syncToCloud = async (payload) => {
  const state = await getNetworkState();

  if (!state.isConnected) {
    await addToSyncQueue(payload);
    return { success: false, queued: true, message: 'Saved locally. Will sync when online.' };
  }

  if (isMockClient) {
    return { success: true, mock: true, message: 'Mock sync: no real database configured.' };
  }

  try {
    // Upsert payload to supabase. Ensure payload contains the new fields
    const { error } = await supabase.from('daily_logs').upsert([payload]);
    if (error) throw error;
    return { success: true, message: 'Synced to cloud.' };
  } catch (e) {
    console.error('[syncToCloud] Database sync failed:', e);
    await addToSyncQueue(payload);
    return { success: false, queued: true, message: e.message || String(e) };
  }
};

export const flushSyncQueue = async () => {
  const state = await getNetworkState();
  if (!state.isConnected || isMockClient) return;

  const raw = await AsyncStorage.getItem(KEYS.SYNC_QUEUE);
  const queue = raw ? JSON.parse(raw) : [];
  if (queue.length === 0) return;

  const remaining = [];
  for (const item of queue) {
    try {
      const { error } = await supabase.from('daily_logs').upsert([item]);
      if (error) remaining.push(item);
    } catch (_e) {
      remaining.push(item);
    }
  }
  await AsyncStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(remaining));
};

// ─── Locked Weeks ───────────────────────────────────────────────────────────

const LOCKED_WEEKS_KEY = 'u_iap_locked_weeks';

export const lockWeek = async (weekNumber) => {
  try {
    const raw = await AsyncStorage.getItem(LOCKED_WEEKS_KEY);
    const locked = raw ? JSON.parse(raw) : [];
    if (!locked.includes(weekNumber)) {
      locked.push(weekNumber);
      await AsyncStorage.setItem(LOCKED_WEEKS_KEY, JSON.stringify(locked));
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
};

export const loadLockedWeeks = async () => {
  try {
    const raw = await AsyncStorage.getItem(LOCKED_WEEKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

// ─── Clear All (for dev/testing/logout) ─────────────────────────────────────────────
 
export const clearAllData = async () => {
  try {
    await AsyncStorage.multiRemove([...Object.values(KEYS), LOCKED_WEEKS_KEY]);
  } catch (e) {
    console.error('Error clearing local storage:', e);
  }
};

// ─── Sync Data from Cloud on Login ───────────────────────────────────────────

export const restoreDataFromCloud = async () => {
  if (isMockClient) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 1. Fetch profile strictly matching user_id
    const { data: profiles, error: profileErr } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('user_id', user.id);

    if (profileErr) throw profileErr;

    const profile = profiles && profiles[0];

    if (!profile) return null;

    // Map back to local profile
    const localProfile = {
      userId: user.id,
      name: profile.name,
      indexNumber: profile.index_number,
      program: profile.program,
      level: profile.level,
      industryName: profile.industry_name,
      industryLocation: profile.industry_location,
      supervisorName: profile.supervisor_name,
      welMonth: profile.wel_month,
      welYear: profile.wel_year,
      welCommencement: profile.wel_commencement,
      weeks: profile.weeks,
      createdAt: profile.created_at,
    };

    // Save profile locally
    await AsyncStorage.setItem(KEYS.STUDENT_PROFILE, JSON.stringify(localProfile));

    // 2. Fetch daily logs
    const { data: dbLogs, error: logsErr } = await supabase
      .from('daily_logs')
      .select('*')
      .eq('index_number', localProfile.indexNumber);

    if (logsErr) throw logsErr;

    const localLogs = {};
    if (dbLogs) {
      for (const row of dbLogs) {
        const weekKey = `week_${row.week}`;
        if (!localLogs[weekKey]) localLogs[weekKey] = {};
        localLogs[weekKey][row.day] = {
          startTime: row.start_time,
          endTime: row.end_time,
          activityText: row.activity,
          learningOutcome: row.learning_outcome,
          skillsDemonstrated: row.skills_demonstrated,
          remarks: row.remarks,
        };
      }
    }
    await AsyncStorage.setItem(KEYS.WEEKLY_LOGS, JSON.stringify(localLogs));

    // 3. Reconstruct locked weeks from Storage PDFs
    const indexId = localProfile.indexNumber.replace(/\s+/g, '_');
    const { data: files, error: filesErr } = await supabase.storage
      .from('uiap-logs')
      .list(`week-pdfs/${indexId}`);

    const lockedWeeks = [];
    if (!filesErr && files) {
      for (const file of files) {
        const match = file.name.match(/week_(\d+)\.pdf/);
        if (match) {
          lockedWeeks.push(parseInt(match[1], 10));
        }
      }
    }
    await AsyncStorage.setItem(LOCKED_WEEKS_KEY, JSON.stringify(lockedWeeks));

    return localProfile;
  } catch (err) {
    console.error('[restoreDataFromCloud] error:', err);
    return null;
  }
};
