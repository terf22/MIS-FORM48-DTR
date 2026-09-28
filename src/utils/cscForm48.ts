import * as XLSX from 'xlsx';
import { DTRDayEntry, MonthlyDTR, Personnel } from '../types';

/**
 * Helper to parse a time string for a specific slot into minutes from midnight.
 * Properly interprets AM vs PM even when "AM" or "PM" is omitted (e.g. "1:05" in PM_IN slot -> 1:05 PM = 785 mins).
 */
export function parseSlotTimeToMinutes(
  timeStr: string,
  slot: 'AM_IN' | 'AM_OUT' | 'PM_IN' | 'PM_OUT'
): number | null {
  if (
    !timeStr ||
    typeof timeStr !== 'string' ||
    timeStr.trim() === '' ||
    /HOLIDAY|LEAVE|OB|SAT|SUN|ABSENT|SUSPENDED/i.test(timeStr)
  ) {
    return null;
  }

  const clean = timeStr.trim().toUpperCase();

  const match = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) {
    return null;
  }

  let rawHours = parseInt(match[1], 10);
  const mins = parseInt(match[2], 10);
  const period = match[3] ? match[3].toUpperCase() : null;

  if (isNaN(rawHours) || isNaN(mins) || mins < 0 || mins > 59) {
    return null;
  }

  let hours = rawHours;

  if (period === 'PM') {
    if (rawHours < 12) hours = rawHours + 12;
  } else if (period === 'AM') {
    if (rawHours === 12) hours = 0;
  } else {
    // When no AM/PM suffix is present, deduce 12-hour vs 24-hour based on the slot:
    if (rawHours < 12) {
      if (slot === 'PM_IN' || slot === 'PM_OUT') {
        // Afternoon slots e.g. "1:00", "1:05", "5:00", "4:50" without suffix are PM times (+12 hrs)
        hours = rawHours + 12;
      } else {
        // Morning slots e.g. "8:00", "7:55", "11:45" without suffix are AM times
        hours = rawHours;
      }
    }
  }

  return hours * 60 + mins;
}

/**
 * Calculates late and undertime minutes for a given day entry based on official CSC work schedules.
 * Standard Work Schedule (8 Hours Total):
 * - Morning Session (AM): Expected 8:00 AM (480 mins) to 12:00 NN (720 mins) -> 4 hours (or 7:30 AM for Teaching)
 * - Afternoon Session (PM): Expected 1:00 PM (780 mins) to 5:00 PM (1020 mins) for Non-Teaching staff,
 *   or 1:00 PM (780 mins) to 4:30 PM (990 mins) for Teaching personnel -> 4 hours
 */
export function calculateDayTimeLoss(
  amIn: string,
  amOut: string,
  pmIn: string,
  pmOut: string,
  schedule?: {
    amArrival?: string;
    amDeparture?: string;
    pmArrival?: string;
    pmDeparture?: string;
  },
  statusTag?: string,
  personnelType?: string
): { lateMinutes: number; undertimeMinutes: number } {
  if (
    statusTag === 'CLASS_SUSPENDED' ||
    statusTag === 'HOLIDAY' ||
    statusTag === 'SATURDAY' ||
    statusTag === 'SUNDAY' ||
    statusTag === 'OB' ||
    statusTag === 'LEAVE'
  ) {
    return { lateMinutes: 0, undertimeMinutes: 0 };
  }

  let lateMinutes = 0;
  let undertimeMinutes = 0;

  const isTeaching = personnelType === 'teaching' || schedule?.pmDeparture === '16:30' || schedule?.amArrival === '07:30';

  const amInMins = parseSlotTimeToMinutes(amIn, 'AM_IN');
  const amOutMins = parseSlotTimeToMinutes(amOut, 'AM_OUT');
  const pmInMins = parseSlotTimeToMinutes(pmIn, 'PM_IN');
  const pmOutMins = parseSlotTimeToMinutes(pmOut, 'PM_OUT');

  const hasAmPunch = amInMins !== null || amOutMins !== null || Boolean(amIn && amIn.trim());
  const hasPmPunch = pmInMins !== null || pmOutMins !== null || Boolean(pmIn && pmIn.trim());
  const hasAnyPunch = hasAmPunch || hasPmPunch;

  // If there are no punches at all on this day, treat as unworked/blank day unless explicitly tagged ABSENT
  if (!hasAnyPunch && statusTag !== 'ABSENT') {
    return { lateMinutes: 0, undertimeMinutes: 0 };
  }

  // AM Session Calculation (Skip if AM is suspended)
  if (statusTag !== 'CLASS_SUSPENDED_AM') {
    const defaultAmInMins = isTeaching ? 450 : 480; // 7:30 AM (450) for teaching, 8:00 AM (480) for non-teaching
    const targetAmIn = schedule?.amArrival
      ? (parseSlotTimeToMinutes(schedule.amArrival, 'AM_IN') ?? defaultAmInMins)
      : defaultAmInMins;
    const targetAmOut = schedule?.amDeparture
      ? (parseSlotTimeToMinutes(schedule.amDeparture, 'AM_OUT') ?? 720)
      : 720;

    if (hasAmPunch) {
      if (amInMins !== null && amInMins > targetAmIn) {
        lateMinutes += (amInMins - targetAmIn);
      }
      if (amOutMins !== null && amOutMins < targetAmOut) {
        undertimeMinutes += (targetAmOut - amOutMins);
      }
    } else {
      // Missed AM session completely on a day with activity or tagged ABSENT
      undertimeMinutes += (targetAmOut - targetAmIn);
    }
  }

  // PM Session Calculation (Skip if PM is suspended)
  if (statusTag !== 'CLASS_SUSPENDED_PM') {
    // Afternoon arrival starts at 1:00 PM (780 mins)
    const targetPmIn = schedule?.pmArrival
      ? (parseSlotTimeToMinutes(schedule.pmArrival, 'PM_IN') ?? 780)
      : 780;

    // Afternoon departure ends at 5:00 PM (1020 mins) for non-teaching, 4:30 PM (990 mins) for teaching personnel
    const defaultPmOutMins = isTeaching ? 990 : 1020;
    const targetPmOut = schedule?.pmDeparture
      ? (parseSlotTimeToMinutes(schedule.pmDeparture, 'PM_OUT') ?? defaultPmOutMins)
      : defaultPmOutMins;

    if (hasPmPunch) {
      if (pmInMins !== null && pmInMins > targetPmIn) {
        lateMinutes += (pmInMins - targetPmIn);
      }
      if (pmOutMins !== null && pmOutMins < targetPmOut) {
        undertimeMinutes += (targetPmOut - pmOutMins);
      }
    } else {
      // Missed PM session completely on a day with activity or tagged ABSENT
      undertimeMinutes += (targetPmOut - targetPmIn);
    }
  }

  return { lateMinutes, undertimeMinutes };
}

/**
 * Returns number of days in a month
 */
export function getDaysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

/**
 * Formats time string to CSC Form 48 standard format (e.g. "7:55" or "12:01" or "5:02")
 */
export function formatCSCTime(timeStr: string): string {
  if (!timeStr) return '';
  const uppercase = timeStr.trim().toUpperCase();
  if (['HOLIDAY', 'SATURDAY', 'SUNDAY', 'OB', 'LEAVE', 'ABSENT'].includes(uppercase)) {
    return uppercase;
  }
  
  // Format 24h "13:05" to "1:05"
  const match = uppercase.match(/(\d+):(\d+)/);
  if (!match) return timeStr;
  let hrs = parseInt(match[1], 10);
  const mins = match[2].padStart(2, '0');
  
  if (hrs > 12) hrs -= 12;
  if (hrs === 0) hrs = 12;
  
  return `${hrs}:${mins}`;
}

/**
 * Formats a personnel name into "First name Middle Initial Family name" format for CSC Form 48.
 * Examples:
 * - "DE LOS SANTOS, LINUEL B." -> "LINUEL B. DE LOS SANTOS"
 * - "SANTOS, MARIA CLARA BALTAZAR" -> "MARIA CLARA B. SANTOS"
 * - { firstName: "Linuel", middleName: "Baltazar", lastName: "De Los Santos" } -> "LINUEL B. DE LOS SANTOS"
 */
export function formatForm48Name(personnelOrName: Partial<Personnel> | string | undefined | null): string {
  if (!personnelOrName) return '';

  if (typeof personnelOrName === 'string') {
    return parseAndFormatNameString(personnelOrName);
  }

  const p = personnelOrName;
  const firstName = (p.firstName || '').trim();
  const middleName = (p.middleName || '').trim();
  const lastName = (p.lastName || '').trim();

  if (firstName && lastName) {
    let midInit = '';
    if (middleName) {
      const cleanMid = middleName.replace(/[^a-zA-Z]/g, '');
      if (cleanMid) {
        midInit = `${cleanMid.charAt(0).toUpperCase()}.`;
      }
    }

    // Check if firstName already ends with a middle initial (e.g. "LINUEL B." or "REINCEL JOY Y.")
    const fnUpper = firstName.toUpperCase();
    const fnTokens = fnUpper.split(/\s+/);
    const lastFnToken = fnTokens[fnTokens.length - 1] || '';

    // If the last token of firstName is a single letter or single letter with dot (e.g. "B.", "B")
    if (/^[A-Z]\.?$/.test(lastFnToken)) {
      const cleanFn = fnTokens.slice(0, -1).join(' ');
      const existingInit = lastFnToken.endsWith('.') ? lastFnToken : `${lastFnToken}.`;
      return `${cleanFn} ${existingInit} ${lastName}`.replace(/\s+/g, ' ').toUpperCase();
    }

    if (midInit) {
      return `${firstName} ${midInit} ${lastName}`.replace(/\s+/g, ' ').toUpperCase();
    }
    return `${firstName} ${lastName}`.replace(/\s+/g, ' ').toUpperCase();
  }

  const rawName = (p.fullName || p.name || '').trim();
  if (rawName) {
    return parseAndFormatNameString(rawName);
  }

  return '';
}

function parseAndFormatNameString(rawName: string): string {
  const clean = rawName.trim();
  if (!clean) return '';

  const hasTrailingComma = clean.endsWith(',');

  const rawParts = clean
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  if (rawParts.length === 0) return '';
  if (rawParts.length === 1) return clean.toUpperCase();

  const PREFIX_REGEX = /^(DR|PROF|ENGR|ENG'R|ATTY|HON|REV|MS|MR|MRS|CAPT|CAPTAIN|DIR|PRES|PRINCIPAL)\.?$/i;

  const SUFFIX_SET = new Set([
    'CESE', 'CESO', 'DM', 'PHD', 'PH.D.', 'EDD', 'ED.D.', 'MA', 'M.A.', 'MS', 'M.S.',
    'MBA', 'M.B.A.', 'CPA', 'RN', 'LPT', 'MD', 'M.D.', 'JR', 'JR.', 'SR', 'SR.',
    'II', 'III', 'IV', 'V'
  ]);

  const firstPartUpper = rawParts[0].toUpperCase();
  const firstTokenOfPart0 = firstPartUpper.split(/\s+/)[0] || '';

  const startsWithTitle = PREFIX_REGEX.test(firstTokenOfPart0);
  const firstPartIsSuffix = SUFFIX_SET.has(firstPartUpper);

  const secondPartUpper = rawParts[1] ? rawParts[1].toUpperCase() : '';
  const firstTokenOfPart1 = secondPartUpper.split(/\s+/)[0] || '';
  const secondPartStartsWithTitle = PREFIX_REGEX.test(firstTokenOfPart1);

  // Case 1: First part is a post-nominal suffix (e.g. "CESE") and second part is title + name (e.g. "DR. JEAHANNE M. ABDULLA DM")
  if (firstPartIsSuffix && secondPartStartsWithTitle) {
    const reordered = [rawParts[1], rawParts[0], ...rawParts.slice(2)].join(', ');
    return (hasTrailingComma ? `${reordered},` : reordered).toUpperCase();
  }

  // Case 2: First part starts with honorific title (e.g. "DR. JEAHANNE M. ABDULLA DM")
  // or first part contains 2+ words and second part is a known post-nominal suffix (e.g. "CESE")
  const secondPartIsSuffix = SUFFIX_SET.has(secondPartUpper);
  const firstPartHasMultipleWords = rawParts[0].split(/\s+/).length >= 2;

  if (startsWithTitle || (firstPartHasMultipleWords && secondPartIsSuffix)) {
    // Natural order (e.g. "DR. JEAHANNE M. ABDULLA DM, CESE," or "JEAHANNE M. ABDULLA, CESE")
    const result = rawParts.join(', ');
    return (hasTrailingComma ? `${result},` : result).toUpperCase();
  }

  // Case 3: Standard "LASTNAME, FIRSTNAME MIDDLE" format (e.g. "SANTOS, MARIA CLARA B." or "DE LOS SANTOS, LINUEL B.")
  if (!startsWithTitle && rawParts.length >= 2) {
    const familyName = rawParts[0];
    const givenNameStr = rawParts[1];
    const restParts = rawParts.slice(2);

    const givenTokens = givenNameStr.split(/\s+/);

    let formattedName = '';
    if (givenTokens.length === 1) {
      formattedName = `${givenTokens[0]} ${familyName}`;
    } else {
      const lastToken = givenTokens[givenTokens.length - 1];
      // Check if last token is middle initial or middle name e.g. "B.", "B", "BALTAZAR"
      if (/^[a-zA-Z]\.?$/.test(lastToken)) {
        const init = lastToken.endsWith('.') ? lastToken.toUpperCase() : `${lastToken.toUpperCase()}.`;
        const firstPart = givenTokens.slice(0, -1).join(' ');
        formattedName = `${firstPart} ${init} ${familyName}`;
      } else {
        const init = `${lastToken.charAt(0).toUpperCase()}.`;
        const firstPart = givenTokens.slice(0, -1).join(' ');
        formattedName = `${firstPart} ${init} ${familyName}`;
      }
    }

    if (restParts.length > 0) {
      formattedName = `${formattedName}, ${restParts.join(', ')}`;
    }

    return (hasTrailingComma ? `${formattedName},` : formattedName).replace(/\s+/g, ' ').toUpperCase();
  }

  const result = rawParts.join(', ');
  return (hasTrailingComma ? `${result},` : result).toUpperCase();
}

/**
 * Generates sample Excel binary data with headers AC-No., Name, Time
 */
export function generateSampleBiometricExcel(): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Standard Biometric Log Format (AC-No., Name, Time)
  const sampleData1 = [
    ['AC-No.', 'Name', 'Time'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 07:52 AM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 12:00 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 01:00 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 05:03 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-02 07:58 AM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-02 12:01 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-02 12:59 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-02 05:01 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-03 08:14 AM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-03 12:00 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-03 01:00 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-03 05:00 PM'],
    ['102', 'RIZAL, JOSE P.', '2026-07-01 07:45 AM'],
    ['102', 'RIZAL, JOSE P.', '2026-07-01 12:00 PM'],
    ['102', 'RIZAL, JOSE P.', '2026-07-01 01:00 PM'],
    ['102', 'RIZAL, JOSE P.', '2026-07-01 05:10 PM'],
    ['102', 'RIZAL, JOSE P.', '2026-07-02 07:50 AM'],
    ['102', 'RIZAL, JOSE P.', '2026-07-02 05:00 PM'],
    ['103', 'DEL ROSARIO, JUAN M.', '2026-07-01 07:50 AM'],
    ['103', 'DEL ROSARIO, JUAN M.', '2026-07-01 12:00 PM'],
    ['103', 'DEL ROSARIO, JUAN M.', '2026-07-01 01:00 PM'],
    ['103', 'DEL ROSARIO, JUAN M.', '2026-07-01 05:05 PM']
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(sampleData1);
  XLSX.utils.book_append_sheet(wb, ws1, 'Biometric Attendance');

  // Generate binary Excel file and download
  XLSX.writeFile(wb, 'Biometric_Attendance_Logs_July_2026.xlsx');
}

export interface ExtractedDateInfo {
  day: number;
  month: number; // 1-12
  year: number;
}

/**
 * Parses date string, Excel serial number, or timestamp into { day, month, year }
 */
export function parseExcelDate(dateVal: any): ExtractedDateInfo | null {
  if (dateVal === null || dateVal === undefined || dateVal === '') return null;

  if (typeof dateVal === 'number') {
    if (dateVal > 31) {
      const parsedDate = XLSX.SSF.parse_date_code(dateVal);
      if (parsedDate && parsedDate.d && parsedDate.m && parsedDate.y) {
        return {
          day: parsedDate.d,
          month: parsedDate.m,
          year: parsedDate.y
        };
      }
    } else if (dateVal >= 1 && dateVal <= 31) {
      return { day: Math.floor(dateVal), month: 7, year: 2026 };
    }
  }

  const str = String(dateVal).trim();
  if (!str) return null;

  // ISO or slash YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // MM/DD/YYYY or DD/MM/YYYY or MM-DD-YYYY or DD-MM-YYYY
  const mdMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (mdMatch) {
    const p1 = parseInt(mdMatch[1], 10);
    const p2 = parseInt(mdMatch[2], 10);
    let y = parseInt(mdMatch[3], 10);
    if (y < 100) y += 2000;

    if (p1 <= 12 && p2 <= 31) {
      return { year: y, month: p1, day: p2 };
    } else if (p1 <= 31 && p2 <= 12) {
      return { year: y, month: p2, day: p1 };
    }
  }

  // Textual date parse via JS Date
  const dateObj = new Date(str);
  if (!isNaN(dateObj.getTime())) {
    const y = dateObj.getFullYear();
    const m = dateObj.getMonth() + 1;
    const d = dateObj.getDate();
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { year: y, month: m, day: d };
    }
  }

  // Month text check e.g. "JULY 01" or "JUL"
  const monthNamesMap: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12
  };

  const lower = str.toLowerCase();
  for (const [mName, mVal] of Object.entries(monthNamesMap)) {
    if (lower.includes(mName)) {
      const dMatch = str.match(/\b([1-9]|[12]\d|3[01])\b/);
      const yMatch = str.match(/\b(20\d{2})\b/);
      return {
        day: dMatch ? parseInt(dMatch[1], 10) : 1,
        month: mVal,
        year: yMatch ? parseInt(yMatch[1], 10) : 2026
      };
    }
  }

  // Fallback day match
  const dMatch = str.match(/\b([1-9]|[12]\d|3[01])\b/);
  if (dMatch) {
    return {
      day: parseInt(dMatch[1], 10),
      month: 7,
      year: 2026
    };
  }

  return null;
}

/**
 * Helper to parse a combined or separate Date and Time value into ExtractedDateInfo and formatted time string.
 */
export function parseDateTimeValue(
  val1: any,
  val2?: any
): {
  dateInfo: ExtractedDateInfo | null;
  formattedTime: string;
  minsFromMidnight: number | null;
} {
  let dateInfo: ExtractedDateInfo | null = null;
  let rawTimeStr = '';
  let minsFromMidnight: number | null = null;

  if (typeof val1 === 'number') {
    dateInfo = parseExcelDate(val1);
    const fractional = val1 % 1;
    if (fractional > 0.00001) {
      const totalMinutes = Math.round(fractional * 24 * 60);
      minsFromMidnight = totalMinutes % (24 * 60);
      const hours = Math.floor(minsFromMidnight / 60);
      const mins = minsFromMidnight % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      rawTimeStr = `${h12}:${String(mins).padStart(2, '0')} ${period}`;
    }
  }

  if (typeof val1 === 'string' && val1.trim()) {
    const str = val1.trim();
    if (!dateInfo) {
      dateInfo = parseExcelDate(str);
    }

    const timeMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
    if (timeMatch) {
      let h = parseInt(timeMatch[1], 10);
      const m = parseInt(timeMatch[2], 10);
      const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

      let h24 = h;
      if (period === 'PM') {
        if (h < 12) h24 = h + 12;
      } else if (period === 'AM') {
        if (h === 12) h24 = 0;
      }

      minsFromMidnight = h24 * 60 + m;
      const finalPeriod = period || (h24 >= 12 ? 'PM' : 'AM');
      const displayH = h24 % 12 === 0 ? 12 : h24 % 12;
      rawTimeStr = `${displayH}:${String(m).padStart(2, '0')} ${finalPeriod}`;
    }
  }

  if (val2 !== undefined && val2 !== null && val2 !== '') {
    if (!dateInfo) {
      dateInfo = parseExcelDate(val2);
    }
    if (!rawTimeStr) {
      const parsedTimeStr = parseExcelTimeValue(val2);
      if (parsedTimeStr) {
        rawTimeStr = parsedTimeStr;
        const slotMins = parseSlotTimeToMinutes(parsedTimeStr, 'AM_IN');
        if (slotMins !== null) minsFromMidnight = slotMins;
      }
    }
  }

  return {
    dateInfo,
    formattedTime: rawTimeStr ? formatCSCTime(rawTimeStr) : '',
    minsFromMidnight
  };
}

/**
 * Converts a list of time punches for a single day into a CSC Form 48 Day Entry.
 */
export function convertPunchListToDayEntry(
  dayNum: number,
  punches: { timeStr: string; mins: number }[],
  schedule?: {
    amArrival?: string;
    amDeparture?: string;
    pmArrival?: string;
    pmDeparture?: string;
  },
  personnelType?: string
): DTRDayEntry {
  if (!punches || punches.length === 0) {
    return {
      day: dayNum,
      amArrival: '',
      amDeparture: '',
      pmArrival: '',
      pmDeparture: '',
      statusTag: 'REGULAR',
      remarks: '',
      lateMinutes: 0,
      undertimeMinutes: 0
    };
  }

  const sorted = [...punches].sort((a, b) => a.mins - b.mins);

  const uniquePunches: { timeStr: string; mins: number }[] = [];
  sorted.forEach((p) => {
    if (uniquePunches.length === 0 || Math.abs(p.mins - uniquePunches[uniquePunches.length - 1].mins) >= 1) {
      uniquePunches.push(p);
    }
  });

  let amArr = '';
  let amDep = '';
  let pmArr = '';
  let pmDep = '';

  const minMins = uniquePunches[0].mins;
  const maxMins = uniquePunches[uniquePunches.length - 1].mins;

  if (uniquePunches.length >= 4) {
    if (maxMins <= 810) {
      // All punches in morning / noon session (Half Day Morning)
      amArr = formatCSCTime(uniquePunches[0].timeStr);
      amDep = formatCSCTime(uniquePunches[uniquePunches.length - 1].timeStr);
    } else {
      amArr = formatCSCTime(uniquePunches[0].timeStr);
      amDep = formatCSCTime(uniquePunches[1].timeStr);
      pmArr = formatCSCTime(uniquePunches[2].timeStr);
      pmDep = formatCSCTime(uniquePunches[uniquePunches.length - 1].timeStr);
    }
  } else if (uniquePunches.length === 3) {
    const p1 = uniquePunches[0];
    const p2 = uniquePunches[1];
    const p3 = uniquePunches[2];

    if (maxMins <= 810) {
      // Morning Half Day with 3 punches
      amArr = formatCSCTime(p1.timeStr);
      amDep = formatCSCTime(p3.timeStr);
    } else if (p1.mins < 720) {
      amArr = formatCSCTime(p1.timeStr);
      if (p2.mins <= 780) {
        amDep = formatCSCTime(p2.timeStr);
        pmDep = formatCSCTime(p3.timeStr);
      } else {
        pmArr = formatCSCTime(p2.timeStr);
        pmDep = formatCSCTime(p3.timeStr);
      }
    } else {
      // Afternoon session
      pmArr = formatCSCTime(p1.timeStr);
      pmDep = formatCSCTime(p3.timeStr);
    }
  } else if (uniquePunches.length === 2) {
    const p1 = uniquePunches[0];
    const p2 = uniquePunches[1];

    // If p1 is morning (< 720 / 12:00 PM) and p2 is around 12 noon onwards up to 1:30 PM (<= 810 mins)
    // or both punches are in the morning (< 720)
    if (p1.mins < 720 && p2.mins <= 810) {
      amArr = formatCSCTime(p1.timeStr);
      amDep = formatCSCTime(p2.timeStr);
      pmArr = '';
      pmDep = '';
    } else if (p1.mins >= 720) {
      // Afternoon Half Day (e.g. 1:00 PM to 5:00 PM)
      amArr = '';
      amDep = '';
      pmArr = formatCSCTime(p1.timeStr);
      pmDep = formatCSCTime(p2.timeStr);
    } else {
      // Full Day (Morning Arrival & Afternoon Departure)
      amArr = formatCSCTime(p1.timeStr);
      amDep = '';
      pmArr = '';
      pmDep = formatCSCTime(p2.timeStr);
    }
  } else if (uniquePunches.length === 1) {
    const p = uniquePunches[0];
    if (p.mins < 660) {
      amArr = formatCSCTime(p.timeStr);
    } else if (p.mins >= 660 && p.mins <= 780) {
      amDep = formatCSCTime(p.timeStr);
    } else if (p.mins > 780 && p.mins <= 870) {
      pmArr = formatCSCTime(p.timeStr);
    } else {
      pmDep = formatCSCTime(p.timeStr);
    }
  }

  const { lateMinutes, undertimeMinutes } = calculateDayTimeLoss(amArr, amDep, pmArr, pmDep, schedule, undefined, personnelType);

  return {
    day: dayNum,
    amArrival: amArr,
    amDeparture: amDep,
    pmArrival: pmArr,
    pmDeparture: pmDep,
    statusTag: 'REGULAR',
    remarks: '',
    lateMinutes,
    undertimeMinutes,
    isAdjusted: true
  };
}

/**
 * Helper to parse Excel numeric time or string to formatted time
 */
function parseExcelTimeValue(val: any): string {
  if (val === undefined || val === null || val === '') return '';
  if (typeof val === 'number') {
    const fractional = val % 1;
    const totalMinutes = Math.round(fractional * 24 * 60);
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const h12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${String(h12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
  }
  return String(val).trim();
}

/**
 * Parses a time string (e.g. "7:27 AM", "11:57 AM", "07/03/2026 7:27 AM") into minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): number | null {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.trim()) return null;
  const clean = timeStr.trim().toUpperCase();

  const timeMatch = clean.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i);
  if (!timeMatch) return null;

  let hrs = parseInt(timeMatch[1], 10);
  const mins = parseInt(timeMatch[2], 10);
  const period = timeMatch[3] ? timeMatch[3].toUpperCase() : null;

  if (isNaN(hrs) || isNaN(mins) || mins < 0 || mins > 59) return null;

  if (period === 'PM') {
    if (hrs < 12) hrs += 12;
  } else if (period === 'AM') {
    if (hrs === 12) hrs = 0;
  } else {
    if (hrs >= 1 && hrs <= 6) hrs += 12;
  }

  return hrs * 60 + mins;
}

/**
 * Allocates clock in and clock out time strings to the appropriate CSC Form 48 slots:
 * AM Arrival, AM Departure, PM Arrival, PM Departure.
 */
export function allocateClockTimes(
  clockInRaw: string,
  clockOutRaw: string,
  timeOut1Raw?: string,
  timeIn2Raw?: string
): { amArr: string; amDep: string; pmArr: string; pmDep: string } {
  let amArr = '';
  let amDep = '';
  let pmArr = '';
  let pmDep = '';

  const hasSeparateAmPmCols = Boolean((timeOut1Raw && timeOut1Raw.trim()) || (timeIn2Raw && timeIn2Raw.trim()));

  if (hasSeparateAmPmCols) {
    amArr = formatCSCTime(clockInRaw);
    amDep = formatCSCTime(timeOut1Raw || '');
    pmArr = formatCSCTime(timeIn2Raw || '');
    pmDep = formatCSCTime(clockOutRaw);
    return { amArr, amDep, pmArr, pmDep };
  }

  const clockInMins = clockInRaw ? parseTimeToMinutes(clockInRaw) : null;
  const clockOutMins = clockOutRaw ? parseTimeToMinutes(clockOutRaw) : null;

  if (clockInRaw && clockOutRaw) {
    if (clockInMins !== null && clockInMins < 720 && clockOutMins !== null && clockOutMins <= 810) {
      // Morning Half Day: e.g. 7:27 AM in, 11:57 AM / 12:00 PM out
      amArr = formatCSCTime(clockInRaw);
      amDep = formatCSCTime(clockOutRaw);
      pmArr = '';
      pmDep = '';
    } else if (clockInMins !== null && clockInMins >= 720) {
      // Afternoon Half Day: e.g. 1:00 PM in, 5:00 PM out
      amArr = '';
      amDep = '';
      pmArr = formatCSCTime(clockInRaw);
      pmDep = formatCSCTime(clockOutRaw);
    } else {
      // Full Day: Morning in (e.g. 7:27 AM), Afternoon out (e.g. 5:00 PM)
      amArr = formatCSCTime(clockInRaw);
      amDep = '';
      pmArr = '';
      pmDep = formatCSCTime(clockOutRaw);
    }
  } else if (clockInRaw) {
    if (clockInMins !== null) {
      if (clockInMins < 660) {
        amArr = formatCSCTime(clockInRaw);
      } else if (clockInMins <= 810) {
        amDep = formatCSCTime(clockInRaw);
      } else if (clockInMins <= 870) {
        pmArr = formatCSCTime(clockInRaw);
      } else {
        pmDep = formatCSCTime(clockInRaw);
      }
    } else {
      amArr = formatCSCTime(clockInRaw);
    }
  } else if (clockOutRaw) {
    if (clockOutMins !== null) {
      if (clockOutMins <= 810) {
        amDep = formatCSCTime(clockOutRaw);
      } else {
        pmDep = formatCSCTime(clockOutRaw);
      }
    } else {
      pmDep = formatCSCTime(clockOutRaw);
    }
  }

  return { amArr, amDep, pmArr, pmDep };
}

/**
 * Helper to extract day number (1-31) from date string or Excel serial
 */
function extractDayNum(dateVal: any): number {
  const parsed = parseExcelDate(dateVal);
  return parsed ? parsed.day : 1;
}

/**
 * Parses uploaded Excel/CSV file targeting columns: AC-No., Name, and Time
 */
export async function parseExcelBiometricFile(
  file: File,
  personnelList?: Personnel[]
): Promise<{
  recordsParsed: number;
  personnelLogsMap: Record<string, DTRDayEntry[]>;
  personnelNameMap: Record<string, string>;
  detectedMonth: number;
  detectedYear: number;
  summary: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const matrix: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!matrix || matrix.length === 0) {
          throw new Error('Excel file contains no data.');
        }

        let acNoCol = -1;
        let nameCol = -1;
        let timeCol = -1;
        let dateCol = -1;
        let timetableCol = -1;
        let onDutyCol = -1;
        let offDutyCol = -1;
        let clockInCol = -1;
        let clockOutCol = -1;
        let timeOut1Col = -1;
        let timeIn2Col = -1;
        let headerRowIndex = -1;

        // Find header row containing AC-No., Name, Time, Date, etc.
        for (let r = 0; r < Math.min(matrix.length, 25); r++) {
          const row = matrix[r];
          if (!Array.isArray(row)) continue;

          let tAcNo = -1;
          let tName = -1;
          let tTime = -1;
          let tDate = -1;
          let tTimetable = -1;
          let tOnDuty = -1;
          let tOffDuty = -1;
          let tClockIn = -1;
          let tClockOut = -1;
          let tTimeOut1 = -1;
          let tTimeIn2 = -1;

          row.forEach((cell, cIdx) => {
            const val = String(cell || '').trim().toLowerCase();
            if (!val) return;

            if (/^(ac[-_\s]*no\.?|ac[-_\s]*number|ac[-_\s]*num|employee\s*id|user\s*id|id|no\.?)$/i.test(val)) {
              tAcNo = cIdx;
            } else if (/^(name|employee\s*name|personnel\s*name|user\s*name)$/i.test(val)) {
              tName = cIdx;
            } else if (/^(time|date\s*time|date\/time|date-time|timestamp|log\s*time|check\s*time|punch\s*time)$/i.test(val)) {
              tTime = cIdx;
            } else if (/^(date|log\s*date)$/i.test(val)) {
              tDate = cIdx;
            } else if (/^(timetable|schedule|shift)$/i.test(val)) {
              tTimetable = cIdx;
            } else if (/^(on\s*duty|duty\s*on)$/i.test(val)) {
              tOnDuty = cIdx;
            } else if (/^(off\s*duty|duty\s*off)$/i.test(val)) {
              tOffDuty = cIdx;
            } else if (/^(am\s*(arrival|in)|clock\s*in(\s*1)?|time\s*in(\s*1)?|c\/in(\s*1)?)$/i.test(val)) {
              tClockIn = cIdx;
            } else if (/^(am\s*(departure|dep|out)|time\s*out\s*1|clock\s*out\s*1|c\/out\s*1)$/i.test(val)) {
              tTimeOut1 = cIdx;
            } else if (/^(pm\s*(arrival|arr|in)|time\s*in\s*2|clock\s*in\s*2|c\/in\s*2)$/i.test(val)) {
              tTimeIn2 = cIdx;
            } else if (/^(pm\s*(departure|dep|out)|clock\s*out(\s*2)?|time\s*out(\s*2)?|c\/out(\s*2)?)$/i.test(val)) {
              tClockOut = cIdx;
            }
          });

          const matchesCount = [tAcNo, tName, tTime, tDate, tClockIn, tClockOut, tOnDuty, tOffDuty].filter((i) => i !== -1).length;
          if (matchesCount >= 2) {
            headerRowIndex = r;
            acNoCol = tAcNo;
            nameCol = tName;
            timeCol = tTime;
            dateCol = tDate;
            timetableCol = tTimetable;
            onDutyCol = tOnDuty;
            offDutyCol = tOffDuty;
            clockInCol = tClockIn;
            clockOutCol = tClockOut;
            timeOut1Col = tTimeOut1;
            timeIn2Col = tTimeIn2;
            break;
          }
        }

        const personnelLogsMap: Record<string, DTRDayEntry[]> = {};
        const personnelNameMap: Record<string, string> = {};
        const punchesMap: Record<string, Record<number, { timeStr: string; mins: number }[]>> = {};
        const monthCounts: Record<number, number> = {};
        const yearCounts: Record<number, number> = {};
        let parsedCount = 0;

        if (headerRowIndex !== -1) {
          for (let r = headerRowIndex + 1; r < matrix.length; r++) {
            const row = matrix[r];
            if (!Array.isArray(row) || row.every((c) => String(c || '').trim() === '')) continue;

            const acNo = String(acNoCol !== -1 ? row[acNoCol] : row[0] || '').trim();
            if (!acNo) continue;

            const name = String(nameCol !== -1 ? row[nameCol] : '').trim();
            if (name) {
              personnelNameMap[acNo] = name;
            }

            // Standard AC-No., Name, Time format
            if (timeCol !== -1 || (clockInCol === -1 && timeOut1Col === -1 && timeIn2Col === -1)) {
              const primaryVal = timeCol !== -1 ? row[timeCol] : (dateCol !== -1 ? row[dateCol] : row[2]);
              const secondaryVal = (timeCol !== -1 && dateCol !== -1) ? row[dateCol] : undefined;

              const dt = parseDateTimeValue(primaryVal, secondaryVal);
              if (dt.dateInfo) {
                if (dt.dateInfo.month >= 1 && dt.dateInfo.month <= 12) {
                  monthCounts[dt.dateInfo.month] = (monthCounts[dt.dateInfo.month] || 0) + 1;
                }
                if (dt.dateInfo.year >= 2000 && dt.dateInfo.year <= 2100) {
                  yearCounts[dt.dateInfo.year] = (yearCounts[dt.dateInfo.year] || 0) + 1;
                }

                const dayNum = dt.dateInfo.day;
                if (dt.minsFromMidnight !== null && dt.formattedTime) {
                  if (!punchesMap[acNo]) punchesMap[acNo] = {};
                  if (!punchesMap[acNo][dayNum]) punchesMap[acNo][dayNum] = [];
                  punchesMap[acNo][dayNum].push({ timeStr: dt.formattedTime, mins: dt.minsFromMidnight });
                  parsedCount++;
                  continue;
                }
              }
            }

            // Multi-column legacy format fallback
            const dateVal = dateCol !== -1 ? row[dateCol] : row[2];
            const dateInfo = parseExcelDate(dateVal);
            const dayNum = dateInfo ? dateInfo.day : extractDayNum(dateVal);

            if (dateInfo) {
              if (dateInfo.month >= 1 && dateInfo.month <= 12) {
                monthCounts[dateInfo.month] = (monthCounts[dateInfo.month] || 0) + 1;
              }
              if (dateInfo.year >= 2000 && dateInfo.year <= 2100) {
                yearCounts[dateInfo.year] = (yearCounts[dateInfo.year] || 0) + 1;
              }
            }

            const clockInRaw = parseExcelTimeValue(clockInCol !== -1 ? row[clockInCol] : '');
            const clockOutRaw = parseExcelTimeValue(clockOutCol !== -1 ? row[clockOutCol] : '');
            const timeOut1Raw = parseExcelTimeValue(timeOut1Col !== -1 ? row[timeOut1Col] : '');
            const timeIn2Raw = parseExcelTimeValue(timeIn2Col !== -1 ? row[timeIn2Col] : '');

            const allocated = allocateClockTimes(clockInRaw, clockOutRaw, timeOut1Raw, timeIn2Raw);
            const { amArr, amDep, pmArr, pmDep } = allocated;

            if (!personnelLogsMap[acNo]) {
              personnelLogsMap[acNo] = [];
            }

            const personName = personnelNameMap[acNo] || '';
            const matchedP = personnelList?.find(
              (p) =>
                p.employeeId.toLowerCase() === acNo.toLowerCase() ||
                p.employeeId.replace(/^EMP-/i, '').toLowerCase() === acNo.toLowerCase() ||
                p.name.toLowerCase() === acNo.toLowerCase() ||
                (personName && p.name.toLowerCase() === personName.toLowerCase()) ||
                p.id.toLowerCase() === acNo.toLowerCase()
            );

            const existingIdx = personnelLogsMap[acNo].findIndex((d) => d.day === dayNum);
            if (existingIdx >= 0) {
              const existing = personnelLogsMap[acNo][existingIdx];
              let finalAmArr = amArr || existing.amArrival;
              let finalAmDep = amDep || existing.amDeparture;
              let finalPmArr = pmArr || existing.pmArrival;
              let finalPmDep = pmDep || existing.pmDeparture;

              // Clean up duplicate or misplaced afternoon entries when morning half-day is parsed
              if (amArr && amDep && !pmArr && !pmDep) {
                finalPmArr = '';
                finalPmDep = '';
              }
              if (finalAmDep && finalPmDep === finalAmDep) {
                finalPmDep = '';
              }
              if (finalAmArr && finalPmArr === finalAmArr) {
                finalPmArr = '';
              }

              const { lateMinutes, undertimeMinutes } = calculateDayTimeLoss(
                finalAmArr,
                finalAmDep,
                finalPmArr,
                finalPmDep,
                matchedP?.regularSchedule,
                undefined,
                matchedP?.personnelType
              );

              personnelLogsMap[acNo][existingIdx] = {
                ...existing,
                amArrival: finalAmArr,
                amDeparture: finalAmDep,
                pmArrival: finalPmArr,
                pmDeparture: finalPmDep,
                remarks: existing.remarks || '',
                lateMinutes,
                undertimeMinutes
              };
            } else {
              const { lateMinutes, undertimeMinutes } = calculateDayTimeLoss(
                amArr,
                amDep,
                pmArr,
                pmDep,
                matchedP?.regularSchedule,
                undefined,
                matchedP?.personnelType
              );
              personnelLogsMap[acNo].push({
                day: dayNum,
                amArrival: amArr,
                amDeparture: amDep,
                pmArrival: pmArr,
                pmDeparture: pmDep,
                statusTag: 'REGULAR',
                remarks: '',
                lateMinutes,
                undertimeMinutes,
                isAdjusted: true
              });
            }

            parsedCount++;
          }
        } else {
          // Fallback object parser
          const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
          jsonRows.forEach((row) => {
            const acNo = String(
              row['AC-No.'] || row['AC-No'] || row['AC No'] || row['AC_No'] || row['Employee ID'] || row['User ID'] || row['ID'] || ''
            ).trim();
            if (!acNo) return;

            const name = String(row['Name'] || row['Employee Name'] || '').trim();
            if (name) personnelNameMap[acNo] = name;

            const timeVal = row['Time'] || row['Date Time'] || row['Date/Time'] || row['Timestamp'] || row['Check Time'];
            const dateVal = row['Date'] || row['Log Date'];

            if (timeVal || dateVal) {
              const dt = parseDateTimeValue(timeVal || dateVal, dateVal && timeVal ? dateVal : undefined);
              if (dt.dateInfo) {
                if (dt.dateInfo.month >= 1 && dt.dateInfo.month <= 12) {
                  monthCounts[dt.dateInfo.month] = (monthCounts[dt.dateInfo.month] || 0) + 1;
                }
                if (dt.dateInfo.year >= 2000 && dt.dateInfo.year <= 2100) {
                  yearCounts[dt.dateInfo.year] = (yearCounts[dt.dateInfo.year] || 0) + 1;
                }

                const dayNum = dt.dateInfo.day;
                if (dt.minsFromMidnight !== null && dt.formattedTime) {
                  if (!punchesMap[acNo]) punchesMap[acNo] = {};
                  if (!punchesMap[acNo][dayNum]) punchesMap[acNo][dayNum] = [];
                  punchesMap[acNo][dayNum].push({ timeStr: dt.formattedTime, mins: dt.minsFromMidnight });
                  parsedCount++;
                  return;
                }
              }
            }

            // Fallback for json objects with AM/PM columns
            const dateInfo = parseExcelDate(dateVal);
            const dayNum = dateInfo ? dateInfo.day : extractDayNum(dateVal);
            const clockInRaw = parseExcelTimeValue(row['AM Arrival'] || row['Clock In'] || row['Time In']);
            const clockOutRaw = parseExcelTimeValue(row['PM Departure'] || row['Clock Out'] || row['Time Out']);
            const timeOut1Raw = parseExcelTimeValue(row['AM Departure'] || row['Time Out 1']);
            const timeIn2Raw = parseExcelTimeValue(row['PM Arrival'] || row['Time In 2']);

            const allocated = allocateClockTimes(clockInRaw, clockOutRaw, timeOut1Raw, timeIn2Raw);
            const { amArr, amDep, pmArr, pmDep } = allocated;

            if (!personnelLogsMap[acNo]) personnelLogsMap[acNo] = [];
            const { lateMinutes, undertimeMinutes } = calculateDayTimeLoss(amArr, amDep, pmArr, pmDep);
            personnelLogsMap[acNo].push({
              day: dayNum,
              amArrival: amArr,
              amDeparture: amDep,
              pmArrival: pmArr,
              pmDeparture: pmDep,
              statusTag: 'REGULAR',
              remarks: '',
              lateMinutes,
              undertimeMinutes,
              isAdjusted: true
            });
            parsedCount++;
          });
        }

        // Process all accumulated punches into DTR Day Entries
        Object.keys(punchesMap).forEach((acNo) => {
          if (!personnelLogsMap[acNo]) {
            personnelLogsMap[acNo] = [];
          }

          const personName = personnelNameMap[acNo] || '';
          const matchedPersonnel = personnelList?.find(
            (p) =>
              p.employeeId.toLowerCase() === acNo.toLowerCase() ||
              p.employeeId.replace(/^EMP-/i, '').toLowerCase() === acNo.toLowerCase() ||
              p.name.toLowerCase() === acNo.toLowerCase() ||
              (personName && p.name.toLowerCase() === personName.toLowerCase()) ||
              p.id.toLowerCase() === acNo.toLowerCase()
          );

          const schedule = matchedPersonnel?.regularSchedule;
          const pType = matchedPersonnel?.personnelType;

          const daysMap = punchesMap[acNo];
          Object.keys(daysMap).forEach((dStr) => {
            const dayNum = parseInt(dStr, 10);
            const dayEntry = convertPunchListToDayEntry(dayNum, daysMap[dayNum], schedule, pType);

            const existingIdx = personnelLogsMap[acNo].findIndex((d) => d.day === dayNum);
            if (existingIdx >= 0) {
              personnelLogsMap[acNo][existingIdx] = dayEntry;
            } else {
              personnelLogsMap[acNo].push(dayEntry);
            }
          });
          // Sort daily entries by day number
          personnelLogsMap[acNo].sort((a, b) => a.day - b.day);
        });

        // Determine detected month and year
        let detectedMonth = 7; // July default fallback
        let maxM = 0;
        Object.entries(monthCounts).forEach(([mStr, count]) => {
          if (count > maxM) {
            maxM = count;
            detectedMonth = parseInt(mStr, 10);
          }
        });

        let detectedYear = 2026;
        let maxY = 0;
        Object.entries(yearCounts).forEach(([yStr, count]) => {
          if (count > maxY) {
            maxY = count;
            detectedYear = parseInt(yStr, 10);
          }
        });

        const monthNamesList = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        resolve({
          recordsParsed: parsedCount,
          personnelLogsMap,
          personnelNameMap,
          detectedMonth,
          detectedYear,
          summary: `Extracted ${parsedCount} biometric records for ${monthNamesList[detectedMonth - 1]} ${detectedYear} from sheet "${firstSheetName}".`
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse Excel file.'));
      }
    };

    reader.onerror = () => reject(new Error('File reading failed.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Formats minutes to CSC Form 48 format e.g. "15" or "1 hr 15 mins"
 */
export function formatMinutesLabel(minutes: number): { hrs: string; mins: string } {
  if (!minutes || minutes <= 0) {
    return { hrs: '', mins: '' };
  }
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return {
    hrs: hrs > 0 ? String(hrs) : '',
    mins: mins > 0 ? String(mins) : (hrs > 0 ? '0' : '')
  };
}
