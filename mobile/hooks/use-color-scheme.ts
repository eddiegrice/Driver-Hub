/**
 * PHD Matrix uses a fixed dark (neo-glass) design. Always returns 'dark'
 * so the app never switches based on system/phone settings.
 */
export function useColorScheme(): 'dark' {
  return 'dark';
}
