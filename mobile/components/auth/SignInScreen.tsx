import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

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

  const cyanButtonColor = '#00CCFF';

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
        <View style={styles.headerSpace} />
        <ThemedText style={[styles.subtitle, { color: textMuted }]}>
          Sign in or register with your email address.
        </ThemedText>
        <View style={styles.paragraphSpace} />
        <ThemedText style={[styles.subtitle, { color: textMuted }]}>
          If you already have an active association membership, please ensure you use the same email address used when previously subscribing.
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

        {(status === 'sent' || status === 'verifying') && (
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
            <Pressable
              onPress={handleVerifyCode}
              disabled={status === 'verifying' || code.length !== 8}
              style={({ pressed }) => [
                styles.sendBtn,
                styles.cyanBtnBase,
                status === 'verifying' && styles.sendBtnDisabled,
                pressed && !(
                  status === 'verifying' ||
                  code.length !== 8
                ) && styles.cyanBtnPressed,
              ]}>
              <ThemedText
                style={[
                  styles.sendBtnLabel,
                  { opacity: status === 'verifying' ? 0.5 : 1 },
                ]}>
                {status === 'verifying' ? 'Verifying…' : 'Sign in with code'}
              </ThemedText>
            </Pressable>
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

            <View style={{ width: '100%' }}>
              <Pressable
                onPress={handleSendCode}
                disabled={status === 'sending'}
                style={({ pressed }) => [
                  styles.sendBtn,
                  styles.cyanBtnBase,
                  status === 'sending' && styles.sendBtnDisabled,
                  pressed && status !== 'sending' && styles.cyanBtnPressed,
                ]}>
                <ThemedText style={[styles.sendBtnLabel, { opacity: status === 'sending' ? 0.5 : 1 }]}>
                  {status === 'sending' ? 'Sending…' : 'Send code'}
                </ThemedText>
              </Pressable>
            </View>
          </>
        )}

        {status === 'sending' && (
          <ActivityIndicator size="small" style={styles.spinner} />
        )}

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
  headerSpace: {
    height: Spacing.sm,
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
  paragraphSpace: {
    height: Spacing.lg,
  },
  sendBtn: {
    width: '100%',
    paddingVertical: Spacing.lg,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyanBtnBase: {
    backgroundColor: '#00CCFF',
  },
  cyanBtnPressed: {
    opacity: 0.9,
  },
  sendBtnDisabled: {
    opacity: 0.7,
  },
  sendBtnLabel: {
    color: '#0F172A',
    fontWeight: '600',
    fontSize: 17,
  },
});
