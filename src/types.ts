export type ThemeMode = 'light' | 'dark';

export type NavTab = 
  | 'overview' 
  | 'patients' 
  | 'map' 
  | 'departments' 
  | 'doctors' 
  | 'history' 
  | 'settings';

export interface KpiMetric {
  id: string;
  title: string;
  value: string;
  unit?: string;
  iconType: 'bed' | 'staff' | 'cost' | 'cars';
  bgColorClass: string;
  darkBgColorClass: string;
  iconColorClass: string;
  change: string;
  isPositive: boolean;
}

export interface OutpatientInpatientData {
  month: string;
  inpatients: number;
  outpatients: number;
}

export interface GenderDistribution {
  gender: 'Female' | 'Male';
  count: number;
  percentage: number;
  color: string;
}

export interface AdmissionTimeData {
  time: string;
  count: number;
  isPeak?: boolean;
}

export interface DivisionStat {
  id: string;
  division: string;
  count: number;
  iconName: string;
  trend: 'up' | 'down' | 'stable';
  color: string;
}

export type UserRole = 'admin' | 'dept_head' | 'teacher' | 'non_teaching';
export type PersonnelType = 'teaching' | 'non_teaching' | 'teaching_related' | 'jo' | 'cos';
export type PositionDesignation = 'Teaching' | 'Non-Teaching' | 'Teaching-Related' | 'JO' | 'CoS';
export type EmploymentStatus = 'permanent' | 'provisionary' | 'contractual' | 'cos' | 'jo';
export type RequestType = 'TIME_ADJUSTMENT' | 'OFFICIAL_BUSINESS' | 'LEAVE_OF_ABSENCE';
export type LanguageCode = 'en' | 'fil' | 'ceb' | 'ilo';

export interface Department {
  id: string;
  name: string;
  code: string;
  headName: string;
  headTitle?: string;
}

export type DtrNavTab =
  | 'overview'
  | 'nosi'
  | 'salary-tranche'
  | 'personnel'
  | 'form48'
  | 'service-records'
  | 'excel'
  | 'settings';

export interface StepIncrementTrackingData {
  currentStep: number;
  effectiveStartDate: string; // YYYY-MM-DD
  lastEventType: 'STEP_INCREMENT' | 'PROMOTION' | 'RECLASSIFICATION';
  maternityLeaveDays: number; // e.g. 105 days for RA 11210
  adjustedNextDueDate: string; // YYYY-MM-DD
  status: 'DUE NOW' | 'UPCOMING (60 DAYS)' | 'ON TRACK' | 'RESET APPLIED';
  notificationTrigger: boolean;
  lastPromotionDate?: string;
  lastReclassificationDate?: string;
}

export interface Personnel {
  id: string;
  
  // 12 Required DepEd/CSC HR Personnel Fields
  fullName: string;
  lastName: string;
  firstName: string;
  middleName: string;
  positionTitle: string;
  positionDesignation?: PositionDesignation | string;
  employeeNumber: string;
  itemNumber: string;
  tin: string;
  dateOfBirth: string;
  placeOfBirth: string;
  districtOrSchool: string;
  gsisBpNo: string;

  // Backward Compatibility & System Aliases
  employeeId: string;
  name: string;
  title: string;
  departmentId: string;
  departmentName: string;
  personnelType: PersonnelType;
  status: EmploymentStatus;
  role: UserRole;
  email: string;
  avatarUrl?: string;
  regularSchedule: {
    amArrival: string;
    amDeparture: string;
    pmArrival: string;
    pmDeparture: string;
    saturdayHours?: string;
  };

  // 2026 Salary Tranche Grade & Step
  salaryGrade?: number;
  salaryStep?: number;
  monthlySalary?: number;

  // Step Increment Tracking Engine
  stepIncrementTracking?: StepIncrementTrackingData;

  // Service Records (Executive Order No. 54)
  serviceRecords?: ServiceRecordEntry[];
}

export interface DTRDayEntry {
  day: number;
  amArrival: string;
  amDeparture: string;
  pmArrival: string;
  pmDeparture: string;
  statusTag?: string;
  remarks?: string;
  lateMinutes: number;
  undertimeMinutes: number;
  isAdjusted?: boolean;
}

export interface MonthlyDTR {
  id: string;
  personnelId: string;
  employeeName: string;
  employeeId: string;
  departmentName: string;
  personnelType: PersonnelType;
  month: number;
  year: number;
  officialHoursRegular: string;
  officialHoursSaturday: string;
  days: DTRDayEntry[];
  totalHoursWorked: number;
  totalLateMinutes: number;
  totalUndertimeMinutes: number;
  isVerifiedByHead: boolean;
  verifiedBy?: string;
  verifiedByTitle?: string;
  verifiedDate?: string;
  certifiedByEmployee: boolean;
}

export interface ApprovalRequest {
  id: string;
  personnelId: string;
  personnelName: string;
  personnelType: PersonnelType;
  departmentName: string;
  requestType: RequestType;
  date: string;
  timeSlot?: string;
  requestedTime?: string;
  reason: string;
  attachmentName?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  reviewedBy?: string;
  reviewComment?: string;
  reviewedAt?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  action: string;
  category: 'SECURITY' | 'EXCEL_IMPORT' | 'DTR_EDIT' | 'APPROVAL' | 'BACKUP' | 'SYSTEM';
  details: string;
  ipAddress: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface UploadedFileRecord {
  id: string;
  fileName: string;
  uploadedAt: string;
  recordsCount: number;
  month: number;
  year: number;
  fileType: string;
  fileSizeKB?: number;
  summary: string;
}

export interface RolePermission {
  role: UserRole;
  roleLabel: string;
  canViewAllDTR: boolean;
  canEditAnyDTR: boolean;
  canApproveRequests: boolean;
  canUploadBiometrics: boolean;
  canManageUsers: boolean;
  canAccessAuditLogs: boolean;
  canManageBackup: boolean;
}

export interface ServiceRecordEntry {
  id: string;
  dateFrom: string;
  dateTo: string;
  designation: string;
  status: 'PERM' | 'PROV' | 'SUB' | 'CONTRACTUAL';
  monthlySalary: number;
  salaryGrade: number;
  step: number;
  stationOrOffice: string;
  branch: string;
  leaveWithoutPay?: string;
  separationDateOrCause?: string;
  remarks: string;
}

// ==========================================
// SMART MERGE & ATTENDANCE RECONCILIATION
// ==========================================
export type SmartMergeConflictType = 'ID_MATCH_NAME_MISMATCH' | 'NAME_MATCH_ID_MISMATCH';
export type ConflictResolutionChoice = 'MERGE_EXISTING' | 'CREATE_SEPARATE' | 'SKIP';

export interface ParsedPhilippineName {
  firstName: string;
  middleInitial: string;
  lastName: string;
  formattedFullName: string;
  raw: string;
}

export interface SafeMergeRecord {
  terminalAcNo: string;
  rawTerminalName: string;
  personnel: Personnel;
  logs: DTRDayEntry[];
  daysCount: number;
  manuallyVerifiedDaysPreserved: number;
  nameSimilarityScore: number;
}

export interface SmartMergeConflict {
  id: string;
  conflictType: SmartMergeConflictType;
  terminalAcNo: string;
  rawTerminalName: string;
  parsedName: ParsedPhilippineName;
  matchedPersonnel: Personnel;
  nameSimilarityScore: number;
  conflictDescription: string;
  logs: DTRDayEntry[];
  resolution?: ConflictResolutionChoice;
  resolvedPersonnelId?: string;
  createdSeparatePersonnel?: Partial<Personnel>;
}

export interface NewPersonnelCandidate {
  tempId: string;
  terminalAcNo: string;
  rawTerminalName: string;
  firstName: string;
  middleInitial: string;
  lastName: string;
  fullName: string;
  positionTitle: string;
  departmentName: string;
  itemNumber?: string;
  tin?: string;
  logs: DTRDayEntry[];
  daysCount: number;
  selected: boolean;
}

export interface SmartMergeAnalysis {
  safeAutoMerges: SafeMergeRecord[];
  conflicts: SmartMergeConflict[];
  newPersonnel: NewPersonnelCandidate[];
  totalRecords: number;
  detectedMonth: number;
  detectedYear: number;
  fileName: string;
}


