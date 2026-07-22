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

  const handleEmailAuth = async () => {
    if (!indexNumber.trim() || !password.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // Convert index number into an email format automatically
    const email = `${indexNumber.trim().replace(/\s+/g, '')}@student.usted.edu.gh`;

    setLoading(true);
    try {
      if (isSignUp) {
        if (!fullName.trim()) {
          Alert.alert('Error', 'Please enter your full name.');
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
        
        Alert.alert(
          'Account Created', 
          'Your account has been successfully created! You can now log in using your Index Number and Password.'
        );
        setIsSignUp(false); // Switch to Log In mode
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });
        if (error) throw error;
        if (onAuthSuccess) onAuthSuccess(data.session);
      }
    } catch (error) {
      Alert.alert('Authentication Error', error.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!GoogleSignin) {
      Alert.alert(
        'Feature Unavailable',
        'Native Google Sign-In requires a custom Development Build (Prebuild) and is not supported directly in the Expo Go client. Please use your Index Number and Password instead.'
      );
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
      Alert.alert('Google Auth Error', error.message || 'Could not complete Google Sign-in.');
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

            {isSignUp && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>FULL NAME</Text>
                <TextInput
                  value={fullName}
                  onChangeText={setFullName}
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
                onChangeText={setIndexNumber}
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
                  onChangeText={setPassword}
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
          </View>

          <TouchableOpacity
            style={styles.toggleBtn}
            onPress={() => setIsSignUp(!isSignUp)}
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
    marginBottom: 24,
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
