import type { SupabaseClient } from '@supabase/supabase-js';

import type { MemberProfile } from '@/types/member';
import { emptyMemberProfile } from '@/types/member';

/** DB row shape for public.members (profile + membership status). */
type MemberRow = {
  name: string | null;
  badge_number: string | null;
  badge_expiry: string | null;
  vehicle_registration: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  plate_number: string | null;
  plate_expiry: string | null;
  membership_number: string | null;
  membership_status: string | null;
  membership_expiry: string | null;
  membership_source: string | null;
  legacy_active_until: string | null;
  subscription_active_until: string | null;
  migration_status: string | null;
  is_chat_moderator: boolean | null;
};

export type MemberStatus = {
  isActive: boolean;
  membershipStatus: MemberProfile['membershipStatus'];
  isChatModerator: boolean;
};

const MEMBER_COLUMNS =
  'name, badge_number, badge_expiry, vehicle_registration, vehicle_make, vehicle_model, plate_number, plate_expiry, membership_number, membership_status, membership_expiry, is_chat_moderator';

/** Active = membership_status === 'active'. All legacy / subscription logic is handled server-side. */
export function isMemberActive(row: Pick<MemberRow, 'membership_status'>): boolean {
  return row.membership_status === 'active';
}

function dateToIso(d: string | null): string {
  if (!d || d.length < 10) return '';
  return d.slice(0, 10);
}

function rowToProfile(row: MemberRow | null): MemberProfile {
  if (!row) return emptyMemberProfile();
  return {
    name: row.name ?? '',
    badgeNumber: row.badge_number ?? '',
    badgeExpiry: dateToIso(row.badge_expiry),
    vehicleRegistration: row.vehicle_registration ?? '',
    vehicleMake: row.vehicle_make ?? '',
    vehicleModel: row.vehicle_model ?? '',
    plateNumber: row.plate_number ?? '',
    plateExpiry: dateToIso(row.plate_expiry),
    membershipNumber: row.membership_number ?? '',
    membershipStatus: (row.membership_status === 'active' || row.membership_status === 'expired' ? row.membership_status : 'pending') as MemberProfile['membershipStatus'],
    membershipExpiry: dateToIso(row.membership_expiry),
  };
}

function profileToRow(profile: MemberProfile): Partial<MemberRow> {
  return {
    name: profile.name || '',
    badge_number: profile.badgeNumber || '',
    badge_expiry: profile.badgeExpiry || null,
    vehicle_registration: profile.vehicleRegistration || '',
    vehicle_make: profile.vehicleMake || '',
    vehicle_model: profile.vehicleModel || '',
    plate_number: profile.plateNumber || '',
    plate_expiry: profile.plateExpiry || null,
    membership_number: profile.membershipNumber || '',
    membership_status: profile.membershipStatus || 'pending',
    membership_expiry: profile.membershipExpiry || null,
  };
}

/**
 * Fetch the current user's member profile and status from Supabase.
 * Returns null if no row or error.
 */
export async function getMemberWithStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<{ profile: MemberProfile; status: MemberStatus } | null> {
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  const row = data as MemberRow;
  const profile = rowToProfile(row);
  return {
    profile,
    status: {
      isActive: isMemberActive(row),
      membershipStatus: profile.membershipStatus,
      isChatModerator: Boolean(row.is_chat_moderator),
    },
  };
}

/**
 * Fetch the current user's member profile only (backward compatibility).
 */
export async function getMemberFromSupabase(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberProfile | null> {
  const result = await getMemberWithStatus(supabase, userId);
  return result?.profile ?? null;
}

/**
 * Save the member profile to Supabase for the current user. Upserts (update or insert).
 */
export async function saveMemberToSupabase(
  supabase: SupabaseClient,
  userId: string,
  profile: MemberProfile
): Promise<{ error: Error | null }> {
  const row = profileToRow(profile);
  const { error } = await supabase
    .from('members')
    .upsert({ id: userId, ...row }, { onConflict: 'id' });

  return { error: error ?? null };
}
