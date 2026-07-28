import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { supabase } from '../utils/supabase';
import { USTED_THEME } from '../utils/theme';

let GoogleSignin;
try {
  GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com',
  });
} catch (e) {
  console.warn('[GoogleSignin] Native module is not available in this environment (e.g. Expo Go).');
}

export default function AuthScreen({ onAuthSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [indexNumber, setIndexNumber] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleEmailAuth = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!indexNumber.trim() || !password.trim()) {
      const msg = 'Please enter both your Index Number and Password.';
      setErrorMsg(msg);
      return;
    }

    const email = `${indexNumber.trim().replace(/\s+/g, '')}@student.usted.edu.gh`;

    setLoading(true);
    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          const msg = 'Please enter your full name.';
          setErrorMsg(msg);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
              index_number: indexNumber.trim(),
            },
          },
        });
        if (error) throw error;

        const successText = 'Account created successfully! You can now log in using your Index Number and Password.';
        setSuccessMsg(successText);
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess(data.session);
      }
    } catch (error) {
      let friendlyMessage = error.message || 'Something went wrong during authentication.';
      const lower = friendlyMessage.toLowerCase();
      if (lower.includes('invalid login credentials')) {
        friendlyMessage = 'Incorrect Index Number or Password. If you do not have an account yet, please tap "Sign Up" below.';
      } else if (lower.includes('user already registered') || lower.includes('already exists')) {
        friendlyMessage = 'An account with this Index Number already exists. Please switch to Log In.';
      } else if (lower.includes('at least 6 characters')) {
        friendlyMessage = 'Password must be at least 6 characters long.';
      }

      setErrorMsg(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!GoogleSignin) {
      const msg = 'Native Google Sign-In is not supported in Expo Go. Please use your Index Number and Password.';
      setErrorMsg(msg);
      return;
    }

    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      if (!idToken) {
        throw new Error('Google Sign-In failed to retrieve ID Token.');
      }

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) throw error;
      if (onAuthSuccess) onAuthSuccess(data.session);
    } catch (error) {
      console.error('Google Sign-in Error:', error);
      setErrorMsg(error.message || 'Could not complete Google Sign-in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.outerContainer}>
      <KeyboardAvoidingView
        style={styles.mobileFrame}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.title}>U-IAP</Text>
            <Text style={styles.subtitle}>USTED Industrial Attachment Portal</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>{isSignUp ? 'Create Account' : 'Welcome Back'}</Text>
            <Text style={styles.cardSub}>Sign in to sync your attachment logs</Text>

            {/* Inline Feedback Banners */}
            {errorMsg ? (
              <View style={styles.errorBanner}>
                <Text style={styles.bannerIcon}>⚠️</Text>
                <Text style={styles.errorBannerText}>{errorMsg}</Text>
              </View>
            ) : null}

            {successMsg ? (
              <View style={styles.successBanner}>
                <Text style={styles.bannerIcon}>✅</Text>
                <Text style={styles.successBannerText}>{successMsg}</Text>
              </View>
            ) : null}

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                  value={fullName}
                  onChangeText={(val) => { setErrorMsg(''); setFullName(val); }}
                  placeholder="e.g. Samuel Kojo"
                  placeholderTextColor={USTED_THEME.textSecondary}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  style={[styles.input, focusedField === 'fullName' && styles.inputFocused]}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>INDEX NUMBER</Text>
              <TextInput
                value={indexNumber}
                onChangeText={(val) => { setErrorMsg(''); setIndexNumber(val); }}
                placeholder="e.g. 040921000"
                placeholderTextColor={USTED_THEME.textSecondary}
                autoCapitalize="none"
                keyboardType="numeric"
                onFocus={() => setFocusedField('indexNumber')}
                onBlur={() => setFocusedField(null)}
                style={[styles.input, focusedField === 'indexNumber' && styles.inputFocused]}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>PASSWORD</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  value={password}
                  onChangeText={(val) => { setErrorMsg(''); setPassword(val); }}
                  placeholder="••••••••"
                  placeholderTextColor={USTED_THEME.textSecondary}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  style={[
                    styles.input,
                    styles.passwordInput,
                    focusedField === 'password' && styles.inputFocused
                  ]}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.eyeText}>{showPassword ? 'HIDE' : 'SHOW'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleEmailAuth}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>
                  {isSignUp ? 'CREATE ACCOUNT' : 'LOG IN'}
                </Text>
              )}
            </TouchableOpacity>

            {/* ── Continue with Google (Commented out for later reuse) ──
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>
            ── End Google Auth ── */}
          </View>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => {
              setErrorMsg('');
              setSuccessMsg('');
              setIsSignUp(!isSignUp);
            }}
          >
            <Text style={styles.toggleText}>
              {isSignUp
                ? 'Already have an account? Log In'
                : "Don't have an account? Sign Up"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: USTED_THEME.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mobileFrame: {
    width: '100%',
    maxWidth: 390,
    height: '100%',
    backgroundColor: USTED_THEME.surface,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: USTED_THEME.border,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: USTED_THEME.primary,
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 12,
    color: USTED_THEME.textSecondary,
    fontWeight: '600',
    marginTop: 4,
  },
  card: {
    backgroundColor: USTED_THEME.surface,
    borderRadius: USTED_THEME.borderRadius.lg,
    borderWidth: 1,
    borderColor: USTED_THEME.border,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: USTED_THEME.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: USTED_THEME.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: USTED_THEME.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 16,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: USTED_THEME.borderRadius.md,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
    fontWeight: '600',
    lineHeight: 16,
  },
  bannerIcon: {
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: USTED_THEME.textPrimary,
    letterSpacing: 1,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderWidth: 1.5,
    borderColor: USTED_THEME.border,
    borderRadius: USTED_THEME.borderRadius.md,
    paddingHorizontal: 16,
    fontSize: 14,
    color: USTED_THEME.textPrimary,
    backgroundColor: USTED_THEME.surface,
  },
  inputFocused: {
    borderColor: USTED_THEME.primary,
  },
  primaryBtn: {
    height: 48,
    backgroundColor: USTED_THEME.primary,
    borderRadius: USTED_THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: USTED_THEME.border,
  },
  dividerText: {
    fontSize: 11,
    color: USTED_THEME.textSecondary,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  googleBtn: {
    height: 48,
    borderWidth: 1.5,
    borderColor: USTED_THEME.border,
    borderRadius: USTED_THEME.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    // subtle shadow
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  googleBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: USTED_THEME.textPrimary,
  },
  toggleBtn: {
    alignItems: 'center',
    marginTop: 24,
  },
  toggleText: {
    fontSize: 12,
    color: USTED_THEME.primary,
    fontWeight: '600',
  },
  passwordContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 60,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 11,
    fontWeight: '700',
    color: USTED_THEME.textSecondary,
    letterSpacing: 0.5,
  },
});
