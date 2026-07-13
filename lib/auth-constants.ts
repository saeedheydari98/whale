export const SUPERADMIN_PHONE = "09176991556";

export function accountEmailFromPhone(phone: string) {
  return `${phone.trim()}@local.user`;
}

export function isLocalAccountEmail(email?: string | null) {
  return Boolean(email?.endsWith("@local.user"));
}
