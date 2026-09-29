export const SUPERADMIN_PHONE = "09176991556";
/** Login OTP and User.email for the superadmin account (see migration superadmin_support_email). */
export const SUPERADMIN_EMAIL = "whalestoresupport@gmail.com";

export function accountEmailFromPhone(phone: string) {
  return `${phone.trim()}@local.user`;
}

export function isLocalAccountEmail(email?: string | null) {
  return Boolean(email?.endsWith("@local.user"));
}
