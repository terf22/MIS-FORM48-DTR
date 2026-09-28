import React, { useState } from 'react';
import { Printer, Download, Edit3, X, Check, FileSpreadsheet, ShieldCheck, Upload, Image as ImageIcon, RotateCcw, Plus, Trash2, Table } from 'lucide-react';
import { Personnel, ServiceRecordEntry } from '../types';

interface DepEdOfficialServiceRecordPrintProps {
  personnel: Personnel;
  serviceRecords?: ServiceRecordEntry[];
  onClose?: () => void;
}

export const DepEdOfficialServiceRecordPrint: React.FC<DepEdOfficialServiceRecordPrintProps> = ({
  personnel,
  serviceRecords: propRecords,
  onClose
}) => {
  // Service Record Table Data State (allows user to provide, edit, add, or remove table rows)
  const [recordsList, setRecordsList] = useState<ServiceRecordEntry[]>(() => {
    if (propRecords && propRecords.length > 0) return propRecords;
    if (personnel.serviceRecords && personnel.serviceRecords.length > 0) return personnel.serviceRecords;
    return [];
  });

  // Functions to edit, add, or remove table rows
  const handleUpdateRecordField = (id: string, field: keyof ServiceRecordEntry, value: any) => {
    setRecordsList(prev =>
      prev.map(row => (row.id === id ? { ...row, [field]: value } : row))
    );
  };

  const handleAddRecordRow = () => {
    const lastRow = recordsList[recordsList.length - 1];
    const newRow: ServiceRecordEntry = {
      id: `sr-user-${Date.now()}`,
      dateFrom: '2026-01-01',
      dateTo: 'PRESENT',
      designation: lastRow?.designation || personnel.positionTitle || 'TCHR - II',
      status: (lastRow?.status as any) || 'PERM',
      monthlySalary: lastRow?.monthlySalary ? Number(lastRow.monthlySalary) + 1000 : 33947,
      salaryGrade: lastRow?.salaryGrade || 12,
      step: (lastRow?.step || 1) + 1,
      stationOrOffice: lastRow?.stationOrOffice || personnel.districtOrSchool || 'DR. MANUEL S. DIAZ MES',
      branch: 'Nat.',
      leaveWithoutPay: '',
      separationDateOrCause: '',
      remarks: 'STEP INCREMENT'
    };
    setRecordsList(prev => [...prev, newRow]);
  };

  const handleDeleteRecordRow = (id: string) => {
    setRecordsList(prev => prev.filter(row => row.id !== id));
  };

  // Customizable Official Header & Signatory Fields
  const [region, setRegion] = useState('Region IX, Zamboanga Peninsula');
  const [division, setDivision] = useState('DIVISION OF ZAMBOANGA CITY');
  const [address, setAddress] = useState('Baliwasan Chico, Zamboanga City');
  const [remittingAgency, setRemittingAgency] = useState('DepED Div. of ZC-1000031963');

  const [preparedByName, setPreparedByName] = useState('LINUEL B. DE LOS SANTOS');
  const [preparedByTitle, setPreparedByTitle] = useState('Administrative Officer II');

  const [certifiedByName, setCertifiedByName] = useState('AL RAHIMIN T. KENOH, J.D.');
  const [certifiedByTitle, setCertifiedByTitle] = useState('Division Administrative Officer V');
  const [certifiedBySubtitle, setCertifiedBySubtitle] = useState('Chief, Administrative Services');

  const [dateIssued, setDateIssued] = useState('August 08, 2026');
  const [isEditingHeader, setIsEditingHeader] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'table' | 'header'>('table');

  // Logos State (Persisted in localStorage)
  const [headerLogo, setHeaderLogo] = useState<string>(() => {
    return localStorage.getItem('deped_header_logo') || '';
  });

  const [footerLogo1, setFooterLogo1] = useState<string>(() => {
    return localStorage.getItem('deped_footer_logo1') || '';
  });

  const [footerLogo2, setFooterLogo2] = useState<string>(() => {
    return localStorage.getItem('deped_footer_logo2') || '';
  });

  const handleHeaderLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setHeaderLogo(result);
        localStorage.setItem('deped_header_logo', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogo1Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFooterLogo1(result);
        localStorage.setItem('deped_footer_logo1', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogo2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setFooterLogo2(result);
        localStorage.setItem('deped_footer_logo2', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetHeaderLogo = () => {
    setHeaderLogo('');
    localStorage.removeItem('deped_header_logo');
  };

  const handleResetLogo1 = () => {
    setFooterLogo1('');
    localStorage.removeItem('deped_footer_logo1');
  };

  const handleResetLogo2 = () => {
    setFooterLogo2('');
    localStorage.removeItem('deped_footer_logo2');
  };

  // Split name for top table
  const lastName = personnel.lastName || (personnel.name ? personnel.name.split(',')[0].trim() : 'PAGSUGUIRON');
  const firstName = personnel.firstName || (personnel.name && personnel.name.includes(',') ? personnel.name.split(',')[1]?.trim() : 'REAH');
  const middleName = personnel.middleName || 'BULANON';

  const handlePrint = () => {
    window.print();
  };

  const formatDateString = (str?: string) => {
    if (!str) return '';
    if (str.toUpperCase() === 'PRESENT') return 'PRESENT';
    // If YYYY-MM-DD
    if (str.includes('-')) {
      const [y, m, d] = str.split('-');
      if (y && m && d) {
        return `${m}/${d}/${y}`;
      }
    }
    return str;
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md fixed inset-0 z-50 overflow-y-auto p-4 md:p-8 flex flex-col items-center">
      {/* Top Controls Bar (Hidden during printing) */}
      <div className="print:hidden max-w-[900px] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
              DepEd Official Service Record Form (F-ADM-PER-029.0)
            </h3>
            <p className="text-xs text-slate-500">
              Standard format compliant with Executive Order No. 54, s. 1954 & EO 58
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsEditingHeader(!isEditingHeader)}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition flex items-center space-x-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditingHeader ? 'Close Form Editor' : 'Edit Form Data & Signatories'}</span>
          </button>

          <button
            onClick={handleAddRecordRow}
            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Row</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center space-x-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Service Record</span>
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Editing Drawer Panel (Hidden during printing) */}
      {isEditingHeader && (
        <div className="print:hidden max-w-[900px] w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 mb-6 shadow-xl space-y-4 text-xs">
          {/* Tab Selection */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 pb-3 gap-3">
            <button
              onClick={() => setActiveEditTab('table')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-2 transition ${
                activeEditTab === 'table'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Table className="w-4 h-4" />
              <span>Service Record Table Entries ({recordsList.length})</span>
            </button>
            <button
              onClick={() => setActiveEditTab('header')}
              className={`px-3.5 py-1.5 rounded-xl font-bold flex items-center space-x-2 transition ${
                activeEditTab === 'header'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              <span>Header, Signatories & Logos</span>
            </button>
          </div>

          {/* TAB 1: Service Record Table Rows Data Editor */}
          {activeEditTab === 'table' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-violet-600 dark:text-violet-400 text-sm">
                    Service Record Entries Table Data
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Directly modify, add, or remove table rows. All changes update live on the printable form.
                  </p>
                </div>
                <button
                  onClick={handleAddRecordRow}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center space-x-1 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Table Entry Row</span>
                </button>
              </div>

              <div className="overflow-x-auto max-h-[400px] border border-slate-200 dark:border-slate-800 rounded-xl p-1 bg-slate-50 dark:bg-slate-950">
                <table className="w-full text-left text-[11px] border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
                      <th className="p-1.5 w-[85px]">From</th>
                      <th className="p-1.5 w-[85px]">To</th>
                      <th className="p-1.5">Designation</th>
                      <th className="p-1.5 w-[65px]">Status</th>
                      <th className="p-1.5 w-[90px]">Salary (₱)</th>
                      <th className="p-1.5 w-[45px]">SG</th>
                      <th className="p-1.5 w-[40px]">Step</th>
                      <th className="p-1.5">School / Station</th>
                      <th className="p-1.5">Remarks</th>
                      <th className="p-1.5 w-[40px] text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {recordsList.map((row, index) => (
                      <tr key={row.id || index} className="hover:bg-white dark:hover:bg-slate-900 transition">
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.dateFrom}
                            onChange={(e) => handleUpdateRecordField(row.id, 'dateFrom', e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px]"
                            placeholder="YYYY-MM-DD"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.dateTo}
                            onChange={(e) => handleUpdateRecordField(row.id, 'dateTo', e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px] font-bold"
                            placeholder="PRESENT"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.designation}
                            onChange={(e) => handleUpdateRecordField(row.id, 'designation', e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px] font-semibold"
                            placeholder="TCHR - I"
                          />
                        </td>
                        <td className="p-1">
                          <select
                            value={row.status}
                            onChange={(e) => handleUpdateRecordField(row.id, 'status', e.target.value as any)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px]"
                          >
                            <option value="PERM">PERM</option>
                            <option value="PROV">PROV</option>
                            <option value="SUB">SUB</option>
                            <option value="CONTRACTUAL">CONTR</option>
                          </select>
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={row.monthlySalary}
                            onChange={(e) => handleUpdateRecordField(row.id, 'monthlySalary', parseFloat(e.target.value) || 0)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px] font-mono text-right"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={row.salaryGrade}
                            onChange={(e) => handleUpdateRecordField(row.id, 'salaryGrade', parseInt(e.target.value) || 0)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px] text-center"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="number"
                            value={row.step}
                            onChange={(e) => handleUpdateRecordField(row.id, 'step', parseInt(e.target.value) || 0)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px] text-center"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.stationOrOffice}
                            onChange={(e) => handleUpdateRecordField(row.id, 'stationOrOffice', e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px]"
                            placeholder="School Name"
                          />
                        </td>
                        <td className="p-1">
                          <input
                            type="text"
                            value={row.remarks}
                            onChange={(e) => handleUpdateRecordField(row.id, 'remarks', e.target.value)}
                            className="w-full p-1 bg-white dark:bg-slate-800 border rounded text-[11px] font-bold text-violet-600 dark:text-violet-400"
                            placeholder="SALARY TRANCHE"
                          />
                        </td>
                        <td className="p-1 text-center">
                          <button
                            onClick={() => handleDeleteRecordRow(row.id)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {recordsList.length === 0 && (
                      <tr>
                        <td colSpan={10} className="p-4 text-center text-slate-400">
                          No service record table rows. Click &quot;Add Table Entry Row&quot; above to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: Division Header & Signatories & Logos */}
          {activeEditTab === 'header' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-bold text-violet-600 dark:text-violet-400">Division Header Info</h4>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold">Region</label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold">Division</label>
                  <input
                    type="text"
                    value={division}
                    onChange={(e) => setDivision(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold">Address / Location</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold">Remitting Agency</label>
                  <input
                    type="text"
                    value={remittingAgency}
                    onChange={(e) => setRemittingAgency(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-violet-600 dark:text-violet-400">Official Signatories</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold">Prepared By Name</label>
                    <input
                      type="text"
                      value={preparedByName}
                      onChange={(e) => setPreparedByName(e.target.value)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold">Prepared By Designation</label>
                    <input
                      type="text"
                      value={preparedByTitle}
                      onChange={(e) => setPreparedByTitle(e.target.value)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold">Certified Correct Name</label>
                    <input
                      type="text"
                      value={certifiedByName}
                      onChange={(e) => setCertifiedByName(e.target.value)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold">Certified Designation</label>
                    <input
                      type="text"
                      value={certifiedByTitle}
                      onChange={(e) => setCertifiedByTitle(e.target.value)}
                      className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 font-bold">Date Issued</label>
                  <input
                    type="text"
                    value={dateIssued}
                    onChange={(e) => setDateIssued(e.target.value)}
                    className="w-full p-1.5 bg-slate-50 dark:bg-slate-800 border rounded-lg"
                  />
                </div>
              </div>

          {/* Logos Upload Section (Header & Footer) */}
          <div className="col-span-1 md:col-span-2 pt-3 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Header Logo Upload */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-violet-600 dark:text-violet-400 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Header Logo (Top DepEd Seal)</span>
                </h4>
                {headerLogo && (
                  <button
                    onClick={handleResetHeaderLogo}
                    className="text-[10px] text-red-500 hover:text-red-600 font-semibold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Upload official DepEd header logo for the top centered header.
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  {headerLogo ? (
                    <img src={headerLogo} alt="Header Logo" className="w-full h-full object-contain" />
                  ) : (
                    <svg className="w-10 h-10 text-blue-900" viewBox="0 0 100 100" fill="currentColor">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="#1e3a8a" strokeWidth="4" />
                      <path d="M50 15 L60 35 L80 38 L65 52 L68 72 L50 62 L32 72 L35 52 L20 38 L40 35 Z" fill="#1e3a8a" />
                      <circle cx="50" cy="50" r="18" fill="#ffffff" />
                      <path d="M42 45 Q50 38 58 45 Q50 52 42 45 Z" fill="#b91c1c" />
                    </svg>
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-violet-500" />
                    <span>{headerLogo ? 'Change Header Logo' : 'Upload Header Logo'}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeaderLogoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Footer Logo 1 Upload */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-violet-600 dark:text-violet-400 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Footer Logo 1 (Left Division Seal)</span>
                </h4>
                {footerLogo1 && (
                  <button
                    onClick={handleResetLogo1}
                    className="text-[10px] text-red-500 hover:text-red-600 font-semibold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Upload division seal image for the left footer (e.g. DepEd Seal).
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  {footerLogo1 ? (
                    <img src={footerLogo1} alt="Footer Logo 1" className="w-full h-full object-contain" />
                  ) : (
                    <div className="w-10 h-10 rounded-full border border-red-600 flex items-center justify-center text-[8px] font-bold text-blue-800">
                      DepEd
                    </div>
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-violet-500" />
                    <span>{footerLogo1 ? 'Change Logo 1' : 'Upload Logo 1'}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogo1Upload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Footer Logo 2 Upload */}
            <div className="space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-violet-600 dark:text-violet-400 flex items-center space-x-1.5">
                  <ImageIcon className="w-4 h-4" />
                  <span>Footer Logo 2 (Right Certification)</span>
                </h4>
                {footerLogo2 && (
                  <button
                    onClick={handleResetLogo2}
                    className="text-[10px] text-red-500 hover:text-red-600 font-semibold flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                Upload ISO 9001 certification seal image for the right footer.
              </p>
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 overflow-hidden shrink-0">
                  {footerLogo2 ? (
                    <img src={footerLogo2} alt="Footer Logo 2" className="w-full h-full object-contain" />
                  ) : (
                    <div className="border-t border-b border-red-600 px-1 text-[7px] font-bold text-center text-sky-800">
                      ISO 9001
                    </div>
                  )}
                </div>
                <label className="flex-1 cursor-pointer">
                  <div className="px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center space-x-1.5 transition">
                    <Upload className="w-3.5 h-3.5 text-violet-500" />
                    <span>{footerLogo2 ? 'Change Logo 2' : 'Upload Logo 2'}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogo2Upload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )}

      {/* PRINTABLE PAGE CANVAS (Exact DepEd F-ADM-PER-029.0 replica) */}
      <div 
        id="deped-service-record-print-canvas"
        className="bg-white text-black font-sans w-[210mm] min-h-[297mm] p-[10mm] print:p-0 shadow-2xl rounded-sm print:shadow-none print:m-0 print:w-full print:rounded-none text-[11px] leading-tight select-text flex flex-col justify-between box-border"
        style={{ color: '#000000', backgroundColor: '#ffffff' }}
      >
        {/* MAIN BODY CONTENT WRAPPER */}
        <div className="flex-1 flex flex-col justify-start">
          {/* TOP HEADER SECTION */}
          <div className="text-center relative mb-2 space-y-0.5">
            {/* DepEd Official Header Logo */}
            <div className="flex justify-center mb-1">
              {headerLogo ? (
                <img src={headerLogo} alt="DepEd Header Logo" className="h-14 max-w-full object-contain" />
              ) : (
                <svg className="w-12 h-12 text-blue-900" viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#1e3a8a" strokeWidth="4" />
                  <path d="M50 15 L60 35 L80 38 L65 52 L68 72 L50 62 L32 72 L35 52 L20 38 L40 35 Z" fill="#1e3a8a" />
                  <circle cx="50" cy="50" r="18" fill="#ffffff" />
                  <path d="M42 45 Q50 38 58 45 Q50 52 42 45 Z" fill="#b91c1c" />
                </svg>
              )}
            </div>

            <p className="text-[10px] tracking-wide">Republic of the Philippines</p>
            <p className="text-[11px] font-bold tracking-wide">Department of Education</p>
            <p className="text-[10px]">{region}</p>
            <p className="text-[11px] font-extrabold uppercase">{division}</p>
            <p className="text-[10px]">{address}</p>

            <div className="pt-2">
              <h1 className="text-base font-black tracking-wider uppercase border-b-2 border-black inline-block pb-0.5 px-4">
                SERVICE RECORD
              </h1>
              <p className="text-[9px] italic mt-0.5">(To be accomplished by Employer)</p>
            </div>
          </div>

        {/* PERSONAL METADATA TABLE */}
        <div className="border border-black mb-1 text-[10px]">
          {/* Row 1: Names */}
          <div className="grid grid-cols-12 border-b border-black divide-x divide-black text-center uppercase font-bold">
            <div className="col-span-3 p-1">
              <div className="font-extrabold text-sm">{lastName}</div>
              <div className="text-[8px] font-normal lowercase italic">(Last Name)</div>
            </div>
            <div className="col-span-3 p-1">
              <div className="font-extrabold text-sm">{firstName}</div>
              <div className="text-[8px] font-normal lowercase italic">(First Name)</div>
            </div>
            <div className="col-span-3 p-1">
              <div className="font-extrabold text-sm">{middleName}</div>
              <div className="text-[8px] font-normal lowercase italic">(Middle Name)</div>
            </div>
            <div className="col-span-3 p-1 text-left font-normal normal-case text-[8px] leading-tight flex items-center justify-center">
              (If married, give also full name and other surname used)
            </div>
          </div>

          {/* Row 2: Birth Details */}
          <div className="grid grid-cols-12 border-b border-black divide-x divide-black text-center">
            <div className="col-span-4 p-1">
              <div className="font-bold">{personnel.dateOfBirth ? formatDateString(personnel.dateOfBirth) : 'August 10, 1997'}</div>
              <div className="text-[8px] italic">(Date of Birth)</div>
            </div>
            <div className="col-span-4 p-1">
              <div className="font-bold">{personnel.placeOfBirth || 'Zamboanga City'}</div>
              <div className="text-[8px] italic">(Place of Birth)</div>
            </div>
            <div className="col-span-4 p-1 text-left text-[8px] leading-tight flex items-center">
              (Date herein should be checked from birth baptismal certificate or some other official document.)
            </div>
          </div>

          {/* Key Identification Rows */}
          <div className="p-1.5 space-y-0.5 text-[9.5px]">
            <div className="flex">
              <span className="font-bold w-44 shrink-0">DIST. / CURRENT SCHOOL:</span>
              <span className="font-semibold uppercase">{personnel.districtOrSchool || 'VITALI DIST. / DR. MANUEL S. DIAZ MES'}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-44 shrink-0">GSIS BP NO.:</span>
              <span className="font-mono">{personnel.gsisBpNo || '2005528812'}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-44 shrink-0">EMPLOYEE NO.:</span>
              <span className="font-mono">{personnel.employeeNumber || personnel.employeeId}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-44 shrink-0">T.I.N.:</span>
              <span className="font-mono">{personnel.tin || '730-262-092-000'}</span>
            </div>
            <div className="flex">
              <span className="font-bold w-44 shrink-0">ITEM NO. / CURRENT POSITION:</span>
              <span className="font-semibold">{personnel.itemNumber || 'OSEC-DECSB-TCH2-570497-2014'} / {personnel.positionTitle || personnel.title || 'TCH2'}</span>
            </div>
          </div>
        </div>

        {/* CERTIFICATION STATEMENT */}
        <p className="text-[8.5px] leading-tight text-justify my-1">
          This is to certify that the employee named herein above actually rendered service in this office or Office as indicated below each line of which is supported by appointment and other papers actually issued and approved by the authorities concerned:
        </p>

        {/* SERVICE HISTORY TABLE (Columns 1 - 10) */}
        <table className="w-full border-collapse border border-black text-[9px] text-center mb-2">
          <thead>
            {/* Table Super Headers */}
            <tr className="border-b border-black divide-x divide-black bg-slate-50 font-bold uppercase text-[8px]">
              <th className="border border-black p-0.5" colSpan={2}>
                SERVICE<br />(Inclusive Dates)
              </th>
              <th className="border border-black p-0.5" colSpan={5}>
                RECORD OF APPOINTMENT
              </th>
              <th className="border border-black p-0.5" colSpan={2}>
                OFFICE (Station/Place)
              </th>
              <th className="border border-black p-0.5" rowSpan={2}>
                BRANCH<br />(7)
              </th>
              <th className="border border-black p-0.5" colSpan={2}>
                LV.AB.<br />w/o pay
              </th>
              <th className="border border-black p-0.5" colSpan={2}>
                SEPARATION
              </th>
              <th className="border border-black p-0.5" rowSpan={2}>
                REMARKS<br />(10)
              </th>
            </tr>

            {/* Sub-headers */}
            <tr className="border-b border-black divide-x divide-black bg-slate-50 font-semibold text-[8px]">
              <th className="border border-black p-0.5 w-[65px]">From</th>
              <th className="border border-black p-0.5 w-[65px]">To</th>
              <th className="border border-black p-0.5">Designation (2)</th>
              <th className="border border-black p-0.5 w-[40px]">Status (3)</th>
              <th className="border border-black p-0.5 w-[60px]">Monthly Salary (4)</th>
              <th className="border border-black p-0.5 w-[20px]">SG (5)</th>
              <th className="border border-black p-0.5 w-[15px]">S (5)</th>
              <th className="border border-black p-0.5">School/Office Assignment (6)</th>
              <th className="border border-black p-0.5">Remitting Agency (6)</th>
              <th className="border border-black p-0.5 w-[30px]">From</th>
              <th className="border border-black p-0.5 w-[30px]">To (8)</th>
              <th className="border border-black p-0.5 w-[35px]">Date</th>
              <th className="border border-black p-0.5 w-[35px]">Cause (9)</th>
            </tr>

            {/* Column Numbers Header Row */}
            <tr className="border-b border-black divide-x divide-black bg-slate-100 font-bold text-[8px] py-0.5">
              <td className="border border-black">1</td>
              <td className="border border-black">1</td>
              <td className="border border-black">2</td>
              <td className="border border-black">3</td>
              <td className="border border-black">4</td>
              <td className="border border-black">5</td>
              <td className="border border-black">5</td>
              <td className="border border-black">6</td>
              <td className="border border-black">6</td>
              <td className="border border-black">7</td>
              <td className="border border-black" colSpan={2}>8</td>
              <td className="border border-black" colSpan={2}>9</td>
              <td className="border border-black">10</td>
            </tr>
          </thead>

          <tbody className="divide-y divide-black font-mono text-[8.5px]">
            {recordsList.map((rec, idx) => (
              <tr key={rec.id || idx} className="divide-x divide-black border-b border-black hover:bg-slate-50">
                <td className="p-0.5 whitespace-nowrap">{formatDateString(rec.dateFrom)}</td>
                <td className="p-0.5 whitespace-nowrap font-bold">{formatDateString(rec.dateTo)}</td>
                <td className="p-0.5 font-sans font-bold text-left px-1">{rec.designation}</td>
                <td className="p-0.5 font-sans">{rec.status}</td>
                <td className="p-0.5 text-right pr-1">
                  {typeof rec.monthlySalary === 'number' 
                    ? rec.monthlySalary.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    : rec.monthlySalary}
                </td>
                <td className="p-0.5">{rec.salaryGrade}</td>
                <td className="p-0.5">{rec.step}</td>
                <td className="p-0.5 font-sans text-left px-1 truncate max-w-[130px]">
                  {rec.stationOrOffice || personnel.districtOrSchool || 'DR. MANUEL S. DIAZ MES'}
                </td>
                <td className="p-0.5 font-sans text-left px-1 truncate max-w-[130px]">
                  {remittingAgency}
                </td>
                <td className="p-0.5 font-sans">{rec.branch || 'Nat.'}</td>
                <td className="p-0.5 font-sans" colSpan={2}>{rec.leaveWithoutPay || ''}</td>
                <td className="p-0.5 font-sans" colSpan={2}>{rec.separationDateOrCause || ''}</td>
                <td className="p-0.5 font-sans font-bold text-left px-1 uppercase">{rec.remarks}</td>
              </tr>
            ))}

            {/* Empty Padding Rows to maintain full page height aesthetic */}
            {Array.from({ length: Math.max(0, 9 - recordsList.length) }).map((_, i) => (
              <tr key={`pad-${i}`} className="divide-x divide-black border-b border-black h-4 text-transparent">
                <td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td><td colSpan={2}>-</td><td colSpan={2}>-</td><td>-</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* BOTTOM LEGAL CERTIFICATION CLAUSE */}
        <p className="text-[8px] italic text-center mb-2">
          Issued in compliance with Executive Order No. 54 dated August 10, 1954 and in accordance with No. 58 dated August 10, 1954 of the system.
        </p>

        {/* SIGNATORIES SECTION */}
        <div className="grid grid-cols-2 gap-8 text-[10px] mb-2 pt-1">
          {/* Left Signatory */}
          <div className="space-y-3">
            <p className="font-bold">PREPARED BY:</p>
            <div className="pl-4">
              <p className="font-black text-xs uppercase underline decoration-1 underline-offset-2">{preparedByName}</p>
              <p className="text-[9px] font-medium">{preparedByTitle}</p>
            </div>
            <div className="pt-1 flex items-center space-x-2 text-[9px]">
              <span className="font-bold">Date issued:</span>
              <span className="border-b border-black px-4 font-medium">{dateIssued}</span>
            </div>
          </div>

          {/* Right Signatory */}
          <div className="space-y-3 text-left pl-8">
            <p className="font-bold">CERTIFIED CORRECT:</p>
            <div>
              <p className="font-black text-xs uppercase underline decoration-1 underline-offset-2">{certifiedByName}</p>
              <p className="text-[9px] font-bold">{certifiedByTitle}</p>
              <p className="text-[9px] text-slate-700 italic">{certifiedBySubtitle}</p>
            </div>
          </div>
        </div>
      </div>

        {/* PAGE FOOTER BRANDING (Matching F-ADM-PER-029.0 form footer) */}
        <div className="border-t border-black pt-1.5 mt-auto grid grid-cols-12 items-end text-[8px] leading-tight gap-1 w-full shrink-0">
          {/* Left Form Code & Footer Logo 1 */}
          <div className="col-span-6 flex flex-col justify-end items-start space-y-0.5">
            <div className="font-mono font-bold text-slate-800 text-[8px]">
              F-ADM-PER-029.0 09/25/2021
            </div>
            {footerLogo1 ? (
              <img src={footerLogo1} alt="Footer Logo 1" className="h-10 max-w-full object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-full border border-slate-900 flex items-center justify-center p-0.5 bg-white shrink-0">
                <svg className="w-full h-full text-red-600" viewBox="0 0 100 100" fill="currentColor">
                  <circle cx="50" cy="50" r="46" fill="none" stroke="#dc2626" strokeWidth="4" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#1e3a8a" strokeWidth="2" />
                  <path d="M50 15 L60 35 L80 38 L65 52 L68 72 L50 62 L32 72 L35 52 L20 38 L40 35 Z" fill="#1e3a8a" />
                  <text x="50" y="55" textAnchor="middle" fill="#000" fontSize="10" fontWeight="bold">DepEd</text>
                </svg>
              </div>
            )}
          </div>

          {/* Right ISO Certification / Footer Logo 2 */}
          <div className="col-span-6 flex justify-end items-end">
            {footerLogo2 ? (
              <img src={footerLogo2} alt="Footer Logo 2" className="h-10 max-w-full object-contain" />
            ) : (
              <div className="inline-block text-center border-t-2 border-b-2 border-red-600 px-1 py-0.5">
                <p className="font-extrabold text-[8.5px] text-sky-700">ISO 9001:2015</p>
                <p className="font-black text-[10px] text-red-600 tracking-wider">CERTIFIED</p>
                <p className="text-[6px] text-slate-500 font-mono">TUV 100 05 4286</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Global CSS for Print Media Override */}
      <style>{`
        @media print {
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background-color: white !important;
            color: black !important;
            overflow: hidden !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          #deped-service-record-print-canvas {
            width: 100% !important;
            height: 100% !important;
            min-height: 100% !important;
            max-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          @page {
            size: A4 portrait;
            margin: 6mm 8mm;
          }
        }
      `}</style>
    </div>
  );
};
