import React, { useState } from 'react';
import {
  GitMerge,
  ShieldCheck,
  AlertTriangle,
  UserCheck,
  UserPlus,
  CheckCircle2,
  ArrowRight,
  Clock,
  Building2,
  Briefcase,
  HelpCircle,
  FileSpreadsheet,
  Layers,
  Sparkles,
  Info,
  X,
  Check,
  ChevronRight,
  Users
} from 'lucide-react';
import {
  SmartMergeAnalysis,
  ConflictResolutionChoice,
  Personnel,
  MonthlyDTR
} from '../types';

interface SmartMergeModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: SmartMergeAnalysis | null;
  onExecuteMerge: (
    analysis: SmartMergeAnalysis,
    resolutions: Record<string, ConflictResolutionChoice>
  ) => void;
}

export const SmartMergeModal: React.FC<SmartMergeModalProps> = ({
  isOpen,
  onClose,
  analysis,
  onExecuteMerge
}) => {
  if (!isOpen || !analysis) return null;

  const [activeTab, setActiveTab] = useState<'conflicts' | 'safe' | 'new'>('conflicts');
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolutionChoice>>(() => {
    const initial: Record<string, ConflictResolutionChoice> = {};
    analysis.conflicts.forEach((c) => {
      initial[c.id] = c.conflictType === 'ID_MATCH_NAME_MISMATCH' ? 'CREATE_SEPARATE' : 'MERGE_EXISTING';
    });
    return initial;
  });

  const [activeConflictIdx, setActiveConflictIdx] = useState(0);

  const safeCount = analysis.safeAutoMerges.length;
  const conflictCount = analysis.conflicts.length;
  const newCount = analysis.newPersonnel.length;

  const handleSetResolution = (conflictId: string, choice: ConflictResolutionChoice) => {
    setResolutions((prev) => ({
      ...prev,
      [conflictId]: choice
    }));
  };

  const handleConfirm = () => {
    onExecuteMerge(analysis, resolutions);
    onClose();
  };

  const currentConflict = analysis.conflicts[activeConflictIdx];

  return (
    <div className="fixed inset-0 bg-slate-900/70 dark:bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-5xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Ribbon */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white flex items-start justify-between border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-400">
                <GitMerge className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
                <span>Smart Merge</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold uppercase tracking-wider">
                  Biometrics Reconciliation Engine
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Analyzes raw machine punch logs against Mangusu Integrated School's official personnel roster. Automatically detects fuzzy typos, tolerates Philippine compound surnames, and protects Form 48 metadata from accidental overwrites.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Three Intelligent Classification Pathways Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-4 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
          {/* Safe Auto-Merge */}
          <button
            onClick={() => setActiveTab('safe')}
            className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between ${
              activeTab === 'safe'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Condition A: Safe Auto-Merge</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ID & Name match roster. Preserves Plantilla & metadata.
              </p>
            </div>
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 ml-2">
              {safeCount}
            </span>
          </button>

          {/* Interactive Conflict Wizard */}
          <button
            onClick={() => setActiveTab('conflicts')}
            className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between relative ${
              activeTab === 'conflicts'
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-amber-300'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>Condition B: Conflict Wizard</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Re-assigned hardware slots or ID/Name discrepancies.
              </p>
            </div>
            <span className={`text-xl font-black ml-2 ${conflictCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`}>
              {conflictCount}
            </span>
          </button>

          {/* New Personnel Onboarding */}
          <button
            onClick={() => setActiveTab('new')}
            className={`p-3.5 rounded-2xl text-left border transition flex items-center justify-between ${
              activeTab === 'new'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 shadow-xs'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300'
            }`}
          >
            <div className="space-y-0.5">
              <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
                <UserPlus className="w-4 h-4" />
                <span>New Personnel Onboarding</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Staff detected on device not yet catalogued in roster.
              </p>
            </div>
            <span className="text-xl font-black text-blue-600 dark:text-blue-400 ml-2">
              {newCount}
            </span>
          </button>
        </div>

        {/* Main Tab Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: CONFLICT RESOLUTION WIZARD */}
          {activeTab === 'conflicts' && (
            <div className="space-y-6">
              {conflictCount === 0 ? (
                <div className="text-center py-12 space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl p-8">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Zero Collisions Detected!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                    All terminal IDs and employee names cleanly match your existing school personnel database. You can proceed with Safe Auto-Merge.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Conflict Selector Tabs if multiple */}
                  {conflictCount > 1 && (
                    <div className="flex items-center space-x-2 overflow-x-auto pb-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider text-[11px] whitespace-nowrap">
                        Reviewing Conflict:
                      </span>
                      {analysis.conflicts.map((c, idx) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveConflictIdx(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
                            activeConflictIdx === idx
                              ? 'bg-amber-600 text-white shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <span>#{idx + 1}: AC-No {c.terminalAcNo}</span>
                          <span className={`w-2 h-2 rounded-full ${resolutions[c.id] === 'MERGE_EXISTING' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active Conflict Side-by-Side Review Card */}
                  {currentConflict && (
                    <div className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700/80 rounded-3xl p-6 shadow-sm space-y-6">
                      
                      {/* Collision Banner */}
                      <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 flex items-start space-x-3 text-amber-900 dark:text-amber-200">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                        <div className="space-y-1">
                          <div className="text-xs font-bold tracking-tight">
                            {currentConflict.conflictType === 'ID_MATCH_NAME_MISMATCH'
                              ? 'Terminal ID Match, But Name Mismatch (Hardware Slot Reassigned)'
                              : 'Name Match, But Terminal ID Discrepancy'}
                          </div>
                          <p className="text-xs opacity-90 leading-relaxed">
                            {currentConflict.conflictDescription}
                          </p>
                        </div>
                      </div>

                      {/* Side-by-Side Comparison Container */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        
                        {/* LEFT: Incoming Biometric Terminal Punch Record */}
                        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                              <Clock className="w-4 h-4 text-emerald-500" />
                              Incoming Biometric Machine Record
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                              Terminal Data
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Terminal AC-No:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                                #{currentConflict.terminalAcNo}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Raw Terminal String:</span>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                                {currentConflict.rawTerminalName || '(Blank / ID Only)'}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Smart Parsed Name:</span>
                              <span className="font-bold text-slate-800 dark:text-slate-100">
                                {currentConflict.parsedName.formattedFullName}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Extracted Punches:</span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {currentConflict.logs.length} Days of Attendance Logs
                              </span>
                            </div>

                            <div className="pt-1">
                              <span className="text-[10px] text-slate-400 block mb-1">Sample Punch Times (First 3 Days):</span>
                              <div className="space-y-1 font-mono text-[11px] bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-800">
                                {currentConflict.logs.slice(0, 3).map((l) => (
                                  <div key={l.day} className="flex justify-between text-slate-600 dark:text-slate-300">
                                    <span>Day {l.day}:</span>
                                    <span>{l.amArrival || '--:--'} - {l.amDeparture || '--:--'} | {l.pmArrival || '--:--'} - {l.pmDeparture || '--:--'}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* RIGHT: Existing School Personnel Roster Profile */}
                        <div className="bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                              <UserCheck className="w-4 h-4 text-blue-500" />
                              Existing School Roster Record
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">
                              Roster Master
                            </span>
                          </div>

                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Roster Employee No:</span>
                              <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                                #{currentConflict.matchedPersonnel.employeeNumber || currentConflict.matchedPersonnel.employeeId}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Teacher Full Name:</span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {currentConflict.matchedPersonnel.fullName}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Plantilla Item Number:</span>
                              <span className="font-mono text-slate-600 dark:text-slate-300">
                                {currentConflict.matchedPersonnel.itemNumber || 'Not set'}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Salary Grade & Step:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-200">
                                SG {currentConflict.matchedPersonnel.salaryGrade || 11} Step {currentConflict.matchedPersonnel.salaryStep || 1}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Assigned Department:</span>
                              <span className="text-slate-700 dark:text-slate-200">
                                {currentConflict.matchedPersonnel.departmentName}
                              </span>
                            </div>

                            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/80">
                              <span className="text-slate-400">Name Match Confidence:</span>
                              <span className={`font-bold ${currentConflict.nameSimilarityScore >= 75 ? 'text-emerald-500' : 'text-amber-500'}`}>
                                {currentConflict.nameSimilarityScore}% Similarity
                              </span>
                            </div>
                          </div>
                        </div>

                      </div>

                      {/* Conflict Action Selector */}
                      <div className="bg-slate-100 dark:bg-slate-800/60 p-4 rounded-2xl space-y-3">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block uppercase tracking-wider text-[11px]">
                          Choose Resolution Pathway for AC-No #{currentConflict.terminalAcNo}:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          
                          {/* Choice 1: Merge with Existing Record */}
                          <button
                            type="button"
                            onClick={() => handleSetResolution(currentConflict.id, 'MERGE_EXISTING')}
                            className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                              resolutions[currentConflict.id] === 'MERGE_EXISTING'
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md ring-2 ring-emerald-400/40'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-emerald-400'
                            }`}
                          >
                            <div className="mt-0.5">
                              <Check className="w-4 h-4 flex-shrink-0" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-bold block">
                                Merge with Existing Record
                              </span>
                              <p className={`text-[11px] ${resolutions[currentConflict.id] === 'MERGE_EXISTING' ? 'text-emerald-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                Consolidates attendance days into <b>{currentConflict.matchedPersonnel.fullName}</b>'s Form 48 monthly card and links terminal ID #{currentConflict.terminalAcNo}.
                              </p>
                            </div>
                          </button>

                          {/* Choice 2: Create as Separate Person */}
                          <button
                            type="button"
                            onClick={() => handleSetResolution(currentConflict.id, 'CREATE_SEPARATE')}
                            className={`p-3 rounded-xl border text-left transition flex items-start space-x-2.5 ${
                              resolutions[currentConflict.id] === 'CREATE_SEPARATE'
                                ? 'bg-blue-600 text-white border-blue-500 shadow-md ring-2 ring-blue-400/40'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:border-blue-400'
                            }`}
                          >
                            <div className="mt-0.5">
                              <UserPlus className="w-4 h-4 flex-shrink-0" />
                            </div>
                            <div className="space-y-1">
                              <span className="text-xs font-bold block">
                                Create as Separate Person
                              </span>
                              <p className={`text-[11px] ${resolutions[currentConflict.id] === 'CREATE_SEPARATE' ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                Generates an independent profile for <b>{currentConflict.parsedName.formattedFullName}</b> (hardware slot was re-assigned to a new staff member).
                              </p>
                            </div>
                          </button>

                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SAFE AUTO-MERGE LIST */}
          {activeTab === 'safe' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                  <span>
                    <b>Condition A: Safe Auto-Merge</b> — {safeCount} personnel records matched with 100% confidence. Existing Plantilla item numbers, Salary Grades, Step increments, and Leave balances are strictly preserved.
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">AC-No</th>
                      <th className="p-3">Matched Personnel Name</th>
                      <th className="p-3">Position Title</th>
                      <th className="p-3">Plantilla Item</th>
                      <th className="p-3">Punch Days</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {analysis.safeAutoMerges.map((rec) => (
                      <tr key={rec.terminalAcNo} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          #{rec.terminalAcNo}
                        </td>
                        <td className="p-3 font-bold text-emerald-700 dark:text-emerald-400">
                          {rec.personnel.fullName}
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">
                          {rec.personnel.positionTitle}
                        </td>
                        <td className="p-3 font-mono text-[11px] text-slate-500">
                          {rec.personnel.itemNumber || '--'}
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                          {rec.daysCount} days
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 flex items-center gap-1 w-max">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Auto-Verified</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                    {analysis.safeAutoMerges.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                          No exact matching records detected for Condition A.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: NEW PERSONNEL ONBOARDING */}
          {activeTab === 'new' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-200 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                  <span>
                    <b>New Personnel Onboarding</b> — Detected {newCount} staff members on biometric device who do not yet exist in your school roster. They will be prepared as new employee profiles with complete Form 48 monthly cards.
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700">
                      <th className="p-3">Terminal ID</th>
                      <th className="p-3">Raw Name</th>
                      <th className="p-3">Smart Parsed Name (First, MI, Last)</th>
                      <th className="p-3">Position Title</th>
                      <th className="p-3">Attendance Days</th>
                      <th className="p-3">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200">
                    {analysis.newPersonnel.map((cand) => (
                      <tr key={cand.tempId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                          #{cand.terminalAcNo}
                        </td>
                        <td className="p-3 font-mono text-slate-500">
                          {cand.rawTerminalName}
                        </td>
                        <td className="p-3 font-bold text-blue-700 dark:text-blue-400">
                          {cand.fullName}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={cand.positionTitle}
                            onChange={(e) => {
                              cand.positionTitle = e.target.value;
                            }}
                            className="p-1.5 text-xs rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100"
                          />
                        </td>
                        <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                          {cand.daysCount} days
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300">
                            Ready to Onboard
                          </span>
                        </td>
                      </tr>
                    ))}
                    {analysis.newPersonnel.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                          No uncatalogued personnel detected on biometric device.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer Controls */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-2">
            <Info className="w-4 h-4 text-indigo-500" />
            <span>
              Reconciling <b>{analysis.totalRecords}</b> punch records across {analysis.safeAutoMerges.length + analysis.conflicts.length + analysis.newPersonnel.length} personnel.
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black shadow-lg flex items-center space-x-2 transition"
            >
              <GitMerge className="w-4 h-4" />
              <span>Execute Smart Merge & Update Form 48 DTRs</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
