import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Register for push notifications and save the device token to Supabase (member_devices).
 * Call when the user is signed in. Requires Supabase and memberId.
 * Does nothing if permission is denied or token cannot be obtained.
 */
export async function registerPushDevice(
  supabase: SupabaseClient,
  memberId: string
): Promise<{ error: Error | null }> {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return { error: null };
    }

    const tokenResult = await Notifications.getExpoPushTokenAsync({
      projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
    });
    const pushToken = tokenResult?.data;
    if (!pushToken) return { error: null };

    const platform = Platform.OS;
    const { error } = await supabase.from('member_devices').upsert(
      {
        member_id: memberId,
        push_token: pushToken,
        platform,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'member_id,push_token' }
    );
    return { error: error ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
