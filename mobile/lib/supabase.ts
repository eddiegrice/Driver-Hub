import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** True if Supabase is configured (URL and anon key set). Use to gate backend features. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const storageAdapter = {
  getItem: async (key: string) => (await AsyncStorage.getItem(key)) ?? null,
  setItem: async (key: string, value: string) => await AsyncStorage.setItem(key, value),
  removeItem: async (key: string) => await AsyncStorage.removeItem(key),
};

/**
 * Supabase client for auth and API. Only created when .env has URL and anon key.
 * When not configured, this is null and the app runs without sign-in (local data only).
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: storageAdapter,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
