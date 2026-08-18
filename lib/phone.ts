const COUNTRY_CODES_WITH_OPTIONAL_TRUNK_ZERO = [
  "966",
  "971",
  "973",
  "965",
  "968",
  "974",
  "20",
];

export function normalizePhoneDigits(phone: string) {
  let digits = String(phone || "").trim().replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  for (const countryCode of COUNTRY_CODES_WITH_OPTIONAL_TRUNK_ZERO) {
    if (digits.startsWith(`${countryCode}0`)) {
      digits = `${countryCode}${digits.slice(countryCode.length + 1)}`;
      break;
    }
  }

  if (digits.startsWith("05") && digits.length === 10) {
    digits = `966${digits.slice(1)}`;
  } else if (digits.startsWith("5") && digits.length === 9) {
    digits = `966${digits}`;
  }

  return digits;
}

export function normalizeInternationalPhone(phone: string) {
  const digits = normalizePhoneDigits(phone);
  if (digits.length < 8 || digits.length > 15) {
    throw new Error("رقم الجوال غير صالح");
  }
  return `+${digits}`;
}
