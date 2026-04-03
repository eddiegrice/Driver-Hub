/**
 * Member profile shape used across the app (membership card, casework pre-fill, expiry reminders).
 * Stored on device for now; later synced with backend when we add auth.
 */
export interface MemberProfile {
  /** Full name as on licence / membership */
  name: string;
  /** Private hire driver badge number */
  badgeNumber: string;
  /** Badge expiry date (YYYY-MM-DD) for reminders */
  badgeExpiry: string;
  /** Vehicle registration number */
  vehicleRegistration: string;
  /** Vehicle make (e.g. Toyota) */
  vehicleMake: string;
  /** Vehicle model (e.g. Prius) */
  vehicleModel: string;
  /** Private hire vehicle plate number */
  plateNumber: string;
  /** Plate expiry (YYYY-MM-DD) for reminders */
  plateExpiry: string;
  /** Club membership number (may come from subscription later) */
  membershipNumber: string;
  /** Start date of paid subscription (YYYY-MM-DD). Used as e-card "Valid From". */
  subscriptionStartDate: string;
  /** Membership status for display; later derived from subscription */
  membershipStatus: 'active' | 'expired' | 'pending';
  /** Membership expiry (YYYY-MM-DD); later from subscription */
  membershipExpiry: string;
}

export const emptyMemberProfile = (): MemberProfile => ({
  name: '',
  badgeNumber: '',
  badgeExpiry: '',
  vehicleRegistration: '',
  vehicleMake: '',
  vehicleModel: '',
  plateNumber: '',
  plateExpiry: '',
  membershipNumber: '',
  subscriptionStartDate: '',
  membershipStatus: 'pending',
  membershipExpiry: '',
});

export function formatDateForDisplay(isoDate: string): string {
  if (!isoDate || isoDate.length < 10) return '—';
  const [y, m, d] = isoDate.slice(0, 10).split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const mi = parseInt(m ?? '0', 10) - 1;
  return `${d ?? ''} ${months[mi] ?? m} ${y ?? ''}`;
}

/** Date (same as {@link formatDateForDisplay}) plus local 24h time from a full ISO timestamp. */
export function formatDateTimeLocalForDisplay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const datePart = formatDateForDisplay(iso.slice(0, 10));
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${datePart}, ${h}:${min}`;
}
