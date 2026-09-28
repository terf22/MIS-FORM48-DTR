import React, { useState } from 'react';
import {
  Award,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  FileText,
  Copy,
  Printer,
  ChevronRight,
  Filter,
  Plus,
  Baby,
  Building2,
  FileCode,
  UserCheck,
  Search
} from 'lucide-react';
import { Personnel } from '../types';
import {
  calculateStepIncrement,
  generateNOSIMemo,
  generateNOSIExportJSON,
  StepIncrementResult
} from '../utils/stepIncrementEngine';

interface NOSIViewProps {
  personnelList: Personnel[];
  onUpdatePersonnelStep: (personnelId: string, updatedTracking: any) => void;
  searchTerm?: string;
}

export const NOSIView: React.FC<NOSIViewProps> = ({
  personnelList,
  onUpdatePersonnelStep,
  searchTerm = ''
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [selectedPersonnel, setSelectedPersonnel] = useState<Personnel | null>(null);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState<boolean>(false);
  const [isMemoModalOpen, setIsMemoModalOpen] = useState<boolean>(false);
  const [isJsonModalOpen, setIsJsonModalOpen] = useState<boolean>(false);

  // Form State for Calculator
  const [calcForm, setCalcForm] = useState<{
    effectiveStartDate: string;
    lastEventType: 'STEP_INCREMENT' | 'PROMOTION' | 'RECLASSIFICATION';
    maternityLeaveDays: number;
    currentStep: number;
  }>({
    effectiveStartDate: '2023-08-01',
    lastEventType: 'STEP_INCREMENT',
    maternityLeaveDays: 0,
    currentStep: 1,
  });

  // Calculate overall stats
  const processedRecords = personnelList.map((p) => {
    const tracking = p.stepIncrementTracking || {
      currentStep: 1,
      effectiveStartDate: '2023-08-01',
      lastEventType: 'STEP_INCREMENT' as const,
      maternityLeaveDays: 0,
      adjustedNextDueDate: '2026-08-01',
      status: 'ON TRACK' as const,
      notificationTrigger: false,
    };

    const calcResult = calculateStepIncrement({
      employeeNumber: p.employeeNumber || p.employeeId,
      fullName: p.fullName || p.name,
      itemNumber: p.itemNumber || '-',
      effectiveStartDate: tracking.effectiveStartDate,
      lastEventType: tracking.lastEventType,
      maternityLeaveDays: tracking.maternityLeaveDays,
      currentStep: tracking.currentStep,
    });

    return {
      personnel: p,
      result: calcResult,
    };
  });

  const dueNowCount = processedRecords.filter((r) => r.result.step_increment_tracking.status === 'DUE NOW').length;
  const upcomingCount = processedRecords.filter((r) => r.result.step_increment_tracking.status === 'UPCOMING (60 DAYS)').length;
  const onTrackCount = processedRecords.filter((r) => r.result.step_increment_tracking.status === 'ON TRACK').length;
  const resetCount = processedRecords.filter((r) => r.result.step_increment_tracking.status === 'RESET APPLIED').length;

  const filteredRecords = processedRecords.filter(({ personnel, result }) => {
    const matchesSearch =
      (personnel.fullName || personnel.name).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (personnel.employeeNumber || personnel.employeeId).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (personnel.positionTitle || personnel.title).toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'ALL') return true;
    return result.step_increment_tracking.status === filterStatus;
  });

  const handleOpenCalcModal = (p: Personnel) => {
    setSelectedPersonnel(p);
    const tracking = p.stepIncrementTracking;
    setCalcForm({
      effectiveStartDate: tracking?.effectiveStartDate || '2023-08-01',
      lastEventType: tracking?.lastEventType || 'STEP_INCREMENT',
      maternityLeaveDays: tracking?.maternityLeaveDays || 0,
      currentStep: tracking?.currentStep || 1,
    });
    setIsCalcModalOpen(true);
  };

  const handleSaveCalculation = () => {
    if (!selectedPersonnel) return;

    const result = calculateStepIncrement({
      employeeNumber: selectedPersonnel.employeeNumber || selectedPersonnel.employeeId,
      fullName: selectedPersonnel.fullName || selectedPersonnel.name,
      itemNumber: selectedPersonnel.itemNumber || 'OSEC-DECSB-2024',
      effectiveStartDate: calcForm.effectiveStartDate,
      lastEventType: calcForm.lastEventType,
      maternityLeaveDays: calcForm.maternityLeaveDays,
      currentStep: calcForm.currentStep,
    });

    const updatedTracking = {
      currentStep: calcForm.currentStep,
      effectiveStartDate: calcForm.effectiveStartDate,
      lastEventType: calcForm.lastEventType,
      maternityLeaveDays: calcForm.maternityLeaveDays,
      adjustedNextDueDate: result.step_increment_tracking.adjusted_next_due_date,
      status: result.step_increment_tracking.status,
      notificationTrigger: result.step_increment_tracking.notification_trigger,
    };

    onUpdatePersonnelStep(selectedPersonnel.id, updatedTracking);
    setIsCalcModalOpen(false);
  };

  const currentCalcPreview = selectedPersonnel
    ? calculateStepIncrement({
        employeeNumber: selectedPersonnel.employeeNumber || selectedPersonnel.employeeId,
        fullName: selectedPersonnel.fullName || selectedPersonnel.name,
        itemNumber: selectedPersonnel.itemNumber || 'OSEC-DECSB-2024',
        effectiveStartDate: calcForm.effectiveStartDate,
        lastEventType: calcForm.lastEventType,
        maternityLeaveDays: calcForm.maternityLeaveDays,
        currentStep: calcForm.currentStep,
      })
    : null;

  const currentMemoText = selectedPersonnel && currentCalcPreview
    ? generateNOSIMemo(selectedPersonnel, currentCalcPreview)
    : '';

  return (
    <div className="space-y-6">
      {/* Header Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">
                Step Increment & NOSI Engine
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Civil Service Commission (CSC) & DBM 3-Year Cycle Tracking, Promotion Resets, & RA 11210 Maternity Leave Adjustments
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium hidden md:block">
            Auto-Sync Status: <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setFilterStatus('DUE NOW')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'DUE NOW'
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-rose-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> DUE NOW
            </span>
            <span className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">{dueNowCount}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Personnel eligible for Notice of Step Increment (NOSI) immediately
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('UPCOMING (60 DAYS)')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'UPCOMING (60 DAYS)'
              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <Clock className="w-4 h-4" /> UPCOMING (60 DAYS)
            </span>
            <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-300">{upcomingCount}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Reaching 3-year service milestone within the next 60 days
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('ON TRACK')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'ON TRACK'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> ON TRACK
            </span>
            <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">{onTrackCount}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Actively serving continuous 3-year cycle with no alerts
          </p>
        </div>

        <div
          onClick={() => setFilterStatus('RESET APPLIED')}
          className={`cursor-pointer p-4 rounded-2xl border transition-all ${
            filterStatus === 'RESET APPLIED'
              ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 shadow-md'
              : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
              <RefreshCw className="w-4 h-4" /> RESET APPLIED
            </span>
            <span className="text-2xl font-extrabold text-blue-700 dark:text-blue-300">{resetCount}</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Timer reset to 0 upon recent Promotion or Reclassification
          </p>
        </div>
      </div>

      {/* Filter & Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
        <div className="flex items-center space-x-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1 mr-2">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['ALL', 'DUE NOW', 'UPCOMING (60 DAYS)', 'ON TRACK', 'RESET APPLIED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                filterStatus === st
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Showing <span className="font-bold text-slate-800 dark:text-white">{filteredRecords.length}</span> of {personnelList.length} Personnel
        </div>
      </div>

      {/* Roster Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="p-4">Personnel & Item No.</th>
                <th className="p-4">Position / Station</th>
                <th className="p-4 text-center">Current Step</th>
                <th className="p-4">Effective Start Date</th>
                <th className="p-4">Event Type</th>
                <th className="p-4">Maternity Leave (RA 11210)</th>
                <th className="p-4">Next Step Due Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-slate-700 dark:text-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    No personnel records found matching current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredRecords.map(({ personnel: p, result }) => {
                  const tracking = result.step_increment_tracking;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 font-medium">
                        <div className="flex items-center space-x-3">
                          <img
                            src={p.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                            alt={p.fullName || p.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-violet-500/20"
                          />
                          <div>
                            <div className="font-bold text-slate-800 dark:text-white text-xs sm:text-sm">
                              {p.fullName || p.name}
                            </div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              EMP: {p.employeeNumber || p.employeeId} | Item: {p.itemNumber || 'OSEC-DECSB'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {p.positionTitle || p.title}
                        </div>
                        <div className="text-[10px] text-slate-400 dark:text-slate-500">
                          {p.districtOrSchool || p.departmentName}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-violet-100 dark:bg-violet-950/60 text-violet-700 dark:text-violet-300">
                          Step {tracking.current_step} → Step {tracking.next_step}
                        </span>
                      </td>

                      <td className="p-4 font-mono text-slate-600 dark:text-slate-300">
                        {tracking.effective_start_date}
                      </td>

                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {tracking.last_event_type}
                        </span>
                      </td>

                      <td className="p-4">
                        {tracking.maternity_leave_adjustments_days > 0 ? (
                          <span className="inline-flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold text-[11px]">
                            <Baby className="w-3.5 h-3.5" /> +{tracking.maternity_leave_adjustments_days} Days Shift
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">None</span>
                        )}
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-800 dark:text-white">
                        {tracking.adjusted_next_due_date}
                      </td>

                      <td className="p-4 text-center">
                        {tracking.status === 'DUE NOW' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 flex items-center justify-center gap-1">
                            <AlertCircle className="w-3 h-3" /> DUE NOW
                          </span>
                        )}
                        {tracking.status === 'UPCOMING (60 DAYS)' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1">
                            <Clock className="w-3 h-3" /> UPCOMING
                          </span>
                        )}
                        {tracking.status === 'ON TRACK' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> ON TRACK
                          </span>
                        )}
                        {tracking.status === 'RESET APPLIED' && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center gap-1">
                            <RefreshCw className="w-3 h-3" /> RESET
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleOpenCalcModal(p)}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-medium transition text-[11px] flex items-center gap-1"
                            title="Recalculate or Edit Service Dates"
                          >
                            <Calendar className="w-3.5 h-3.5" /> Recalc
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPersonnel(p);
                              setIsMemoModalOpen(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold transition text-[11px] flex items-center gap-1 shadow-sm"
                            title="Generate Official NOSI Notice Memo"
                          >
                            <FileText className="w-3.5 h-3.5" /> NOSI
                          </button>

                          <button
                            onClick={() => {
                              setSelectedPersonnel(p);
                              setIsJsonModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-mono text-[10px] transition"
                            title="View / Copy API JSON"
                          >
                            <FileCode className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CALCULATOR / EDIT MODAL */}
      {isCalcModalOpen && selectedPersonnel && currentCalcPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Step Increment Engine Calculator
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {selectedPersonnel.fullName || selectedPersonnel.name} ({selectedPersonnel.employeeNumber || selectedPersonnel.employeeId})
                </p>
              </div>
              <button
                onClick={() => setIsCalcModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Current Step (1 to 8)
                </label>
                <select
                  value={calcForm.currentStep}
                  onChange={(e) => setCalcForm({ ...calcForm, currentStep: parseInt(e.target.value) })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
                    <option key={s} value={s}>
                      Step {s}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Effective Start Date of Current Step / Promotion
                </label>
                <input
                  type="date"
                  value={calcForm.effectiveStartDate}
                  onChange={(e) => setCalcForm({ ...calcForm, effectiveStartDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Last Event Type
                </label>
                <select
                  value={calcForm.lastEventType}
                  onChange={(e) =>
                    setCalcForm({
                      ...calcForm,
                      lastEventType: e.target.value as any,
                    })
                  }
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white"
                >
                  <option value="STEP_INCREMENT">Regular Step Increment (3-Year Cycle)</option>
                  <option value="PROMOTION">Promotion (Resets Timer to 0)</option>
                  <option value="RECLASSIFICATION">Position Reclassification (Resets Timer to 0)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                  <span>Maternity Leave Adjustment (RA 11210)</span>
                  <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">+105 Days / Instance</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={calcForm.maternityLeaveDays}
                    onChange={(e) => setCalcForm({ ...calcForm, maternityLeaveDays: parseInt(e.target.value) || 0 })}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setCalcForm({ ...calcForm, maternityLeaveDays: 105 })}
                    className="px-3 py-2 bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-xl text-xs font-bold whitespace-nowrap hover:bg-purple-200"
                  >
                    +105 Days
                  </button>
                </div>
              </div>

              {/* Real-time Calculation Result Box */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="font-bold text-slate-800 dark:text-white flex items-center justify-between">
                  <span>Calculated Outcome:</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-violet-600 text-white">
                    {currentCalcPreview.step_increment_tracking.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">Base Due Date (+3 Yrs):</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                      {currentCalcPreview.step_increment_tracking.base_due_date}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Adjusted Next Due Date:</span>
                    <span className="font-mono font-bold text-violet-600 dark:text-violet-400">
                      {currentCalcPreview.step_increment_tracking.adjusted_next_due_date}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsCalcModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCalculation}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold shadow-md transition"
              >
                Save & Update Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFICIAL NOSI MEMO PREVIEW MODAL */}
      {isMemoModalOpen && selectedPersonnel && currentMemoText && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Notice of Step Increment (NOSI) Draft
                </h3>
              </div>
              <button
                onClick={() => setIsMemoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed select-all">
              {currentMemoText}
            </div>

            <div className="flex items-center justify-between pt-2 shrink-0">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(currentMemoText);
                  alert('NOSI Notice text copied to clipboard!');
                }}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <Copy className="w-4 h-4" /> Copy Text
              </button>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsMemoModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
                >
                  <Printer className="w-4 h-4" /> Print NOSI Document
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JSON DATA MODAL */}
      {isJsonModalOpen && selectedPersonnel && currentCalcPreview && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 border border-slate-100 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <FileCode className="w-5 h-5 text-violet-600" />
                <div>
                  <h3 className="text-base font-bold text-slate-800 dark:text-white">
                    Automated NOSI Printing JSON (Form F-ADM-PER-025-0)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    DepEd Division Export Object conforming to CSC-DBM Joint Circular No. 1, s. 2012
                  </p>
                </div>
              </div>
              <button onClick={() => setIsJsonModalOpen(false)} className="text-slate-400 font-bold">
                ✕
              </button>
            </div>

            <pre className="bg-slate-950 text-emerald-400 p-4 rounded-2xl font-mono text-xs overflow-x-auto max-h-96 select-all">
              {JSON.stringify(generateNOSIExportJSON(selectedPersonnel, currentCalcPreview), null, 2)}
            </pre>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  const exportJson = generateNOSIExportJSON(selectedPersonnel, currentCalcPreview);
                  navigator.clipboard.writeText(JSON.stringify(exportJson, null, 2));
                  alert('DepEd NOSI Form F-ADM-PER-025-0 JSON copied to clipboard!');
                }}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Copy className="w-3.5 h-3.5" /> Copy NOSI Printing JSON
              </button>
              <button
                onClick={() => setIsJsonModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
