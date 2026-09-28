import React, { useState } from 'react';
import {
  Users,
  Clock,
  CheckCircle2,
  TrendingUp,
  Download,
  Filter,
  Search,
  Printer,
  Sparkles,
  Building2,
  UserCheck,
  Award,
  ChevronRight,
  Plus
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import { Personnel, Department, LanguageCode, MonthlyDTR } from '../types';
import { translations } from '../utils/translations';

interface AdminDashboardProps {
  personnelList: Personnel[];
  departments: Department[];
  dtrMap?: Record<string, MonthlyDTR>;
  pendingCount?: number;
  onSelectPersonnelForForm48: (p: Personnel) => void;
  onUpdatePersonnel?: (updated: Personnel) => void;
  onUpdateInCharge?: (headName: string, headTitle: string, targetDeptId?: string, applyToAll?: boolean) => void;
  lang: LanguageCode;
  onLogAudit: (action: string, category: 'SYSTEM', details: string) => void;
  onOpenAddPersonnelModal?: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  personnelList,
  departments,
  dtrMap = {},
  pendingCount = 0,
  onSelectPersonnelForForm48,
  lang,
  onOpenAddPersonnelModal
}) => {
  const t = translations[lang];
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('ALL');

  const totalPersonnel = personnelList.length;
  const teachingCount = personnelList.filter((p) => p.personnelType === 'teaching').length;
  const nonTeachingCount = personnelList.filter((p) => p.personnelType === 'non_teaching').length;
  const joCount = personnelList.filter((p) => p.personnelType === 'jo').length;
  const cosCount = personnelList.filter((p) => p.personnelType === 'cos').length;

  const dtrs = Object.values(dtrMap) as MonthlyDTR[];
  const personnelMap = new Map(personnelList.map((p) => [p.id, p]));

  let totalLoggedDays = 0;
  let totalOnTimeDays = 0;
  let totalLateUndertimeMins = 0;
  let totalDutyHoursWorked = 0;

  const arrivalTimeSlots = [
    { label: '06:30 AM', min: 0, max: 405, count: 0 },
    { label: '07:00 AM', min: 406, max: 427, count: 0 },
    { label: '07:15 AM', min: 428, max: 442, count: 0 },
    { label: '07:30 AM', min: 443, max: 457, count: 0 },
    { label: '07:45 AM', min: 458, max: 472, count: 0 },
    { label: '08:00 AM', min: 473, max: 487, count: 0 },
    { label: '08:15 AM+', min: 488, max: 1440, count: 0 }
  ];

  const monthNamesList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyCounts = monthNamesList.map((m) => ({ month: m, teaching: 0, nonTeaching: 0 }));

  const weeklyHours = [
    { day: 'W1', hours: 0 },
    { day: 'W2', hours: 0 },
    { day: 'W3', hours: 0 },
    { day: 'W4', hours: 0 }
  ];

  function parseTimeToMinutes(timeStr: string): number | null {
    if (!timeStr || !timeStr.trim()) return null;
    const str = timeStr.trim().toUpperCase();
    const match = str.match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/);
    if (!match) return null;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const period = match[3];
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  dtrs.forEach((dtr) => {
    const person = personnelMap.get(dtr.personnelId) as Personnel | undefined;
    const isTeaching = person?.personnelType === 'teaching';
    const mIndex = typeof dtr.month === 'number' && dtr.month >= 1 && dtr.month <= 12 ? dtr.month - 1 : -1;

    if (Array.isArray(dtr.days)) {
      dtr.days.forEach((dayLog) => {
        const hasPunches = Boolean(
          (dayLog.amArrival && dayLog.amArrival.trim()) ||
          (dayLog.amDeparture && dayLog.amDeparture.trim()) ||
          (dayLog.pmArrival && dayLog.pmArrival.trim()) ||
          (dayLog.pmDeparture && dayLog.pmDeparture.trim())
        );

        if (hasPunches) {
          totalLoggedDays++;
          if ((dayLog.lateMinutes || 0) === 0) {
            totalOnTimeDays++;
          }

          totalLateUndertimeMins += (dayLog.lateMinutes || 0) + (dayLog.undertimeMinutes || 0);

          let dayHrs = 0;
          if (dayLog.amArrival && dayLog.amDeparture) {
            const arr = parseTimeToMinutes(dayLog.amArrival);
            const dep = parseTimeToMinutes(dayLog.amDeparture);
            if (arr !== null && dep !== null && dep > arr) dayHrs += (dep - arr) / 60;
          }
          if (dayLog.pmArrival && dayLog.pmDeparture) {
            const arr = parseTimeToMinutes(dayLog.pmArrival);
            const dep = parseTimeToMinutes(dayLog.pmDeparture);
            if (arr !== null && dep !== null && dep > arr) dayHrs += (dep - arr) / 60;
          }
          if (dayHrs === 0 && (dayLog.amArrival || dayLog.pmArrival)) {
            // Default estimate if partial punches
            dayHrs = 8;
          }

          totalDutyHoursWorked += dayHrs;

          if (mIndex >= 0) {
            if (isTeaching) {
              monthlyCounts[mIndex].teaching++;
            } else {
              monthlyCounts[mIndex].nonTeaching++;
            }
          }

          if (dayLog.day >= 1 && dayLog.day <= 7) weeklyHours[0].hours += dayHrs;
          else if (dayLog.day >= 8 && dayLog.day <= 14) weeklyHours[1].hours += dayHrs;
          else if (dayLog.day >= 15 && dayLog.day <= 21) weeklyHours[2].hours += dayHrs;
          else if (dayLog.day >= 22) weeklyHours[3].hours += dayHrs;

          if (dayLog.amArrival) {
            const mins = parseTimeToMinutes(dayLog.amArrival);
            if (mins !== null) {
              const slot = arrivalTimeSlots.find((s) => mins >= s.min && mins <= s.max);
              if (slot) slot.count++;
            }
          }
        }
      });
    }
  });

  const hasData = totalLoggedDays > 0;
  const onTimeRate = hasData ? `${((totalOnTimeDays / totalLoggedDays) * 100).toFixed(1)}%` : 'N/A';

  const attendanceTrendData = monthlyCounts;
  const arrivalTimesData = arrivalTimeSlots.map((s) => ({ time: s.label, count: s.count }));
  const peakSlot = arrivalTimeSlots.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), arrivalTimeSlots[0]);
  const peakTimeLabel = peakSlot.count > 0 ? `Peak: ${peakSlot.label}` : 'No Punch Data';

  // Pie chart data - Personnel distribution
  const categoryPieData = [
    { name: 'Teaching Faculty', value: teachingCount, color: '#8b5cf6' },
    { name: 'Non-Teaching Staff', value: nonTeachingCount, color: '#06b6d4' },
    { name: 'Job Order (JO)', value: joCount, color: '#f59e0b' },
    { name: 'Contractual Service (CoS)', value: cosCount, color: '#10b981' }
  ].filter((item) => item.value > 0);

  // Monthly Hours Wave Data
  const hoursWaveData = weeklyHours.map((w) => ({ day: w.day, hours: Math.round(w.hours) }));

  // Filtered Roster
  const filteredPersonnel = personnelList.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.departmentName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDeptFilter === 'ALL' || p.departmentId === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            CSC Form 48 DTR Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Civil Service Daily Time Record & Personnel Attendance Analytics
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {onOpenAddPersonnelModal && (
            <button
              onClick={onOpenAddPersonnelModal}
              className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs sm:text-sm font-semibold shadow-md shadow-violet-500/20 flex items-center space-x-2 transition active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Personnel</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Row (3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Total Personnel */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Total Active Personnel
            </span>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {totalPersonnel}
            </h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full flex items-center space-x-0.5">
              <TrendingUp className="w-3 h-3 mr-0.5" />
              {hasData ? 'Active' : 'Empty'}
            </span>
          </div>
          <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 mt-2 flex flex-wrap gap-x-1.5 gap-y-0.5">
            <span>Teaching: {teachingCount}</span>
            <span>•</span>
            <span>Non-Teaching: {nonTeachingCount}</span>
            <span>•</span>
            <span>JO: {joCount}</span>
            <span>•</span>
            <span>CoS: {cosCount}</span>
          </p>
        </div>

        {/* Card 2: On-Time Attendance */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              On-Time Attendance Rate
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {onTimeRate}
            </h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
              {hasData ? 'Normal' : 'No Data'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {hasData ? `${totalOnTimeDays} on-time daily logs` : 'No DTR attendance logged'}
          </p>
        </div>

        {/* Card 3: Tardiness Mins */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Monthly Tardiness Total
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100">
              {hasData ? totalLateUndertimeMins : 0} <span className="text-xs font-normal text-slate-400">mins</span>
            </h3>
            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
              {hasData ? 'Tracked' : '0 mins'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
            {hasData ? `Average ${totalPersonnel > 0 ? (totalLateUndertimeMins / totalPersonnel).toFixed(1) : 0} mins per employee` : 'No tardiness logged'}
          </p>
        </div>
      </div>

      {/* Middle Row: Attendance Trend & Category Donut Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends Bar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                Attendance Trends
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                Monthly verified DTR logs by teaching & non-teaching staff
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" />
                <span>Teaching</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 inline-block" />
                <span>Non-Teaching</span>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {!hasData ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center">
                <Clock className="w-8 h-8 mb-2 text-slate-300 dark:text-slate-600" />
                <p className="font-semibold text-xs text-slate-600 dark:text-slate-300">No attendance log data available</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-sm">
                  Upload an Excel biometrics file or record punches in Form 48 to view monthly attendance trends.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.15} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      borderColor: '#1e293b',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="teaching" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={16} />
                  <Bar dataKey="nonTeaching" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Personnel Category Donut Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1">
              Personnel Staff Distribution
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">
              Breakdown by faculty and administrative support
            </p>

            <div className="h-48 w-full relative flex items-center justify-center">
              {categoryPieData.length === 0 ? (
                <div className="text-center text-xs text-slate-400">
                  <p>No personnel registered</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {categoryPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderRadius: '12px',
                          borderColor: '#1e293b',
                          color: '#f8fafc',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                      {totalPersonnel}
                    </span>
                    <span className="text-[10px] text-slate-400">Total Staff</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2.5 mt-2 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {categoryPieData.map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-md" style={{ backgroundColor: cat.color }} />
                  <span className="font-medium text-slate-700 dark:text-slate-300">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-800 dark:text-slate-100">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Row: Peak Arrival Time, Department tardiness, Purple Wave Highlight */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Peak Arrival Time Area Chart */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                Peak Morning Punch-In
              </h3>
              <p className="text-[11px] text-slate-400">Biometric log timestamps</p>
            </div>
            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/50 px-2 py-1 rounded-full">
              {peakTimeLabel}
            </span>
          </div>

          <div className="h-40 w-full">
            {!hasData || peakSlot.count === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-2 text-center">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500">No arrival punch logs recorded</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={arrivalTimesData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '8px',
                      fontSize: '11px',
                      borderColor: '#1e293b'
                    }}
                  />
                  <Area type="monotone" dataKey="count" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorCount)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Department Summary List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">
              Departments & Divisions
            </h3>
            <p className="text-[11px] text-slate-400 mb-3">Civil Service Units</p>

            <div className="space-y-3">
              {departments.slice(0, 3).map((dept) => (
                <div
                  key={dept.id}
                  className="p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400 flex items-center justify-center font-bold">
                      {dept.code.slice(0, 2)}
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 dark:text-slate-200">{dept.name}</h5>
                      <span className="text-[10px] text-slate-400">{dept.headName}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-800">
                    Active Unit
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Purple Accent Highlight Banner */}
        <div className="bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-800 rounded-3xl p-6 shadow-lg shadow-purple-500/20 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-200 bg-white/10 px-2.5 py-1 rounded-full backdrop-blur-md">
              Monthly DTR Aggregate
            </span>
            <h3 className="text-2xl font-black mt-3">{Math.round(totalDutyHoursWorked).toLocaleString()} Hours</h3>
            <p className="text-xs text-purple-100 mt-1">
              {hasData ? 'Total Official Duty Hours Logged' : 'No Official Duty Hours Logged Yet'}
            </p>
          </div>

          <div className="mt-4 relative z-10">
            <div className="h-16 w-full">
              {hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hoursWaveData}>
                    <Area type="monotone" dataKey="hours" stroke="#ffffff" strokeWidth={2} fill="#ffffff" fillOpacity={0.15} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center border border-dashed border-white/20 rounded-xl">
                  <span className="text-xs text-purple-200">No duty hours curve</span>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between text-[11px] text-purple-200 mt-2">
              <span>Verified CSC Records</span>
              <span className="font-bold text-white">
                {hasData ? `${((totalOnTimeDays / totalLoggedDays) * 100).toFixed(0)}% Compliant` : '0% Logged'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personnel Roster Quick Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Personnel Roster & DTR Quick Selection
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Select any personnel to generate or edit Civil Service Form 48
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter roster..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl pl-8 pr-3 py-2 outline-none border border-slate-100 dark:border-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="p-3.5 rounded-l-xl">Personnel</th>
                <th className="p-3.5">Employee ID</th>
                <th className="p-3.5">Department</th>
                <th className="p-3.5">Category</th>
                <th className="p-3.5">Schedule</th>
                <th className="p-3.5 rounded-r-xl text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredPersonnel.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 dark:text-slate-500">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                    <p className="font-semibold text-slate-600 dark:text-slate-300 text-xs">No personnel records found</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                      The database is currently clear. Click "+ Add Personnel" or import Excel biometrics to populate the roster.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPersonnel.map((person) => (
                  <tr key={person.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="p-3.5">
                      <div className="flex items-center space-x-3">
                        <img
                          src={person.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'}
                          alt={person.name}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-violet-500/20"
                        />
                        <div>
                          <div className="font-bold text-slate-800 dark:text-slate-100">{person.name}</div>
                          <div className="text-[10px] text-slate-400">{person.title}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500 dark:text-slate-400">
                      {person.employeeId}
                    </td>
                    <td className="p-3.5 font-medium">{person.departmentName}</td>
                    <td className="p-3.5">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${
                          person.personnelType === 'teaching'
                            ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400'
                            : person.personnelType === 'non_teaching'
                            ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400'
                            : person.personnelType === 'jo'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {person.personnelType === 'teaching'
                          ? 'Teaching Faculty'
                          : person.personnelType === 'non_teaching'
                          ? 'Non-Teaching'
                          : person.personnelType === 'jo'
                          ? 'Job Order (JO)'
                          : 'Contractual Service (CoS)'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px]">
                      {person.regularSchedule
                        ? `${person.regularSchedule.amArrival} - ${person.regularSchedule.pmDeparture}`
                        : person.personnelType === 'teaching'
                        ? '07:30 - 16:30'
                        : '08:00 - 17:00'}
                    </td>
                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => onSelectPersonnelForForm48(person)}
                        className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/60 dark:hover:bg-violet-900/80 text-violet-600 dark:text-violet-300 font-semibold text-[11px] rounded-xl transition flex items-center space-x-1 ml-auto"
                      >
                        <span>Open Form 48</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
