import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { PersonnelProfileView } from './components/PersonnelProfileView';
import { CSCForm48View } from './components/CSCForm48View';
import { ExcelUploader } from './components/ExcelUploader';
import { AddPersonnelModal } from './components/AddPersonnelModal';
import { CloudBackupModal } from './components/CloudBackupModal';
import { calculateDayTimeLoss } from './utils/cscForm48';
import { executeSmartMergeApplication } from './utils/smartMergeEngine';
import {
  INITIAL_PERSONNEL,
  INITIAL_DEPARTMENTS,
  INITIAL_AUDIT_LOGS,
  DEMO_PERSONNEL,
  DEMO_DEPARTMENTS,
  generateDefaultDTR
} from './data/mockData';
import {
  Personnel,
  Department,
  MonthlyDTR,
  AuditLog,
  UploadedFileRecord,
  DTRDayEntry,
  ThemeMode,
  UserRole,
  LanguageCode,
  DtrNavTab,
  SmartMergeAnalysis,
  ConflictResolutionChoice
} from './types';
import {
  Users,
  Search,
  Plus,
  ChevronRight,
  ShieldCheck,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  Settings,
  Sun,
  Moon,
  Database,
  Award,
  Trash2
} from 'lucide-react';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme_mode') as ThemeMode;
      if (savedTheme === 'dark' || savedTheme === 'light') return savedTheme;
    }
    return 'light';
  });
  const [activeTab, setActiveTab] = useState<DtrNavTab>('personnel');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [personnelList, setPersonnelList] = useState<Personnel[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deped_dtr_personnel_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            return parsed.map((p) => ({
              ...p,
              employeeId: p.employeeId ? p.employeeId.replace(/^EMP-(\d+)$/i, '$1') : p.employeeId
            }));
          }
        } catch (e) {
          console.error('Failed reading saved personnel list:', e);
        }
      }
    }
    return [];
  });

  const [departments, setDepartments] = useState<Department[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deped_dtr_departments');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed reading saved departments:', e);
        }
      }
    }
    return [];
  });

  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deped_dtr_personnel_list');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const first = parsed[0];
            return {
              ...first,
              employeeId: first.employeeId ? first.employeeId.replace(/^EMP-(\d+)$/i, '$1') : first.employeeId
            };
          }
        } catch (e) {
          // fallback
        }
      }
    }
    return null;
  });

  const [dtrMap, setDtrMap] = useState<Record<string, MonthlyDTR>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deped_dtr_map');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {
          console.error('Failed reading saved DTR map:', e);
        }
      }
    }
    return {};
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deped_dtr_uploaded_files');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        } catch (e) {
          console.error('Failed reading saved uploaded files:', e);
        }
      }
    }
    return [];
  });
  const [isAddPersonnelOpen, setIsAddPersonnelOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<number>(7);
  const [selectedYear, setSelectedYear] = useState<number>(2026);

  const [currentRole] = useState<UserRole>('admin');
  const [lang] = useState<LanguageCode>('en');

  // Auto-select valid personnel when list changes or gets wiped
  useEffect(() => {
    if (personnelList.length === 0) {
      if (selectedPersonnel !== null) {
        setSelectedPersonnel(null);
      }
    } else if (!selectedPersonnel || !personnelList.some((p) => p.id === selectedPersonnel.id)) {
      setSelectedPersonnel(personnelList[0]);
    }
  }, [personnelList]);

  // Sync theme class to HTML document root & body
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme_mode', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme_mode', 'light');
    }
  }, [theme]);

  // Persistent local storage auto-save effect for all application data
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('deped_dtr_personnel_list', JSON.stringify(personnelList));
        localStorage.setItem('deped_dtr_departments', JSON.stringify(departments));
        localStorage.setItem('deped_dtr_map', JSON.stringify(dtrMap));
        localStorage.setItem('deped_dtr_audit_logs', JSON.stringify(auditLogs));
        localStorage.setItem('deped_dtr_uploaded_files', JSON.stringify(uploadedFiles));
        localStorage.setItem('deped_dtr_last_saved', new Date().toISOString());
      } catch (err) {
        console.error('Error saving to local storage:', err);
      }
    }
  }, [personnelList, departments, dtrMap, auditLogs, uploadedFiles]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleExportToLocalDrive = () => {
    const dataSnapshot = {
      version: '1.0.0',
      appName: 'Mangusu Integrated School CSC Form 48 DTR Management System',
      exportedAt: new Date().toISOString(),
      personnelList,
      departments,
      dtrMap,
      auditLogs,
      uploadedFiles
    };

    const jsonStr = JSON.stringify(dataSnapshot, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `Mangusu_IS_CSC_Form48_Backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    handleLogAudit(
      'LOCAL_DRIVE_EXPORT',
      'BACKUP',
      'Saved complete database backup file directly to local computer drive (.json).'
    );
  };

  const handleImportFromLocalDrive = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (parsed.personnelList && parsed.dtrMap) {
          setPersonnelList(parsed.personnelList);
          if (parsed.departments) setDepartments(parsed.departments);
          setDtrMap(parsed.dtrMap);
          if (parsed.auditLogs) setAuditLogs(parsed.auditLogs);
          if (parsed.uploadedFiles) setUploadedFiles(parsed.uploadedFiles);

          if (parsed.personnelList.length > 0) {
            setSelectedPersonnel(parsed.personnelList[0]);
          }

          handleLogAudit(
            'LOCAL_DRIVE_RESTORE',
            'BACKUP',
            `Restored database snapshot from local drive backup file "${file.name}".`
          );
          alert(`Successfully restored ${parsed.personnelList.length} personnel and attendance records from "${file.name}". All data saved to local drive.`);
        } else {
          alert('Invalid backup file structure.');
        }
      } catch (err: any) {
        alert('Failed to parse local backup file.');
      }
    };
    reader.readAsText(file);
  };

  const handleWipeAllData = () => {
    try {
      setPersonnelList([]);
      setDepartments([]);
      setDtrMap({});
      setAuditLogs([]);
      setUploadedFiles([]);
      setSelectedPersonnel(null);

      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('deped_dtr_') || key === 'DEPED_SALARY_TRANCHES_V2') {
            localStorage.removeItem(key);
          }
        });

        localStorage.setItem('deped_dtr_personnel_list', JSON.stringify([]));
        localStorage.setItem('deped_dtr_departments', JSON.stringify([]));
        localStorage.setItem('deped_dtr_map', JSON.stringify({}));
        localStorage.setItem('deped_dtr_audit_logs', JSON.stringify([]));
        localStorage.setItem('deped_dtr_uploaded_files', JSON.stringify([]));
        localStorage.setItem('deped_dtr_last_saved', new Date().toISOString());
      }

      alert('All system data (including personnel, DTR logs, uploaded files, audit logs, and custom salary tranches) has been completely wiped. The system is now 100% blank.');
    } catch (err) {
      console.error('Error wiping all data:', err);
      alert('Failed to clear all data.');
    }
  };

  const handleResetLocalData = () => {
    try {
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('deped_dtr_')) {
            localStorage.removeItem(key);
          }
        });

        localStorage.setItem('deped_dtr_personnel_list', JSON.stringify([]));
        localStorage.setItem('deped_dtr_departments', JSON.stringify([]));
        localStorage.setItem('deped_dtr_map', JSON.stringify({}));
        localStorage.setItem('deped_dtr_audit_logs', JSON.stringify([]));
        localStorage.setItem('deped_dtr_uploaded_files', JSON.stringify([]));
        localStorage.setItem('deped_dtr_last_saved', new Date().toISOString());
      }

      setPersonnelList([]);
      setDepartments([]);
      setAuditLogs([]);
      setUploadedFiles([]);
      setDtrMap({});
      setSelectedPersonnel(null);

      handleLogAudit('RESET_LOCAL_DATA', 'SYSTEM', 'Reset all local storage records to default blank state.');
      alert('Local storage data has been successfully reset to default blank state.');
    } catch (err) {
      console.error('Error resetting local data:', err);
      alert('Failed to reset local data.');
    }
  };

  const handleLoadDemoData = () => {
    setPersonnelList(DEMO_PERSONNEL);
    setDepartments(DEMO_DEPARTMENTS);
    if (DEMO_PERSONNEL.length > 0) {
      setSelectedPersonnel(DEMO_PERSONNEL[0]);
    }
    handleLogAudit('LOAD_DEMO_DATA', 'SYSTEM', 'Loaded sample demo personnel roster and department structure.');
    alert('Loaded sample demo personnel and department roster.');
  };

  const handleApplyImportedLogs = (
    personnelLogsMap: Record<string, DTRDayEntry[]>,
    personnelNameMap: Record<string, string>,
    fileName: string,
    targetMonth: number = 7,
    targetYear: number = 2026
  ) => {
    let updatedPersonnelList = [...personnelList];
    let updatedDtrMap = { ...dtrMap };
    let totalRecordsApplied = 0;

    Object.entries(personnelLogsMap).forEach(([empIdOrKey, logs]) => {
      let person = updatedPersonnelList.find(
        (p) =>
          p.employeeId.toLowerCase() === empIdOrKey.toLowerCase() ||
          p.employeeId.replace(/^EMP-/i, '').toLowerCase() === empIdOrKey.toLowerCase() ||
          p.name.toLowerCase() === empIdOrKey.toLowerCase() ||
          (personnelNameMap[empIdOrKey] && p.name.toLowerCase() === personnelNameMap[empIdOrKey].toLowerCase())
      );

      const cleanName = personnelNameMap[empIdOrKey] || empIdOrKey;

      if (!person) {
        const lName = cleanName.includes(',') ? cleanName.split(',')[0].trim() : '';
        const fName = cleanName.includes(',') ? (cleanName.split(',')[1] || '').trim() : cleanName;
        person = {
          id: `p-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          employeeId: empIdOrKey,
          employeeNumber: empIdOrKey,
          name: cleanName,
          fullName: cleanName,
          lastName: lName,
          firstName: fName,
          middleName: '',
          positionTitle: 'Teaching / Staff',
          title: 'Teaching / Staff',
          itemNumber: '',
          tin: '',
          dateOfBirth: '',
          placeOfBirth: '',
          districtOrSchool: departments[0]?.name || '',
          gsisBpNo: '',
          departmentId: departments[0]?.id || 'dept-1',
          departmentName: departments[0]?.name || '',
          personnelType: 'teaching',
          status: 'permanent',
          role: 'teacher',
          email: '',
          regularSchedule: {
            amArrival: '07:30',
            amDeparture: '12:00',
            pmArrival: '13:00',
            pmDeparture: '16:30',
            saturdayHours: 'As required',
          }
        };
        updatedPersonnelList.unshift(person);
      } else {
        if (empIdOrKey && person.employeeId !== empIdOrKey) {
          person = { ...person, employeeId: empIdOrKey };
          const pIdx = updatedPersonnelList.findIndex((p) => p.id === person!.id);
          if (pIdx !== -1) {
            updatedPersonnelList[pIdx] = person;
          }
        }
      }

      if (selectedPersonnel && person.id === selectedPersonnel.id) {
        setSelectedPersonnel(person);
      }

      const key = `${person.id}-${targetYear}-${targetMonth}`;
      const existingDTR = updatedDtrMap[key] || generateDefaultDTR(person, targetMonth, targetYear);

      const dayMap = new Map<number, DTRDayEntry>();
      existingDTR.days.forEach((d) => dayMap.set(d.day, d));

      logs.forEach((incomingDay) => {
        if (incomingDay.day >= 1 && incomingDay.day <= 31) {
          const existingDay = dayMap.get(incomingDay.day);
          
          let amArr = incomingDay.amArrival || '';
          let amDep = incomingDay.amDeparture || '';
          let pmArr = incomingDay.pmArrival || '';
          let pmDep = incomingDay.pmDeparture || '';

          // If incoming log is a morning half day (e.g. amArrival: '7:27', amDeparture: '11:57')
          // and afternoon is blank in incoming log, override any previous misplaced afternoon departure
          if (incomingDay.amArrival && incomingDay.amDeparture && !incomingDay.pmArrival && !incomingDay.pmDeparture) {
            pmArr = '';
            pmDep = '';
          }

          if (amDep && pmDep === amDep) {
            pmDep = '';
          }
          if (amArr && pmArr === amArr) {
            pmArr = '';
          }

          const statusTag = incomingDay.statusTag || existingDay?.statusTag || 'REGULAR';
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
            remarks: incomingDay.remarks || existingDay?.remarks || '',
            lateMinutes,
            undertimeMinutes,
            isAdjusted: incomingDay.isAdjusted ?? existingDay?.isAdjusted ?? false
          });
          totalRecordsApplied++;
        }
      });

      const newDaysArray: DTRDayEntry[] = Array.from(dayMap.values()).sort((a, b) => a.day - b.day);
      const totalLate = newDaysArray.reduce((acc, curr) => acc + (curr.lateMinutes || 0), 0);
      const totalUndertime = newDaysArray.reduce((acc, curr) => acc + (curr.undertimeMinutes || 0), 0);

      updatedDtrMap[key] = {
        ...existingDTR,
        days: newDaysArray,
        totalLateMinutes: totalLate,
        totalUndertimeMinutes: totalUndertime
      };
    });

    setPersonnelList(updatedPersonnelList);
    setDtrMap(updatedDtrMap);

    const newFileRecord: UploadedFileRecord = {
      id: `file-${Date.now()}`,
      fileName,
      uploadedAt: new Date().toLocaleString(),
      recordsCount: totalRecordsApplied,
      month: targetMonth,
      year: targetYear,
      fileType: fileName.endsWith('.csv') ? 'CSV' : 'EXCEL',
      summary: `Imported ${totalRecordsApplied} biometric records for ${Object.keys(personnelLogsMap).length} personnel.`
    };

    setUploadedFiles((prev) => [newFileRecord, ...prev]);

    handleLogAudit(
      'LOCAL_DRIVE_BIOMETRIC_SAVED',
      'EXCEL_IMPORT',
      `Imported and saved "${fileName}" to local drive. ${totalRecordsApplied} punch records processed.`
    );
  };

  const handleExecuteSmartMerge = (
    analysis: SmartMergeAnalysis,
    resolutions: Record<string, ConflictResolutionChoice>
  ) => {
    const result = executeSmartMergeApplication(
      analysis,
      resolutions,
      personnelList,
      dtrMap,
      departments[0]?.name || 'Junior High School Department'
    );

    setPersonnelList(result.updatedPersonnelList);
    setDtrMap(result.updatedDtrMap);

    const newFileRecord: UploadedFileRecord = {
      id: `file-${Date.now()}`,
      fileName: analysis.fileName,
      uploadedAt: new Date().toLocaleString(),
      recordsCount: result.appliedCount,
      month: analysis.detectedMonth,
      year: analysis.detectedYear,
      fileType: analysis.fileName.endsWith('.csv') ? 'CSV' : 'EXCEL',
      summary: `Smart Merge: ${analysis.safeAutoMerges.length} safe auto-merged, ${analysis.conflicts.length} resolved, ${analysis.newPersonnel.length} new personnel onboarded.`
    };

    setUploadedFiles((prev) => [newFileRecord, ...prev]);

    handleLogAudit(
      'SMART_MERGE_RECONCILIATION_SUCCESS',
      'EXCEL_IMPORT',
      result.auditSummary
    );
  };

  const handleLogAudit = (
    action: string,
    category: 'SECURITY' | 'EXCEL_IMPORT' | 'DTR_EDIT' | 'APPROVAL' | 'BACKUP' | 'SYSTEM',
    details: string
  ) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: 'Admin / School In-Charge',
      actorRole: currentRole,
      action,
      category,
      details,
      ipAddress: '192.168.1.10',
      severity: 'INFO'
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const handleAddPersonnel = (newPersonnel: Personnel) => {
    setPersonnelList((prev) => [newPersonnel, ...prev]);
    const dtr = generateDefaultDTR(newPersonnel, 7, 2026);
    setDtrMap((prev) => ({
      ...prev,
      [`${newPersonnel.id}-2026-7`]: dtr
    }));
    setSelectedPersonnel(newPersonnel);
    handleLogAudit(
      'REGISTER_PERSONNEL',
      'SYSTEM',
      `Registered new personnel: ${newPersonnel.name} (${newPersonnel.employeeId})`
    );
  };

  const handleAddDepartment = (newDept: Department) => {
    setDepartments((prev) => [...prev, newDept]);
  };

  const handleUpdatePersonnel = (updated: Personnel) => {
    setPersonnelList((prev) =>
      prev.map((p) => (p.id === updated.id ? updated : p))
    );
    if (selectedPersonnel?.id === updated.id) {
      setSelectedPersonnel(updated);
    }

    // Recalculate late and undertime for all existing DTR days matching updated personnel schedule
    setDtrMap((prev) => {
      const nextMap = { ...prev };
      Object.keys(nextMap).forEach((key) => {
        if (key.startsWith(`${updated.id}-`)) {
          const dtr = nextMap[key];
          const updatedDays = dtr.days.map((d) => {
            const { lateMinutes, undertimeMinutes } = calculateDayTimeLoss(
              d.amArrival,
              d.amDeparture,
              d.pmArrival,
              d.pmDeparture,
              updated.regularSchedule,
              d.statusTag,
              updated.personnelType
            );
            return {
              ...d,
              lateMinutes,
              undertimeMinutes
            };
          });
          nextMap[key] = {
            ...dtr,
            personnelType: updated.personnelType,
            days: updatedDays
          };
        }
      });
      return nextMap;
    });

    handleLogAudit(
      'UPDATE_PERSONNEL',
      'SYSTEM',
      `Updated profile and regular schedule for ${updated.name}`
    );
  };

  const handleDeletePersonnel = (personnelId: string) => {
    const target = personnelList.find((p) => p.id === personnelId);
    if (!target) return;

    const updatedList = personnelList.filter((p) => p.id !== personnelId);
    setPersonnelList(updatedList);
    localStorage.setItem('deped_dtr_personnel_list', JSON.stringify(updatedList));

    // Remove associated DTR records
    setDtrMap((prev) => {
      const nextMap = { ...prev };
      Object.keys(nextMap).forEach((key) => {
        if (key.startsWith(`${personnelId}-`)) {
          delete nextMap[key];
        }
      });
      return nextMap;
    });

    if (selectedPersonnel?.id === personnelId) {
      setSelectedPersonnel(updatedList.length > 0 ? updatedList[0] : null);
    }

    handleLogAudit(
      'DELETE_PERSONNEL',
      'SYSTEM',
      `Deleted personnel profile: ${target.name} (${target.employeeId}).`
    );
  };

  const handleImportPersonnelBatch = (importedPersonnelList: Personnel[]) => {
    setPersonnelList((prev) => {
      const existingNos = new Set(prev.map((p) => p.employeeNumber));
      const newItems = importedPersonnelList.filter((p) => !existingNos.has(p.employeeNumber));
      return [...prev, ...newItems];
    });
    handleLogAudit(
      'EXCEL_PERSONNEL_BATCH_IMPORT',
      'EXCEL_IMPORT',
      `Imported ${importedPersonnelList.length} personnel profiles via Excel Master Roster spreadsheet.`
    );
  };

  const handleUpdateInCharge = (
    headName: string,
    headTitle: string,
    targetDeptId?: string,
    applyToAll?: boolean
  ) => {
    // 1. Update departments list
    setDepartments((prev) => {
      const nextDepts = prev.map((d) => {
        if (applyToAll || (targetDeptId && d.id === targetDeptId)) {
          return { ...d, headName, headTitle };
        }
        return d;
      });
      if (typeof window !== 'undefined') {
        localStorage.setItem('deped_dtr_departments', JSON.stringify(nextDepts));
      }
      return nextDepts;
    });

    // 2. Update dtrMap entries so Form 48 monthlyDTR updates immediately
    setDtrMap((prevMap) => {
      const newMap = { ...prevMap };
      const targetPersonnelIds = new Set(
        personnelList
          .filter((p) => applyToAll || !targetDeptId || p.departmentId === targetDeptId)
          .map((p) => p.id)
      );

      if (selectedPersonnel && (applyToAll || !targetDeptId || selectedPersonnel.departmentId === targetDeptId)) {
        targetPersonnelIds.add(selectedPersonnel.id);
      }

      // Update existing DTRs in dtrMap
      Object.keys(newMap).forEach((key) => {
        const dtr = newMap[key];
        if (targetPersonnelIds.has(dtr.personnelId)) {
          newMap[key] = {
            ...dtr,
            verifiedBy: headName,
            verifiedByTitle: headTitle
          };
        }
      });

      // Ensure DTR for each target person exists in dtrMap with updated verifiedBy
      personnelList.forEach((p) => {
        if (targetPersonnelIds.has(p.id)) {
          const key = `${p.id}-${selectedYear}-${selectedMonth}`;
          const existing = newMap[key] || generateDefaultDTR(p, selectedMonth, selectedYear);
          newMap[key] = {
            ...existing,
            verifiedBy: headName,
            verifiedByTitle: headTitle
          };
        }
      });

      if (typeof window !== 'undefined') {
        localStorage.setItem('deped_dtr_map', JSON.stringify(newMap));
      }
      return newMap;
    });

    handleLogAudit(
      'UPDATE_IN_CHARGE',
      'SYSTEM',
      `Updated in-charge signatory to ${headName} (${headTitle})`
    );
  };

  const handleUpdateDTRDay = (
    dayNum: number,
    fieldOrObject: any,
    value?: any,
    targetPersonId?: string
  ) => {
    const targetP = targetPersonId
      ? personnelList.find((p) => p.id === targetPersonId)
      : selectedPersonnel;
    if (!targetP) return;

    const targetKey = `${targetP.id}-${selectedYear}-${selectedMonth}`;

    setDtrMap((prev) => {
      const existingDTR = prev[targetKey] || generateDefaultDTR(targetP, selectedMonth, selectedYear);

      const updatedDays = existingDTR.days.map((d) => {
        if (d.day === dayNum) {
          let mergedDayObj: DTRDayEntry;
          if (typeof fieldOrObject === 'object') {
            mergedDayObj = { ...d, ...fieldOrObject };
          } else {
            mergedDayObj = { ...d, [fieldOrObject]: value };
          }

          const { lateMinutes, undertimeMinutes } = calculateDayTimeLoss(
            mergedDayObj.amArrival,
            mergedDayObj.amDeparture,
            mergedDayObj.pmArrival,
            mergedDayObj.pmDeparture,
            targetP.regularSchedule,
            mergedDayObj.statusTag,
            targetP.personnelType
          );

          return {
            ...mergedDayObj,
            lateMinutes,
            undertimeMinutes
          };
        }
        return d;
      });

      return {
        ...prev,
        [targetKey]: {
          ...existingDTR,
          days: updatedDays
        }
      };
    });
  };

  const currentDTRKey = selectedPersonnel ? `${selectedPersonnel.id}-${selectedYear}-${selectedMonth}` : '';
  const currentDTR = selectedPersonnel
    ? dtrMap[currentDTRKey] || generateDefaultDTR(selectedPersonnel, selectedMonth, selectedYear)
    : null;

  // Filtered personnel for Personnel Roster view
  const filteredPersonnelList = personnelList.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.departmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-100 flex flex-row transition-colors duration-300">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAddPersonnelModal={() => setIsAddPersonnelOpen(true)}
        theme={theme}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-hidden">
        {/* Top Header Bar */}
        <Header
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          theme={theme}
          onToggleTheme={handleToggleTheme}
          pendingCount={0}
          onOpenBackupModal={() => setIsBackupOpen(true)}
        />

        {/* Dashboard Dynamic Content View */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* PERSONNEL PROFILE TAB (Default) */}
          {(activeTab === 'personnel' || activeTab === 'overview') && (
            <PersonnelProfileView
              personnelList={personnelList}
              onUpdatePersonnel={handleUpdatePersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              onSelectPersonnelForForm48={(p) => {
                setSelectedPersonnel(p);
                setActiveTab('form48');
              }}
              onOpenAddPersonnelModal={() => setIsAddPersonnelOpen(true)}
              onLogAudit={handleLogAudit}
              lang={lang}
            />
          )}

          {/* CSC FORM 48 VIEW TAB */}
          {activeTab === 'form48' && (
            <CSCForm48View
              personnelList={personnelList}
              selectedPersonnel={selectedPersonnel}
              onSelectPersonnel={setSelectedPersonnel}
              monthlyDTR={currentDTR}
              dtrMap={dtrMap}
              departments={departments}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              onSelectMonthYear={(m, y) => {
                setSelectedMonth(m);
                setSelectedYear(y);
              }}
              onUpdateDTRDay={handleUpdateDTRDay}
              onUpdatePersonnel={handleUpdatePersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              onUpdateInCharge={handleUpdateInCharge}
              currentRole={currentRole}
              lang={lang}
              onLogAudit={handleLogAudit}
              onOpenAddPersonnelModal={() => setIsAddPersonnelOpen(true)}
            />
          )}

          {/* EXCEL BIOMETRIC & PERSONNEL ROSTER UPLOAD TAB */}
          {activeTab === 'excel' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                  Data Import Center
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Batch upload Biometric Attendance Punch Logs or Personnel Master Roster Spreadsheets (.xlsx, .csv)
                </p>
              </div>
              <ExcelUploader
                personnelList={personnelList}
                dtrMap={dtrMap}
                onApplyImportedLogs={handleApplyImportedLogs}
                onExecuteSmartMerge={handleExecuteSmartMerge}
                onImportPersonnelBatch={handleImportPersonnelBatch}
                onLogAudit={handleLogAudit}
                lang={lang}
              />
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-8 shadow-sm">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100">
                  System Settings & Preferences
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Configure visual theme, department head signatures, and backup rules
                </p>
              </div>

              {/* Theme Settings */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      Color Mode & Interface Theme
                    </h3>
                    <p className="text-xs text-slate-400">
                      Toggle between Light and Dark visual modes
                    </p>
                  </div>
                  <button
                    onClick={handleToggleTheme}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-2"
                  >
                    {theme === 'dark' ? (
                      <>
                        <Sun className="w-4 h-4 text-amber-300" />
                        <span>Switch to Light Mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="w-4 h-4" />
                        <span>Switch to Dark Mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* In-Charge Signatures Setup */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Civil Service In-Charge Signatories
                  </h3>
                  <p className="text-xs text-slate-400">
                    Default Department Head / School Principal appearing on CSC Form 48 prints
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {departments.map((d) => (
                    <div
                      key={d.id}
                      className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800"
                    >
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
                        {d.name} ({d.code})
                      </h4>
                      <p className="text-xs text-slate-500 font-medium">{d.headName}</p>
                      <p className="text-[10px] text-slate-400">{d.headTitle || 'Dept Head'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cloud Backup Trigger */}
              <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    Cloud Backup & Export
                  </h3>
                  <p className="text-xs text-slate-400">
                    Export all personnel time records and audit logs to encrypted JSON/Excel
                  </p>
                </div>
                <button
                  onClick={() => setIsBackupOpen(true)}
                  className="px-4 py-2 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl transition flex items-center space-x-2"
                >
                  <Database className="w-4 h-4" />
                  <span>Backup System</span>
                </button>
              </div>

              {/* Clear All System Data */}
              <div className="p-5 bg-rose-50 dark:bg-rose-950/30 rounded-2xl border border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300 flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4 text-rose-600" />
                    <span>Clear All Data (Wipe System Clean)</span>
                  </h3>
                  <p className="text-xs text-rose-700/80 dark:text-rose-400/80 mt-0.5">
                    Completely erase all personnel records, DTR logs, uploaded biometric files, and sample data. Leaves the database 100% blank.
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to WIPE ALL DATA including sample personnel and DTR records? This will leave the application completely blank for fresh data imports.')) {
                      handleWipeAllData();
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-2 shadow-sm shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Wipe All Data</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Add Personnel Modal */}
      <AddPersonnelModal
        isOpen={isAddPersonnelOpen}
        onClose={() => setIsAddPersonnelOpen(false)}
        departments={departments}
        onAddPersonnel={handleAddPersonnel}
        onAddDepartment={handleAddDepartment}
      />

      {/* Cloud & Local Storage Backup Modal */}
      <CloudBackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        dtrMap={dtrMap}
        personnelList={personnelList}
        auditLogs={auditLogs}
        uploadedFilesCount={uploadedFiles.length}
        onRestoreData={({ dtrMap: newMap, personnelList: newList, auditLogs: newLogs }) => {
          setDtrMap(newMap);
          setPersonnelList(newList);
          if (newLogs) setAuditLogs(newLogs);
          if (newList.length > 0) setSelectedPersonnel(newList[0]);
        }}
        onExportToLocalDrive={handleExportToLocalDrive}
        onImportFromLocalDrive={handleImportFromLocalDrive}
        onResetLocalData={handleResetLocalData}
        onWipeAllData={handleWipeAllData}
        onLoadDemoData={handleLoadDemoData}
        onLogAudit={handleLogAudit}
        lang={lang}
      />
    </div>
  );
}
