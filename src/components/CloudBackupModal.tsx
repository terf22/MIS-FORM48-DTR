import React, { useState, useEffect } from 'react';
import { Database, ShieldCheck, CheckCircle2, RefreshCw, HardDrive, Cloud, CloudUpload, CloudDownload, LogOut, AlertTriangle, Download, Upload, FileText, Trash2 } from 'lucide-react';
import { LanguageCode, Personnel, MonthlyDTR, AuditLog } from '../types';
import { translations } from '../utils/translations';
import {
  initAuth,
  googleSignIn,
  googleSignOut,
  checkDriveBackup,
  saveToGoogleDrive,
  loadFromGoogleDrive,
  auth
} from '../utils/googleDriveService';

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
  lang,
  dtrMap,
  personnelList,
  auditLogs,
  uploadedFilesCount = 0,
  onRestoreData,
  onExportToLocalDrive,
  onImportFromLocalDrive,
  onResetLocalData,
  onWipeAllData,
  onLoadDemoData,
  onLogAudit
}) => {
  const t = translations[lang];
  const [autoBackup, setAutoBackup] = useState(true);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isDriveSaving, setIsDriveSaving] = useState(false);
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [lastBackupTime, setLastBackupTime] = useState('Local Snapshot Ready');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Google Drive state
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [driveFileInfo, setDriveFileInfo] = useState<{ exists: boolean; modifiedTime?: string; size?: string } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ type: 'SAVE' | 'RESTORE'; message: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Check auth status
    const unsubscribe = initAuth(
      (user) => {
        setUserEmail(user.email);
        refreshDriveInfo();
      },
      () => {
        setUserEmail(auth.currentUser?.email || null);
        if (auth.currentUser) {
          refreshDriveInfo();
        } else {
          setDriveFileInfo(null);
        }
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const refreshDriveInfo = async () => {
    const info = await checkDriveBackup();
    setDriveFileInfo(info);
  };

  const handleGoogleLogin = async () => {
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res?.user) {
        setUserEmail(res.user.email);
        setSuccessMessage(`Signed in as ${res.user.email}. Google Drive connected.`);
        onLogAudit('GOOGLE_DRIVE_LOGIN', 'BACKUP', `Signed in with Google account ${res.user.email}`);
        await refreshDriveInfo();
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      if (
        err?.code === 'auth/popup-closed-by-user' ||
        err?.code === 'auth/cancelled-popup-request'
      ) {
        // User closed the popup window before finishing sign in
        return;
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Sign-in popup was blocked by browser settings. Please allow popups for this site and try again.');
      } else {
        setErrorMessage(err?.message || 'Failed to sign in with Google');
      }
    }
  };

  const handleGoogleLogout = async () => {
    await googleSignOut();
    setUserEmail(null);
    setDriveFileInfo(null);
    setSuccessMessage('Signed out from Google Drive.');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const requestSaveToDrive = () => {
    if (!userEmail) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }
    const msg = driveFileInfo?.exists
      ? 'Updating "CSC_Form48_DTR_Backup.json" in your Google Drive will overwrite the existing cloud file with your current attendance records. Do you wish to proceed?'
      : 'Create a new backup file "CSC_Form48_DTR_Backup.json" in your Google Drive?';
    setConfirmModal({ type: 'SAVE', message: msg });
  };

  const requestRestoreFromDrive = () => {
    if (!userEmail) {
      setErrorMessage('Please sign in with Google first.');
      return;
    }
    if (!driveFileInfo?.exists) {
      setErrorMessage('No Google Drive backup file found yet.');
      return;
    }
    setConfirmModal({
      type: 'RESTORE',
      message: 'Restoring from Google Drive will replace your current in-app attendance records with the data from Google Drive. Are you sure you want to continue?'
    });
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;
    const actionType = confirmModal.type;
    setConfirmModal(null);
    setErrorMessage(null);

    if (actionType === 'SAVE') {
      setIsDriveSaving(true);
      try {
        const res = await saveToGoogleDrive({ personnelList, dtrMap, auditLogs });
        const nowStr = new Date(res.modifiedTime).toLocaleString();
        setSuccessMessage(`Successfully backed up Form 48 data to Google Drive (${nowStr}).`);
        onLogAudit('GOOGLE_DRIVE_SAVE', 'BACKUP', 'Exported and saved Form 48 data snapshot to Google Drive');
        await refreshDriveInfo();
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to save to Google Drive.');
      } finally {
        setIsDriveSaving(false);
      }
    } else if (actionType === 'RESTORE') {
      setIsDriveLoading(true);
      try {
        const restoredData = await loadFromGoogleDrive();
        if (restoredData && onRestoreData) {
          onRestoreData({
            dtrMap: restoredData.dtrMap,
            personnelList: restoredData.personnelList,
            auditLogs: restoredData.auditLogs
          });
          setSuccessMessage(`Form 48 data successfully restored from Google Drive backup (${new Date(restoredData.savedAt).toLocaleString()})!`);
          onLogAudit('GOOGLE_DRIVE_RESTORE', 'BACKUP', 'Restored Form 48 data snapshot from Google Drive');
        } else {
          setErrorMessage('Could not load backup file from Google Drive.');
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to restore from Google Drive.');
      } finally {
        setIsDriveLoading(false);
      }
    }
  };

  const handleManualBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      setIsBackingUp(false);
      const nowStr = new Date().toLocaleString();
      setLastBackupTime(nowStr);
      setSuccessMessage('Local memory snapshot created successfully.');
      onLogAudit(
        'MANUAL_LOCAL_BACKUP',
        'BACKUP',
        'Manual Local Snapshot Backup created.'
      );
      setTimeout(() => setSuccessMessage(null), 4000);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-slate-800 dark:text-slate-100 max-w-xl w-full shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto scrollbar-thin">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Cloud className="w-5 h-5 text-violet-600 dark:text-sky-400" />
            <h3 className="text-base font-bold text-slate-800 dark:text-white">Google Drive & Cloud Data Storage</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 dark:hover:text-white font-bold p-1">
            ✕
          </button>
        </div>

        {/* Security Banner */}
        <div className="bg-sky-50 dark:bg-sky-500/10 border border-sky-200 dark:border-sky-500/30 rounded-2xl p-4 text-sky-800 dark:text-sky-300 text-xs space-y-1">
          <div className="flex items-center space-x-2 font-bold text-sky-700 dark:text-sky-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Google Drive Personal Account Integration</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300">
            When published, Form 48 time records are safely stored inside your personal Google Drive file (<code className="text-sky-800 dark:text-sky-200">CSC_Form48_DTR_Backup.json</code>). You retain complete ownership and control of your data.
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

        {/* Google Drive Account & Sync Section */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Cloud className="w-4 h-4 text-violet-600 dark:text-sky-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Google Drive Storage</span>
            </div>
            {userEmail ? (
              <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 border border-emerald-300 dark:border-emerald-500/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-semibold">
                Connected
              </span>
            ) : (
              <span className="text-[10px] bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">
                Not Connected
              </span>
            )}
          </div>

          {!userEmail ? (
            <div className="space-y-3 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Connect your Google Account to store and sync your Form 48 DTR attendance records directly in Google Drive.
              </p>
              
              {/* Official Google Sign-In Button */}
              <button
                onClick={handleGoogleLogin}
                className="w-full py-2.5 px-4 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-xs shadow-sm flex items-center justify-center space-x-3 transition cursor-pointer"
              >
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-4 h-4">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span>Sign in with Google to enable Drive Storage</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 block text-[10px]">Google Account:</span>
                  <span className="font-semibold text-violet-600 dark:text-sky-300">{userEmail}</span>
                </div>
                <button
                  onClick={handleGoogleLogout}
                  className="text-[11px] text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 flex items-center space-x-1"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Disconnect</span>
                </button>
              </div>

              {driveFileInfo?.exists ? (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl p-3 text-xs space-y-1">
                  <div className="flex justify-between text-emerald-800 dark:text-emerald-300 font-semibold">
                    <span>Google Drive File:</span>
                    <span className="font-mono">CSC_Form48_DTR_Backup.json</span>
                  </div>
                  {driveFileInfo.modifiedTime && (
                    <div className="flex justify-between text-slate-500 dark:text-slate-400 text-[11px]">
                      <span>Last Synced:</span>
                      <span>{new Date(driveFileInfo.modifiedTime).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                  No backup file in Google Drive yet. Click <strong>"Save to Google Drive"</strong> below to create your first cloud snapshot.
                </div>
              )}

              {/* Action Buttons for Google Drive */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={requestSaveToDrive}
                  disabled={isDriveSaving || isDriveLoading}
                  className="py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 dark:bg-sky-600 dark:hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50 shadow-sm"
                >
                  {isDriveSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-3.5 h-3.5" />
                  )}
                  <span>{isDriveSaving ? 'Saving...' : 'Save to Drive'}</span>
                </button>

                <button
                  onClick={requestRestoreFromDrive}
                  disabled={isDriveSaving || isDriveLoading || !driveFileInfo?.exists}
                  className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center space-x-1.5 transition disabled:opacity-50 shadow-sm"
                >
                  {isDriveLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-violet-600 dark:text-sky-400" />
                  ) : (
                    <CloudDownload className="w-3.5 h-3.5 text-violet-600 dark:text-sky-400" />
                  )}
                  <span>{isDriveLoading ? 'Loading...' : 'Restore from Drive'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Local Drive Storage & Computer Files Section */}
        <div className="bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-2.5">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span className="font-bold text-slate-800 dark:text-slate-200">Local Hard Drive Storage Manager</span>
            </div>
            <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
              100% Persisted Locally
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">Personnel Roster:</span>
              <span className="font-bold text-slate-800 dark:text-white">{personnelList.length} Employees</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px]">DTR Map Records:</span>
              <span className="font-bold text-slate-800 dark:text-white">{Object.keys(dtrMap).length} Months</span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-400 block text-[10px]">Uploaded Files:</span>
              <span className="font-bold text-slate-800 dark:text-white">{uploadedFilesCount} Files</span>
            </div>
          </div>

          <div className="space-y-2 pt-1">
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Export a complete database snapshot to your computer hard drive, or restore a saved <code>.json</code> file from your local storage:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Save / Export to Local Drive Button */}
              {onExportToLocalDrive && (
                <button
                  onClick={onExportToLocalDrive}
                  className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center space-x-2 transition shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Save Snapshot to Local Drive (.json)</span>
                </button>
              )}

              {/* Import / Load from Local Drive Button */}
              {onImportFromLocalDrive && (
                <label className="py-2.5 px-3 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs flex items-center justify-center space-x-2 cursor-pointer transition shadow-sm">
                  <Upload className="w-4 h-4 text-violet-600 dark:text-sky-400" />
                  <span>Restore File from Computer</span>
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        onImportFromLocalDrive(e.target.files[0]);
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Reset / Wipe / Demo Storage Options */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">Database controls:</span>
            <div className="flex items-center space-x-3">
              {onLoadDemoData && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Load sample personnel roster and department structure?')) {
                      onLoadDemoData();
                      onClose();
                    }
                  }}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 font-bold"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Load Demo Sample Data</span>
                </button>
              )}
              {onWipeAllData && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Are you sure you want to CLEAR ALL DATA including sample personnel and DTRs? This will leave the system completely blank for new uploads.')) {
                      onWipeAllData();
                      onClose();
                    }
                  }}
                  className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center space-x-1 font-bold"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Wipe All Data</span>
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Confirmation Dialog Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-slate-800 dark:text-slate-100">
            <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Confirm Google Drive Action</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-200 leading-relaxed">
              {confirmModal.message}
            </p>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-2 rounded-xl bg-violet-600 dark:bg-sky-600 text-white text-xs font-bold hover:bg-violet-700 dark:hover:bg-sky-500"
              >
                Yes, Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
