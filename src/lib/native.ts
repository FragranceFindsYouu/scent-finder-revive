/**
 * Detect whether the app is running inside the Capacitor native shell
 * (iOS/Android WebView) vs. a regular browser. Used to hide
 * builder/admin-only surfaces and to add iOS safe-area padding.
 */
export function isNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } };
  if (w.Capacitor?.isNativePlatform?.()) return true;
  // Fallback for older Capacitor builds
  return typeof w.Capacitor !== "undefined";
}
