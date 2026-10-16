// Utility helpers for Bengali language processing and offline quick response

export const BENGALI_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export const ENGLISH_TO_BENGALI_DIGITS: Record<string, string> = {
  '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪',
  '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯',
};

export function convertBengaliToEnglishNumbers(str: string): string {
  return str.replace(/[০-৯]/g, (match) => BENGALI_DIGITS[match] || match);
}

export function convertEnglishToBengaliNumbers(str: string): string {
  return str.replace(/[0-9]/g, (match) => ENGLISH_TO_BENGALI_DIGITS[match] || match);
}

// Convert English numbers to spoken Bengali word or representation
export function getBengaliTimeNow(): string {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();

  let period = 'সকাল';
  let bengaliHour = hours;

  if (hours >= 12 && hours < 16) {
    period = 'দুপুর';
    bengaliHour = hours === 12 ? 12 : hours - 12;
  } else if (hours >= 16 && hours < 18) {
    period = 'বিকেল';
    bengaliHour = hours - 12;
  } else if (hours >= 18 && hours < 20) {
    period = 'সন্ধ্যা';
    bengaliHour = hours - 12;
  } else if (hours >= 20) {
    period = 'রাত';
    bengaliHour = hours - 12;
  } else if (hours === 0) {
    bengaliHour = 12;
    period = 'রাত';
  }

  const bnHourStr = convertEnglishToBengaliNumbers(String(bengaliHour));
  const bnMinStr = convertEnglishToBengaliNumbers(String(minutes));

  if (minutes === 0) {
    return `এখন ${period} ${bnHourStr}টা বাজে`;
  }
  return `এখন ${period} ${bnHourStr}টা বেজে ${bnMinStr} মিনিট`;
}

export function getBengaliDateToday(): string {
  const now = new Date();
  const monthsBn = [
    'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
    'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
  ];
  const daysBn = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];

  const dayName = daysBn[now.getDay()];
  const dateNum = convertEnglishToBengaliNumbers(String(now.getDate()));
  const monthName = monthsBn[now.getMonth()];
  const yearNum = convertEnglishToBengaliNumbers(String(now.getFullYear()));

  return `আজ ${dayName}, ${dateNum} ${monthName} ${yearNum}`;
}

// Check for simple math expressions in Bengali (e.g. ৫০ + ২০ or ৫ গুণ ৩)
export function tryCalculateBengaliMath(text: string): string | null {
  const converted = convertBengaliToEnglishNumbers(text);
  // Match simple patterns like "50 + 20", "50 যোগ 20", "10 গুন 5", "10 গুণ 5", "50 বিয়োগ 10", "100 ভাগ 4"
  const mathRegex = /(\d+)\s*(\+|\-| যোগ | বিয়োগ | বিয়োগ | গুণ | গুন |\*|\/| ভাগ )\s*(\d+)/;
  const match = converted.match(mathRegex);

  if (match) {
    const num1 = parseInt(match[1], 10);
    const opRaw = match[2].trim();
    const num2 = parseInt(match[3], 10);

    let result = 0;
    if (opRaw === '+' || opRaw === 'যোগ') result = num1 + num2;
    else if (opRaw === '-' || opRaw === 'বিয়োগ' || opRaw === 'বিয়োগ') result = num1 - num2;
    else if (opRaw === '*' || opRaw === 'গুণ' || opRaw === 'গুন') result = num1 * num2;
    else if (opRaw === '/' || opRaw === 'ভাগ') {
      if (num2 === 0) return 'শূন্য দিয়ে ভাগ করা সম্ভব নয়।';
      result = Math.round((num1 / num2) * 100) / 100;
    } else {
      return null;
    }

    const bnResult = convertEnglishToBengaliNumbers(String(result));
    return `গণনা ফলাফল: ${bnResult}`;
  }

  return null;
}
