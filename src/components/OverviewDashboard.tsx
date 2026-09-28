import React from 'react';
import {
  Users,
  Award,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  Building2,
  FileCheck
} from 'lucide-react';
import { Personnel, DtrNavTab } from '../types';

interface OverviewDashboardProps {
  personnelList: Personnel[];
  onSelectTab: (tab: DtrNavTab) => void;
  onOpenAddPersonnelModal: () => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  personnelList,
  onSelectTab,
  onOpenAddPersonnelModal,
}) => {
  const totalPersonnel = personnelList.length;
  const teachingCount = personnelList.filter(
    (p) => p.personnelType === 'teaching' || (p.positionTitle && p.positionTitle.includes('Teacher'))
  ).length;
  const nonTeachingCount = totalPersonnel - teachingCount;

  // Step Increment Stats
  const dueNowCount = personnelList.filter((p) => p.stepIncrementTracking?.status === 'DUE NOW').length;
  const upcomingCount = personnelList.filter((p) => p.stepIncrementTracking?.status === 'UPCOMING (60 DAYS)').length;
  const onTrackCount = personnelList.filter((p) => p.stepIncrementTracking?.status === 'ON TRACK').length;

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-700 via-indigo-700 to-purple-800 p-8 text-white shadow-xl">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide text-violet-100 border border-white/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrative Officer II (AOII) Portal</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              DepEd & Civil Service HR Operations
            </h1>
            <p className="text-sm text-violet-100/90 leading-relaxed">
              Automated Civil Service Commission (CSC) Form 48 DTR generation, Notice of Step Increment (NOSI) tracking, and official personnel record management.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <button
              onClick={() => onSelectTab('nosi')}
              className="px-5 py-3 rounded-2xl bg-white text-violet-800 font-bold text-xs sm:text-sm hover:bg-violet-50 transition shadow-lg flex items-center justify-center gap-2"
            >
              <Award className="w-4 h-4 text-violet-600" />
              <span>Step Increment Engine</span>
            </button>
            <button
              onClick={onOpenAddPersonnelModal}
              className="px-5 py-3 rounded-2xl bg-violet-900/60 hover:bg-violet-900/80 text-white font-bold text-xs sm:text-sm transition border border-white/20 flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4" />
              <span>Add Personnel</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">Total Personnel</span>
            <div className="text-2xl font-black text-slate-800 dark:text-white">{totalPersonnel}</div>
            <div className="text-[11px] text-slate-500 font-medium">
              {teachingCount} Teaching | {nonTeachingCount} Non-Teaching
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('nosi')}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-rose-300 transition"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> NOSI Due Now
            </span>
            <div className="text-2xl font-black text-rose-700 dark:text-rose-300">{dueNowCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Action required immediately</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('nosi')}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-amber-300 transition"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Upcoming (60 Days)
            </span>
            <div className="text-2xl font-black text-amber-700 dark:text-amber-300">{upcomingCount}</div>
            <div className="text-[11px] text-slate-500 font-medium">Reaching 3-year milestone</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div
          onClick={() => onSelectTab('form48')}
          className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
        >
          <div className="space-y-1">
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" /> CSC Form 48 DTR
            </span>
            <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">Active</div>
            <div className="text-[11px] text-slate-500 font-medium">Standard 2-Up Side-by-Side</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Operations Navigation Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Step Increment Management Card */}
        <div
          onClick={() => onSelectTab('nosi')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition duration-300 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-violet-600 transition">
              Step Increment (NOSI) Engine
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Calculates 3-year continuous service cycles (Step 1 to Step 8), automatically resets timer on Promotion/Reclassification, and applies RA 11210 (+105 Days) Maternity Leave adjustments.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-violet-600 dark:text-violet-400">
            <span>Manage Step Increments</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* CSC Form 48 DTR Generator Card */}
        <div
          onClick={() => onSelectTab('form48')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition duration-300 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 transition">
              CSC Form 48 DTR Generator
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Generates official Civil Service Daily Time Records with fixed standard dimensions (3.5" × 10.0" in 1-up or 2-up layout) and high-resolution PDF exports.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>Generate CSC Form 48</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>

        {/* Biometrics & Excel Sync Card */}
        <div
          onClick={() => onSelectTab('excel')}
          className="group cursor-pointer bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition duration-300 relative overflow-hidden flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition duration-300">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-cyan-600 transition">
              Biometrics Machine Log Import
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Upload attendance biometric logs (Excel / CSV / TXT) with intelligent name-matching algorithm matching uploaded personnel data directly to employee database records.
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-cyan-600 dark:text-cyan-400">
            <span>Import Biometrics Logs</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
          </div>
        </div>
      </div>
    </div>
  );
};
