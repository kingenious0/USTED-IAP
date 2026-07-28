import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
  console.warn(
    '⚠️ [Supabase Warning]: EXPO_PUBLIC_SUPABASE_URL is missing! ' +
    'If you recently added your .env file, stop Metro and run "npx expo start -c" to clear the cache.'
  );
}

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key';

export const isMockClient = !process.env.EXPO_PUBLIC_SUPABASE_URL;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Upload a local PDF file (returned by expo-print) to Supabase Storage.
 * Path: week-pdfs/{indexNumber}/week_{weekNumber}.pdf
 *
 * @param {number} weekNumber
 * @param {string} localUri   - file:// URI from expo-print
 * @param {object} profile
 * @returns {{ success: boolean, path?: string, error?: string }}
 */
export const uploadWeekPdfToStorage = async (weekNumber, localUri, profile) => {
  if (isMockClient) {
    return { success: false, error: 'Supabase not configured — skipping cloud upload.' };
  }
  if (!localUri) {
    return { success: false, error: 'No local file URI provided.' };
  }

  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(localUri, {
      encoding: 'base64',
    });

    // Convert base64 → ArrayBuffer (React Native compatible)
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    const indexId = (profile?.indexNumber || 'unknown').replace(/\s+/g, '_');
    const storagePath = `week-pdfs/${indexId}/week_${weekNumber}.pdf`;

    const { error } = await supabase.storage
      .from('uiap-logs')
      .upload(storagePath, byteArray, {
        contentType: 'application/pdf',
        upsert: true,
      });

    if (error) throw error;
    return { success: true, path: storagePath };
  } catch (err) {
    console.error('[uploadWeekPdfToStorage] Error:', err);
    return { success: false, error: err.message };
  }
};
