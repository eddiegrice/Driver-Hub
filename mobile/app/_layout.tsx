import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { NotActiveScreen } from '@/components/auth/NotActiveScreen';
import { RegisterPushToken } from '@/components/RegisterPushToken';
import { SignInScreen } from '@/components/auth/SignInScreen';
import { CaseworkProvider } from '@/context/CaseworkContext';
import { ChatProvider } from '@/context/ChatContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MemberProvider, useMember } from '@/context/MemberContext';
import { NewsProvider } from '@/context/NewsContext';
import { PollsProvider } from '@/context/PollsContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export const unstable_settings = {
  anchor: '(tabs)',
};

function TabsAndStack() {
  return (
    <CaseworkProvider>
      <NewsProvider>
        <PollsProvider>
          <ChatProvider>
            <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
            </Stack>
            <StatusBar style="auto" />
          </ChatProvider>
        </PollsProvider>
      </NewsProvider>
    </CaseworkProvider>
  );
}

/** When Supabase is used: gate main app until member is active (or show migration / subscribe options). */
function ActiveGate() {
  const { memberStatus, isLoading } = useMember();
  const backgroundColor = useThemeColor({}, 'background');

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!memberStatus.isActive) {
    return <NotActiveScreen />;
  }
  return (
    <>
      <RegisterPushToken />
      <TabsAndStack />
    </>
  );
}

function AppContent() {
  return (
    <MemberProvider>
      <ActiveGate />
    </MemberProvider>
  );
}

function RootContent() {
  const { session, isLoading, isSupabaseConfigured } = useAuth();
  const backgroundColor = useThemeColor({}, 'background');

  if (!isSupabaseConfigured) {
    return <AppContent />;
  }
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  if (!session) {
    return <SignInScreen />;
  }
  return <AppContent />;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <AuthProvider>
            <RootContent />
          </AuthProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
