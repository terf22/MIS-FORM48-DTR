// Salary Schedule Tranche Manager for DepEd / Civil Service Personnel
// Supports 2026 3rd Tranche, Historical SSL Tranches (2024, 2023, 2020), Custom Uploaded Tranches, and Direct Table Cell Editing.

export interface SalaryTrancheSchedule {
  id: string; // e.g. '2026-3rd-tranche', '2024-1st-tranche', 'custom-2022'
  name: string; // e.g. '2026 3rd Tranche (Effective Jan 1, 2026)'
  effectiveYear: number;
  description: string;
  matrix: Record<number, Record<number, number>>; // SG (1..33) -> Step (1..8) -> Amount
  isCustom?: boolean;
}

export const DEMO_2026_MATRIX: Record<number, Record<number, number>> = {
  1:  { 1: 14634, 2: 14730, 3: 14849, 4: 14968, 5: 15089, 6: 15211, 7: 15333, 8: 15456 },
  2:  { 1: 15522, 2: 15636, 3: 15752, 4: 15869, 5: 15986, 6: 16103, 7: 16223, 8: 16342 },
  3:  { 1: 16486, 2: 16610, 3: 16732, 4: 16856, 5: 16982, 6: 17106, 7: 17234, 8: 17360 },
  4:  { 1: 17506, 2: 17636, 3: 17767, 4: 17898, 5: 18031, 6: 18163, 7: 18298, 8: 18433 },
  5:  { 1: 18581, 2: 18720, 3: 18858, 4: 18998, 5: 19137, 6: 19280, 7: 19423, 8: 19565 },
  6:  { 1: 19716, 2: 19862, 3: 20009, 4: 20158, 5: 20307, 6: 20456, 7: 20609, 8: 20761 },
  7:  { 1: 20914, 2: 21069, 3: 21224, 4: 21382, 5: 21539, 6: 21699, 7: 21859, 8: 22022 },
  8:  { 1: 22423, 2: 22627, 3: 22832, 4: 23038, 5: 23246, 6: 23456, 7: 23668, 8: 23883 },
  9:  { 1: 24329, 2: 24523, 3: 24720, 4: 24917, 5: 25117, 6: 25318, 7: 25521, 8: 25725 },
  10: { 1: 26917, 2: 27131, 3: 27347, 4: 27565, 5: 27786, 6: 28007, 7: 28230, 8: 28456 },
  11: { 1: 31705, 2: 31820, 3: 32109, 4: 32401, 5: 32697, 6: 32998, 7: 33302, 8: 33611 },
  12: { 1: 33947, 2: 34069, 3: 34357, 4: 34648, 5: 34943, 6: 35242, 7: 35544, 8: 35850 },
  13: { 1: 36125, 2: 36283, 3: 36599, 4: 36919, 5: 37244, 6: 37572, 7: 37904, 8: 38241 },
  14: { 1: 38764, 2: 39141, 3: 39523, 4: 39910, 5: 40300, 6: 40696, 7: 41097, 8: 41503 },
  15: { 1: 42178, 2: 42594, 3: 43015, 4: 43442, 5: 43874, 6: 44310, 7: 44753, 8: 45202 },
  16: { 1: 45694, 2: 46152, 3: 46615, 4: 47084, 5: 47559, 6: 48040, 7: 48528, 8: 49020 },
  17: { 1: 49562, 2: 50066, 3: 50576, 4: 51092, 5: 51614, 6: 52144, 7: 52678, 8: 53221 },
  18: { 1: 53818, 2: 54371, 3: 54933, 4: 55499, 5: 56075, 6: 56657, 7: 57246, 8: 57842 },
  19: { 1: 59153, 2: 59966, 3: 60793, 4: 61632, 5: 62486, 6: 63353, 7: 64236, 8: 65132 },
  20: { 1: 66052, 2: 66970, 3: 67904, 4: 68853, 5: 69818, 6: 70772, 7: 71727, 8: 72671 },
  21: { 1: 73303, 2: 74337, 3: 75388, 4: 76456, 5: 77542, 6: 78645, 7: 79692, 8: 80831 },
  22: { 1: 81796, 2: 82963, 3: 84151, 4: 85356, 5: 86582, 6: 87746, 7: 89011, 8: 90295 },
  23: { 1: 91306, 2: 92622, 3: 93962, 4: 95330, 5: 96823, 6: 98341, 7: 99883, 8: 101318 },
  24: { 1: 102603, 2: 104209, 3: 105841, 4: 107500, 5: 109185, 6: 110898, 7: 112533, 8: 114301 },
  25: { 1: 116643, 2: 118469, 3: 120326, 4: 122212, 5: 124131, 6: 126079, 7: 128061, 8: 130073 },
  26: { 1: 131807, 2: 133870, 3: 135968, 4: 138100, 5: 140268, 6: 142469, 7: 144707, 8: 146983 },
  27: { 1: 148940, 2: 151273, 3: 153644, 4: 155906, 5: 158353, 6: 160235, 7: 162752, 8: 165310 },
  28: { 1: 167129, 2: 169752, 3: 172418, 4: 174797, 5: 177545, 6: 180339, 7: 182660, 8: 185537 },
  29: { 1: 187531, 2: 190482, 3: 193480, 4: 196528, 5: 199624, 6: 202005, 7: 205191, 8: 208430 },
  30: { 1: 210718, 2: 214038, 3: 217207, 4: 220425, 5: 223691, 6: 227224, 7: 230595, 8: 234240 },
  31: { 1: 300961, 2: 306691, 3: 312532, 4: 318182, 5: 323938, 6: 329989, 7: 336092, 8: 342310 },
  32: { 1: 356237, 2: 363257, 3: 370418, 4: 377359, 5: 384805, 6: 392400, 7: 400150, 8: 408055 },
  33: { 1: 449157, 2: 462329, 3: 462329, 4: 462329, 5: 462329, 6: 462329, 7: 462329, 8: 462329 },
};

/**
 * Creates an empty baseline matrix (1 to 33 SGs, 1 to 8 Steps with 0 amount)
 */
export function createEmptyMatrix(baseAmount: number = 0): Record<number, Record<number, number>> {
  const matrix: Record<number, Record<number, number>> = {};
  for (let sg = 1; sg <= 33; sg++) {
    matrix[sg] = {};
    for (let st = 1; st <= 8; st++) {
      matrix[sg][st] = baseAmount;
    }
  }
  return matrix;
}

export const DEFAULT_2026_MATRIX: Record<number, Record<number, number>> = createEmptyMatrix(0);

export const DEFAULT_TRANCHES: SalaryTrancheSchedule[] = [
  {
    id: 'salary-schedule-2026',
    name: 'Salary Schedule Matrix',
    effectiveYear: 2026,
    description: 'Salary Schedule Matrix (SG 1 - SG 33)',
    matrix: createEmptyMatrix(0)
  }
];

export const DEMO_TRANCHES: SalaryTrancheSchedule[] = [
  {
    id: '2026-3rd-tranche',
    name: '2026 3rd Tranche Monthly Salary Schedule',
    effectiveYear: 2026,
    description: 'Official DBM National Salary Schedule effective Jan 1, 2026',
    matrix: DEMO_2026_MATRIX
  }
];

const LOCAL_STORAGE_KEY = 'DEPED_SALARY_TRANCHES_V2';

export function loadAllTranches(): SalaryTrancheSchedule[] {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load salary tranches from localStorage:', err);
  }
  return DEFAULT_TRANCHES;
}

export function saveAllTranches(tranches: SalaryTrancheSchedule[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tranches));
  } catch (err) {
    console.error('Failed to save salary tranches to localStorage:', err);
  }
}

/**
 * Returns exact monthly salary in Pesos for a given Salary Grade (1..33) and Step (1..8)
 * for a specified tranche schedule or fallback to 2026 default.
 */
export function getSalaryForSGAndStep(
  salaryGrade: number,
  step: number,
  trancheId?: string
): number {
  const tranches = loadAllTranches();
  const targetTranche = tranches.find((t) => t.id === trancheId) || tranches[0] || DEFAULT_TRANCHES[0];

  const sg = Math.min(Math.max(1, salaryGrade || 11), 33);
  const st = Math.min(Math.max(1, step || 1), 8);

  const sgRow = targetTranche?.matrix?.[sg];
  if (sgRow && sgRow[st] !== undefined) {
    return sgRow[st];
  }

  return 0;
}

/**
 * Update a specific cell (SG + Step) in a target Tranche Schedule
 */
export function updateTrancheCellAmount(
  trancheId: string,
  salaryGrade: number,
  step: number,
  newAmount: number
): SalaryTrancheSchedule[] {
  const tranches = loadAllTranches();
  const updated = tranches.map((t) => {
    if (t.id !== trancheId) return t;
    const newMatrix = { ...t.matrix };
    if (!newMatrix[salaryGrade]) {
      newMatrix[salaryGrade] = {};
    }
    newMatrix[salaryGrade] = {
      ...newMatrix[salaryGrade],
      [step]: Math.max(0, Math.round(newAmount))
    };
    return { ...t, matrix: newMatrix };
  });

  saveAllTranches(updated);
  return updated;
}

/**
 * Determines default Salary Grade based on DepEd / Civil Service Position Title
 */
export function getSGForPosition(positionTitle: string): number {
  const p = (positionTitle || '').toLowerCase();

  if (p.includes('teacher i') && !p.includes('ii') && !p.includes('iii') && !p.includes('master')) return 11;
  if (p.includes('teacher ii') && !p.includes('iii') && !p.includes('master')) return 12;
  if (p.includes('teacher iii') && !p.includes('master')) return 13;
  if (p.includes('master teacher i') && !p.includes('ii') && !p.includes('iii')) return 18;
  if (p.includes('master teacher ii') && !p.includes('iii')) return 19;
  if (p.includes('master teacher iii')) return 20;
  if (p.includes('master teacher iv')) return 21;

  if (p.includes('head teacher i') && !p.includes('ii') && !p.includes('iii')) return 14;
  if (p.includes('head teacher ii') && !p.includes('iii')) return 15;
  if (p.includes('head teacher iii')) return 16;
  if (p.includes('head teacher iv')) return 17;
  if (p.includes('head teacher v') && !p.includes('vi')) return 18;
  if (p.includes('head teacher vi')) return 19;

  if (p.includes('principal i') && !p.includes('ii') && !p.includes('iii')) return 19;
  if (p.includes('principal ii') && !p.includes('iii')) return 20;
  if (p.includes('principal iii') && !p.includes('iv')) return 21;
  if (p.includes('principal iv')) return 22;

  if (p.includes('assistant principal i')) return 18;
  if (p.includes('assistant principal ii')) return 19;

  if (p.includes('administrative officer v')) return 18;
  if (p.includes('administrative officer iv')) return 15;
  if (p.includes('administrative officer iii')) return 14;
  if (p.includes('administrative officer ii')) return 11;
  if (p.includes('administrative officer i')) return 10;

  if (p.includes('administrative assistant iii')) return 9;
  if (p.includes('administrative assistant ii')) return 8;
  if (p.includes('administrative assistant i')) return 7;

  if (p.includes('administrative aide vi')) return 6;
  if (p.includes('administrative aide v')) return 5;
  if (p.includes('administrative aide iv')) return 4;
  if (p.includes('administrative aide iii')) return 3;
  if (p.includes('administrative aide ii')) return 2;
  if (p.includes('administrative aide i')) return 1;

  if (p.includes('nurse')) return 15;
  if (p.includes('guidance counselor iii')) return 13;
  if (p.includes('guidance counselor ii')) return 12;
  if (p.includes('guidance counselor')) return 11;

  return 11; // Default
}

/**
 * Calculates detailed salary schedule stats
 */
export function getSalaryScheduleDetails(
  salaryGrade: number,
  currentStep: number,
  trancheId?: string
) {
  const sg = Math.min(Math.max(1, salaryGrade || 11), 33);
  const step = Math.min(Math.max(1, currentStep || 1), 8);
  const nextStep = Math.min(8, step + 1);
  const prevStep = Math.max(1, step - 1);

  const currentBasicSalary = getSalaryForSGAndStep(sg, step, trancheId);
  const previousBasicSalary = getSalaryForSGAndStep(sg, prevStep, trancheId);
  const nextBasicSalary = getSalaryForSGAndStep(sg, nextStep, trancheId);

  const incrementAmount = nextStep > step ? Number((nextBasicSalary - currentBasicSalary).toFixed(2)) : 0;

  return {
    salaryGrade: sg,
    currentStep: step,
    nextStep,
    prevStep,
    currentBasicSalary,
    previousBasicSalary,
    nextBasicSalary,
    incrementAmount
  };
}

/**
 * Utility to format Philippine Pesos
 */
export function formatSalaryPesos(amount: number): string {
  return `₱${(amount || 0).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
