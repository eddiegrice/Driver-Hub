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
  subscription_started_at: string | null;
  membership_status: string | null;
  membership_expiry: string | null;
  membership_source: string | null;
  legacy_active_until: string | null;
  subscription_active_until: string | null;
  migration_status: string | null;
  is_chat_moderator: boolean | null;
  is_admin: boolean | null;
};

export type MemberStatus = {
  isActive: boolean;
  membershipStatus: MemberProfile['membershipStatus'];
  isChatModerator: boolean;
  isAdmin: boolean;
};

const MEMBER_COLUMNS =
  'name, badge_number, badge_expiry, vehicle_registration, vehicle_make, vehicle_model, plate_number, plate_expiry, membership_number, subscription_started_at, membership_status, membership_expiry, is_chat_moderator, is_admin';

function normalizeMembershipStatus(raw: string | null | undefined): MemberProfile['membershipStatus'] {
  const s = (raw ?? '').trim().toLowerCase();
  if (s === 'active') return 'active';
  if (s === 'expired') return 'expired';
  return 'pending';
}

/** Active = membership_status === 'active' (case-insensitive). */
export function isMemberActive(row: Pick<MemberRow, 'membership_status'>): boolean {
  return normalizeMembershipStatus(row.membership_status) === 'active';
}

function dateToIso(d: string | null): string {
  if (!d || d.length < 10) return '';
  return d.slice(0, 10);
}

function rowToProfile(row: MemberRow | null): MemberProfile {
  if (!row) return emptyMemberProfile();
  const membershipStatus = normalizeMembershipStatus(row.membership_status);
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
    subscriptionStartDate: dateToIso(row.subscription_started_at),
    membershipStatus,
    membershipExpiry: dateToIso(row.membership_expiry),
  };
}

/**
 * Fields the app may update from Profile. Never includes membership_status, is_admin,
 * or subscription_started_at — those are controlled in Supabase/admin/billing flows.
 */
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
    membership_expiry: profile.membershipExpiry || null,
  };
}

/**
 * Fetch the current user's member profile and status from Supabase.
 * Returns null if no row or error.
 */
/**
 * Read only `is_admin` for the current user (RLS: own row).
 * Used to gate the admin UI without toggling global member loading state.
 */
export async function fetchMemberAdminFlag(
  supabase: SupabaseClient | null,
  userId: string
): Promise<{ isAdmin: boolean; error: Error | null }> {
  if (!supabase) {
    return { isAdmin: false, error: null };
  }
  const { data, error } = await supabase
    .from('members')
    .select('is_admin')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { isAdmin: false, error };
  }
  return { isAdmin: Boolean(data?.is_admin), error: null };
}

export type MemberWithStatusResult =
  | { ok: true; profile: MemberProfile; status: MemberStatus }
  /** `error` set when PostgREST failed; both null when RLS returned no visible row (wrong id or missing row). */
  | { ok: false; error: Error | null };

export async function getMemberWithStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<MemberWithStatusResult> {
  // Ensure the client has attached the session JWT before RLS-protected selects (Expo cold start).
  await supabase.auth.getSession();
  const { data, error } = await supabase
    .from('members')
    .select(MEMBER_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    return { ok: false, error };
  }
  if (!data) {
    return { ok: false, error: null };
  }
  const row = data as MemberRow;
  const profile = rowToProfile(row);
  return {
    ok: true,
    profile,
    status: {
      isActive: isMemberActive(row),
      membershipStatus: profile.membershipStatus,
      isChatModerator: Boolean(row.is_chat_moderator),
      isAdmin: Boolean(row.is_admin),
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
  return result.ok ? result.profile : null;
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
