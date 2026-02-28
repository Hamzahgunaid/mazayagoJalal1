const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
const EASTERN_ARABIC_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function normalizeArabicNumerals(input: string) {
  let output = input;
  ARABIC_DIGITS.forEach((digit, index) => {
    output = output.replaceAll(digit, String(index));
  });
  EASTERN_ARABIC_DIGITS.forEach((digit, index) => {
    output = output.replaceAll(digit, String(index));
  });
  return output;
}
