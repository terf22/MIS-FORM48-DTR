import React, { useState } from 'react';
import { Database, ShieldCheck, CheckCircle2, RefreshCw, HardDrive, AlertTriangle, Download, Upload, Trash2, FileJson, Clock } from 'lucide-react';
import { LanguageCode, Personnel, MonthlyDTR, AuditLog } from '../types';

interface CloudBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: LanguageCode;
  dtrMap: Record<string, MonthlyDTR>;
  personnelList: Personnel[];
  auditLogs?: AuditLog[];
  uploadedFilesCount?: number;
  onRestoreData?: (data: { dtrMap: Record<string, MonthlyDTR>; personnelList: Personnel[]; auditLogs?: AuditLog[] }) => void;
  onExportToLocalDrive?: () => void;
  onImportFromLocalDrive?: (file: File) => void;
  onResetLocalData?: () => void;
  onWipeAllData?: () => void;
  onLoadDemoData?: () => void;
  onLogAudit: (action: string, category: 'BACKUP', details: string) => void;
}

export const CloudBackupModal: React.FC<CloudBackupModalProps> = ({
  isOpen,
  onClose,
  dtrMap,
  personnelList,
  auditLogs = [],
  uploadedFilesCount = 0,
  onExportToLocalDrive,
  onImportFromLocalDrive,
  onWipeAllData,
  onLoadDemoData,
  onLogAudit
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      if (onExportToLocalDrive) {
        onExportToLocalDrive();
      } else {
        // Fallback direct JSON download
        const dataSnapshot = {
          version: '1.0.0',
          appName: 'Mangusu Integrated School CSC Form 48 DTR Management System',
          exportedAt: new Date().toISOString(),
          personnelList,
          dtrMap,
          auditLogs
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
      }
      setSuccessMessage('Backup snapshot exported successfully to your computer (.json).');
      onLogAudit('LOCAL_EXPORT', 'BACKUP', 'Exported full database backup to local computer.');
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export backup file.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);
    if (!file.name.endsWith('.json')) {
      setErrorMessage('Please select a valid .json database backup file.');
      return;
    }
    if (onImportFromLocalDrive) {
      onImportFromLocalDrive(file);
      setSuccessMessage(`Database restored from "${file.name}".`);
      setTimeout(() => setSuccessMessage(null), 4000);
    }
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-slate-800 dark:text-slate-100 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">Database Backup & Storage</h3>
              <p className="text-[11px] text-slate-400">Offline & Secure Data Management</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Security & Privacy Banner */}
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 rounded-2xl p-4 text-emerald-900 dark:text-emerald-300 text-xs space-y-1">
          <div className="flex items-center space-x-2 font-bold text-emerald-700 dark:text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>100% Private, Client-Side Data Storage</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            All personnel records, biometric logs, and CSC Form 48 monthly DTRs are saved directly on your local device. No external accounts or cloud logins are required.
          </p>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/40 rounded-2xl p-3 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-rose-50 dark:bg-rose-500/20 border border-rose-200 dark:border-rose-500/40 rounded-2xl p-3 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Database Content Summary */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Current Database Status</span>
            </div>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
              Active
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Personnel Roster</span>
              <span className="font-bold text-slate-800 dark:text-white text-xs">{personnelList.length} Records</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">DTR Months</span>
              <span className="font-bold text-slate-800 dark:text-white text-xs">{Object.keys(dtrMap).length} Months</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Uploaded Files</span>
              <span className="font-bold text-slate-800 dark:text-white text-xs">{uploadedFilesCount} Files</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Audit Logs</span>
              <span className="font-bold text-slate-800 dark:text-white text-xs">{auditLogs.length} Events</span>
            </div>
          </div>
        </div>

        {/* Backup & Restore Action Buttons */}
        <div className="space-y-3">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            Backup & Restore Actions
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Export Button */}
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-md cursor-pointer disabled:opacity-50"
            >
              {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>Download Backup (.json)</span>
            </button>

            {/* Import / Restore Button */}
            <label className="py-3 px-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 active:scale-95 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm cursor-pointer">
              <Upload className="w-4 h-4 text-violet-600 dark:text-violet-400" />
              <span>Restore from File (.json)</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
            Downloaded <code className="text-violet-600 dark:text-violet-400 font-mono">.json</code> backups can be safely transferred between computers and restored at any time.
          </p>
        </div>

        {/* Database Utilities Footer */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-slate-400">Database Tools:</span>
          <div className="flex items-center space-x-3">
            {onLoadDemoData && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Load official DepEd sample personnel roster and sample DTR records?')) {
                    onLoadDemoData();
                    onClose();
                  }
                }}
                className="text-[11px] text-violet-600 dark:text-violet-400 hover:underline flex items-center space-x-1 font-bold cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Load Demo Data</span>
              </button>
            )}
            {onWipeAllData && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to CLEAR ALL DATA including sample personnel and DTRs? This will leave the system completely blank for fresh biometric uploads.')) {
                    onWipeAllData();
                    onClose();
                  }
                }}
                className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1 font-bold cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                <span>Clear All Data</span>
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
