export const measurementId = 'G-0S3J4CK8RP';
export const consentKey = 'vpa.analytics-consent.v1';
export const consentLifetime = 180 * 24 * 60 * 60 * 1000;
export type Choice = 'granted' | 'denied';
// Values are compiled by Vite, never inferred from a preview's URL alone.
export function productionEligible() {
  return __VPA_ANALYTICS_PRODUCTION__ &&
    typeof window !== 'undefined' && window.location.origin === 'https://vudiphothisukart.com';
}
export function privacySignal() {
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true || navigator.doNotTrack === '1';
}
export function readConsent(): Choice | null {
  try {
    const value = JSON.parse(localStorage.getItem(consentKey) ?? 'null');
    return value && ['granted', 'denied'].includes(value.choice) && typeof value.time === 'number' &&
      Date.now() >= value.time && Date.now() - value.time < consentLifetime ? value.choice : null;
  } catch { return null; }
}
