import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  RefreshCw,
  Table,
  UserPlus,
  Users,
  Clock,
  Check,
  GitMerge,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { parseExcelBiometricFile, generateSampleBiometricExcel } from '../utils/cscForm48';
import { parsePersonnelExcelFile, generateSamplePersonnelExcel } from '../utils/personnelExcel';
import {
  analyzeSmartMerge,
  executeSmartMergeApplication,
  generateSampleSmartMergeExcel
} from '../utils/smartMergeEngine';
import { SmartMergeModal } from './SmartMergeModal';
import {
  DTRDayEntry,
  LanguageCode,
  Personnel,
  MonthlyDTR,
  SmartMergeAnalysis,
  ConflictResolutionChoice
} from '../types';
import { translations } from '../utils/translations';

interface ExcelUploaderProps {
  personnelList?: Personnel[];
  dtrMap?: Record<string, MonthlyDTR>;
  onApplyImportedLogs: (
    personnelLogsMap: Record<string, DTRDayEntry[]>,
    personnelNameMap: Record<string, string>,
    fileName: string,
    targetMonth?: number,
    targetYear?: number
  ) => void;
  onExecuteSmartMerge?: (
    analysis: SmartMergeAnalysis,
    resolutions: Record<string, ConflictResolutionChoice>
  ) => void;
  onImportPersonnelBatch?: (importedPersonnel: Personnel[]) => void;
  lang: LanguageCode;
  onLogAudit: (action: string, category: 'EXCEL_IMPORT' | 'SYSTEM' | 'BACKUP', details: string) => void;
}

export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  personnelList = [],
  dtrMap = {},
  onApplyImportedLogs,
  onExecuteSmartMerge,
  onImportPersonnelBatch,
  lang,
  onLogAudit
}) => {
  const t = translations[lang];
  const [activeMode, setActiveMode] = useState<'dtr_logs' | 'personnel_roster'>('dtr_logs');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Biometric Logs State
  const [dtrImportResult, setDtrImportResult] = useState<{
    fileName: string;
    recordsParsed: number;
    personnelLogsMap: Record<string, DTRDayEntry[]>;
    personnelNameMap: Record<string, string>;
    detectedMonth: number;
    detectedYear: number;
    summary: string;
  } | null>(null);

  // Smart Merge Analysis State
  const [smartMergeAnalysis, setSmartMergeAnalysis] = useState<SmartMergeAnalysis | null>(null);
  const [isSmartMergeModalOpen, setIsSmartMergeModalOpen] = useState(false);

  // Personnel Master Roster State
  const [personnelImportResult, setPersonnelImportResult] = useState<{
    fileName: string;
    recordsParsed: number;
    personnelList: Personnel[];
    summary: string;
  } | null>(null);

  const [targetMonth, setTargetMonth] = useState<number>(7);
  const [targetYear, setTargetYear] = useState<number>(2026);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);

  const handleFileChange = async (file: File) => {
    if (!file) return;
    setIsLoading(true);
    setErrorMessage(null);
    setAppliedNotice(null);

    try {
      if (activeMode === 'dtr_logs') {
        const result = await parseExcelBiometricFile(file, personnelList);
        const m = result.detectedMonth || 7;
        const y = result.detectedYear || 2026;

        setDtrImportResult({
          fileName: file.name,
          recordsParsed: result.recordsParsed,
          personnelLogsMap: result.personnelLogsMap,
          personnelNameMap: result.personnelNameMap || {},
          detectedMonth: m,
          detectedYear: y,
          summary: result.summary
        });
        setTargetMonth(m);
        setTargetYear(y);

        // Run Smart Merge Analysis with fuzzy matching & compound surname awareness
        const analysis = analyzeSmartMerge(
          result.personnelLogsMap,
          result.personnelNameMap || {},
          personnelList,
          dtrMap,
          m,
          y,
          file.name
        );
        setSmartMergeAnalysis(analysis);

        onLogAudit(
          'EXCEL_BIOMETRIC_PARSE_SUCCESS',
          'EXCEL_IMPORT',
          `Parsed biometric file "${file.name}" for ${m}/${y} - ${result.recordsParsed} punches. Smart Merge: ${analysis.safeAutoMerges.length} safe, ${analysis.conflicts.length} conflicts, ${analysis.newPersonnel.length} new personnel.`
        );
      } else if (activeMode === 'personnel_roster') {
        const result = await parsePersonnelExcelFile(file);
        setPersonnelImportResult({
          fileName: file.name,
          recordsParsed: result.recordsParsed,
          personnelList: result.personnelList,
          summary: result.summary
        });

        onLogAudit(
          'EXCEL_PERSONNEL_PARSE_SUCCESS',
          'EXCEL_IMPORT',
          `Successfully parsed Personnel Master file "${file.name}" - ${result.recordsParsed} employee profiles extracted.`
        );
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to read file format.');
      onLogAudit(
        'EXCEL_PARSE_FAILED',
        'EXCEL_IMPORT',
        `Failed parsing file "${file.name}": ${err.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleApplySmartMerge = (
    analysis: SmartMergeAnalysis,
    resolutions: Record<string, ConflictResolutionChoice>
  ) => {
    if (onExecuteSmartMerge) {
      onExecuteSmartMerge(analysis, resolutions);
    } else {
      // Fallback direct execution
      const result = executeSmartMergeApplication(
        analysis,
        resolutions,
        personnelList,
        dtrMap
      );
      if (onImportPersonnelBatch && result.updatedPersonnelList.length > personnelList.length) {
        onImportPersonnelBatch(result.updatedPersonnelList);
      }
      onApplyImportedLogs(
        analysis.safeAutoMerges.reduce((acc, curr) => {
          acc[curr.terminalAcNo] = curr.logs;
          return acc;
        }, {} as Record<string, DTRDayEntry[]>),
        {},
        analysis.fileName,
        analysis.detectedMonth,
        analysis.detectedYear
      );
    }

    const noticeMsg = `Smart Merge successfully applied! Auto-merged ${analysis.safeAutoMerges.length} teachers, resolved ${analysis.conflicts.length} collisions, and updated Form 48 monthly cards.`;
    setAppliedNotice(noticeMsg);
    onLogAudit('SMART_MERGE_APPLIED', 'EXCEL_IMPORT', noticeMsg);
    setTimeout(() => setAppliedNotice(null), 8000);
  };

  const handleApplyPersonnel = () => {
    if (!personnelImportResult || !onImportPersonnelBatch) return;
    onImportPersonnelBatch(personnelImportResult.personnelList);
    const noticeMsg = `Successfully added/updated ${personnelImportResult.recordsParsed} Personnel Records to the DepEd Roster Database!`;
    setAppliedNotice(noticeMsg);
    setTimeout(() => setAppliedNotice(null), 8000);
  };

  return (
    <div className="space-y-6">
      
      {/* Mode Selector Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 flex flex-wrap gap-2 shadow-xs">
        <button
          onClick={() => {
            setActiveMode('dtr_logs');
            setErrorMessage(null);
            setAppliedNotice(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeMode === 'dtr_logs'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <GitMerge className="w-4 h-4" />
          <span>Biometrics & Smart Merge (Form 48)</span>
        </button>

        <button
          onClick={() => {
            setActiveMode('personnel_roster');
            setErrorMessage(null);
            setAppliedNotice(null);
          }}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-2 ${
            activeMode === 'personnel_roster'
              ? 'bg-blue-600 text-white shadow-md'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Personnel Master Roster (12 DepEd Fields)</span>
        </button>
      </div>

      {/* Mode 1: Biometric DTR Logs with Smart Merge */}
      {activeMode === 'dtr_logs' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-6 h-6 text-emerald-400" />
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Biometric Attendance & Smart Merge Engine</span>
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Upload raw logs from hardware terminals (ZKTeco, Granding, Hikvision, Excel/CSV).
                Smart Merge reconciles punches against Mangusu Integrated School's personnel roster, corrects fuzzy typos,
                respects Philippine compound surnames, and resolves re-assigned hardware slots.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={generateSampleSmartMergeExcel}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg flex items-center space-x-2 transition"
                title="Download test file with typos, compound surnames, and hardware collisions"
              >
                <GitMerge className="w-4 h-4" />
                <span>Download Smart Merge Test Excel</span>
              </button>

              <button
                onClick={generateSampleBiometricExcel}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Standard Biometric Sample</span>
              </button>
            </div>
          </div>

          {/* Expected Headers */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-800 dark:text-slate-200 text-xs shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Table className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Smart Merge Supported Biometric Column Headers:
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">Auto-detected & mapped</span>
            </div>
            <div className="flex flex-wrap gap-2 font-mono text-[11px]">
              {['AC-No.', 'Name', 'Date', 'Time', 'AM Arrival', 'PM Departure'].map((header) => (
                <span key={header} className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold">
                  {header}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              💡 Standard format: <b>Date</b> column has date only (e.g. <code className="font-bold text-emerald-700 dark:text-emerald-300">2026-07-01</code>, no time), and <b>Time</b> column has time only (e.g. <code className="font-bold text-emerald-700 dark:text-emerald-300">07:52 AM</code>, no date).
            </p>
          </div>
        </div>
      )}

      {/* Mode 2: Personnel Master Roster */}
      {activeMode === 'personnel_roster' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 shadow-xl flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-6 h-6 text-blue-400" />
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Personnel Master Data Spreadsheet Import
                </h2>
              </div>
              <p className="text-xs text-slate-300 max-w-2xl">
                Batch upload employee rosters containing the 12 CSC/DepEd official personnel fields (Full Name, Last/First/Middle Name, Position Title, Employee No., Item No., TIN, DOB, POB, District/School, GSIS BP No).
              </p>
            </div>

            <button
              onClick={generateSamplePersonnelExcel}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg flex items-center space-x-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Personnel Excel Template</span>
            </button>
          </div>

          {/* Expected Personnel Headers */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-slate-800 dark:text-slate-200 text-xs shadow-sm space-y-2">
            <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Table className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Supported 12 Personnel Fields in Excel Columns:
            </span>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10px]">
              {[
                'FULL NAME', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME',
                'POSITION TITLE', 'EMPLOYEE NUMBER', 'ITEM NUMBER', 'TIN',
                'DATE OF BIRTH', 'PLACE OF BIRTH', 'DIST. / CURRENT SCHOOL', 'GSIS BP NO.'
              ].map((header) => (
                <span key={header} className="px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-semibold">
                  {header}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Universal Dropzone Container */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-3xl p-10 text-center transition cursor-pointer relative overflow-hidden ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-900/60 shadow-sm'
        }`}
      >
        <input
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
            {isLoading ? (
              <RefreshCw className="w-8 h-8 animate-spin" />
            ) : (
              <Upload className="w-8 h-8" />
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              {activeMode === 'dtr_logs'
                ? 'Drop Biometric Punch Log (.xlsx / .csv) here for Smart Merge'
                : 'Drop Personnel Master Spreadsheet (.xlsx / .csv) here'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              or click to browse files on your computer
            </p>
          </div>
        </div>
      </div>

      {/* Applied Notice Banner */}
      {appliedNotice && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{appliedNotice}</span>
        </div>
      )}

      {/* Error Message Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/80 border border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 text-xs font-bold flex items-center gap-2 shadow-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SMART MERGE CLASSIFICATION BANNER & PREVIEW (DTR Logs Mode) */}
      {activeMode === 'dtr_logs' && smartMergeAnalysis && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-5 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <GitMerge className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Smart Merge Classification Preview
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Analyzed <b>{smartMergeAnalysis.totalRecords}</b> punch records from "{smartMergeAnalysis.fileName}"
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsSmartMergeModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition"
              >
                <GitMerge className="w-4 h-4" />
                <span>Launch Interactive Conflict Wizard</span>
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleApplySmartMerge(smartMergeAnalysis, {})}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>1-Click Safe Auto-Merge</span>
              </button>
            </div>
          </div>

          {/* Three Classification Pathways Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Condition A */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  Condition A: Safe Auto-Merge
                </span>
                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                  {smartMergeAnalysis.safeAutoMerges.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Exact ID & Name match. Auto-attaches punches directly into Form 48 monthly cards.
              </p>
            </div>

            {/* Condition B */}
            <div className={`p-4 rounded-2xl border space-y-1 ${
              smartMergeAnalysis.conflicts.length > 0
                ? 'bg-amber-50/70 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Condition B: Conflict Wizard
                </span>
                <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                  {smartMergeAnalysis.conflicts.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Collisions (re-assigned machine slots or ID discrepancies) requiring side-by-side review.
              </p>
            </div>

            {/* Condition C */}
            <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-blue-800 dark:text-blue-300 flex items-center gap-1.5">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  New Personnel Onboarding
                </span>
                <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                  {smartMergeAnalysis.newPersonnel.length}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Staff detected on device who do not exist in roster. Ready to onboard with Form 48 cards intact.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Result Preview for Personnel Roster */}
      {activeMode === 'personnel_roster' && personnelImportResult && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Personnel Roster Parsed ({personnelImportResult.recordsParsed} records)
              </h3>
            </div>
            <button
              onClick={handleApplyPersonnel}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <span>Import {personnelImportResult.recordsParsed} Employees into Database</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                  <th className="p-2.5">Full Name</th>
                  <th className="p-2.5">Position Title</th>
                  <th className="p-2.5">Emp No</th>
                  <th className="p-2.5">Item Number</th>
                  <th className="p-2.5">District / School</th>
                  <th className="p-2.5">GSIS BP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {personnelImportResult.personnelList.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">{p.fullName}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{p.positionTitle}</td>
                    <td className="p-2.5 font-mono">{p.employeeNumber}</td>
                    <td className="p-2.5 font-mono text-[11px] text-slate-500">{p.itemNumber}</td>
                    <td className="p-2.5">{p.districtOrSchool}</td>
                    <td className="p-2.5 font-mono text-slate-500">{p.gsisBpNo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interactive Conflict Resolution Wizard Modal */}
      {isSmartMergeModalOpen && smartMergeAnalysis && (
        <SmartMergeModal
          isOpen={isSmartMergeModalOpen}
          onClose={() => setIsSmartMergeModalOpen(false)}
          analysis={smartMergeAnalysis}
          onExecuteMerge={handleApplySmartMerge}
        />
      )}

    </div>
  );
};
