import React from 'react';
import { Search, Bell, Sun, Moon, HardDrive } from 'lucide-react';
import { ThemeMode } from '../types';

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
  pendingCount?: number;
  onOpenBackupModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  theme,
  onToggleTheme,
  pendingCount = 0,
  onOpenBackupModal
}) => {
  return (
    <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/80 px-8 flex items-center justify-between sticky top-0 z-30 transition-colors duration-300">
      {/* Search Input */}
      <div className="relative w-72 md:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search employee, ID, department..."
          className="w-full bg-slate-50 dark:bg-slate-800/60 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-full pl-11 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-violet-500/30 border border-slate-100 dark:border-slate-800 transition duration-200"
        />
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-4">
        
        {/* Local Storage Badge */}
        <button
          onClick={onOpenBackupModal}
          className="hidden md:flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-semibold hover:bg-emerald-100 transition cursor-pointer"
          title="All biometric logs and DTR records are stored on your local drive"
        >
          <HardDrive className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px]">Local Storage: Active</span>
        </button>
        {/* Light / Dark Mode Toggle Pill */}
        <button
          onClick={onToggleTheme}
          aria-label="Toggle Light and Dark Mode"
          className="w-14 h-7 bg-slate-200 dark:bg-slate-800 rounded-full p-1 flex items-center justify-between relative transition-colors duration-300 focus:outline-none shadow-inner"
        >
          <div
            className={`w-5 h-5 rounded-full bg-white dark:bg-violet-600 shadow-md flex items-center justify-center transition-transform duration-300 transform ${
              theme === 'dark' ? 'translate-x-7' : 'translate-x-0'
            }`}
          >
            {theme === 'dark' ? (
              <Moon className="w-3 h-3 text-white" />
            ) : (
              <Sun className="w-3 h-3 text-amber-500" />
            )}
          </div>
          <Sun className="w-3 h-3 text-slate-400 ml-1.5 dark:opacity-40" />
          <Moon className="w-3 h-3 text-slate-400 mr-1.5 opacity-40 dark:opacity-100" />
        </button>

        {/* Notifications Bell */}
        <div className="relative cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center text-slate-500 dark:text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-800 transition">
            <Bell className="w-5 h-5" />
          </div>
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
              {pendingCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
