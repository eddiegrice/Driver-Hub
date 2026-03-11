import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MemberProfile } from '@/types/member';

const STORAGE_KEY = '@driverhub_member';

export async function getStoredMember(): Promise<MemberProfile | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MemberProfile;
    return parsed;
  } catch {
    return null;
  }
}

export async function setStoredMember(profile: MemberProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
