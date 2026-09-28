import * as XLSX from 'xlsx';
import { Personnel, PersonnelType, EmploymentStatus, UserRole } from '../types';

export interface PersonnelImportResult {
  recordsParsed: number;
  personnelList: Personnel[];
  summary: string;
}

/**
 * Generates and downloads a sample Excel template for DepEd Personnel Master Data Import
 * with the 12 CSC/DepEd standard fields.
 */
export function generateSamplePersonnelExcel() {
  const sampleData = [
    {
      'FULL NAME': 'Dela Cruz, Juan Pedro',
      'LAST NAME': 'Dela Cruz',
      'FIRST NAME': 'Juan',
      'MIDDLE NAME': 'Pedro',
      'POSITION TITLE': 'Teacher III',
      'EMPLOYEE NUMBER': '6102845',
      'ITEM NUMBER / CURRENT POSITION': 'OSEC-DECSB-TCH3-571379-2015',
      'TIN': '294-810-332-000',
      'DATE OF BIRTH': '1988-05-14',
      'PLACE OF BIRTH': 'San Fernando, Pampanga',
      'DIST. / CURRENT SCHOOL': 'San Fernando High School',
      'GSIS BP NO.': '2001849201',
    },
    {
      'FULL NAME': 'Santos, Maria Clara',
      'LAST NAME': 'Santos',
      'FIRST NAME': 'Maria',
      'MIDDLE NAME': 'Clara',
      'POSITION TITLE': 'Master Teacher I',
      'EMPLOYEE NUMBER': '4920183',
      'ITEM NUMBER / CURRENT POSITION': 'OSEC-DECSB-MTCH1-884102-2018',
      'TIN': '102-948-571-000',
      'DATE OF BIRTH': '1984-11-20',
      'PLACE OF BIRTH': 'Malolos, Bulacan',
      'DIST. / CURRENT SCHOOL': 'Central Elementary School',
      'GSIS BP NO.': '2009384712',
    },
    {
      'FULL NAME': 'Reyes, Ricardo Jose',
      'LAST NAME': 'Reyes',
      'FIRST NAME': 'Ricardo',
      'MIDDLE NAME': 'Jose',
      'POSITION TITLE': 'Administrative Officer V',
      'EMPLOYEE NUMBER': '3849102',
      'ITEM NUMBER / CURRENT POSITION': 'OSEC-DECSB-AOV-102938-2020',
      'TIN': '381-029-482-000',
      'DATE OF BIRTH': '1980-03-08',
      'PLACE OF BIRTH': 'Angeles City',
      'DIST. / CURRENT SCHOOL': 'Division Office - SDO',
      'GSIS BP NO.': '2003810293',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Personnel Roster');

  // Auto-width columns
  worksheet['!cols'] = [
    { wch: 25 },
    { wch: 15 },
    { wch: 15 },
    { wch: 15 },
    { wch: 25 },
    { wch: 18 },
    { wch: 32 },
    { wch: 18 },
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 18 },
  ];

  XLSX.writeFile(workbook, 'DepEd_Personnel_Master_Import_Template.xlsx');
}

/**
 * Parses an uploaded Excel or CSV file containing personnel records.
 */
export async function parsePersonnelExcelFile(file: File): Promise<PersonnelImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        if (!workbook.SheetNames.length) {
          throw new Error('Excel workbook contains no sheets.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows.length) {
          throw new Error('Sheet appears to be empty or missing header rows.');
        }

        const parsedPersonnel: Personnel[] = [];

        rawRows.forEach((row, idx) => {
          // Normalize object keys
          const keys = Object.keys(row);
          const getVal = (possibleHeaders: string[]) => {
            for (const key of keys) {
              const cleanKey = key.trim().toLowerCase();
              for (const target of possibleHeaders) {
                if (cleanKey.includes(target.toLowerCase())) {
                  const val = row[key];
                  if (val !== undefined && val !== null) {
                    return String(val).trim();
                  }
                }
              }
            }
            return '';
          };

          const fullName = getVal(['full name', 'fullname', 'employee name', 'name', 'personnel name']);
          const lastName = getVal(['last name', 'surname', 'lastname']);
          const firstName = getVal(['first name', 'given name', 'firstname']);
          const middleName = getVal(['middle name', 'middlename']);
          const positionTitle = getVal(['position title', 'position', 'designation', 'title']);
          const employeeNumber = getVal(['employee number', 'employee no', 'emp no', 'employee id', 'id']);
          const itemNumber = getVal(['item number', 'item no', 'position item', 'item']);
          const tin = getVal(['tin', 'tax identification number', 'tax id']);
          const dateOfBirth = getVal(['date of birth', 'birth date', 'dob', 'birthday']);
          const placeOfBirth = getVal(['place of birth', 'birth place', 'pob']);
          const districtOrSchool = getVal(['dist', 'district', 'current school', 'school', 'station', 'dept']);
          const gsisBpNo = getVal(['gsis bp no', 'gsis bp', 'bp no', 'gsis']);

          // Skip completely empty rows
          if (!fullName && !lastName && !employeeNumber && !positionTitle) {
            return;
          }

          // Build unified full name if separated
          let computedFullName = fullName;
          if (!computedFullName && (lastName || firstName)) {
            computedFullName = `${lastName}${firstName ? ', ' + firstName : ''}${middleName ? ' ' + middleName : ''}`;
          }

          const empNo = employeeNumber || `EMP-${Date.now().toString().slice(-4)}-${idx + 1}`;
          const pos = positionTitle || 'Teacher I';

          // Classify teaching vs non-teaching
          const posLower = pos.toLowerCase();
          const isTeaching = posLower.includes('teacher') || posLower.includes('instructor') || posLower.includes('master');
          const pType: PersonnelType = isTeaching ? 'teaching' : 'non_teaching';
          const role: UserRole = isTeaching ? 'teacher' : 'non_teaching';

          const newPersonnel: Personnel = {
            id: `p-exp-${Date.now()}-${idx}`,
            fullName: computedFullName || (employeeNumber ? `Employee ${employeeNumber}` : `Personnel #${idx + 1}`),
            lastName: lastName || (computedFullName ? computedFullName.split(',')[0].trim() : ''),
            firstName: firstName || (computedFullName ? (computedFullName.split(',')[1] || '').trim() : ''),
            middleName: middleName || '',
            positionTitle: pos,
            employeeNumber: empNo,
            itemNumber: itemNumber || '',
            tin: tin || '',
            dateOfBirth: dateOfBirth || '',
            placeOfBirth: placeOfBirth || '',
            districtOrSchool: districtOrSchool || '',
            gsisBpNo: gsisBpNo || '',

            // Backward compatibility
            employeeId: empNo,
            name: computedFullName || (employeeNumber ? `Employee ${employeeNumber}` : `Personnel #${idx + 1}`),
            title: pos,
            departmentId: pType === 'teaching' ? 'dept-1' : 'dept-2',
            departmentName: districtOrSchool || (pType === 'teaching' ? 'Faculty & Academic Dept' : 'Administrative Services Division'),
            personnelType: pType,
            status: 'permanent' as EmploymentStatus,
            role: role,
            email: empNo ? `${empNo.toLowerCase().replace(/[^a-z0-9]/g, '')}@deped.gov.ph` : '',
            regularSchedule: {
              amArrival: pType === 'teaching' ? '07:30' : '08:00',
              amDeparture: '12:00',
              pmArrival: '13:00',
              pmDeparture: pType === 'teaching' ? '16:30' : '17:00',
              saturdayHours: 'As required',
            },
            stepIncrementTracking: {
              currentStep: 1,
              effectiveStartDate: '',
              lastEventType: 'STEP_INCREMENT',
              maternityLeaveDays: 0,
              adjustedNextDueDate: '',
              status: 'DUE NOW',
              notificationTrigger: false,
            },
          };

          parsedPersonnel.push(newPersonnel);
        });

        if (!parsedPersonnel.length) {
          throw new Error('No valid personnel records found in file. Please check column headers.');
        }

        resolve({
          recordsParsed: parsedPersonnel.length,
          personnelList: parsedPersonnel,
          summary: `Successfully extracted ${parsedPersonnel.length} personnel records with 12 DepEd/CSC fields.`,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Error processing personnel spreadsheet file.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read spreadsheet file.'));
    reader.readAsArrayBuffer(file);
  });
}
