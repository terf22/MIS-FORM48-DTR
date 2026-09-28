import * as XLSX from 'xlsx';
import {
  DTRDayEntry,
  MonthlyDTR,
  Personnel,
  ParsedPhilippineName,
  SafeMergeRecord,
  SmartMergeConflict,
  NewPersonnelCandidate,
  SmartMergeAnalysis,
  ConflictResolutionChoice
} from '../types';
import { calculateDayTimeLoss, generateSampleBiometricExcel } from './cscForm48';

/**
 * Common Philippine Compound Surname Prefixes
 */
const PHILIPPINE_COMPOUND_PREFIXES = [
  'de los santos',
  'de la cruz',
  'de la rosa',
  'de la torre',
  'de las alas',
  'del rosario',
  'del carmen',
  'del mundo',
  'del pilar',
  'dela cruz',
  'dela rosa',
  'dela torre',
  'dela peña',
  'delos santos',
  'delos reyes',
  'delos arcos',
  'san jose',
  'san juan',
  'san pedro',
  'san miguel',
  'san vicente',
  'santa maria',
  'santa ana',
  'santa cruz',
  'sta. maria',
  'sta. ana',
  'sta. cruz',
  'sto. tomas',
  'sto. niño',
  'de jesus',
  'de leon',
  'de vera',
  'de guzman',
  'de castro',
  'de chavez',
  'de gracia',
  'de luna',
  'de mesa',
  'de soto'
];

/**
 * Standard Levenshtein Distance implementation
 */
export function levenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();

  if (s1 === s2) return 0;
  if (s1.length === 0) return s2.length;
  if (s2.length === 0) return s1.length;

  const v0 = new Int32Array(s2.length + 1);
  const v1 = new Int32Array(s2.length + 1);

  for (let i = 0; i <= s2.length; i++) {
    v0[i] = i;
  }

  for (let i = 0; i < s1.length; i++) {
    v1[0] = i + 1;

    for (let j = 0; j < s2.length; j++) {
      const cost = s1[i] === s2[j] ? 0 : 1;
      v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
    }

    for (let j = 0; j <= s2.length; j++) {
      v0[j] = v1[j];
    }
  }

  return v0[s2.length];
}

/**
 * Normalizes common biometric machine export anomalies:
 * - Squished words: "Jenevi-veAntido" -> "Jenevive Antido"
 * - Typographical commas: "Ma Elvie D,R Acma" -> "Ma. Elvie D. R. Acma"
 * - CamelCase sticking: "MariaClara" -> "Maria Clara"
 */
export function normalizeBiometricNameString(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();

  // Fix typo commas in middle initials e.g. "D,R" -> "D. R."
  clean = clean.replace(/\b([A-Za-z]),([A-Za-z])\b/g, '$1. $2.');

  // Fix hyphens in names like "Jenevi-veAntido" -> "Jenevive Antido"
  clean = clean.replace(/([a-z])-([a-z])/gi, '$1$2');

  // Fix squished words when lowercase followed immediately by Uppercase: "veAntido" -> "ve Antido"
  clean = clean.replace(/([a-z])([A-Z])/g, '$1 $2');

  // Replace underscores or multiple spaces
  clean = clean.replace(/[_]+/g, ' ').replace(/\s+/g, ' ');

  // If there's "Ma " or "Ma." -> "Ma."
  clean = clean.replace(/\bMa\b(?!\.)/gi, 'Ma.');

  return clean.trim();
}

/**
 * Checks if a string starts with a Philippine compound surname
 */
function findCompoundPrefix(str: string): string | null {
  const lower = str.toLowerCase();
  for (const prefix of PHILIPPINE_COMPOUND_PREFIXES) {
    if (lower === prefix || lower.startsWith(prefix + ' ')) {
      return prefix;
    }
  }
  return null;
}

/**
 * Splits raw terminal strings into First Name, Middle Initial, and Last Name
 * with Philippine Compound Surname Awareness.
 */
export function parsePhilippineName(rawName: string): ParsedPhilippineName {
  const raw = rawName || '';
  const normalized = normalizeBiometricNameString(raw);

  if (!normalized) {
    return {
      firstName: '',
      middleInitial: '',
      lastName: '',
      formattedFullName: '',
      raw
    };
  }

  // Check if contains comma: "LASTNAME, FIRSTNAME MIDDLE"
  if (normalized.includes(',')) {
    const parts = normalized.split(',').map((p) => p.trim()).filter(Boolean);
    const familyPart = parts[0] || '';
    const givenPart = parts.slice(1).join(' ');

    const givenTokens = givenPart.split(/\s+/).filter(Boolean);
    let fName = '';
    let mInit = '';

    if (givenTokens.length === 1) {
      fName = givenTokens[0];
    } else if (givenTokens.length > 1) {
      const lastGivenToken = givenTokens[givenTokens.length - 1];
      // Check if last token is middle initial (1-2 chars e.g. "B.", "B", "M.")
      if (/^[A-Za-z]\.?$/.test(lastGivenToken)) {
        mInit = lastGivenToken.replace('.', '').toUpperCase();
        fName = givenTokens.slice(0, -1).join(' ');
      } else {
        fName = givenTokens.join(' ');
      }
    }

    const formatted = mInit
      ? `${fName} ${mInit}. ${familyPart}`.trim().toUpperCase()
      : `${fName} ${familyPart}`.trim().toUpperCase();

    return {
      firstName: fName,
      middleInitial: mInit,
      lastName: familyPart,
      formattedFullName: formatted,
      raw
    };
  }

  // Natural order without comma e.g. "Juan P. Dela Cruz" or "Ma. Elvie D. Acma"
  const tokens = normalized.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) {
    return {
      firstName: tokens[0],
      middleInitial: '',
      lastName: tokens[0],
      formattedFullName: tokens[0].toUpperCase(),
      raw
    };
  }

  // Check for Philippine compound surname from the end:
  // e.g. ["Juan", "P.", "De", "Los", "Santos"]
  let compoundMatch: string | null = null;
  let compoundTokensCount = 0;

  for (let len = Math.min(tokens.length - 1, 4); len >= 2; len--) {
    const candidate = tokens.slice(tokens.length - len).join(' ').toLowerCase();
    if (PHILIPPINE_COMPOUND_PREFIXES.some((p) => candidate === p || candidate.startsWith(p + ' '))) {
      compoundMatch = tokens.slice(tokens.length - len).join(' ');
      compoundTokensCount = len;
      break;
    }
  }

  let lName = '';
  let fName = '';
  let mInit = '';

  if (compoundMatch) {
    lName = compoundMatch;
    const remaining = tokens.slice(0, tokens.length - compoundTokensCount);
    if (remaining.length > 1 && /^[A-Za-z]\.?$/.test(remaining[remaining.length - 1])) {
      mInit = remaining[remaining.length - 1].replace('.', '').toUpperCase();
      fName = remaining.slice(0, -1).join(' ');
    } else {
      fName = remaining.join(' ');
    }
  } else {
    // Standard single family name at the end
    lName = tokens[tokens.length - 1];
    const remaining = tokens.slice(0, -1);
    if (remaining.length > 1 && /^[A-Za-z]\.?$/.test(remaining[remaining.length - 1])) {
      mInit = remaining[remaining.length - 1].replace('.', '').toUpperCase();
      fName = remaining.slice(0, -1).join(' ');
    } else {
      fName = remaining.join(' ');
    }
  }

  const formatted = mInit
    ? `${fName} ${mInit}. ${lName}`.trim().toUpperCase()
    : `${fName} ${lName}`.trim().toUpperCase();

  return {
    firstName: fName,
    middleInitial: mInit,
    lastName: lName,
    formattedFullName: formatted,
    raw
  };
}

/**
 * Calculates a robust similarity percentage (0-100) between two personnel names
 * taking into account order differences ("Santos, Maria" vs "Maria Santos"),
 * middle initials, and squished characters.
 */
export function calculateNameSimilarity(rawName1: string, rawName2: string): number {
  if (!rawName1 || !rawName2) return 0;

  const n1 = normalizeBiometricNameString(rawName1).toLowerCase();
  const n2 = normalizeBiometricNameString(rawName2).toLowerCase();

  if (n1 === n2) return 100;

  // Direct Levenshtein similarity
  const maxLen = Math.max(n1.length, n2.length);
  const levDist = levenshteinDistance(n1, n2);
  const levScore = Math.max(0, (1 - levDist / maxLen) * 100);

  // Token set similarity (order-independent)
  const tokens1 = n1.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  const tokens2 = n2.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  if (tokens1.length === 0 || tokens2.length === 0) return Math.round(levScore);

  let matchedTokens = 0;
  for (const t1 of tokens1) {
    if (t1.length <= 1) {
      // Middle initial check
      if (tokens2.some((t2) => t2.startsWith(t1))) {
        matchedTokens += 0.5;
      }
    } else {
      // Full word check
      const bestLev = Math.min(...tokens2.map((t2) => levenshteinDistance(t1, t2)));
      if (bestLev === 0) {
        matchedTokens += 1;
      } else if (bestLev === 1 && t1.length > 3) {
        matchedTokens += 0.8;
      }
    }
  }

  const tokenScore = Math.min(100, (matchedTokens / Math.max(tokens1.length, tokens2.length)) * 100);

  // Return the maximum of the two metrics to accommodate reordered Philippine names
  return Math.round(Math.max(levScore, tokenScore));
}

/**
 * Analyzes incoming biometric parsed data against existing personnel roster
 * and categorizes into the Three Intelligent Classification Pathways:
 * 1. Condition A: Safe Auto-Merge
 * 2. Condition B: Interactive Conflict Resolution Wizard
 * 3. Condition C: New Personnel Onboarding
 */
export function analyzeSmartMerge(
  personnelLogsMap: Record<string, DTRDayEntry[]>,
  personnelNameMap: Record<string, string>,
  personnelList: Personnel[],
  existingDtrMap: Record<string, MonthlyDTR>,
  detectedMonth: number = 7,
  detectedYear: number = 2026,
  fileName: string = 'biometric_data.xlsx'
): SmartMergeAnalysis {
  const safeAutoMerges: SafeMergeRecord[] = [];
  const conflicts: SmartMergeConflict[] = [];
  const newPersonnel: NewPersonnelCandidate[] = [];

  const processedAcNos = Object.keys(personnelLogsMap);
  let totalRecords = 0;

  processedAcNos.forEach((acNo) => {
    const logs = personnelLogsMap[acNo] || [];
    const rawName = (personnelNameMap[acNo] || '').trim();
    const parsedName = parsePhilippineName(rawName);

    totalRecords += logs.length;

    // Clean AC-No comparison (handles "101", "EMP-101", etc.)
    const cleanAcNo = acNo.replace(/^EMP-/i, '').toLowerCase();

    // 1. Try to find a personnel with matching ID
    const idMatchedPersonnel = personnelList.find((p) => {
      const pEmpNo = (p.employeeNumber || '').replace(/^EMP-/i, '').toLowerCase();
      const pEmpId = (p.employeeId || '').replace(/^EMP-/i, '').toLowerCase();
      const pId = (p.id || '').replace(/^EMP-/i, '').toLowerCase();
      return pEmpNo === cleanAcNo || pEmpId === cleanAcNo || pId === cleanAcNo;
    });

    // 2. Try to find personnel with high name similarity
    let bestNameMatch: { personnel: Personnel; score: number } | null = null;
    if (rawName) {
      for (const p of personnelList) {
        const score1 = calculateNameSimilarity(rawName, p.fullName || p.name);
        const score2 = calculateNameSimilarity(rawName, `${p.lastName} ${p.firstName}`);
        const maxScore = Math.max(score1, score2);

        if (!bestNameMatch || maxScore > bestNameMatch.score) {
          bestNameMatch = { personnel: p, score: maxScore };
        }
      }
    }

    // -------------------------------------------------------------
    // Pathway Classification Logic
    // -------------------------------------------------------------

    // Case 1: ID Match exists
    if (idMatchedPersonnel) {
      const nameScoreWithIdMatch = rawName
        ? Math.max(
            calculateNameSimilarity(rawName, idMatchedPersonnel.fullName || idMatchedPersonnel.name),
            calculateNameSimilarity(rawName, `${idMatchedPersonnel.lastName} ${idMatchedPersonnel.firstName}`)
          )
        : 100;

      if (!rawName || nameScoreWithIdMatch >= 65) {
        // Safe Auto-Merge (Condition A)
        // Check preserved manually verified days
        const dtrKey = `${idMatchedPersonnel.id}-${detectedYear}-${detectedMonth}`;
        const existingDTR = existingDtrMap[dtrKey];
        let preservedDaysCount = 0;

        if (existingDTR) {
          existingDTR.days.forEach((d) => {
            if (
              d.statusTag === 'LEAVE' ||
              d.statusTag === 'OB' ||
              d.statusTag === 'HOLIDAY' ||
              d.statusTag === 'CLASS_SUSPENDED' ||
              d.isAdjusted
            ) {
              preservedDaysCount++;
            }
          });
        }

        safeAutoMerges.push({
          terminalAcNo: acNo,
          rawTerminalName: rawName || idMatchedPersonnel.fullName,
          personnel: idMatchedPersonnel,
          logs,
          daysCount: logs.length,
          manuallyVerifiedDaysPreserved: preservedDaysCount,
          nameSimilarityScore: nameScoreWithIdMatch
        });
      } else {
        // Condition B: Collision -> ID Match, Name Mismatch (Hardware Slot Reassigned)
        conflicts.push({
          id: `conflict-id-${acNo}-${Date.now()}`,
          conflictType: 'ID_MATCH_NAME_MISMATCH',
          terminalAcNo: acNo,
          rawTerminalName: rawName,
          parsedName,
          matchedPersonnel: idMatchedPersonnel,
          nameSimilarityScore: nameScoreWithIdMatch,
          conflictDescription: `Re-assigned Terminal Slot: Terminal AC-No #${acNo} is assigned in Roster to "${idMatchedPersonnel.fullName}", but the biometric terminal export lists "${rawName}".`,
          logs,
          resolution: 'MERGE_EXISTING'
        });
      }
      return;
    }

    // Case 2: ID did not match, but high Name Match exists
    if (bestNameMatch && bestNameMatch.score >= 78) {
      // Condition B: Collision -> Name Match, ID Mismatch
      conflicts.push({
        id: `conflict-name-${acNo}-${Date.now()}`,
        conflictType: 'NAME_MATCH_ID_MISMATCH',
        terminalAcNo: acNo,
        rawTerminalName: rawName,
        parsedName,
        matchedPersonnel: bestNameMatch.personnel,
        nameSimilarityScore: bestNameMatch.score,
        conflictDescription: `Terminal ID Discrepancy: Biometric name "${rawName}" matches roster personnel "${bestNameMatch.personnel.fullName}" (${bestNameMatch.score}% match), but terminal AC-No #${acNo} differs from employee #${bestNameMatch.personnel.employeeNumber || bestNameMatch.personnel.employeeId}.`,
        logs,
        resolution: 'MERGE_EXISTING'
      });
      return;
    }

    // Case 3: Neither ID nor Name matched any existing personnel
    // -> Condition C: New Personnel Onboarding
    const lName = parsedName.lastName || (rawName.includes(',') ? rawName.split(',')[0].trim() : rawName);
    const fName = parsedName.firstName || (rawName.includes(',') ? rawName.split(',')[1]?.trim() : rawName);

    newPersonnel.push({
      tempId: `new-p-${Date.now()}-${acNo}`,
      terminalAcNo: acNo,
      rawTerminalName: rawName || `Staff ID ${acNo}`,
      firstName: fName,
      middleInitial: parsedName.middleInitial,
      lastName: lName,
      fullName: parsedName.formattedFullName || rawName || `Staff ID ${acNo}`,
      positionTitle: 'Teacher I (Junior/Senior High)',
      departmentName: 'Junior High School Department',
      logs,
      daysCount: logs.length,
      selected: true
    });
  });

  return {
    safeAutoMerges,
    conflicts,
    newPersonnel,
    totalRecords,
    detectedMonth,
    detectedYear,
    fileName
  };
}

/**
 * Executes Smart Merge Application into the system state:
 * - Safely attaches punch days to existing Form 48 monthly cards
 * - Preserves all metadata: Plantilla Item No, Salary Grade, Step Increment, Leave Ledger balances
 * - Protects manually verified days (LEAVE, OB, HOLIDAY, SUSPENDED, manual edits)
 * - Resolves conflict choices
 * - Onboards accepted new personnel
 */
export function executeSmartMergeApplication(
  analysis: SmartMergeAnalysis,
  conflictResolutions: Record<string, ConflictResolutionChoice>,
  personnelList: Personnel[],
  dtrMap: Record<string, MonthlyDTR>,
  defaultDepartmentName: string = 'Junior High School Department'
): {
  updatedPersonnelList: Personnel[];
  updatedDtrMap: Record<string, MonthlyDTR>;
  auditSummary: string;
  appliedCount: number;
} {
  let updatedPersonnelList = [...personnelList];
  let updatedDtrMap = { ...dtrMap };
  let appliedCount = 0;
  const targetMonth = analysis.detectedMonth;
  const targetYear = analysis.detectedYear;

  // Helper to merge punch days into a person's DTR safely
  const mergeLogsIntoDTR = (person: Personnel, logs: DTRDayEntry[]) => {
    const key = `${person.id}-${targetYear}-${targetMonth}`;
    const existingDTR = updatedDtrMap[key] || {
      id: key,
      personnelId: person.id,
      employeeName: person.fullName || person.name,
      employeeId: person.employeeId || person.employeeNumber,
      departmentName: person.departmentName || defaultDepartmentName,
      personnelType: person.personnelType || 'teaching',
      month: targetMonth,
      year: targetYear,
      officialHoursRegular: '8:00 AM - 5:00 PM',
      officialHoursSaturday: 'As required',
      days: [],
      totalHoursWorked: 0,
      totalLateMinutes: 0,
      totalUndertimeMinutes: 0,
      isVerifiedByHead: false,
      certifiedByEmployee: false
    };

    const dayMap = new Map<number, DTRDayEntry>();
    existingDTR.days.forEach((d) => dayMap.set(d.day, d));

    logs.forEach((incomingDay) => {
      if (incomingDay.day >= 1 && incomingDay.day <= 31) {
        const existing = dayMap.get(incomingDay.day);

        // DATA SAFETY RULE:
        // Do not overwrite manually verified days or official status tags unless incoming day is active punches
        const isManuallyProtected =
          existing &&
          (existing.statusTag === 'LEAVE' ||
            existing.statusTag === 'OB' ||
            existing.statusTag === 'HOLIDAY' ||
            existing.statusTag === 'CLASS_SUSPENDED' ||
            existing.isAdjusted);

        if (isManuallyProtected && (!incomingDay.amArrival && !incomingDay.pmArrival)) {
          // Keep manual status
          return;
        }

        let amArr = incomingDay.amArrival || existing?.amArrival || '';
        let amDep = incomingDay.amDeparture || existing?.amDeparture || '';
        let pmArr = incomingDay.pmArrival || existing?.pmArrival || '';
        let pmDep = incomingDay.pmDeparture || existing?.pmDeparture || '';

        // Clean up duplicate departure
        if (amDep && pmDep === amDep) pmDep = '';
        if (amArr && pmArr === amArr) pmArr = '';

        const statusTag = isManuallyProtected
          ? existing?.statusTag || 'REGULAR'
          : incomingDay.statusTag || existing?.statusTag || 'REGULAR';

        const { lateMinutes, undertimeMinutes } = calculateDayTimeLoss(
          amArr,
          amDep,
          pmArr,
          pmDep,
          person.regularSchedule,
          statusTag,
          person.personnelType
        );

        dayMap.set(incomingDay.day, {
          day: incomingDay.day,
          amArrival: amArr,
          amDeparture: amDep,
          pmArrival: pmArr,
          pmDeparture: pmDep,
          statusTag,
          remarks: existing?.remarks || incomingDay.remarks || '',
          lateMinutes,
          undertimeMinutes,
          isAdjusted: existing?.isAdjusted || incomingDay.isAdjusted || false
        });

        appliedCount++;
      }
    });

    const newDaysArray = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
    const totalLate = newDaysArray.reduce((acc, c) => acc + (c.lateMinutes || 0), 0);
    const totalUnder = newDaysArray.reduce((acc, c) => acc + (c.undertimeMinutes || 0), 0);

    updatedDtrMap[key] = {
      ...existingDTR,
      days: newDaysArray,
      totalLateMinutes: totalLate,
      totalUndertimeMinutes: totalUnder
    };
  };

  // 1. Process Condition A: Safe Auto-Merges
  analysis.safeAutoMerges.forEach((rec) => {
    // Preserve profile metadata
    const pIdx = updatedPersonnelList.findIndex((p) => p.id === rec.personnel.id);
    if (pIdx !== -1) {
      // Keep Plantilla, SG, Step, Leave balances 100% intact
      const p = updatedPersonnelList[pIdx];
      mergeLogsIntoDTR(p, rec.logs);
    }
  });

  // 2. Process Condition B: Conflicts
  analysis.conflicts.forEach((conflict) => {
    const choice = conflictResolutions[conflict.id] || conflict.resolution || 'MERGE_EXISTING';

    if (choice === 'MERGE_EXISTING') {
      // Consolidate punch days with matched personnel and link terminal ID
      const targetP = conflict.matchedPersonnel;
      const pIdx = updatedPersonnelList.findIndex((p) => p.id === targetP.id);
      if (pIdx !== -1) {
        // Link terminal ID if not set
        if (!updatedPersonnelList[pIdx].employeeId) {
          updatedPersonnelList[pIdx] = {
            ...updatedPersonnelList[pIdx],
            employeeId: conflict.terminalAcNo
          };
        }
        mergeLogsIntoDTR(updatedPersonnelList[pIdx], conflict.logs);
      }
    } else if (choice === 'CREATE_SEPARATE') {
      // Generate an independent profile for distinct staff member
      const newPerson: Personnel = {
        id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        employeeId: conflict.terminalAcNo,
        employeeNumber: conflict.terminalAcNo,
        name: conflict.parsedName.formattedFullName || conflict.rawTerminalName,
        fullName: conflict.parsedName.formattedFullName || conflict.rawTerminalName,
        lastName: conflict.parsedName.lastName || conflict.rawTerminalName,
        firstName: conflict.parsedName.firstName || conflict.rawTerminalName,
        middleName: conflict.parsedName.middleInitial ? `${conflict.parsedName.middleInitial}.` : '',
        positionTitle: 'Teacher I',
        title: 'Teacher I',
        itemNumber: `T1-${conflict.terminalAcNo}`,
        tin: '',
        dateOfBirth: '',
        placeOfBirth: '',
        districtOrSchool: defaultDepartmentName,
        gsisBpNo: '',
        departmentId: 'dept-1',
        departmentName: defaultDepartmentName,
        personnelType: 'teaching',
        status: 'permanent',
        role: 'teacher',
        email: '',
        regularSchedule: {
          amArrival: '07:30',
          amDeparture: '12:00',
          pmArrival: '13:00',
          pmDeparture: '16:30',
          saturdayHours: 'As required'
        }
      };
      updatedPersonnelList.push(newPerson);
      mergeLogsIntoDTR(newPerson, conflict.logs);
    }
    // 'SKIP' leaves record unmerged
  });

  // 3. Process Condition C: New Personnel Onboarding
  analysis.newPersonnel.forEach((candidate) => {
    if (!candidate.selected) return;

    const newPerson: Personnel = {
      id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      employeeId: candidate.terminalAcNo,
      employeeNumber: candidate.terminalAcNo,
      name: candidate.fullName,
      fullName: candidate.fullName,
      lastName: candidate.lastName,
      firstName: candidate.firstName,
      middleName: candidate.middleInitial ? `${candidate.middleInitial}.` : '',
      positionTitle: candidate.positionTitle || 'Teacher I',
      title: candidate.positionTitle || 'Teacher I',
      itemNumber: candidate.itemNumber || `T1-${candidate.terminalAcNo}`,
      tin: candidate.tin || '',
      dateOfBirth: '',
      placeOfBirth: '',
      districtOrSchool: candidate.departmentName || defaultDepartmentName,
      gsisBpNo: '',
      departmentId: 'dept-1',
      departmentName: candidate.departmentName || defaultDepartmentName,
      personnelType: 'teaching',
      status: 'permanent',
      role: 'teacher',
      email: '',
      regularSchedule: {
        amArrival: '07:30',
        amDeparture: '12:00',
        pmArrival: '13:00',
        pmDeparture: '16:30',
        saturdayHours: 'As required'
      }
    };

    updatedPersonnelList.push(newPerson);
    mergeLogsIntoDTR(newPerson, candidate.logs);
  });

  const auditSummary = `Smart Merge completed for file "${analysis.fileName}": Auto-merged ${analysis.safeAutoMerges.length} records, resolved ${analysis.conflicts.length} collisions, and onboarded ${analysis.newPersonnel.filter((n) => n.selected).length} new staff members. Total ${appliedCount} punch day slots integrated into CSC Form 48 cards.`;

  return {
    updatedPersonnelList,
    updatedDtrMap,
    auditSummary,
    appliedCount
  };
}

/**
 * Generates sample Excel showcasing Smart Merge capabilities:
 * - Condition A: Safe Auto-Merge (AC-No & Name match)
 * - Typo tolerance: Squished names (Jenevi-veAntido), Typo commas (Ma Elvie D,R Acma)
 * - Philippine Compound Surnames (dela Cruz, de los Santos)
 * - Condition B: Interactive Conflict Resolution Wizard (Reassigned slot & ID discrepancy)
 * - Condition C: New Personnel Onboarding (Uncatalogued faculty)
 */
export function generateSampleSmartMergeExcel(): void {
  const wb = XLSX.utils.book_new();

  const rows = [
    ['AC-No.', 'Name', 'Time'],
    // Safe Auto-Merge (Maria Clara Santos)
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 07:45 AM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 12:00 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 01:00 PM'],
    ['101', 'SANTOS, MARIA CLARA L.', '2026-07-01 05:00 PM'],

    // Typo Tolerance: Squished characters (Jenevi-veAntido)
    ['102', 'Jenevi-veAntido', '2026-07-01 07:28 AM'],
    ['102', 'Jenevi-veAntido', '2026-07-01 12:01 PM'],
    ['102', 'Jenevi-veAntido', '2026-07-01 12:58 PM'],
    ['102', 'Jenevi-veAntido', '2026-07-01 04:32 PM'],

    // Typo Tolerance: Typographical comma in middle initials (Ma Elvie D,R Acma)
    ['103', 'Ma Elvie D,R Acma', '2026-07-01 07:30 AM'],
    ['103', 'Ma Elvie D,R Acma', '2026-07-01 12:00 PM'],
    ['103', 'Ma Elvie D,R Acma', '2026-07-01 01:00 PM'],
    ['103', 'Ma Elvie D,R Acma', '2026-07-01 04:30 PM'],

    // Philippine Compound Surname Awareness (dela Cruz, Juan P.)
    ['104', 'dela Cruz, Juan P.', '2026-07-01 07:55 AM'],
    ['104', 'dela Cruz, Juan P.', '2026-07-01 12:05 PM'],
    ['104', 'dela Cruz, Juan P.', '2026-07-01 01:00 PM'],
    ['104', 'dela Cruz, Juan P.', '2026-07-01 05:02 PM'],

    // Conflict Condition B: Collision - Hardware Slot Reassigned (ID Match, Name Mismatch)
    ['105', 'BAUTISTA, ALLAN M.', '2026-07-01 07:50 AM'],
    ['105', 'BAUTISTA, ALLAN M.', '2026-07-01 12:00 PM'],
    ['105', 'BAUTISTA, ALLAN M.', '2026-07-01 01:00 PM'],
    ['105', 'BAUTISTA, ALLAN M.', '2026-07-01 05:00 PM'],

    // Conflict Condition B: Name Match, ID Mismatch (RIZAL, JOSE P. on new AC-No 999)
    ['999', 'RIZAL, JOSE P.', '2026-07-01 07:40 AM'],
    ['999', 'RIZAL, JOSE P.', '2026-07-01 12:00 PM'],
    ['999', 'RIZAL, JOSE P.', '2026-07-01 01:00 PM'],
    ['999', 'RIZAL, JOSE P.', '2026-07-01 05:15 PM'],

    // Condition C: New Personnel Onboarding (Uncatalogued teacher detected)
    ['108', 'MENDOZA, KRISTINE JOY C.', '2026-07-01 07:35 AM'],
    ['108', 'MENDOZA, KRISTINE JOY C.', '2026-07-01 12:00 PM'],
    ['108', 'MENDOZA, KRISTINE JOY C.', '2026-07-01 01:00 PM'],
    ['108', 'MENDOZA, KRISTINE JOY C.', '2026-07-01 04:35 PM']
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Smart_Merge_Biometrics');
  XLSX.writeFile(wb, 'Smart_Merge_Biometric_Test_Data.xlsx');
}
