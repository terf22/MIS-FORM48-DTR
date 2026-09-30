import React, { useState, useEffect } from 'react';
import { Award, X, ShieldCheck, Building2, Check, Users } from 'lucide-react';
import { Department, Personnel } from '../types';

interface EditInChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersonnel: Personnel | null;
  departments: Department[];
  currentInChargeName: string;
  currentInChargeTitle?: string;
  currentVerifiedDate?: string;
  onUpdateInCharge: (
    headName: string,
    headTitle: string,
    targetDeptId?: string,
    applyToAll?: boolean,
    verifiedDate?: string
  ) => void;
}

export const EditInChargeModal: React.FC<EditInChargeModalProps> = ({
  isOpen,
  onClose,
  selectedPersonnel,
  departments,
  currentInChargeName,
  currentInChargeTitle,
  currentVerifiedDate,
  onUpdateInCharge
}) => {
  const [inChargeName, setInChargeName] = useState('');
  const [inChargeTitle, setInChargeTitle] = useState('In-Charge / Department Head');
  const [verifiedDate, setVerifiedDate] = useState('');
  const [targetDeptId, setTargetDeptId] = useState('');
  const [applyScope, setApplyScope] = useState<'department' | 'all'>('department');

  useEffect(() => {
    if (currentInChargeName) {
      setInChargeName(currentInChargeName);
    } else if (selectedPersonnel) {
      const dept = departments.find((d) => d.id === selectedPersonnel.departmentId);
      setInChargeName(dept?.headName || 'DR. ROBERTO V. GARCIA');
    }

    if (currentInChargeTitle) {
      setInChargeTitle(currentInChargeTitle);
    } else if (selectedPersonnel) {
      const dept = departments.find((d) => d.id === selectedPersonnel.departmentId);
      setInChargeTitle(dept?.headTitle || 'In-Charge / Department Head');
    }

    if (currentVerifiedDate) {
      setVerifiedDate(currentVerifiedDate);
    }

    if (selectedPersonnel) {
      setTargetDeptId(selectedPersonnel.departmentId);
    } else if (departments.length > 0) {
      setTargetDeptId(departments[0].id);
    }
  }, [currentInChargeName, currentInChargeTitle, currentVerifiedDate, selectedPersonnel, departments, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inChargeName.trim()) return;

    onUpdateInCharge(
      inChargeName.trim().toUpperCase(),
      inChargeTitle.trim(),
      targetDeptId,
      applyScope === 'all',
      verifiedDate.trim()
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-xl text-slate-800 dark:text-slate-100 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 border-b border-slate-200 dark:border-slate-800 pb-4 mb-4">
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">Edit In-Charge / Department Head</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Configure the official signatory appearing on CSC Form 48 DTRs</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Official In-Charge Full Name */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              In-Charge / Department Head Name (Printed Signature Block) *
            </label>
            <input
              type="text"
              required
              placeholder="e.g., DR. ROBERTO V. GARCIA"
              value={inChargeName}
              onChange={(e) => setInChargeName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs font-extrabold text-amber-300 focus:outline-none focus:border-amber-500 uppercase tracking-wide"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              This name appears directly above "In-Charge / Department Head" at the bottom of CSC Form 48.
            </p>
          </div>

          {/* Official Sub Name / Title / Designation */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Sub Name / Designation Title (Printed below signatory name)
            </label>
            <input
              type="text"
              placeholder="e.g., In-Charge / Department Head"
              value={inChargeTitle}
              onChange={(e) => setInChargeTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 focus:outline-none focus:border-amber-500 uppercase tracking-wide font-semibold"
            />
            
            {/* Quick Presets for Designation */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className="text-[10px] text-slate-500 py-0.5">Presets:</span>
              {[
                'In-Charge / Department Head',
                'School Principal IV',
                'Secondary School Principal III',
                'Head Teacher III / Department Head',
                'Officer-in-Charge'
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setInChargeTitle(preset)}
                  className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[10px] text-slate-300 font-medium transition"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Verification Date (Date only, no time) */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Verification Date (Date Only, No Time)
            </label>
            <input
              type="text"
              placeholder="e.g. July 31, 2026 or 2026-07-31"
              value={verifiedDate}
              onChange={(e) => setVerifiedDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Date without time appearing below the In-Charge signatory on Form 48.
            </p>
          </div>

          {/* Department Selection */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Select Department</label>
            <select
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
              disabled={applyScope === 'all'}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 disabled:opacity-50"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code}) - Current Head: {d.headName || 'Not Set'}
                </option>
              ))}
            </select>
          </div>

          {/* Scope Selector */}
          <div className="space-y-2 border-t border-slate-800 pt-3">
            <label className="block text-xs font-medium text-slate-400">Apply Changes Scope:</label>
            
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setApplyScope('department')}
                className={`p-3 rounded-xl border text-left text-xs transition flex items-start space-x-2 ${
                  applyScope === 'department'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Building2 className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">This Department</p>
                  <p className="text-[10px] opacity-80">Update head for selected department & personnel</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setApplyScope('all')}
                className={`p-3 rounded-xl border text-left text-xs transition flex items-start space-x-2 ${
                  applyScope === 'all'
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                    : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">All Departments</p>
                  <p className="text-[10px] opacity-80">Set as global In-Charge for all school personnel Form 48s</p>
                </div>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg transition flex items-center space-x-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Update In-Charge</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
