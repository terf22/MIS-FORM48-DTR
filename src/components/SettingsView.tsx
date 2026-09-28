import React from 'react';
import { Sun, Moon, Bell, Shield, Sliders, Check } from 'lucide-react';
import { ThemeMode } from '../types';

interface SettingsViewProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ theme, onToggleTheme }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
          System Settings & Appearance
        </h2>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
          Customize dashboard theme mode, display preferences, and notifications
        </p>
      </div>

      {/* Theme Preference Section */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center space-x-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <Sliders className="w-5 h-5 text-violet-600 dark:text-violet-400" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
            Appearance & Theme Mode
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Light Mode Card */}
          <div
            onClick={() => {
              if (theme !== 'light') onToggleTheme();
            }}
            className={`p-5 rounded-2xl border-2 transition cursor-pointer flex items-center space-x-4 ${
              theme === 'light'
                ? 'border-violet-600 bg-violet-50/50 dark:bg-slate-800 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Sun className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Light Mode</h4>
                {theme === 'light' && <Check className="w-4 h-4 text-violet-600" />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Clean high-contrast original theme</p>
            </div>
          </div>

          {/* Dark Mode Card */}
          <div
            onClick={() => {
              if (theme !== 'dark') onToggleTheme();
            }}
            className={`p-5 rounded-2xl border-2 transition cursor-pointer flex items-center space-x-4 ${
              theme === 'dark'
                ? 'border-violet-600 bg-slate-800 shadow-md'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            <div className="w-12 h-12 rounded-2xl bg-violet-950 text-violet-400 flex items-center justify-center shrink-0">
              <Moon className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Dark Mode</h4>
                {theme === 'dark' && <Check className="w-4 h-4 text-violet-400" />}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Eye-friendly low light interface</p>
            </div>
          </div>
        </div>
      </div>

      {/* School Station & Compliance Profile */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-4 text-xs">
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 pb-2 border-b border-slate-100 dark:border-slate-800">
          School Profile & Regulatory Standards
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-slate-400 font-semibold mb-1">School Station</label>
            <input
              type="text"
              readOnly
              value="Mangusu Integrated School"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-slate-400 font-semibold mb-1">DTR Regulatory Standard</label>
            <input
              type="text"
              readOnly
              value="CSC Form No. 48 (Revised 1991) / DepEd D.O. 23"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-semibold text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
