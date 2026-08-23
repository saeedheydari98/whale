const PERSIAN_LETTERS = "آابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی";

export const PERSIAN_NAME_MAX_LENGTH = 15;
export const PERSIAN_NAME_PATTERN_SOURCE = `[${PERSIAN_LETTERS}][${PERSIAN_LETTERS} ‌]{0,13}[${PERSIAN_LETTERS}]`;
export const PHONE_PATTERN_SOURCE = "09[0-9]{9}";
export const OTP_CODE_PATTERN_SOURCE = "[0-9]{6}";

export const PERSIAN_NAME_PATTERN = new RegExp(`^${PERSIAN_NAME_PATTERN_SOURCE}$`, "u");
export const PHONE_PATTERN = new RegExp(`^${PHONE_PATTERN_SOURCE}$`);
export const IRAN_PHONE_WITH_COUNTRY_CODE_PATTERN = /^989[0-9]{9}$/;
export const EMAIL_PATTERN = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?(?:\.[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?)+$/i;
export const OTP_CODE_PATTERN = new RegExp(`^${OTP_CODE_PATTERN_SOURCE}$`);
export const NON_ASCII_DIGIT_PATTERN = /[^0-9]/g;
