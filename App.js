import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { loadStudentProfile, saveStudentProfile, flushSyncQueue, restoreDataFromCloud, clearAllData } from './src/utils/storage';
import { supabase } from './src/utils/supabase';

// ── Screens ───────────────────────────────────────────────────────────────────
import AuthScreen         from './src/screens/AuthScreen';
import SetupScreen        from './src/screens/SetupScreen';
import LogsHubScreen      from './src/screens/LogsHubScreen';
import WeekProgressScreen from './src/screens/WeekProgressScreen';
import CompletionScreen   from './src/screens/CompletionScreen';

// ── App Entry Point ───────────────────────────────────────────────────────────
export default function App() {
  const [profile, setProfile]         = useState(null);
  const [session, setSession]         = useState(null);
  const [screen, setScreen]           = useState('auth');
  // 'auth' | 'setup' | 'hub' | 'editor' | 'completion'
  const [editorWeek, setEditorWeek]   = useState(1);
  const [editorDay, setEditorDay]     = useState(null); // null = let editor pick default
  const [loading, setLoading]         = useState(true);
  const [hubRefreshKey, setHubRefreshKey] = useState(0); // increments to force hub data reload

  const handleSessionState = async (currentSession) => {
    setLoading(true);
    if (!currentSession) {
      setProfile(null);
      setScreen('auth');
      setLoading(false);
      return;
    }

    // Recover profile & logs from local storage first
    const localProfile = await loadStudentProfile();
    if (localProfile) {
      setProfile(localProfile);
      setScreen('hub');
      await flushSyncQueue();
    } else {
      // Fetch and restore profile & logs from Supabase
      const restored = await restoreDataFromCloud();
      if (restored) {
        setProfile(restored);
        setScreen('hub');
      } else {
        // No profile found online or offline, go to onboarding setup
        setScreen('setup');
      }
    }
    setLoading(false);
  };

  // Restore saved profile & listen for auth on mount
  useEffect(() => {
    // 1. Check current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      handleSessionState(currentSession);
    });

    // 2. Listen to Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      await handleSessionState(currentSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSetupComplete = (newProfile) => {
    setProfile(newProfile);
    setScreen('hub');
  };

  // Called from LogsHubScreen — "Log Today" or "Edit Log" for a specific day
  const handleOpenEditor = (week, day = null) => {
    setEditorWeek(week);
    setEditorDay(day);
    setScreen('editor');
  };

  // ── Splash ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.splash}>
        <Text style={styles.splashTitle}>U-IAP</Text>
        <Text style={styles.splashSub}>USTED Industrial Attachment Portal</Text>
      </View>
    );
  }

  // ── Screen Router ──────────────────────────────────────────────────────────
  switch (screen) {
    case 'auth':
      return <AuthScreen onAuthSuccess={(newSession) => handleSessionState(newSession)} />;

    case 'setup':
      return (
        <SetupScreen
          onComplete={handleSetupComplete}
          onCancel={async () => {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.warn('Sign out error:', e);
            }
            try {
              await clearAllData();
            } catch (e) {
              console.warn('Clear storage error:', e);
            }
            setProfile(null);
            setSession(null);
            setScreen('auth');
          }}
        />
      );

    case 'hub':
      return (
        <LogsHubScreen
          profile={profile}
          onLogToday={handleOpenEditor}
          onBack={() => setScreen('setup')}
          refreshKey={hubRefreshKey}
          onUpdateProfile={async (updated) => {
            await saveStudentProfile(updated);
            setProfile(updated);
          }}
          onLogout={async () => {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              console.warn('Sign out error:', e);
            }
            try {
              await clearAllData();
            } catch (e) {
              console.warn('Clear storage error:', e);
            }
            setProfile(null);
            setSession(null);
            setScreen('auth');
          }}
        />
      );

    case 'editor':
      return (
        <WeekProgressScreen
          profile={profile}
          currentWeek={editorWeek}
          initialDay={editorDay}
          onWeekChange={setEditorWeek}
          onViewProgress={() => setScreen('completion')}
          onBack={() => {
            setHubRefreshKey((k) => k + 1); // force hub to re-read storage
            setScreen('hub');
          }}
        />
      );

    case 'completion':
      return (
        <CompletionScreen
          profile={profile}
          onBack={() => setScreen('hub')}
        />
      );

    default:
      return <AuthScreen onAuthSuccess={(newSession) => handleSessionState(newSession)} />;
  }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
  },
  splashTitle: {
    fontSize: 40,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 8,
  },
  splashSub: {
    fontSize: 12,
    color: '#888888',
    letterSpacing: 1,
  },
});
