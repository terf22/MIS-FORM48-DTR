import { Personnel, StepIncrementTrackingData } from '../types';
import {
  getSalaryForSGAndStep,
  getSGForPosition,
  getSalaryScheduleDetails,
  formatSalaryPesos
} from '../data/salaryMatrix2026';

export interface StepIncrementCalcInput {
  employeeNumber: string;
  fullName: string;
  itemNumber: string;
  effectiveStartDate: string; // YYYY-MM-DD
  lastEventType: 'STEP_INCREMENT' | 'PROMOTION' | 'RECLASSIFICATION';
  maternityLeaveDays: number; // default 105 if leave taken under RA 11210
  currentStep?: number; // 1 to 8
  referenceDate?: string; // default today YYYY-MM-DD
}

export interface StepIncrementResult {
  employee_number: string;
  full_name: string;
  item_number: string;
  step_increment_tracking: {
    effective_start_date: string;
    last_event_type: 'STEP_INCREMENT' | 'PROMOTION' | 'RECLASSIFICATION';
    maternity_leave_adjustments_days: number;
    base_due_date: string;
    adjusted_next_due_date: string;
    current_step: number;
    next_step: number;
    days_remaining: number;
    status: 'DUE NOW' | 'UPCOMING (60 DAYS)' | 'ON TRACK' | 'RESET APPLIED';
    notification_trigger: boolean;
  };
}

/**
 * Calculates Step Increment progress based on CSC / DBM / DepEd rules:
 * 1. Base 3-year cycle (1,095 days / 3 years)
 * 2. Reset on Promotion or Reclassification (timer resets to 0 from event date)
 * 3. Adjustment for RA 11210 Expanded Maternity Leave (+105 days per instance)
 */
export function calculateStepIncrement(input: StepIncrementCalcInput): StepIncrementResult {
  const refDateObj = input.referenceDate ? new Date(input.referenceDate) : new Date();
  const refDateStr = refDateObj.toISOString().split('T')[0];

  const startDateObj = new Date(input.effectiveStartDate);
  if (isNaN(startDateObj.getTime())) {
    // Fallback if invalid date
    const fallbackDate = '2023-01-01';
    return calculateStepIncrement({ ...input, effectiveStartDate: fallbackDate });
  }

  // 1. Calculate Base Due Date: Effective Start Date + 3 Years
  const baseDueDateObj = new Date(startDateObj);
  baseDueDateObj.setFullYear(baseDueDateObj.getFullYear() + 3);

  // 2. Add Maternity Leave Adjustment (RA 11210: +105 days per instance)
  const maternityDays = Math.max(0, input.maternityLeaveDays || 0);
  const adjustedDueDateObj = new Date(baseDueDateObj);
  if (maternityDays > 0) {
    adjustedDueDateObj.setDate(adjustedDueDateObj.getDate() + maternityDays);
  }

  const baseDueDateStr = baseDueDateObj.toISOString().split('T')[0];
  const adjustedNextDueDateStr = adjustedDueDateObj.toISOString().split('T')[0];

  // Calculate days remaining from reference date to adjusted next due date
  const diffTime = adjustedDueDateObj.getTime() - refDateObj.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Determine Status
  let status: 'DUE NOW' | 'UPCOMING (60 DAYS)' | 'ON TRACK' | 'RESET APPLIED' = 'ON TRACK';
  let notificationTrigger = false;

  if (daysRemaining <= 0) {
    status = 'DUE NOW';
    notificationTrigger = true;
  } else if (daysRemaining <= 60) {
    status = 'UPCOMING (60 DAYS)';
    notificationTrigger = true;
  } else if (input.lastEventType === 'PROMOTION' || input.lastEventType === 'RECLASSIFICATION') {
    // Check if the reset occurred recently (within the last 365 days)
    const daysSinceReset = Math.floor((refDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60 * 24));
    if (daysSinceReset >= 0 && daysSinceReset <= 365) {
      status = 'RESET APPLIED';
    } else {
      status = 'ON TRACK';
    }
  } else {
    status = 'ON TRACK';
  }

  const currentStep = input.currentStep || 1;
  const nextStep = Math.min(8, currentStep + 1);

  return {
    employee_number: input.employeeNumber,
    full_name: input.fullName,
    item_number: input.itemNumber,
    step_increment_tracking: {
      effective_start_date: input.effectiveStartDate,
      last_event_type: input.lastEventType,
      maternity_leave_adjustments_days: maternityDays,
      base_due_date: baseDueDateStr,
      adjusted_next_due_date: adjustedNextDueDateStr,
      current_step: currentStep,
      next_step: nextStep,
      days_remaining: daysRemaining,
      status,
      notification_trigger: notificationTrigger,
    },
  };
}

/**
 * Drafts an official DepEd / CSC Notice of Step Increment (NOSI) memo
 */
export function generateNOSIMemo(personnel: Personnel, stepResult: StepIncrementResult): string {
  const todayFormatted = new Date().toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const nextStep = stepResult.step_increment_tracking.next_step;
  const currentStep = stepResult.step_increment_tracking.current_step;
  const effectiveDate = new Date(stepResult.step_increment_tracking.adjusted_next_due_date).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate Next NOSI Date (3 years / 36 months from Effective Date of Adjustment)
  const effDateObj = new Date(stepResult.step_increment_tracking.adjusted_next_due_date);
  const nextNosiObj = new Date(effDateObj);
  nextNosiObj.setFullYear(nextNosiObj.getFullYear() + 3);
  const nextNosiDateFormatted = nextNosiObj.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sg = personnel.salaryGrade || getSGForPosition(personnel.positionTitle || personnel.title || '');
  const salDetails = getSalaryScheduleDetails(sg, currentStep);

  return `DEPARTMENT OF EDUCATION
Region Office / Schools Division Office
ADMINISTRATIVE SERVICES DIVISION - HRMO UNIT
FORM CODE: F-ADM-PER-025-0, 10/24/2020

NOTICE OF STEP INCREMENT DUE TO LENGTH OF SERVICE

Date: ${todayFormatted}

TO: ${personnel.fullName || personnel.name}
Position Title: ${personnel.positionTitle || personnel.title} (Salary Grade ${sg})
Item No.: ${personnel.itemNumber || 'OSEC-DECSB-TEACH1-2023'}
Station / School: ${personnel.districtOrSchool || personnel.departmentName || 'Division Office'}
Employee No.: ${personnel.employeeNumber || personnel.employeeId}

Sir / Madam:

Pursuant to Joint Civil Service Commission (CSC) and Department of Budget and Management Joint Circular No. 1 dated September 3, 2012, implementing item (4)(d) of Senate and House of Representatives Joint Resolution No. 4, s. 2009, approved on June 17, 2009, notice is hereby given that your salary step is adjusted under the 2026 3rd Tranche Salary Schedule as follows:

1. Present Step & Basic Salary: Salary Grade ${sg}, Step ${currentStep} (${formatSalaryPesos(salDetails.currentBasicSalary)}/mo)
2. New Step Increment & Adjusted Salary: Salary Grade ${sg}, Step ${nextStep} (${formatSalaryPesos(salDetails.nextBasicSalary)}/mo)
3. Monthly Differential / Increase: ${formatSalaryPesos(salDetails.incrementAmount)}
4. Effective Date of Step Increment: ${effectiveDate}
5. Next NOSI Due Date (+3 Years / 36 Months): ${nextNosiDateFormatted}
6. Reason for Adjustment: Completion of Three (3) Years Continuous Satisfactory Service ${stepResult.step_increment_tracking.maternity_leave_adjustments_days > 0 ? `(Adjusted +${stepResult.step_increment_tracking.maternity_leave_adjustments_days} days under RA 11210 Expanded Maternity Leave)` : ''}

This Step Increment is subject to post-audit by the Civil Service Commission and Department of Budget and Management (DBM).

Very truly yours,


ADMINISTRATIVE OFFICER / HRMO
Administrative Services Division

APPROVED:

MARIA FE L. CORPUS, CESO V
Schools Division Superintendent

Copy Furnished:
1. Employee's Service Record
2. GSIS BP No.: ${personnel.gsisBpNo || '2001928374'}
3. Personnel File / NOSI Records
4. DBM Regional Office`;
}

/**
 * Generates JSON structure for automated NOSI printing matching DepEd Division F-ADM-PER-025-0 specs
 */
export function generateNOSIExportJSON(personnel: Personnel, stepResult: StepIncrementResult) {
  const todayStr = new Date().toISOString().split('T')[0];
  const effDateStr = stepResult.step_increment_tracking.adjusted_next_due_date;
  
  // Calculate Next NOSI Date (exactly 3 years / 36 months from Effective Date of Adjustment)
  const effDateObj = new Date(effDateStr);
  const nextNosiObj = new Date(effDateObj);
  nextNosiObj.setFullYear(nextNosiObj.getFullYear() + 3);
  const nextNosiDueStr = nextNosiObj.toISOString().split('T')[0];

  // Determine Salary Grade and Step 2026 salaries
  const sg = personnel.salaryGrade || getSGForPosition(personnel.positionTitle || personnel.title || '');
  const currentStep = stepResult.step_increment_tracking.current_step;
  const nextStep = stepResult.step_increment_tracking.next_step;

  const salaryDetails = getSalaryScheduleDetails(sg, currentStep);
  const previousBasicSalary = salaryDetails.currentBasicSalary;
  const newBasicSalary = salaryDetails.nextBasicSalary;
  const incrementAmount = salaryDetails.incrementAmount;

  const lastName = personnel.lastName || (personnel.fullName || personnel.name || '').split(',')[0] || '';
  const fullName = personnel.fullName || personnel.name || '';

  return {
    document_title: "NOTICE OF STEP INCREMENT DUE TO LENGTH OF SERVICE",
    form_control_code: "F-ADM-PER-025-0, 10/24/2020",
    notice_date: todayStr,
    employee_details: {
      salutation: "Mr./Ms.",
      full_name: fullName,
      last_name: lastName,
      school_station: personnel.districtOrSchool || personnel.departmentName || "Division Office",
      division_office: "Schools Division Office - DepEd"
    },
    position_details: {
      position_title: personnel.positionTitle || personnel.title || "Teacher I",
      item_number: personnel.itemNumber || "OSEC-DECSB-T1-2024"
    },
    salary_adjustment: {
      effective_date: effDateStr,
      as_of_date: effDateStr,
      previous_sg: sg,
      previous_step: currentStep,
      previous_basic_salary: previousBasicSalary,
      step_increment_added: 1,
      increment_amount: incrementAmount,
      new_sg: sg,
      new_step: nextStep,
      new_basic_salary: newBasicSalary
    },
    signatories: {
      administrative_officer_v: "ADMINISTRATIVE OFFICER / HRMO",
      schools_division_superintendent: "MARIA FE L. CORPUS, CESO V"
    },
    next_nosi_due_date: nextNosiDueStr
  };
}

/**
 * Extracts 12-field personnel data from unformatted text or pasted documents
 */
export function extractPersonnelFromText(rawText: string): Partial<Personnel> {
  const lines = rawText.split('\n');
  const text = rawText.toLowerCase();

  const getFieldValue = (regex: RegExp): string => {
    const match = rawText.match(regex);
    return match && match[1] ? match[1].trim() : '';
  };

  const fullName = getFieldValue(/(?:full\s*name|name):\s*([^\n,]+)/i) || getFieldValue(/^([A-Z\s.,'-]{4,40})$/m);
  const lastName = getFieldValue(/(?:last\s*name|surname):\s*([^\n,]+)/i);
  const firstName = getFieldValue(/(?:first\s*name|given\s*name):\s*([^\n,]+)/i);
  const middleName = getFieldValue(/(?:middle\s*name):\s*([^\n,]+)/i);
  const positionTitle = getFieldValue(/(?:position|title|designation):\s*([^\n,]+)/i);
  const employeeNumber = getFieldValue(/(?:employee\s*(?:number|no|id)|emp\s*no):\s*([A-Z0-9-]+)/i);
  const itemNumber = getFieldValue(/(?:item\s*(?:number|no)|item):\s*([A-Z0-9-]+)/i);
  const tin = getFieldValue(/(?:tin|tax\s*id):\s*([\d-]+)/i);
  const dateOfBirth = getFieldValue(/(?:birth\s*date|date\s*of\s*birth|dob):\s*([0-9]{4}-[0-9]{2}-[0-9]{2}|[A-Za-z]+\s+\d{1,2},\s+\d{4})/i);
  const placeOfBirth = getFieldValue(/(?:birth\s*place|place\s*of\s*birth):\s*([^\n,]+)/i);
  const districtOrSchool = getFieldValue(/(?:school|district|station):\s*([^\n,]+)/i);
  const gsisBpNo = getFieldValue(/(?:gsis|gsis\s*bp|bp\s*no):\s*([A-Z0-9-]+)/i);

  // Construct combined full name if components available
  let computedFullName = fullName;
  if (!computedFullName && (lastName || firstName)) {
    computedFullName = `${lastName ? lastName + ', ' : ''}${firstName || ''} ${middleName || ''}`.trim();
  }

  return {
    fullName: computedFullName || 'UNEXTRACTED PERSONNEL NAME',
    lastName: lastName || (computedFullName ? computedFullName.split(',')[0] : ''),
    firstName: firstName || '',
    middleName: middleName || '',
    positionTitle: positionTitle || 'Teacher I',
    employeeNumber: employeeNumber || `EMP-${Math.floor(100000 + Math.random() * 900000)}`,
    itemNumber: itemNumber || 'OSEC-DECSB-T1-2024',
    tin: tin || '123-456-789-000',
    dateOfBirth: dateOfBirth || '1990-01-15',
    placeOfBirth: placeOfBirth || 'Manila',
    districtOrSchool: districtOrSchool || 'Main Division Campus',
    gsisBpNo: gsisBpNo || '2009876543',
  };
}
