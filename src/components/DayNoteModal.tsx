import React, { useState } from 'react';
import { X, Calendar, AlertCircle, Sparkles, Check, Users, User } from 'lucide-react';
import { DTRDayEntry, Personnel, LanguageCode, MonthlyDTR } from '../types';

interface DayNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPersonnel: Personnel | null;
  personnelList: Personnel[];
  selectedMonth: number;
  selectedYear: number;
  initialDay?: number;
  monthlyDTR?: MonthlyDTR | null;
  onApplyNote: (
    startDay: number,
    endDay: number,
    noteData: {
      statusTag: string;
      remarks: string;
      amArrival?: string;
      amDeparture?: string;
      pmArrival?: string;
      pmDeparture?: string;
    },
    applyToAll: boolean
  ) => void;
  lang: LanguageCode;
}

export const DayNoteModal: React.FC<DayNoteModalProps> = ({
  isOpen,
  onClose,
  selectedPersonnel,
  personnelList,
  selectedMonth,
  selectedYear,
  initialDay = 1,
  monthlyDTR,
  onApplyNote,
  lang
}) => {
  const [startDay, setStartDay] = useState<number>(initialDay);
  const [endDay, setEndDay] = useState<number>(initialDay);
  const [isRangeMode, setIsRangeMode] = useState<boolean>(false);
  const [statusTag, setStatusTag] = useState<string>('CLASS_SUSPENDED_PM');
  const [remarks, setRemarks] = useState<string>('Class Suspended (PM Afternoon Half Day)');
  const [clearTimes, setClearTimes] = useState<boolean>(false);
  const [applyToAll, setApplyToAll] = useState<boolean>(false);
  const [customAmIn, setCustomAmIn] = useState<string>('');
  const [customAmOut, setCustomAmOut] = useState<string>('');
  const [customPmIn, setCustomPmIn] = useState<string>('');
  const [customPmOut, setCustomPmOut] = useState<string>('');

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate() || 31;

  React.useEffect(() => {
    if (isOpen) {
      const target = initialDay || 1;
      setStartDay(target);
      setEndDay(target);
      setIsRangeMode(false);
      const existingEntry = monthlyDTR?.days?.find((d) => d.day === target);
      if (existingEntry) {
        setCustomAmIn(existingEntry.amArrival || '');
        setCustomAmOut(existingEntry.amDeparture || '');
        setCustomPmIn(existingEntry.pmArrival || '');
        setCustomPmOut(existingEntry.pmDeparture || '');
        if (existingEntry.statusTag && existingEntry.statusTag !== 'REGULAR') {
          setStatusTag(existingEntry.statusTag);
        } else {
          setStatusTag('CLASS_SUSPENDED_PM');
        }
        if (existingEntry.remarks) {
          setRemarks(existingEntry.remarks);
        } else {
          setRemarks('Class Suspended (PM Afternoon Half Day)');
        }
      } else {
        setCustomAmIn('');
        setCustomAmOut('');
        setCustomPmIn('');
        setCustomPmOut('');
        setStatusTag('CLASS_SUSPENDED_PM');
        setRemarks('Class Suspended (PM Afternoon Half Day)');
      }
      setClearTimes(false);
    }
  }, [isOpen, initialDay, monthlyDTR]);

  if (!isOpen) return null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleDayNumChange = (newDay: number) => {
    setStartDay(newDay);
    if (!isRangeMode) {
      setEndDay(newDay);
    } else if (endDay < newDay) {
      setEndDay(newDay);
    }
    const existingEntry = monthlyDTR?.days?.find((d) => d.day === newDay);
    if (existingEntry) {
      setCustomAmIn(existingEntry.amArrival || '');
      setCustomAmOut(existingEntry.amDeparture || '');
      setCustomPmIn(existingEntry.pmArrival || '');
      setCustomPmOut(existingEntry.pmDeparture || '');
      if (existingEntry.statusTag && existingEntry.statusTag !== 'REGULAR') {
        setStatusTag(existingEntry.statusTag);
      }
      if (existingEntry.remarks) {
        setRemarks(existingEntry.remarks);
      }
    }
  };

  const presetReasons = [
    'Class Suspended (Full Day) due to Heavy Rainfall / Weather',
    'Class Suspended (AM Morning Half Day) due to Heavy Rainfall',
    'Class Suspended (PM Afternoon Half Day) due to Weather Advisory',
    'Half Day Class Suspended - Executive Order / LGU Advisory',
    'Class Suspended - Typhoon Signal No. 2',
    'Declared Regular National Holiday',
    'Declared Special Non-Working Holiday',
    'School In-Service Training (INSET)',
    'Division / District Teachers Conference',
    'Official Business - Regional Office Meeting',
    'Approved Sick Leave',
    'Approved Vacation Leave'
  ];

  const handleSelectTag = (tag: string) => {
    setStatusTag(tag);
    const existingEntry = monthlyDTR?.days?.find((d) => d.day === startDay);

    if (tag === 'CLASS_SUSPENDED') {
      setRemarks('Class Suspended (Full Day) due to Heavy Rainfall / Weather');
      setClearTimes(true);
    } else if (tag === 'CLASS_SUSPENDED_AM') {
      setRemarks('Class Suspended (AM Morning Half Day)');
      setClearTimes(false);
      setCustomAmIn('');
      setCustomAmOut('');
      if (!customPmIn && existingEntry?.pmArrival) setCustomPmIn(existingEntry.pmArrival);
      if (!customPmOut && existingEntry?.pmDeparture) setCustomPmOut(existingEntry.pmDeparture);
    } else if (tag === 'CLASS_SUSPENDED_PM') {
      setRemarks('Class Suspended (PM Afternoon Half Day)');
      setClearTimes(false);
      if (!customAmIn && existingEntry?.amArrival) setCustomAmIn(existingEntry.amArrival);
      if (!customAmOut && existingEntry?.amDeparture) setCustomAmOut(existingEntry.amDeparture);
      setCustomPmIn('');
      setCustomPmOut('');
    } else if (tag === 'HOLIDAY') {
      setRemarks('Declared Holiday');
      setClearTimes(true);
    } else if (tag === 'OB') {
      setRemarks('Official Business');
      setClearTimes(true);
    } else if (tag === 'LEAVE') {
      setRemarks('Approved Leave of Absence');
      setClearTimes(true);
    } else if (tag === 'REGULAR') {
      setClearTimes(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const minDay = Math.min(startDay, isRangeMode ? endDay : startDay);
    const maxDay = Math.max(startDay, isRangeMode ? endDay : startDay);

    const existingEntry = monthlyDTR?.days?.find((d) => d.day === minDay);

    let amIn = customAmIn;
    let amOut = customAmOut;
    let pmIn = customPmIn;
    let pmOut = customPmOut;

    if (clearTimes && statusTag !== 'REGULAR') {
      amIn = '';
      amOut = '';
      pmIn = '';
      pmOut = '';
    } else {
      if (statusTag === 'CLASS_SUSPENDED_PM') {
        amIn = customAmIn || existingEntry?.amArrival || '';
        amOut = customAmOut || existingEntry?.amDeparture || '';
        pmIn = customPmIn;
        pmOut = customPmOut;
      } else if (statusTag === 'CLASS_SUSPENDED_AM') {
        amIn = customAmIn;
        amOut = customAmOut;
        pmIn = customPmIn || existingEntry?.pmArrival || '';
        pmOut = customPmOut || existingEntry?.pmDeparture || '';
      }
    }

    onApplyNote(
      minDay,
      maxDay,
      {
        statusTag,
        remarks: remarks.trim(),
        amArrival: amIn,
        amDeparture: amOut,
        pmArrival: pmIn,
        pmDeparture: pmOut
      },
      applyToAll
    );

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Add Day Note / Status</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Mark Class Suspension, Holiday, OB, or Leave across single day or range</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Target Date Mode: Single Day vs Date Range */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">
                Target Date / Duration
              </label>
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setIsRangeMode(false);
                    setEndDay(startDay);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    !isRangeMode
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single Day
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRangeMode(true);
                    if (endDay < startDay) setEndDay(Math.min(startDay + 1, daysInMonth));
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    isRangeMode
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Date Range
                </button>
              </div>
            </div>

            {!isRangeMode ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Select Day
                  </label>
                  <select
                    value={startDay}
                    onChange={(e) => handleDayNumChange(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Day {d} ({monthNames[selectedMonth - 1]} {d}, {selectedYear})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Event Type / Status
                  </label>
                  <select
                    value={statusTag}
                    onChange={(e) => handleSelectTag(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="CLASS_SUSPENDED">🌧️ Full Day Class Suspended</option>
                    <option value="CLASS_SUSPENDED_AM">🌤️ Half Day Class Suspended (AM Morning)</option>
                    <option value="CLASS_SUSPENDED_PM">🌧️ Half Day Class Suspended (PM Afternoon)</option>
                    <option value="HOLIDAY">🇵🇭 Holiday</option>
                    <option value="OB">💼 Official Business (OB)</option>
                    <option value="LEAVE">📄 Leave of Absence</option>
                    <option value="REGULAR">☀️ Regular Working Day</option>
                    <option value="SATURDAY">🗓️ Saturday</option>
                    <option value="SUNDAY">🗓️ Sunday</option>
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      Start Day
                    </label>
                    <select
                      value={startDay}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setStartDay(val);
                        if (endDay < val) setEndDay(val);
                        handleDayNumChange(val);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Day {d} ({monthNames[selectedMonth - 1]} {d})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">
                      End Day
                    </label>
                    <select
                      value={endDay}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setEndDay(val);
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d} disabled={d < startDay}>
                          Day {d} ({monthNames[selectedMonth - 1]} {d}) {d < startDay ? '(Invalid)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">
                    Event Type / Status
                  </label>
                  <select
                    value={statusTag}
                    onChange={(e) => handleSelectTag(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-bold text-indigo-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="CLASS_SUSPENDED">🌧️ Full Day Class Suspended</option>
                    <option value="CLASS_SUSPENDED_AM">🌤️ Half Day Class Suspended (AM Morning)</option>
                    <option value="CLASS_SUSPENDED_PM">🌧️ Half Day Class Suspended (PM Afternoon)</option>
                    <option value="HOLIDAY">🇵🇭 Holiday</option>
                    <option value="OB">💼 Official Business (OB)</option>
                    <option value="LEAVE">📄 Leave of Absence</option>
                    <option value="REGULAR">☀️ Regular Working Day</option>
                    <option value="SATURDAY">🗓️ Saturday</option>
                    <option value="SUNDAY">🗓️ Sunday</option>
                  </select>
                </div>

                <div className="text-[11px] text-indigo-400 font-medium flex items-center space-x-1.5 pt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Applies to {Math.max(1, endDay - startDay + 1)} day(s): {monthNames[selectedMonth - 1]} {startDay} {startDay !== endDay ? `to ${endDay}` : ''}, {selectedYear}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Quick Presets
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {presetReasons.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setRemarks(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition text-left ${
                    remarks === preset
                      ? 'bg-indigo-600/30 text-indigo-300 border-indigo-500'
                      : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Remarks Text Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Custom Note / Remark / Reason
            </label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Typhoon Signal No. 2 declared by DepEd / LGU"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          {/* Options: Clear time logs & Scope */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-2.5 text-xs">
            <label className="flex items-center space-x-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={clearTimes}
                onChange={(e) => setClearTimes(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-0"
              />
              <span className="text-slate-300 font-medium">
                Clear arrival/departure time logs for {isRangeMode && startDay !== endDay ? `Days ${startDay}–${endDay}` : `Day ${startDay}`}
              </span>
            </label>

            {!clearTimes && (
              <div className="pt-2 border-t border-slate-800 grid grid-cols-4 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">AM In</span>
                  <input
                    type="text"
                    value={customAmIn}
                    onChange={(e) => setCustomAmIn(e.target.value)}
                    placeholder="08:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-center font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">AM Out</span>
                  <input
                    type="text"
                    value={customAmOut}
                    onChange={(e) => setCustomAmOut(e.target.value)}
                    placeholder="12:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-center font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PM In</span>
                  <input
                    type="text"
                    value={customPmIn}
                    onChange={(e) => setCustomPmIn(e.target.value)}
                    placeholder="13:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-center font-mono"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">PM Out</span>
                  <input
                    type="text"
                    value={customPmOut}
                    onChange={(e) => setCustomPmOut(e.target.value)}
                    placeholder="17:00"
                    className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white text-center font-mono"
                  />
                </div>
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-300 font-medium">
                {applyToAll ? (
                  <Users className="w-4 h-4 text-emerald-400" />
                ) : (
                  <User className="w-4 h-4 text-indigo-400" />
                )}
                <span>Scope:</span>
              </div>
              <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setApplyToAll(false)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    !applyToAll
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Selected Person ({selectedPersonnel?.name || 'Selected'})
                </button>
                <button
                  type="button"
                  onClick={() => setApplyToAll(true)}
                  className={`px-2.5 py-1 rounded text-[11px] font-semibold transition ${
                    applyToAll
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All Staff ({personnelList.length})
                </button>
              </div>
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-2 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-xs font-bold text-white shadow-lg flex items-center space-x-2 transition"
            >
              <Check className="w-4 h-4" />
              <span>Apply Day Note / Status</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
