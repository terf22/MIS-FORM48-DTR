import React from 'react';
import {
  Users,
  FileText,
  Upload,
  Settings,
  Plus,
  ShieldCheck
} from 'lucide-react';
import { DtrNavTab, ThemeMode } from '../types';

interface SidebarProps {
  activeTab: DtrNavTab;
  onSelectTab: (tab: DtrNavTab) => void;
  onOpenAddPersonnelModal: () => void;
  theme: ThemeMode;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  onOpenAddPersonnelModal,
  theme
}) => {
  const navItems: { id: DtrNavTab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'personnel', label: 'Personnel Profile', icon: <Users className="w-5 h-5" /> },
    { id: 'form48', label: 'CSC Form 48 DTR', icon: <FileText className="w-5 h-5" /> },
    { id: 'excel', label: 'Biometrics & Excel Upload', icon: <Upload className="w-5 h-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-5 h-5" /> }
  ];

  return (
    <aside className="w-64 min-h-screen bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800/80 p-6 flex flex-col justify-between transition-colors duration-300 shrink-0 select-none">
      <div>
        {/* Brand Logo Section */}
        <div
          className="flex items-center space-x-3 mb-8 cursor-pointer group"
          onClick={() => onSelectTab('personnel')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-violet-600 via-indigo-600 to-cyan-400 flex items-center justify-center text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition duration-200">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 tracking-tight block leading-tight">
              Mangusu Integrated School
            </span>
            <span className="text-[10px] text-violet-600 dark:text-violet-400 font-semibold block">
              CSC Form 48 DTR Portal
            </span>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          onClick={onOpenAddPersonnelModal}
          className="w-full py-3.5 px-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-medium rounded-2xl shadow-lg shadow-purple-500/25 transition-all duration-200 flex items-center justify-between group mb-8 active:scale-[0.98]"
        >
          <span className="text-xs sm:text-sm font-semibold tracking-wide">Add Personnel</span>
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition">
            <Plus className="w-4 h-4 text-white" />
          </div>
        </button>

        {/* Navigation Menu */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-purple-50 dark:bg-purple-950/40 text-violet-600 dark:text-violet-400 font-semibold shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3.5">
                  <span className={isActive ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400 dark:text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white animate-pulse">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Card - CSC Compliance Banner */}
      <div className="mt-8 bg-gradient-to-br from-purple-50 via-violet-50 to-indigo-100/60 dark:from-slate-800 dark:via-purple-950/40 dark:to-slate-800/80 p-4 rounded-3xl border border-purple-100/50 dark:border-purple-900/30 text-center relative overflow-hidden group">
        <div className="relative z-10 flex flex-col items-center">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-600 to-emerald-400 flex items-center justify-center text-white mb-2.5 shadow-md shadow-purple-500/20 group-hover:scale-105 transition duration-300">
            <FileText className="w-5 h-5" />
          </div>

          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1">
            CSC Form 48 Compliant
          </h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mb-2">
            Civil Service DTR & Biometrics Engine
          </p>

          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-white/80 dark:bg-slate-900/80 px-2.5 py-1 rounded-full shadow-sm">
            Mangusu Integrated School
          </span>
        </div>
      </div>
    </aside>
  );
};
