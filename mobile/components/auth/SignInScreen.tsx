import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';

export function SignInScreen() {
  const { signInWithEmail, verifyEmailCode } = useAuth();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'verifying' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const textColor = useThemeColor({}, 'text');
  const textMuted = useThemeColor({}, 'textMuted');
  const successColor = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');

  const handleSendCode = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('error');
      setErrorMessage('Please enter your email');
      return;
    }
    setStatus('sending');
    setErrorMessage('');
    const { error } = await signInWithEmail(trimmed);
    if (error) {
      setStatus('error');
      setErrorMessage(error.message || 'Something went wrong');
      return;
    }
    setStatus('sent');
    setCode('');
  };

  const handleVerifyCode = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setStatus('error');
      setErrorMessage('Please enter the code from your email');
      return;
    }
    setStatus('verifying');
    setErrorMessage('');
    const { error } = await verifyEmailCode(email.trim(), trimmed);
    if (error) {
      setStatus('error');
      setErrorMessage(error.message || 'Invalid or expired code');
      return;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Welcome to PHD Matrix
        </ThemedText>
        <ThemedText style={[styles.subtitle, { color: textMuted }]}>
          Sign in with your email. We’ll send a code—no password needed.
        </ThemedText>

        <TextInput
          style={[
            styles.input,
            { backgroundColor: surfaceColor, borderColor, color: textColor },
          ]}
          placeholder="Your email"
          placeholderTextColor={textMuted}
          value={email}
          onChangeText={(t) => { setEmail(t); setStatus('idle'); }}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          editable={status !== 'sending' && status !== 'verifying'}
        />

        {status === 'sent' && (
          <>
            <ThemedText style={[styles.message, { color: successColor }]}>
              Check your email for the code and enter it below.
            </ThemedText>
            <TextInput
              style={[
                styles.input,
                styles.codeInput,
                { backgroundColor: surfaceColor, borderColor, color: textColor },
              ]}
              placeholder="00000000"
              placeholderTextColor={textMuted}
              value={code}
              onChangeText={(t) => { setCode(t.replace(/\D/g, '').slice(0, 8)); setStatus('sent'); }}
              keyboardType="number-pad"
              maxLength={8}
              editable={status !== 'verifying'}
            />
            <PrimaryButton
              title={status === 'verifying' ? 'Verifying…' : 'Sign in with code'}
              onPress={handleVerifyCode}
              disabled={status === 'verifying' || code.length !== 8}
              fullWidth
            />
            <ThemedText
              style={[styles.backLink, { color: textMuted }]}
              onPress={() => { setStatus('idle'); setCode(''); }}>
              Use a different email
            </ThemedText>
          </>
        )}

        {status !== 'sent' && (
          <>
            {status === 'error' && (
              <ThemedText style={[styles.message, { color: errorColor }]}>
                {errorMessage}
              </ThemedText>
            )}
            <PrimaryButton
              title={status === 'sending' ? 'Sending…' : 'Send code'}
              onPress={handleSendCode}
              disabled={status === 'sending'}
              fullWidth
            />
          </>
        )}

        {status === 'sending' && (
          <ActivityIndicator size="small" style={styles.spinner} />
        )}

        <ThemedText style={[styles.comingSoon, { color: textMuted }]}>
          Sign in with Google and Apple will be available soon.
        </ThemedText>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  content: {
    maxWidth: 400,
    width: '100%',
    alignSelf: 'center',
  },
  title: {
    marginBottom: Spacing.sm,
  },
  subtitle: {
    marginBottom: Spacing.xxl,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: 16,
    marginBottom: Spacing.lg,
  },
  codeInput: {
    marginBottom: Spacing.md,
    letterSpacing: 4,
    fontSize: 24,
    textAlign: 'center',
  },
  backLink: {
    marginTop: Spacing.lg,
    fontSize: 14,
    textAlign: 'center',
  },
  message: {
    marginBottom: Spacing.md,
    fontSize: 14,
  },
  spinner: {
    marginTop: Spacing.md,
  },
  comingSoon: {
    marginTop: Spacing.xxl,
    fontSize: 13,
    textAlign: 'center',
  },
});
