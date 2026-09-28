import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  DollarSign,
  UserCheck,
  CheckCircle2,
  Award,
  Filter,
  Calculator,
  ArrowUpRight,
  Layers,
  Database,
  Briefcase,
  Upload,
  PlusCircle,
  Edit3,
  Save,
  RotateCcw,
  FileSpreadsheet,
  Calendar,
  X,
  HelpCircle,
  FileText,
  Download,
  Eraser,
  Trash2
} from 'lucide-react';
import { Personnel } from '../types';
import {
  SalaryTrancheSchedule,
  loadAllTranches,
  saveAllTranches,
  getSalaryForSGAndStep,
  getSalaryScheduleDetails,
  formatSalaryPesos,
  getSGForPosition,
  updateTrancheCellAmount,
  createEmptyMatrix,
  DEFAULT_TRANCHES,
  DEMO_TRANCHES
} from '../data/salaryMatrix2026';

interface SalaryTranche2026ViewProps {
  personnelList: Personnel[];
  onUpdatePersonnelSalary: (personnelId: string, salaryGrade: number, step: number, monthlySalary: number) => void;
  onLogAudit: (action: string, category: 'SYSTEM', details: string) => void;
}

export const SalaryTranche2026View: React.FC<SalaryTranche2026ViewProps> = ({
  personnelList,
  onUpdatePersonnelSalary,
  onLogAudit
}) => {
  // Tranches State
  const [tranches, setTranches] = useState<SalaryTrancheSchedule[]>([]);
  const [selectedTrancheId, setSelectedTrancheId] = useState<string>('salary-schedule-2026');

  // Matrix Viewer / Calculator State
  const [selectedSG, setSelectedSG] = useState<number>(11);
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(personnelList[0]?.id || '');
  const [sgFilterRange, setSgFilterRange] = useState<'ALL' | 'TEACHING' | 'ADMIN' | 'EXECUTIVE'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [appliedNotification, setAppliedNotification] = useState<string | null>(null);

  // Cell Direct Editing State
  const [editingCell, setEditingCell] = useState<{ sg: number; step: number } | null>(null);
  const [editingCellValue, setEditingCellValue] = useState<string>('');

  // Modals State
  const [showUploadModal, setShowUploadModal] = useState<boolean>(false);
  const [showNewTrancheModal, setShowNewTrancheModal] = useState<boolean>(false);

  // New Tranche Form State
  const [newTrancheName, setNewTrancheName] = useState<string>('');
  const [newTrancheYear, setNewTrancheYear] = useState<number>(2025);
  const [newTrancheDesc, setNewTrancheDesc] = useState<string>('');
  const [newTrancheBaseTemplate, setNewTrancheBaseTemplate] = useState<string>('2026-3rd-tranche');

  // File Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTrancheYear, setUploadTrancheYear] = useState<number>(2024);
  const [uploadTrancheName, setUploadTrancheName] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = loadAllTranches();
    setTranches(loaded);
    if (loaded.length > 0 && !loaded.some((t) => t.id === selectedTrancheId)) {
      setSelectedTrancheId(loaded[0].id);
    }
  }, []);

  const currentTranche = tranches.find((t) => t.id === selectedTrancheId) || tranches[0] || DEFAULT_TRANCHES[0];

  const selectedDetails = getSalaryScheduleDetails(selectedSG, selectedStep, selectedTrancheId);
  const selectedPersonnel = personnelList.find((p) => p.id === selectedPersonnelId) || personnelList[0];

  const handleApplySalaryToPersonnel = () => {
    if (!selectedPersonnel) return;
    const salary = selectedDetails.currentBasicSalary;

    onUpdatePersonnelSalary(selectedPersonnel.id, selectedSG, selectedStep, salary);
    onLogAudit(
      'SALARY_TRANCHE_UPDATED',
      'SYSTEM',
      `Assigned ${currentTranche.name} SG ${selectedSG} Step ${selectedStep} (${formatSalaryPesos(salary)}) to ${selectedPersonnel.fullName}`
    );

    setAppliedNotification(
      `Successfully updated ${selectedPersonnel.fullName} to SG ${selectedSG}, Step ${selectedStep} (${formatSalaryPesos(salary)}/mo) under ${currentTranche.name}!`
    );

    setTimeout(() => {
      setAppliedNotification(null);
    }, 4000);
  };

  // Direct Table Cell Editing
  const handleStartCellEdit = (sg: number, step: number) => {
    const currentVal = currentTranche.matrix?.[sg]?.[step] || 0;
    setEditingCell({ sg, step });
    setEditingCellValue(String(currentVal));
  };

  const handleSaveCellEdit = () => {
    if (!editingCell) return;
    const numVal = parseFloat(editingCellValue.replace(/,/g, ''));
    if (isNaN(numVal) || numVal < 0) {
      setEditingCell(null);
      return;
    }

    const updatedTranches = updateTrancheCellAmount(
      selectedTrancheId,
      editingCell.sg,
      editingCell.step,
      numVal
    );

    setTranches(updatedTranches);
    onLogAudit(
      'TRANCHE_CELL_EDITED',
      'SYSTEM',
      `Manually updated SG ${editingCell.sg} Step ${editingCell.step} to ${formatSalaryPesos(numVal)} in tranche ${currentTranche.name}`
    );

    setAppliedNotification(
      `Updated SG ${editingCell.sg} Step ${editingCell.step} to ${formatSalaryPesos(numVal)} in ${currentTranche.name}`
    );

    setEditingCell(null);
    setTimeout(() => setAppliedNotification(null), 3000);
  };

  // Reset Tranches to Defaults
  const handleResetTranchesToDefault = () => {
    if (confirm('Are you sure you want to reset all tranche schedules to factory defaults?')) {
      saveAllTranches(DEFAULT_TRANCHES);
      setTranches(DEFAULT_TRANCHES);
      setSelectedTrancheId(DEFAULT_TRANCHES[0].id);
      onLogAudit('TRANCHE_RESET', 'SYSTEM', 'Reset all salary tranche matrices to defaults.');
    }
  };

  // Clear / Zero out current tranche matrix
  const handleClearTrancheValues = () => {
    if (!currentTranche) return;
    if (confirm(`Are you sure you want to clear/zero-out all salary amounts in "${currentTranche.name}"? All cells from SG 1 to SG 33 (Steps 1-8) will be set to ₱0 so you can enter or import a blank schedule.`)) {
      const emptyMatrix = createEmptyMatrix(0);
      const updated = tranches.map((t) => {
        if (t.id !== selectedTrancheId) return t;
        return { ...t, matrix: emptyMatrix };
      });
      saveAllTranches(updated);
      setTranches(updated);
      onLogAudit('TRANCHE_CLEARED', 'SYSTEM', `Cleared all matrix salary amounts for tranche: ${currentTranche.name}`);
      setAppliedNotification(`Cleared all salary amounts in "${currentTranche.name}". Matrix is now 100% blank (₱0).`);
      setTimeout(() => setAppliedNotification(null), 4000);
    }
  };

  // Delete current selected tranche
  const handleDeleteTranche = () => {
    if (!currentTranche) return;
    if (tranches.length <= 1) {
      alert('Cannot delete the only remaining salary tranche schedule.');
      return;
    }
    if (confirm(`Are you sure you want to delete the tranche schedule "${currentTranche.name}"?`)) {
      const updated = tranches.filter((t) => t.id !== selectedTrancheId);
      saveAllTranches(updated);
      setTranches(updated);
      setSelectedTrancheId(updated[0]?.id || DEFAULT_TRANCHES[0].id);
      onLogAudit('TRANCHE_DELETED', 'SYSTEM', `Deleted salary tranche schedule: ${currentTranche.name}`);
      setAppliedNotification(`Deleted salary schedule "${currentTranche.name}".`);
      setTimeout(() => setAppliedNotification(null), 3500);
    }
  };

  // Create New Empty / Template Tranche
  const handleCreateNewTranche = () => {
    if (!newTrancheName.trim()) return;

    const baseTranche = tranches.find((t) => t.id === newTrancheBaseTemplate);
    const newMatrix = baseTranche
      ? JSON.parse(JSON.stringify(baseTranche.matrix))
      : createEmptyMatrix(0);

    const newId = `tranche-${newTrancheYear}-${Date.now()}`;
    const newTrancheObj: SalaryTrancheSchedule = {
      id: newId,
      name: newTrancheName.trim(),
      effectiveYear: newTrancheYear,
      description: newTrancheDesc.trim() || `Salary Schedule for Year ${newTrancheYear}`,
      matrix: newMatrix,
      isCustom: true
    };

    const updated = [...tranches, newTrancheObj];
    saveAllTranches(updated);
    setTranches(updated);
    setSelectedTrancheId(newId);
    setShowNewTrancheModal(false);

    // Reset Form
    setNewTrancheName('');
    setNewTrancheDesc('');

    onLogAudit('TRANCHE_CREATED', 'SYSTEM', `Created new salary schedule: ${newTrancheObj.name}`);
    setAppliedNotification(`Created new Salary Tranche "${newTrancheObj.name}". You can now manually edit cells!`);
    setTimeout(() => setAppliedNotification(null), 4000);
  };

  // Handle Upload Tranche (JSON or CSV)
  const handleUploadTrancheFile = async () => {
    if (!uploadFile) {
      setUploadError('Please select a file to upload (.json or .csv)');
      return;
    }

    try {
      setUploadError(null);
      const text = await uploadFile.text();
      let matrix: Record<number, Record<number, number>> = createEmptyMatrix(0);

      if (uploadFile.name.endsWith('.json')) {
        const parsed = JSON.parse(text);
        if (parsed.matrix) {
          matrix = parsed.matrix;
        } else if (typeof parsed === 'object') {
          matrix = parsed;
        }
      } else if (uploadFile.name.endsWith('.csv') || uploadFile.name.endsWith('.txt')) {
        const lines = text.split('\n');
        lines.forEach((line) => {
          const parts = line.split(',').map((p) => p.trim());
          if (parts.length >= 2) {
            const sg = parseInt(parts[0], 10);
            if (!isNaN(sg) && sg >= 1 && sg <= 33) {
              matrix[sg] = matrix[sg] || {};
              for (let st = 1; st <= 8; st++) {
                if (parts[st]) {
                  const val = parseFloat(parts[st].replace(/[^0-9.]/g, ''));
                  if (!isNaN(val)) {
                    matrix[sg][st] = val;
                  }
                }
              }
            }
          }
        });
      }

      const trancheTitle =
        uploadTrancheName.trim() ||
        `Uploaded Tranche (${uploadTrancheYear}) - ${uploadFile.name.replace(/\.[^/.]+$/, '')}`;
      const newId = `uploaded-${uploadTrancheYear}-${Date.now()}`;

      const uploadedTrancheObj: SalaryTrancheSchedule = {
        id: newId,
        name: trancheTitle,
        effectiveYear: uploadTrancheYear,
        description: `Imported from file ${uploadFile.name}`,
        matrix,
        isCustom: true
      };

      const updated = [...tranches, uploadedTrancheObj];
      saveAllTranches(updated);
      setTranches(updated);
      setSelectedTrancheId(newId);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTrancheName('');

      onLogAudit('TRANCHE_UPLOADED', 'SYSTEM', `Uploaded salary schedule: ${trancheTitle}`);
      setAppliedNotification(`Successfully imported salary tranche "${trancheTitle}"!`);
      setTimeout(() => setAppliedNotification(null), 4000);
    } catch (err: any) {
      console.error('Failed to parse uploaded tranche file:', err);
      setUploadError(`Failed to parse file: ${err.message || 'Invalid format'}`);
    }
  };

  // Download CSV Template (Blank or Populated)
  const handleDownloadCSVTemplate = (populated: boolean = false) => {
    const csvRows: string[] = ['SalaryGrade,Step1,Step2,Step3,Step4,Step5,Step6,Step7,Step8'];

    for (let sg = 1; sg <= 33; sg++) {
      const rowVals: (number | string)[] = [sg];
      for (let st = 1; st <= 8; st++) {
        if (populated) {
          rowVals.push(getSalaryForSGAndStep(sg, st, selectedTrancheId));
        } else {
          rowVals.push('');
        }
      }
      csvRows.push(rowVals.join(','));
    }

    const csvContent = csvRows.join('\n');
    const fileName = populated
      ? `${currentTranche.name.replace(/[^a-zA-Z0-9]/g, '_')}_Matrix.csv`
      : 'Salary_Tranche_Template_SG1_to_SG33.csv';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onLogAudit('TRANCHE_TEMPLATE_DOWNLOADED', 'SYSTEM', `Downloaded tranche CSV (${populated ? 'Populated' : 'Blank'})`);
    setAppliedNotification(`Downloaded ${populated ? 'populated matrix' : 'blank template'} file: ${fileName}`);
    setTimeout(() => setAppliedNotification(null), 3500);
  };

  // Download JSON Template
  const handleDownloadJSONTemplate = () => {
    const jsonStructure = {
      name: "Custom Salary Schedule",
      effectiveYear: 2025,
      description: "Official Salary Schedule Matrix",
      matrix: currentTranche.matrix
    };

    const jsonStr = JSON.stringify(jsonStructure, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Salary_Schedule_Template.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFilteredGrades = () => {
    let grades = Array.from({ length: 33 }, (_, i) => i + 1);

    if (sgFilterRange === 'TEACHING') {
      grades = grades.filter((sg) => sg >= 11 && sg <= 21);
    } else if (sgFilterRange === 'ADMIN') {
      grades = grades.filter((sg) => sg >= 1 && sg <= 15);
    } else if (sgFilterRange === 'EXECUTIVE') {
      grades = grades.filter((sg) => sg >= 18 && sg <= 33);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      grades = grades.filter((sg) => {
        if (`sg ${sg}`.includes(q) || `grade ${sg}`.includes(q) || `${sg}` === q) return true;
        const matchingPositions: Record<number, string[]> = {
          1: ['aide i'],
          10: ['ao i', 'admin officer i'],
          11: ['teacher i', 'ao ii', 'guidance counselor i'],
          12: ['teacher ii', 'guidance counselor ii'],
          13: ['teacher iii', 'special science teacher i'],
          14: ['head teacher i', 'ao iii'],
          15: ['head teacher ii', 'ao iv', 'nurse'],
          16: ['head teacher iii'],
          17: ['head teacher iv'],
          18: ['master teacher i', 'head teacher v', 'assistant principal i', 'ao v'],
          19: ['master teacher ii', 'head teacher vi', 'assistant principal ii', 'principal i'],
          20: ['master teacher iii', 'principal ii'],
          21: ['master teacher iv', 'principal iii'],
          22: ['principal iv']
        };
        const posArr = matchingPositions[sg] || [];
        return posArr.some((p) => p.includes(q));
      });
    }

    return grades;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-violet-900 via-indigo-900 to-slate-900 rounded-3xl p-6 text-white shadow-xl border border-violet-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-violet-500/20 rounded-2xl backdrop-blur-md border border-violet-400/30 text-cyan-300">
              <TrendingUp className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-400 text-slate-950 tracking-wider">
                  Tranche Schedule Manager
                </span>
                <span className="text-xs text-violet-300 font-bold">
                  Effective Year: {currentTranche.effectiveYear}
                </span>
              </div>
              <h2 className="text-2xl font-black tracking-tight text-white mt-1">
                National Salary Tranches & Service Record Matrix
              </h2>
            </div>
          </div>
          <p className="text-xs text-violet-200/90 max-w-3xl leading-relaxed">
            Upload new or historical salary tranches, select active schedules, or manually edit table cells for years without official digital sheets. Integrated with DepEd Personnel Rosters, Service Records (EO 54), and Step Increments (NOSI).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => handleDownloadCSVTemplate(false)}
            className="px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md transition"
            title="Download CSV Template for Salary Grade 1-33"
          >
            <Download className="w-4 h-4" />
            <span>Download Template</span>
          </button>

          <button
            onClick={() => setShowUploadModal(true)}
            className="px-3.5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md transition"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Tranche Sheet</span>
          </button>

          <button
            onClick={() => setShowNewTrancheModal(true)}
            className="px-3.5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-2xl text-xs flex items-center space-x-2 shadow-md transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Custom Year</span>
          </button>

          <button
            onClick={handleResetTranchesToDefault}
            title="Reset Tranches to Factory Default"
            className="p-2.5 bg-white/10 hover:bg-white/20 text-violet-200 rounded-2xl backdrop-blur-md border border-white/10 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Applied Alert Notification */}
      {appliedNotification && (
        <div className="p-4 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{appliedNotification}</span>
          </div>
          <button
            onClick={() => setAppliedNotification(null)}
            className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tranche Selector bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          <Calendar className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0" />
          <div>
            <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
              Active / Selected Salary Tranche Schedule
            </label>
            <div className="flex items-center space-x-2 mt-0.5">
              <select
                value={selectedTrancheId}
                onChange={(e) => setSelectedTrancheId(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white font-bold text-sm rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {tranches.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.effectiveYear}){t.isCustom ? ' — Custom / Uploaded' : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleClearTrancheValues}
                className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-900/30 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
                title="Zero-out all amounts in this tranche to start with a blank matrix"
              >
                <Eraser className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Clear Matrix Values</span>
              </button>

              {tranches.length > 1 && (
                <button
                  type="button"
                  onClick={handleDeleteTranche}
                  className="px-2 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-500 hover:text-white text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1 transition"
                  title="Delete this salary tranche schedule"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Schedule</span>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
          <Edit3 className="w-4 h-4 text-violet-500 shrink-0" />
          <span>
            <b>Manual Table Editing Enabled:</b> Click any matrix cell in the table below to edit its exact salary rate!
          </span>
        </div>
      </div>

      {/* Calculator & Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calculator Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center space-x-2">
              <Calculator className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Grade & Step Calculator
              </h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300">
              {currentTranche.effectiveYear} Schedule
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Salary Grade (SG)
              </label>
              <select
                value={selectedSG}
                onChange={(e) => setSelectedSG(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              >
                {Array.from({ length: 33 }, (_, i) => i + 1).map((sg) => (
                  <option key={sg} value={sg}>
                    Salary Grade {sg}{' '}
                    {sg === 11
                      ? '(Teacher I)'
                      : sg === 12
                      ? '(Teacher II)'
                      : sg === 13
                      ? '(Teacher III)'
                      : sg === 18
                      ? '(Master Teacher I)'
                      : sg === 19
                      ? '(Master Teacher II / Principal I)'
                      : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Select Step (1 to 8)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((st) => (
                  <button
                    key={st}
                    onClick={() => setSelectedStep(st)}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      selectedStep === st
                        ? 'bg-violet-600 text-white border-violet-600 shadow-md'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    Step {st}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Assign to Personnel Record
              </label>
              <select
                value={selectedPersonnelId}
                onChange={(e) => setSelectedPersonnelId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-3 py-2 text-xs text-slate-800 dark:text-white mb-3"
              >
                {personnelList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName || p.name} — {p.positionTitle || p.title}
                  </option>
                ))}
              </select>

              <button
                onClick={handleApplySalaryToPersonnel}
                className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-2xl shadow-md transition flex items-center justify-center space-x-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>Apply SG {selectedSG} Step {selectedStep} ({formatSalaryPesos(selectedDetails.currentBasicSalary)})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Real-time Detailed Computation Summary */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  {currentTranche.name} Breakdown
                </h3>
              </div>
              <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                SG {selectedSG} — Step {selectedStep}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Monthly Basic Salary
                </span>
                <span className="text-3xl font-black text-slate-900 dark:text-white font-mono">
                  {formatSalaryPesos(selectedDetails.currentBasicSalary)}
                </span>
                <p className="text-[10px] text-slate-500">
                  {currentTranche.description}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Step Increment Differential
                </span>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-extrabold text-violet-600 dark:text-violet-400 font-mono">
                    +{formatSalaryPesos(selectedDetails.incrementAmount)}
                  </span>
                  <span className="text-xs text-slate-500 font-bold">/mo</span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Step {selectedStep} → Step {selectedDetails.nextStep} (+3 Years NOSI)
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">
                  Annualized Basic Salary
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {formatSalaryPesos(selectedDetails.currentBasicSalary * 12)}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-400 text-[10px] font-bold uppercase block mb-1">
                  Daily Equivalent Rate (22 Days)
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                  {formatSalaryPesos(selectedDetails.currentBasicSalary / 22)}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900/40 rounded-2xl text-xs text-violet-900 dark:text-violet-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
              <span>
                <b>CSC & DBM Standard:</b> Salary Grade {selectedSG} is assigned for position titles like{' '}
                <b>
                  {selectedSG === 11
                    ? 'Teacher I / AO II'
                    : selectedSG === 12
                    ? 'Teacher II'
                    : selectedSG === 13
                    ? 'Teacher III'
                    : selectedSG === 18
                    ? 'Master Teacher I / AO V'
                    : selectedSG === 19
                    ? 'Master Teacher II / Principal I'
                    : `Civil Service Grade ${selectedSG} Personnel`}
                </b>.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Full Interactive Tranche Matrix Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-600" />
              {currentTranche.name} Table (Steps 1 to 8)
            </h3>
            <p className="text-xs text-slate-500">
              Click any cell to edit its salary value directly on the table for custom/missing years!
            </p>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSgFilterRange('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                sgFilterRange === 'ALL'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All (SG 1 - 33)
            </button>
            <button
              onClick={() => setSgFilterRange('TEACHING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                sgFilterRange === 'TEACHING'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Teaching (SG 11-21)
            </button>
            <button
              onClick={() => setSgFilterRange('ADMIN')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                sgFilterRange === 'ADMIN'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Admin (SG 1-15)
            </button>
            <button
              onClick={() => setSgFilterRange('EXECUTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                sgFilterRange === 'EXECUTIVE'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Executive (SG 18-33)
            </button>
          </div>
        </div>

        {/* Matrix Search Bar */}
        <div className="relative max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search Salary Grade or Position (e.g., 'SG 11', 'Teacher III')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>

        {/* Responsive Table with Direct Manual Cell Editing */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-extrabold uppercase border-b border-slate-200 dark:border-slate-700">
                <th className="p-3.5 sticky left-0 bg-slate-100 dark:bg-slate-800 z-10 shadow-xs">
                  Salary Grade
                </th>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((st) => (
                  <th key={st} className="p-3.5 text-right font-mono">
                    Step {st}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
              {getFilteredGrades().map((sg) => {
                const isSelectedSGRow = selectedSG === sg;
                return (
                  <tr
                    key={sg}
                    className={`transition hover:bg-violet-50/50 dark:hover:bg-violet-950/20 ${
                      isSelectedSGRow ? 'bg-violet-50/80 dark:bg-violet-950/30' : ''
                    }`}
                  >
                    <td className="p-3.5 font-bold sticky left-0 bg-white dark:bg-slate-900 z-10 border-r border-slate-100 dark:border-slate-800">
                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-mono text-xs font-black">
                          {sg}
                        </span>
                        <span className="text-xs text-slate-800 dark:text-slate-200">
                          Grade {sg}
                        </span>
                      </div>
                    </td>

                    {[1, 2, 3, 4, 5, 6, 7, 8].map((st) => {
                      const val = getSalaryForSGAndStep(sg, st, selectedTrancheId);
                      const isEditingThisCell = editingCell?.sg === sg && editingCell?.step === st;
                      const isSelectedCell = selectedSG === sg && selectedStep === st;

                      return (
                        <td
                          key={st}
                          onClick={() => {
                            setSelectedSG(sg);
                            setSelectedStep(st);
                          }}
                          className={`p-3.5 text-right font-mono transition relative group cursor-pointer ${
                            isSelectedCell
                              ? 'bg-violet-600 text-white font-black shadow-inner'
                              : 'hover:bg-violet-100 dark:hover:bg-violet-900/50'
                          }`}
                        >
                          {isEditingThisCell ? (
                            <div className="flex items-center justify-end space-x-1" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="text"
                                autoFocus
                                value={editingCellValue}
                                onChange={(e) => setEditingCellValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveCellEdit();
                                  if (e.key === 'Escape') setEditingCell(null);
                                }}
                                className="w-24 px-2 py-1 bg-white text-slate-900 border-2 border-violet-500 rounded text-right font-mono font-bold text-xs"
                              />
                              <button
                                onClick={handleSaveCellEdit}
                                className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                                title="Save Value"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              <span>{val.toLocaleString('en-PH')}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartCellEdit(sg, st);
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1 hover:bg-violet-200 dark:hover:bg-violet-800 rounded text-violet-700 dark:text-violet-300 transition ml-1"
                                title={`Manually edit SG ${sg} Step ${st}`}
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: Upload Tranche File Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Upload Historical or New Salary Tranche
                </h3>
              </div>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {uploadError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 rounded-xl font-bold">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tranche Schedule Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2018 SSL Tranche III / DepEd 2025 Schedule"
                  value={uploadTrancheName}
                  onChange={(e) => setUploadTrancheName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Effective Year
                </label>
                <input
                  type="number"
                  value={uploadTrancheYear}
                  onChange={(e) => setUploadTrancheYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select File (.CSV or .JSON)
                </label>
                <input
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-cyan-500 file:text-slate-950"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  CSV format example: Column 1 = SG (1-33), Column 2 to 9 = Step 1 to Step 8 monthly amounts.
                </p>
              </div>

              {/* Template Download Card */}
              <div className="p-3 bg-violet-500/10 border border-violet-500/20 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-violet-900 dark:text-violet-200 text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                    Download Salary Tranche Templates:
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleDownloadCSVTemplate(false)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1 shadow-xs transition"
                  >
                    <Download className="w-3 h-3 text-emerald-500" />
                    <span>Blank CSV Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadCSVTemplate(true)}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1 shadow-xs transition"
                  >
                    <Download className="w-3 h-3 text-cyan-500" />
                    <span>Export Active Tranche CSV</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadJSONTemplate}
                    className="px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-400 rounded-lg text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center space-x-1 shadow-xs transition"
                  >
                    <Download className="w-3 h-3 text-amber-500" />
                    <span>JSON Schema</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleUploadTrancheFile}
                className="px-4 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl shadow-md"
              >
                Upload & Import Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create Custom Tranche Year Modal */}
      {showNewTrancheModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <PlusCircle className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                  Create Custom Year Tranche Schedule
                </h3>
              </div>
              <button
                onClick={() => setShowNewTrancheModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tranche Schedule Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2012 Historical Salary Schedule / 2027 Projected"
                  value={newTrancheName}
                  onChange={(e) => setNewTrancheName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Effective Year
                </label>
                <input
                  type="number"
                  value={newTrancheYear}
                  onChange={(e) => setNewTrancheYear(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Template / Baseline
                </label>
                <select
                  value={newTrancheBaseTemplate}
                  onChange={(e) => setNewTrancheBaseTemplate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                >
                  {tranches.map((t) => (
                    <option key={t.id} value={t.id}>
                      Clone from {t.name} ({t.effectiveYear})
                    </option>
                  ))}
                  <option value="">Start Empty Matrix (0 values)</option>
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can edit individual values on the table directly after creating the tranche!
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description / Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Custom manually inputted tranche for historical service records"
                  value={newTrancheDesc}
                  onChange={(e) => setNewTrancheDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowNewTrancheModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewTranche}
                className="px-4 py-2 text-xs font-bold bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md"
              >
                Create Tranche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
