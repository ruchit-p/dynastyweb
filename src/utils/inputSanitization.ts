// MARK: Input Sanitization Utilities

/*
  Utility helpers to sanitize potentially unsafe user provided data before it is rendered in the UI.
  These helpers are intentionally lightweight and synchronous so they can be used in both the
  browser and during server-side rendering.

  NOTE: For production security-critical contexts you should favour a battle-tested library such
  as DOMPurify. The below helpers cover our immediate needs and avoid adding an extra dependency
  to the bundle size.
*/

/**
 * Escapes the most common HTML entities so arbitrary strings cannot break out of
 * text nodes and inject markup or scripts.
 */
export function sanitizeUserInput(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Masks a user ID so we never accidentally expose full identifiers in the UI.
 * Example: abcd1234efgh  ->  abcd12••••
 */
export function sanitizeUserId(userId?: string | null): string {
  if (!userId) return '';
  const safe = sanitizeUserInput(userId);
  return safe.length > 6 ? `${safe.slice(0, 6)}••••` : safe;
}

/**
 * Very lightweight email validator + masker. We keep the first character of the
 * local part and always show the domain. Example: jane.doe@example.com -> j•••@example.com
 */
export function sanitizeEmail(email?: string | null): string {
  if (!email) return '';
  const safe = sanitizeUserInput(email);
  const [local, domain] = safe.split('@');
  if (!domain) return safe; // malformed, just return escaped string
  return `${local[0] || ''}•••@${domain}`;
}

/**
 * Normalises phone numbers to E.164 digits only and masks the middle for privacy.
 * Example: +14155552671 -> +1••••2671
 */
export function sanitizePhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = phone.replace(/[^\d+]/g, '');
  if (digits.length <= 4) return digits;
  const prefix = digits.slice(0, 2);
  const suffix = digits.slice(-4);
  return `${prefix}••••${suffix}`;
} 