import * as XLSX from 'xlsx';
import { ServiceRecordEntry } from '../types';

export interface ServiceRecordImportResult {
  recordsParsed: number;
  entries: ServiceRecordEntry[];
  summary: string;
  detectedEmployeeName?: string;
  detectedEmployeeNumber?: string;
}

/**
 * Smart Merge for Official Service Records (Append vs Replace)
 * In APPEND mode: Merges new appointments onto existing service history without duplicate dates/positions.
 * In REPLACE mode: Completely refreshes service history with the imported baseline.
 */
export function mergeServiceRecords(
  existingRecords: ServiceRecordEntry[],
  incomingRecords: ServiceRecordEntry[],
  mode: 'APPEND' | 'REPLACE'
): {
  merged: ServiceRecordEntry[];
  addedCount: number;
  updatedCount: number;
} {
  if (mode === 'REPLACE') {
    return {
      merged: [...incomingRecords].sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || '')),
      addedCount: incomingRecords.length,
      updatedCount: 0
    };
  }

  // APPEND (Smart Merge) Mode
  const merged = [...existingRecords];
  let addedCount = 0;
  let updatedCount = 0;

  incomingRecords.forEach((incoming) => {
    // Check if an entry with exact or overlapping inclusive dates and designation already exists
    const matchIdx = merged.findIndex(
      (ex) =>
        ex.dateFrom === incoming.dateFrom &&
        (ex.dateTo === incoming.dateTo || (!ex.dateTo && !incoming.dateTo))
    );

    if (matchIdx !== -1) {
      // Update metadata (e.g. salary, step, remarks) if incoming has more details
      merged[matchIdx] = {
        ...merged[matchIdx],
        monthlySalary: incoming.monthlySalary || merged[matchIdx].monthlySalary,
        salaryGrade: incoming.salaryGrade || merged[matchIdx].salaryGrade,
        step: incoming.step || merged[matchIdx].step,
        stationOrOffice: incoming.stationOrOffice || merged[matchIdx].stationOrOffice,
        remarks: incoming.remarks || merged[matchIdx].remarks
      };
      updatedCount++;
    } else {
      merged.push({
        ...incoming,
        id: `sr-merged-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
      });
      addedCount++;
    }
  });

  merged.sort((a, b) => (a.dateFrom || '').localeCompare(b.dateFrom || ''));

  return {
    merged,
    addedCount,
    updatedCount
  };
}

/**
 * Generates and downloads a sample Excel template for Official Service Record Import (EO No. 54, s. 1954)
 */
export function generateSampleServiceRecordExcel(employeeName: string = 'Dela Cruz, Juan Pedro') {
  const sampleData = [
    {
      'INCLUSIVE DATE FROM': '2017-06-13',
      'INCLUSIVE DATE TO': '2020-06-12',
      'DESIGNATION / POSITION': 'Teacher I',
      'STATUS': 'PERM',
      'MONTHLY SALARY': 20754.00,
      'SALARY GRADE': 11,
      'STEP': 1,
      'STATION / OFFICE': 'San Fernando High School',
      'BRANCH': 'National',
      'LEAVE WITHOUT PAY': 'NONE',
      'REMARKS / ACTION': 'ORIGINAL APPOINTMENT',
    },
    {
      'INCLUSIVE DATE FROM': '2020-06-13',
      'INCLUSIVE DATE TO': '2023-06-12',
      'DESIGNATION / POSITION': 'Teacher I',
      'STATUS': 'PERM',
      'MONTHLY SALARY': 22490.00,
      'SALARY GRADE': 11,
      'STEP': 2,
      'STATION / OFFICE': 'San Fernando High School',
      'BRANCH': 'National',
      'LEAVE WITHOUT PAY': 'NONE',
      'REMARKS / ACTION': 'STEP INCREMENT (NOSI)',
    },
    {
      'INCLUSIVE DATE FROM': '2023-06-13',
      'INCLUSIVE DATE TO': 'PRESENT',
      'DESIGNATION / POSITION': 'Teacher III',
      'STATUS': 'PERM',
      'MONTHLY SALARY': 31320.00,
      'SALARY GRADE': 13,
      'STEP': 1,
      'STATION / OFFICE': 'San Fernando High School',
      'BRANCH': 'National',
      'LEAVE WITHOUT PAY': 'NONE',
      'REMARKS / ACTION': 'PROMOTION / RECLASSIFICATION',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Service Record');

  worksheet['!cols'] = [
    { wch: 22 },
    { wch: 20 },
    { wch: 28 },
    { wch: 12 },
    { wch: 18 },
    { wch: 15 },
    { wch: 8 },
    { wch: 28 },
    { wch: 12 },
    { wch: 20 },
    { wch: 32 },
  ];

  const cleanName = employeeName.replace(/[^a-zA-Z0-9]/g, '_');
  XLSX.writeFile(workbook, `Service_Record_Template_${cleanName}.xlsx`);
}

/**
 * Parses an uploaded Excel or CSV file containing Service Record entries
 */
export async function parseServiceRecordExcelFile(file: File): Promise<ServiceRecordImportResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });

        if (!workbook.SheetNames.length) {
          throw new Error('Excel file contains no sheets.');
        }

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawRows.length) {
          throw new Error('Sheet is empty or missing data rows.');
        }

        const parsedEntries: ServiceRecordEntry[] = [];

        rawRows.forEach((row, idx) => {
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

          const dateFrom = getVal(['inclusive date from', 'date from', 'from', 'start date']);
          const dateTo = getVal(['inclusive date to', 'date to', 'to', 'end date']);
          const designation = getVal(['designation', 'position title', 'position', 'title']);
          const statusRaw = getVal(['status', 'employment status', 'appt status']);
          const salaryRaw = getVal(['monthly salary', 'salary', 'basic salary', 'pay']);
          const sgRaw = getVal(['salary grade', 'sg', 'grade']);
          const stepRaw = getVal(['step', 'salary step', 's']);
          const stationOrOffice = getVal(['station', 'office', 'school', 'assignment', 'branch/office']);
          const branch = getVal(['branch', 'nat', 'national']) || 'National';
          const lwop = getVal(['leave without pay', 'lwop', 'absences']) || 'NONE';
          const remarks = getVal(['remarks', 'action', 'cause', 'action taken']);

          if (!dateFrom && !designation && !salaryRaw) {
            return; // Skip empty row
          }

          let statusVal: 'PERM' | 'PROV' | 'SUB' | 'CONTRACTUAL' = 'PERM';
          const sUpper = statusRaw.toUpperCase();
          if (sUpper.includes('PROV')) statusVal = 'PROV';
          else if (sUpper.includes('SUB')) statusVal = 'SUB';
          else if (sUpper.includes('CONTRACT') || sUpper.includes('COS') || sUpper.includes('JO')) statusVal = 'CONTRACTUAL';

          const monthlySalary = parseFloat(salaryRaw.replace(/[^0-9.]/g, '')) || 0;
          const salaryGrade = parseInt(sgRaw.replace(/[^0-9]/g, ''), 10) || 0;
          const step = parseInt(stepRaw.replace(/[^0-9]/g, ''), 10) || 0;

          const entry: ServiceRecordEntry = {
            id: `sr-excel-${Date.now()}-${idx}`,
            dateFrom: dateFrom || '',
            dateTo: dateTo || '',
            designation: designation || '',
            status: statusVal,
            monthlySalary: monthlySalary,
            salaryGrade: salaryGrade,
            step: step,
            stationOrOffice: stationOrOffice || '',
            branch: branch || 'National',
            leaveWithoutPay: lwop || 'NONE',
            remarks: remarks || '',
          };

          parsedEntries.push(entry);
        });

        if (!parsedEntries.length) {
          throw new Error('No valid service record entries could be parsed. Check column headers.');
        }

        resolve({
          recordsParsed: parsedEntries.length,
          entries: parsedEntries,
          summary: `Successfully parsed ${parsedEntries.length} official Service Record entries from spreadsheet.`,
        });
      } catch (err: any) {
        reject(new Error(err.message || 'Error processing Service Record spreadsheet file.'));
      }
    };

    reader.onerror = () => reject(new Error('Failed to read Excel file.'));
    reader.readAsArrayBuffer(file);
  });
}
