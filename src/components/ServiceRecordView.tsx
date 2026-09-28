import React, { useState, useEffect } from 'react';
import {
  FileText,
  UserCheck,
  Plus,
  Trash2,
  Printer,
  Download,
  CheckCircle2,
  Calendar,
  Building2,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  Search,
  Copy,
  Clock,
  Upload,
  GitMerge,
  RefreshCw,
  AlertCircle,
  Check,
  FileSpreadsheet
} from 'lucide-react';
import { Personnel, ServiceRecordEntry } from '../types';
import { DepEdOfficialServiceRecordPrint } from './DepEdOfficialServiceRecordPrint';
import {
  getSalaryForSGAndStep,
  getSGForPosition,
  loadAllTranches,
  SalaryTrancheSchedule
} from '../data/salaryMatrix2026';
import {
  parseServiceRecordExcelFile,
  generateSampleServiceRecordExcel,
  mergeServiceRecords
} from '../utils/serviceRecordExcel';
import { calculateNameSimilarity } from '../utils/smartMergeEngine';

interface ServiceRecordViewProps {
  personnelList: Personnel[];
  onLogAudit: (action: string, category: 'SYSTEM' | 'EXCEL_IMPORT', details: string) => void;
}

export const ServiceRecordView: React.FC<ServiceRecordViewProps> = ({
  personnelList,
  onLogAudit
}) => {
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(
    personnelList[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const selectedPersonnel =
    personnelList.find((p) => p.id === selectedPersonnelId) || personnelList[0];

  // Service Record history map based on personnel, with local storage sync
  const [serviceRecordsMap, setServiceRecordsMap] = useState<
    Record<string, ServiceRecordEntry[]>
  >(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('deped_dtr_service_records_map');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (e) {
          console.error('Failed reading saved service records:', e);
        }
      }
    }
    const map: Record<string, ServiceRecordEntry[]> = {};
    personnelList.forEach((p) => {
      map[p.id] = p.serviceRecords || [];
    });
    return map;
  });

  const saveServiceRecords = (newMap: Record<string, ServiceRecordEntry[]>) => {
    setServiceRecordsMap(newMap);
    if (typeof window !== 'undefined') {
      localStorage.setItem('deped_dtr_service_records_map', JSON.stringify(newMap));
    }
  };

  const currentRecords = selectedPersonnel
    ? serviceRecordsMap[selectedPersonnel.id] || []
    : [];

  // Manual Add Entry Modal
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState<Partial<ServiceRecordEntry>>({
    dateFrom: new Date().toISOString().split('T')[0],
    dateTo: 'PRESENT',
    designation: selectedPersonnel?.positionTitle || 'Teacher III',
    status: 'PERM',
    monthlySalary: 31320,
    salaryGrade: 13,
    step: 3,
    stationOrOffice: selectedPersonnel?.districtOrSchool || 'Division Office',
    branch: 'National',
    leaveWithoutPay: 'NONE',
    remarks: 'STEP INCREMENT',
  });

  // Import Service Record Modal State
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importMode, setImportMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [importTargetPersonnelId, setImportTargetPersonnelId] = useState<string>(
    selectedPersonnel?.id || ''
  );
  const [parsedEntries, setParsedEntries] = useState<ServiceRecordEntry[]>([]);
  const [autoMatchedPersonnel, setAutoMatchedPersonnel] = useState<Personnel | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    if (selectedPersonnel) {
      setImportTargetPersonnelId(selectedPersonnel.id);
    }
  }, [selectedPersonnel?.id]);

  const handleAddEntry = () => {
    if (!selectedPersonnel) return;

    const entryToAdd: ServiceRecordEntry = {
      id: `sr-${Date.now()}`,
      dateFrom: newEntry.dateFrom || '2026-08-01',
      dateTo: newEntry.dateTo || 'PRESENT',
      designation: newEntry.designation || selectedPersonnel.positionTitle,
      status: (newEntry.status as any) || 'PERM',
      monthlySalary: Number(newEntry.monthlySalary) || 31320,
      salaryGrade: Number(newEntry.salaryGrade) || 13,
      step: Number(newEntry.step) || 1,
      stationOrOffice: newEntry.stationOrOffice || selectedPersonnel.districtOrSchool,
      branch: newEntry.branch || 'National',
      leaveWithoutPay: newEntry.leaveWithoutPay || 'NONE',
      remarks: newEntry.remarks || 'STEP INCREMENT',
    };

    const nextMap = {
      ...serviceRecordsMap,
      [selectedPersonnel.id]: [...(serviceRecordsMap[selectedPersonnel.id] || []), entryToAdd],
    };
    saveServiceRecords(nextMap);

    setIsAddEntryModalOpen(false);
    onLogAudit(
      'SERVICE_RECORD_ENTRY_ADDED',
      'SYSTEM',
      `Added official Service Record entry for ${selectedPersonnel.fullName}: ${entryToAdd.remarks}`
    );
  };

  const handleDeleteEntry = (entryId: string) => {
    if (!selectedPersonnel) return;
    const nextMap = {
      ...serviceRecordsMap,
      [selectedPersonnel.id]: (serviceRecordsMap[selectedPersonnel.id] || []).filter(
        (r) => r.id !== entryId
      ),
    };
    saveServiceRecords(nextMap);
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;
    setIsParsing(true);
    setImportError(null);
    setImportFile(file);

    try {
      const result = await parseServiceRecordExcelFile(file);
      setParsedEntries(result.entries);

      // Automatic Employee Matching:
      // Check if file name or row values contain employee name or employee number
      let bestMatch: Personnel | null = null;
      let highestScore = 0;

      const cleanFileName = file.name.replace(/[_.-]/g, ' ');

      personnelList.forEach((p) => {
        // Compare with file name
        const score = Math.max(
          calculateNameSimilarity(cleanFileName, p.fullName),
          calculateNameSimilarity(cleanFileName, p.lastName)
        );
        if (score > highestScore && score >= 60) {
          highestScore = score;
          bestMatch = p;
        }
      });

      if (bestMatch) {
        setAutoMatchedPersonnel(bestMatch);
        setImportTargetPersonnelId((bestMatch as Personnel).id);
      } else {
        setAutoMatchedPersonnel(selectedPersonnel || null);
        if (selectedPersonnel) {
          setImportTargetPersonnelId(selectedPersonnel.id);
        }
      }
    } catch (err: any) {
      setImportError(err.message || 'Failed to parse Service Record file.');
      setParsedEntries([]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleExecuteImport = () => {
    if (!importTargetPersonnelId || parsedEntries.length === 0) return;

    const targetPerson = personnelList.find((p) => p.id === importTargetPersonnelId);
    if (!targetPerson) return;

    const existing = serviceRecordsMap[importTargetPersonnelId] || [];
    const { merged, addedCount, updatedCount } = mergeServiceRecords(
      existing,
      parsedEntries,
      importMode
    );

    const nextMap = {
      ...serviceRecordsMap,
      [importTargetPersonnelId]: merged
    };
    saveServiceRecords(nextMap);

    const msg = importMode === 'APPEND'
      ? `Smart Merge Complete: Appended ${addedCount} new service record entries and updated ${updatedCount} appointments for ${targetPerson.fullName}.`
      : `Baseline Refresh Complete: Replaced service record history for ${targetPerson.fullName} with ${parsedEntries.length} imported appointments.`;

    setSuccessBanner(msg);
    setIsImportModalOpen(false);
    setImportFile(null);
    setParsedEntries([]);
    setSelectedPersonnelId(importTargetPersonnelId);

    onLogAudit('SERVICE_RECORD_IMPORT_SUCCESS', 'EXCEL_IMPORT', msg);
    setTimeout(() => setSuccessBanner(null), 8000);
  };

  const filteredPersonnel = personnelList.filter(
    (p) =>
      p.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employeeNumber.includes(searchTerm) ||
      p.positionTitle.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold tracking-tight">
              Official Service Record Maintenance (EO No. 54, s. 1954)
            </h2>
          </div>
          <p className="text-xs text-slate-300 max-w-3xl">
            Department of Education & Civil Service Commission official Service Record database.
            Maintains inclusive dates, designations, salary grade steps, office stations, and promotional remarks.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg flex items-center space-x-2 transition"
          >
            <GitMerge className="w-4 h-4" />
            <span>Import Service Records (Excel / CSV)</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg flex items-center space-x-2 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Service Record</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <span>{successBanner}</span>
        </div>
      )}

      {/* Main Grid: Selector & Records Table */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Personnel Roster Sidebar */}
        <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-500" />
              Personnel Directory
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              {personnelList.length} Total
            </span>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search employee..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
            {filteredPersonnel.map((p) => {
              const isSelected = p.id === selectedPersonnel?.id;
              const count = (serviceRecordsMap[p.id] || []).length;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPersonnelId(p.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex flex-col space-y-1 ${
                    isSelected
                      ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {p.fullName}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      #{p.employeeNumber}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>{p.positionTitle}</span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {count} {count === 1 ? 'entry' : 'entries'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Service Record Detail Table */}
        <div className="lg:col-span-3 space-y-4">
          {selectedPersonnel && (
            <div className="bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-6">
              {/* Employee Header Info Card */}
              <div className="bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    Republic of the Philippines — Department of Education
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    SERVICE RECORD: {selectedPersonnel.fullName}
                  </h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                    <span><b>Emp No:</b> {selectedPersonnel.employeeNumber}</span>
                    <span><b>Item No:</b> {selectedPersonnel.itemNumber}</span>
                    <span><b>TIN:</b> {selectedPersonnel.tin}</span>
                    <span><b>GSIS BP:</b> {selectedPersonnel.gsisBpNo}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      setImportTargetPersonnelId(selectedPersonnel.id);
                      setIsImportModalOpen(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center space-x-1.5 transition"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Smart Merge Excel</span>
                  </button>

                  <button
                    onClick={() => setIsAddEntryModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center space-x-1.5 shadow-sm transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Service Entry</span>
                  </button>
                </div>
              </div>

              {/* Service History Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Inclusive Dates (From - To)</th>
                      <th className="p-3">Designation / Position</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Monthly Salary</th>
                      <th className="p-3">SG / Step</th>
                      <th className="p-3">Station / Office</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3">Remarks / Action</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {currentRecords.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
                      >
                        <td className="p-3 font-mono font-medium whitespace-nowrap">
                          {rec.dateFrom} to <span className="font-bold text-blue-600 dark:text-blue-400">{rec.dateTo}</span>
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          {rec.designation}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200">
                            {rec.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          ₱{rec.monthlySalary.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-3 font-mono font-bold">
                          SG {rec.salaryGrade} Step {rec.step}
                        </td>
                        <td className="p-3">{rec.stationOrOffice}</td>
                        <td className="p-3 text-slate-500">{rec.branch}</td>
                        <td className="p-3 font-bold text-blue-600 dark:text-blue-400">
                          {rec.remarks}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleDeleteEntry(rec.id)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                            title="Delete Entry"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {currentRecords.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-400 text-xs">
                          No service record entries logged yet for this employee. Click "Add Service Entry" or "Smart Merge Excel".
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Add Service Entry Modal Overlay */}
      {isAddEntryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-600" />
              <span>Add Official Service Record Entry</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Inclusive Date From</label>
                  <input
                    type="date"
                    value={newEntry.dateFrom || ''}
                    onChange={(e) => setNewEntry({ ...newEntry, dateFrom: e.target.value })}
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Inclusive Date To</label>
                  <input
                    type="text"
                    value={newEntry.dateTo || 'PRESENT'}
                    onChange={(e) => setNewEntry({ ...newEntry, dateTo: e.target.value })}
                    placeholder="YYYY-MM-DD or PRESENT"
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Designation / Position</label>
                <input
                  type="text"
                  value={newEntry.designation || ''}
                  onChange={(e) => setNewEntry({ ...newEntry, designation: e.target.value })}
                  className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Status</label>
                <select
                  value={newEntry.status || 'PERM'}
                  onChange={(e) => setNewEntry({ ...newEntry, status: e.target.value as any })}
                  className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1"
                >
                  <option value="PERM">PERM (Permanent)</option>
                  <option value="PROV">PROV (Provisional)</option>
                  <option value="SUB">SUB (Substitute)</option>
                  <option value="CONTRACTUAL">CONTRACTUAL</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Salary Tranche / Schedule Basis</label>
                <select
                  onChange={(e) => {
                    const selectedTrancheId = e.target.value;
                    const sg = newEntry.salaryGrade || 13;
                    const st = newEntry.step || 1;
                    if (selectedTrancheId) {
                      const sal = getSalaryForSGAndStep(sg, st, selectedTrancheId);
                      setNewEntry({ ...newEntry, monthlySalary: sal });
                    }
                  }}
                  className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1 text-xs"
                >
                  <option value="">Auto / Manual Salary Rate</option>
                  {loadAllTranches().map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.effectiveYear})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Salary Grade (1-33)</label>
                  <input
                    type="number"
                    min={1}
                    max={33}
                    value={newEntry.salaryGrade || 13}
                    onChange={(e) => {
                      const sg = Number(e.target.value);
                      const st = newEntry.step || 1;
                      const autoSal = getSalaryForSGAndStep(sg, st);
                      setNewEntry({ ...newEntry, salaryGrade: sg, monthlySalary: autoSal });
                    }}
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 dark:text-slate-300">Step (1-8)</label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={newEntry.step || 1}
                    onChange={(e) => {
                      const st = Number(e.target.value);
                      const sg = newEntry.salaryGrade || 13;
                      const autoSal = getSalaryForSGAndStep(sg, st);
                      setNewEntry({ ...newEntry, step: st, monthlySalary: autoSal });
                    }}
                    className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Monthly Salary (₱)</label>
                <input
                  type="number"
                  value={newEntry.monthlySalary || getSalaryForSGAndStep(newEntry.salaryGrade || 13, newEntry.step || 1)}
                  onChange={(e) => setNewEntry({ ...newEntry, monthlySalary: Number(e.target.value) })}
                  className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 dark:text-slate-300">Remarks / Cause</label>
                <input
                  type="text"
                  value={newEntry.remarks || 'STEP INCREMENT'}
                  onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                  placeholder="STEP INCREMENT / PROMOTION"
                  className="w-full p-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mt-1"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsAddEntryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Save Record Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMART MERGE SERVICE RECORD IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full shadow-2xl p-6 space-y-6">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400">
                    <GitMerge className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black text-slate-900 dark:text-white">
                    Service Record Import & Smart Merge
                  </h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Import official service appointment history from Excel or CSV spreadsheets (EO No. 54, s. 1954).
                </p>
              </div>

              <button
                onClick={() => {
                  generateSampleServiceRecordExcel(selectedPersonnel?.fullName || 'Teacher');
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Template</span>
              </button>
            </div>

            {/* Target Personnel Selector with Auto-Match */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Target Employee Profile:
                </label>
                {autoMatchedPersonnel && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Auto-Matched via File Name</span>
                  </span>
                )}
              </div>

              <select
                value={importTargetPersonnelId}
                onChange={(e) => setImportTargetPersonnelId(e.target.value)}
                className="w-full p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100"
              >
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName} (#{p.employeeNumber}) — {p.positionTitle}
                  </option>
                ))}
              </select>
            </div>

            {/* Dropzone */}
            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl p-6 text-center relative hover:border-indigo-400 transition bg-slate-50/50 dark:bg-slate-950/30">
              <input
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="space-y-2">
                <Upload className="w-8 h-8 text-indigo-500 mx-auto" />
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {importFile ? importFile.name : 'Click to select or drop Service Record spreadsheet (.xlsx, .csv)'}
                </div>
                {isParsing && (
                  <p className="text-[11px] text-indigo-500 flex items-center justify-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Parsing spreadsheet rows...</span>
                  </p>
                )}
              </div>
            </div>

            {/* Error Message */}
            {importError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* Merge Mode Selection: Append vs Replace */}
            {parsedEntries.length > 0 && (
              <div className="space-y-3">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider text-[11px]">
                  Select Import Reconciliation Strategy:
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Append (Smart Merge) */}
                  <button
                    type="button"
                    onClick={() => setImportMode('APPEND')}
                    className={`p-3.5 rounded-2xl text-left border transition flex items-start space-x-3 ${
                      importMode === 'APPEND'
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md ring-2 ring-indigo-400/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      <GitMerge className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block">
                        Append (Smart Merge)
                      </span>
                      <p className={`text-[11px] ${importMode === 'APPEND' ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        Smart merge of new appointments onto existing service history. Updates promotional salary & steps without duplicate dates.
                      </p>
                    </div>
                  </button>

                  {/* Replace (Baseline Refresh) */}
                  <button
                    type="button"
                    onClick={() => setImportMode('REPLACE')}
                    className={`p-3.5 rounded-2xl text-left border transition flex items-start space-x-3 ${
                      importMode === 'REPLACE'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md ring-2 ring-rose-400/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-rose-300'
                    }`}
                  >
                    <div className="mt-0.5">
                      <RefreshCw className="w-4 h-4 flex-shrink-0" />
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold block">
                        Replace (Complete Baseline Refresh)
                      </span>
                      <p className={`text-[11px] ${importMode === 'REPLACE' ? 'text-rose-100' : 'text-slate-500 dark:text-slate-400'}`}>
                        Completely replaces all historical entries with the spreadsheet data as the new master baseline.
                      </p>
                    </div>
                  </button>
                </div>

                {/* Parsed Preview Table */}
                <div className="pt-2">
                  <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                    Extracted Entries Preview ({parsedEntries.length} items):
                  </span>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 font-bold text-slate-700 dark:text-slate-300">
                        <tr>
                          <th className="p-2">Dates</th>
                          <th className="p-2">Designation</th>
                          <th className="p-2">Salary</th>
                          <th className="p-2">SG/Step</th>
                          <th className="p-2">Remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {parsedEntries.map((rec, i) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="p-2 font-mono whitespace-nowrap">{rec.dateFrom} - {rec.dateTo}</td>
                            <td className="p-2 font-semibold">{rec.designation}</td>
                            <td className="p-2 font-mono">₱{rec.monthlySalary.toLocaleString()}</td>
                            <td className="p-2">SG {rec.salaryGrade} Step {rec.step}</td>
                            <td className="p-2 text-indigo-600 dark:text-indigo-400 font-bold">{rec.remarks}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setParsedEntries([]);
                }}
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                disabled={parsedEntries.length === 0}
                onClick={handleExecuteImport}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md flex items-center space-x-1.5 transition"
              >
                <GitMerge className="w-4 h-4" />
                <span>Execute {importMode === 'APPEND' ? 'Smart Merge (Append)' : 'Baseline Refresh (Replace)'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Official Service Record Print Modal Overlay */}
      {isPrintModalOpen && selectedPersonnel && (
        <DepEdOfficialServiceRecordPrint
          personnel={selectedPersonnel}
          serviceRecords={currentRecords}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}
    </div>
  );
};
