import { ApprovalRequest, AuditLog, Department, MonthlyDTR, Personnel, RolePermission } from '../types';
import { getDaysInMonth, formatCSCTime } from '../utils/cscForm48';

export const INITIAL_DEPARTMENTS: Department[] = [];

export const INITIAL_PERSONNEL: Personnel[] = [];

export const DEMO_DEPARTMENTS: Department[] = [
  { id: 'dept-1', name: 'Elementary Department', code: 'ELEM', headName: 'School Head / In-Charge', headTitle: 'School Principal IV' },
  { id: 'dept-2', name: 'Junior High School Department', code: 'JHS', headName: 'Department Head', headTitle: 'Head Teacher VI' },
  { id: 'dept-3', name: 'Senior High School Track', code: 'SHS', headName: 'Assistant Principal', headTitle: 'Assistant Principal' },
  { id: 'dept-4', name: 'Administrative & Non-Teaching Unit', code: 'ADMIN', headName: 'Administrative Officer', headTitle: 'Administrative Officer II' },
];

export const DEMO_PERSONNEL: Personnel[] = [
  {
    id: 'p-101',
    fullName: 'Maria Santos Cruz',
    lastName: 'Cruz',
    firstName: 'Maria',
    middleName: 'Santos',
    positionTitle: 'Master Teacher I',
    employeeNumber: 'EMP-2018-0412',
    itemNumber: 'OSEC-DECSB-MT1-2018-0012',
    tin: '234-567-890-001',
    dateOfBirth: '1985-05-14',
    placeOfBirth: 'Quezon City',
    districtOrSchool: 'Mangusu Integrated School',
    gsisBpNo: '2001849201',
    employeeId: 'EMP-2018-0412',
    name: 'Maria Santos Cruz',
    title: 'Master Teacher I',
    departmentId: 'dept-1',
    departmentName: 'Elementary Department',
    personnelType: 'teaching',
    status: 'permanent',
    role: 'teacher',
    email: 'maria.cruz@deped.gov.ph',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    regularSchedule: { amArrival: '07:30', amDeparture: '12:00', pmArrival: '13:00', pmDeparture: '16:30', saturdayHours: 'As required' },
    stepIncrementTracking: {
      currentStep: 3,
      effectiveStartDate: '2023-08-01',
      lastEventType: 'STEP_INCREMENT',
      maternityLeaveDays: 0,
      adjustedNextDueDate: '2026-08-01',
      status: 'DUE NOW',
      notificationTrigger: true,
    },
  },
  {
    id: 'p-102',
    fullName: 'Juan Dela Cruz',
    lastName: 'Dela Cruz',
    firstName: 'Juan',
    middleName: 'Perez',
    positionTitle: 'Teacher III',
    employeeNumber: 'EMP-2020-0198',
    itemNumber: 'OSEC-DECSB-T3-2020-0045',
    tin: '123-987-456-002',
    dateOfBirth: '1990-11-20',
    placeOfBirth: 'Manila',
    districtOrSchool: 'Mangusu Integrated School',
    gsisBpNo: '2009812734',
    employeeId: 'EMP-2020-0198',
    name: 'Juan Dela Cruz',
    title: 'Teacher III',
    departmentId: 'dept-2',
    departmentName: 'Junior High School Department',
    personnelType: 'teaching',
    status: 'permanent',
    role: 'teacher',
    email: 'juan.delacruz@deped.gov.ph',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    regularSchedule: { amArrival: '07:30', amDeparture: '12:00', pmArrival: '13:00', pmDeparture: '16:30', saturdayHours: 'As required' },
    stepIncrementTracking: {
      currentStep: 2,
      effectiveStartDate: '2023-09-15',
      lastEventType: 'STEP_INCREMENT',
      maternityLeaveDays: 0,
      adjustedNextDueDate: '2026-09-15',
      status: 'UPCOMING (60 DAYS)',
      notificationTrigger: true,
    },
  },
  {
    id: 'p-103',
    fullName: 'Ana Rosales Reyes',
    lastName: 'Reyes',
    firstName: 'Ana',
    middleName: 'Rosales',
    positionTitle: 'Administrative Officer II',
    employeeNumber: 'EMP-2022-0056',
    itemNumber: 'OSEC-DECSB-AO2-2022-0008',
    tin: '456-123-789-003',
    dateOfBirth: '1993-03-08',
    placeOfBirth: 'Pasig City',
    districtOrSchool: 'Mangusu Integrated School',
    gsisBpNo: '2003456128',
    employeeId: 'EMP-2022-0056',
    name: 'Ana Rosales Reyes',
    title: 'Administrative Officer II',
    departmentId: 'dept-4',
    departmentName: 'Administrative & Non-Teaching Unit',
    personnelType: 'non_teaching',
    status: 'permanent',
    role: 'admin',
    email: 'ana.reyes@deped.gov.ph',
    avatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
    regularSchedule: { amArrival: '08:00', amDeparture: '12:00', pmArrival: '13:00', pmDeparture: '17:00', saturdayHours: 'As required' },
    stepIncrementTracking: {
      currentStep: 1,
      effectiveStartDate: '2024-01-10',
      lastEventType: 'PROMOTION',
      maternityLeaveDays: 0,
      adjustedNextDueDate: '2027-01-10',
      status: 'ON TRACK',
      notificationTrigger: false,
    },
  },
  {
    id: 'p-104',
    fullName: 'Elena Magsaysay Tang',
    lastName: 'Tang',
    firstName: 'Elena',
    middleName: 'Magsaysay',
    positionTitle: 'Teacher II',
    employeeNumber: 'EMP-2019-0331',
    itemNumber: 'OSEC-DECSB-T2-2019-0089',
    tin: '789-456-123-004',
    dateOfBirth: '1988-08-25',
    placeOfBirth: 'Cebu City',
    districtOrSchool: 'Mangusu Integrated School',
    gsisBpNo: '2008765432',
    employeeId: 'EMP-2019-0331',
    name: 'Elena Magsaysay Tang',
    title: 'Teacher II',
    departmentId: 'dept-1',
    departmentName: 'Elementary Department',
    personnelType: 'teaching',
    status: 'permanent',
    role: 'teacher',
    email: 'elena.tang@deped.gov.ph',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
    regularSchedule: { amArrival: '07:30', amDeparture: '12:00', pmArrival: '13:00', pmDeparture: '16:30', saturdayHours: 'As required' },
    stepIncrementTracking: {
      currentStep: 2,
      effectiveStartDate: '2023-03-01',
      lastEventType: 'STEP_INCREMENT',
      maternityLeaveDays: 105, // RA 11210 Maternity Leave adjustment applied (+105 days)
      adjustedNextDueDate: '2026-06-14',
      status: 'ON TRACK',
      notificationTrigger: false,
    },
  },
  {
    id: 'p-105',
    fullName: 'Corazon Aquino Villanueva',
    lastName: 'Villanueva',
    firstName: 'Corazon',
    middleName: 'Aquino',
    positionTitle: 'Administrative Assistant III',
    employeeNumber: 'EMP-2025-0012',
    itemNumber: 'OSEC-DECSB-ADAS3-2025-0012',
    tin: '321-654-987-005',
    dateOfBirth: '1995-12-01',
    placeOfBirth: 'Davao City',
    districtOrSchool: 'Mangusu Integrated School',
    gsisBpNo: '2005432109',
    employeeId: 'EMP-2025-0012',
    name: 'Corazon Aquino Villanueva',
    title: 'Administrative Assistant III',
    departmentId: 'dept-4',
    departmentName: 'Administrative & Non-Teaching Unit',
    personnelType: 'non_teaching',
    status: 'permanent',
    role: 'non_teaching',
    email: 'corazon.villanueva@deped.gov.ph',
    avatarUrl: 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=150&auto=format&fit=crop&q=80',
    regularSchedule: { amArrival: '08:00', amDeparture: '12:00', pmArrival: '13:00', pmDeparture: '17:00', saturdayHours: 'As required' },
    stepIncrementTracking: {
      currentStep: 1,
      effectiveStartDate: '2025-06-01',
      lastEventType: 'RECLASSIFICATION',
      maternityLeaveDays: 0,
      adjustedNextDueDate: '2028-06-01',
      status: 'RESET APPLIED',
      notificationTrigger: false,
      lastReclassificationDate: '2025-06-01',
    },
  },
];

// Helper to construct a clean default DTR for a personnel record
export function generateDefaultDTR(personnel: Personnel, month = 7, year = 2026): MonthlyDTR {
  const daysCount = getDaysInMonth(month, year);
  const days = [];

  for (let d = 1; d <= daysCount; d++) {
    // Determine day of week
    const dateObj = new Date(year, month - 1, d);
    const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

    if (dayOfWeek === 0) {
      days.push({
        day: d,
        date: dateStr,
        amArrival: 'SUNDAY',
        amDeparture: '',
        pmArrival: '',
        pmDeparture: '',
        statusTag: 'SUNDAY' as const,
        lateMinutes: 0,
        undertimeMinutes: 0
      });
    } else if (dayOfWeek === 6) {
      days.push({
        day: d,
        date: dateStr,
        amArrival: 'SATURDAY',
        amDeparture: '',
        pmArrival: '',
        pmDeparture: '',
        statusTag: 'SATURDAY' as const,
        lateMinutes: 0,
        undertimeMinutes: 0
      });
    } else {
      days.push({
        day: d,
        date: dateStr,
        amArrival: '',
        amDeparture: '',
        pmArrival: '',
        pmDeparture: '',
        statusTag: 'REGULAR' as const,
        lateMinutes: 0,
        undertimeMinutes: 0
      });
    }
  }

  const officialHoursRegular = personnel.regularSchedule
    ? `${formatCSCTime(personnel.regularSchedule.amArrival)} AM - ${formatCSCTime(personnel.regularSchedule.amDeparture)} NN & ${formatCSCTime(personnel.regularSchedule.pmArrival)} PM - ${formatCSCTime(personnel.regularSchedule.pmDeparture)} PM`
    : personnel.personnelType === 'teaching'
    ? '7:30 AM - 12:00 NN & 1:00 PM - 4:30 PM'
    : '8:00 AM - 12:00 NN & 1:00 PM - 5:00 PM';

  return {
    id: `dtr-${personnel.id}-${year}-${month}`,
    personnelId: personnel.id,
    employeeName: personnel.name,
    employeeId: personnel.employeeId,
    departmentName: personnel.departmentName,
    personnelType: personnel.personnelType,
    month,
    year,
    officialHoursRegular,
    officialHoursSaturday: (personnel.regularSchedule?.saturdayHours && personnel.regularSchedule.saturdayHours.toLowerCase() !== 'off') ? personnel.regularSchedule.saturdayHours : 'As required',
    days,
    totalHoursWorked: 0,
    totalLateMinutes: 0,
    totalUndertimeMinutes: 0,
    isVerifiedByHead: false,
    verifiedBy: '',
    verifiedByTitle: 'In-Charge / Department Head',
    verifiedDate: '',
    certifiedByEmployee: false
  };
}

export const INITIAL_APPROVAL_REQUESTS: ApprovalRequest[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_ROLE_PERMISSIONS: RolePermission[] = [
  {
    role: 'admin',
    roleLabel: 'HR Admin & Oversight Manager',
    canViewAllDTR: true,
    canEditAnyDTR: true,
    canApproveRequests: true,
    canUploadBiometrics: true,
    canManageUsers: true,
    canAccessAuditLogs: true,
    canManageBackup: true
  },
  {
    role: 'dept_head',
    roleLabel: 'Department Head / School Principal',
    canViewAllDTR: true,
    canEditAnyDTR: false,
    canApproveRequests: true,
    canUploadBiometrics: true,
    canManageUsers: false,
    canAccessAuditLogs: false,
    canManageBackup: false
  },
  {
    role: 'teacher',
    roleLabel: 'Teaching Personnel (Teacher I - III / Master)',
    canViewAllDTR: false,
    canEditAnyDTR: false,
    canApproveRequests: false,
    canUploadBiometrics: false,
    canManageUsers: false,
    canAccessAuditLogs: false,
    canManageBackup: false
  },
  {
    role: 'non_teaching',
    roleLabel: 'Non-Teaching Staff & Administrative Support',
    canViewAllDTR: false,
    canEditAnyDTR: false,
    canApproveRequests: false,
    canUploadBiometrics: false,
    canManageUsers: false,
    canAccessAuditLogs: false,
    canManageBackup: false
  }
];
