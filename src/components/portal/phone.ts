/** Formats a US phone number as "(000) 000-0000" once 10 digits are present; otherwise leaves it as typed. */
export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  const ten = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  if (ten.length !== 10) return value;
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`;
}
