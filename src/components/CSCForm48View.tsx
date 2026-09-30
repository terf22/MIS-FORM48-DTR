import React, { useState } from 'react';
import { toPng, toJpeg } from 'html-to-image';
import jsPDF from 'jspdf';
import {
  Printer,
  Download,
  Edit3,
  CheckCircle,
  FileSpreadsheet,
  Copy,
  Clock,
  User,
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles,
  UserCheck,
  Award,
  FileText,
  Loader2,
  Layers,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  Check,
  Search,
  X,
  Users
} from 'lucide-react';
import { MonthlyDTR, Personnel, UserRole, LanguageCode, Department, DTRDayEntry } from '../types';
import { formatCSCTime, formatMinutesLabel, formatForm48Name } from '../utils/cscForm48';
import { translations } from '../utils/translations';
import { DayNoteModal } from './DayNoteModal';
import { EditPersonnelModal } from './EditPersonnelModal';
import { EditInChargeModal } from './EditInChargeModal';
import * as XLSX from 'xlsx';

interface CSCForm48ViewProps {
  personnelList: Personnel[];
  selectedPersonnel: Personnel | null;
  onSelectPersonnel: (p: Personnel) => void;
  monthlyDTR: MonthlyDTR | null;
  dtrMap?: Record<string, MonthlyDTR>;
  departments?: Department[];
  onUpdateDTRDay: (dayNum: number, fieldOrObject: any, value?: any, targetPersonId?: string) => void;
  onUpdatePersonnel?: (updated: Personnel) => void;
  onDeletePersonnel?: (personnelId: string) => void;
  onUpdateInCharge?: (headName: string, headTitle: string, targetDeptId?: string, applyToAll?: boolean, verifiedDate?: string) => void;
  currentRole: UserRole;
  lang: LanguageCode;
  onLogAudit: (action: string, category: 'DTR_EDIT' | 'SYSTEM', details: string) => void;
  onOpenAddPersonnelModal?: () => void;
  selectedMonth?: number;
  selectedYear?: number;
  onSelectMonthYear?: (month: number, year: number) => void;
}

export const CSCForm48View: React.FC<CSCForm48ViewProps> = ({
  personnelList,
  selectedPersonnel,
  onSelectPersonnel,
  monthlyDTR,
  departments = [],
  onUpdateDTRDay,
  onUpdatePersonnel,
  onDeletePersonnel,
  onUpdateInCharge,
  currentRole,
  lang,
  onLogAudit,
  onOpenAddPersonnelModal,
  selectedMonth: propSelectedMonth,
  selectedYear: propSelectedYear,
  onSelectMonthYear
}) => {
  const t = translations[lang];
  const [printLayout, setPrintLayout] = useState<'1-up' | '2-up'>('1-up');
  const [paperSize, setPaperSize] = useState<'auto' | 'a4' | 'letter' | 'legal'>('auto');
  const [printScale, setPrintScale] = useState<'fit' | 'compact' | 'ultra'>('fit');
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number>(
    monthlyDTR?.month || propSelectedMonth || 7
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    monthlyDTR?.year || propSelectedYear || 2026
  );
  const [isNoteModalOpen, setIsNoteModalOpen] = useState<boolean>(false);
  const [noteModalDay, setNoteModalDay] = useState<number>(1);
  const [isEditPersonnelOpen, setIsEditPersonnelOpen] = useState<boolean>(false);
  const [isEditInChargeOpen, setIsEditInChargeOpen] = useState<boolean>(false);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [isBatchExportingPDF, setIsBatchExportingPDF] = useState<boolean>(false);
  const [pdfBatchProgress, setPdfBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Lock scrollbars on body/html during PDF export
  React.useEffect(() => {
    if (isExportingPDF || isBatchExportingPDF) {
      document.documentElement.classList.add('hide-scrollbars-for-pdf');
      document.body.classList.add('hide-scrollbars-for-pdf');
      return () => {
        document.documentElement.classList.remove('hide-scrollbars-for-pdf');
        document.body.classList.remove('hide-scrollbars-for-pdf');
      };
    }
  }, [isExportingPDF, isBatchExportingPDF]);

  // Batch Export Selection State
  const [isBatchModalOpen, setIsBatchModalOpen] = useState<boolean>(false);
  const [selectedPersonnelIdsForBatch, setSelectedPersonnelIdsForBatch] = useState<string[]>([]);
  const [batchSearchQuery, setBatchSearchQuery] = useState<string>('');

  const handleOpenBatchModal = () => {
    setSelectedPersonnelIdsForBatch(personnelList.map((p) => p.id));
    setBatchSearchQuery('');
    setIsBatchModalOpen(true);
  };

  const togglePersonnelForBatch = (id: string) => {
    setSelectedPersonnelIdsForBatch((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllBatch = () => {
    setSelectedPersonnelIdsForBatch(personnelList.map((p) => p.id));
  };

  const handleDeselectAllBatch = () => {
    setSelectedPersonnelIdsForBatch([]);
  };

  // Date Range Selection State
  const [rangePreset, setRangePreset] = useState<'full' | '1st-half' | '2nd-half' | 'custom'>('full');
  const [startDay, setStartDay] = useState<number>(1);
  const [endDay, setEndDay] = useState<number>(31);
  const [isCalendarPickerOpen, setIsCalendarPickerOpen] = useState<boolean>(false);

  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  React.useEffect(() => {
    const numDays = new Date(selectedYear, selectedMonth, 0).getDate();
    if (rangePreset === 'full') {
      setStartDay(1);
      setEndDay(numDays);
    } else if (rangePreset === '1st-half') {
      setStartDay(1);
      setEndDay(15);
    } else if (rangePreset === '2nd-half') {
      setStartDay(16);
      setEndDay(numDays);
    } else if (rangePreset === 'custom') {
      setStartDay((prev) => Math.min(Math.max(1, prev), numDays));
      setEndDay((prev) => Math.min(Math.max(1, prev), numDays));
    }
  }, [selectedMonth, selectedYear, rangePreset]);

  const actualStartDay = Math.max(1, Math.min(startDay, daysInMonth));
  const actualEndDay = Math.max(actualStartDay, Math.min(endDay, daysInMonth));

  const filteredDays = React.useMemo(() => {
    if (!monthlyDTR) return [];
    const dayMap = new Map<number, DTRDayEntry>();
    (monthlyDTR.days || []).forEach((d) => dayMap.set(d.day, d));

    const result: DTRDayEntry[] = [];
    for (let d = actualStartDay; d <= actualEndDay; d++) {
      if (dayMap.has(d)) {
        const item = { ...dayMap.get(d)! };
        if (!item.date) {
          item.date = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
        result.push(item);
      } else {
        const dateObj = new Date(selectedYear, selectedMonth - 1, d);
        const dayOfWeek = dateObj.getDay();
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const isSun = dayOfWeek === 0;
        const isSat = dayOfWeek === 6;
        result.push({
          day: d,
          date: dateStr,
          amArrival: isSun ? 'SUNDAY' : isSat ? 'SATURDAY' : '',
          amDeparture: '',
          pmArrival: '',
          pmDeparture: '',
          statusTag: isSun ? 'SUNDAY' : isSat ? 'SATURDAY' : 'REGULAR',
          remarks: '',
          lateMinutes: 0,
          undertimeMinutes: 0,
          isAdjusted: false
        });
      }
    }
    return result;
  }, [monthlyDTR, actualStartDay, actualEndDay, selectedYear, selectedMonth]);

  const totalLate = filteredDays.reduce((acc, curr) => acc + (curr.lateMinutes || 0), 0);
  const totalUndertime = filteredDays.reduce((acc, curr) => acc + (curr.undertimeMinutes || 0), 0);
  const { hrs: lateHrs, mins: lateMins } = formatMinutesLabel(totalLate);
  const { hrs: underHrs, mins: underMins } = formatMinutesLabel(totalUndertime);

  React.useEffect(() => {
    if (propSelectedMonth && propSelectedMonth !== selectedMonth) {
      setSelectedMonth(propSelectedMonth);
    }
  }, [propSelectedMonth]);

  React.useEffect(() => {
    if (propSelectedYear && propSelectedYear !== selectedYear) {
      setSelectedYear(propSelectedYear);
    }
  }, [propSelectedYear]);

  React.useEffect(() => {
    if (monthlyDTR) {
      if (monthlyDTR.month && monthlyDTR.month !== selectedMonth) {
        setSelectedMonth(monthlyDTR.month);
      }
      if (monthlyDTR.year && monthlyDTR.year !== selectedYear) {
        setSelectedYear(monthlyDTR.year);
      }
    }
  }, [monthlyDTR?.month, monthlyDTR?.year]);

  const handleMonthChange = (newM: number) => {
    setSelectedMonth(newM);
    if (onSelectMonthYear) {
      onSelectMonthYear(newM, selectedYear);
    }
  };

  const handleYearChange = (newY: number) => {
    setSelectedYear(newY);
    if (onSelectMonthYear) {
      onSelectMonthYear(selectedMonth, newY);
    }
  };

  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  // Print Handler
  const handlePrint = () => {
    if (!selectedPersonnel) return;
    onLogAudit(
      'CSC_FORM_48_PRINT',
      'SYSTEM',
      `Printed CSC Form 48 for ${selectedPersonnel.name} (${selectedPersonnel.employeeId}) in ${printLayout} layout.`
    );
    window.print();
  };

  // Helper to safely render high-resolution canvas/image data for CSC Form 48 using html-to-image
  const captureFormImageData = async (element: HTMLElement): Promise<string> => {
    const is2Up = element.classList.contains('layout-2-up');
    
    // Exact 3.5 in x 8.5 in at 120 DPI = 420px width x 1020px height
    const cardWidthPx = 420;
    const cardHeightPx = 1020;
    const gapPx = 20;
    const targetContainerWidth = is2Up ? cardWidthPx * 2 + gapPx + 24 : cardWidthPx + 24;

    // Offscreen wrapper container so the capture process is completely invisible to the user and doesn't trigger window scrollbars
    const wrapper = document.createElement('div');
    wrapper.style.position = 'fixed';
    wrapper.style.left = '0';
    wrapper.style.top = '0';
    wrapper.style.opacity = '0';
    wrapper.style.width = `${targetContainerWidth}px`;
    wrapper.style.height = 'auto';
    wrapper.style.overflow = 'hidden';
    wrapper.style.zIndex = '-999999';
    wrapper.style.pointerEvents = 'none';

    // Temporary container inside wrapper
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'relative';
    tempContainer.style.left = '0';
    tempContainer.style.top = '0';
    tempContainer.style.width = `${targetContainerWidth}px`;
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.color = '#000000';
    tempContainer.style.margin = '0';
    tempContainer.style.padding = '12px';
    tempContainer.style.boxSizing = 'border-box';
    tempContainer.style.overflow = 'hidden';

    // Inject CSS to strip all scrollbars from capture clone
    const scrollbarOverrideStyle = document.createElement('style');
    scrollbarOverrideStyle.textContent = `
      * {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }
      *::-webkit-scrollbar {
        display: none !important;
        width: 0 !important;
        height: 0 !important;
      }
    `;
    tempContainer.appendChild(scrollbarOverrideStyle);

    // Deep clone the source form element
    const clone = element.cloneNode(true) as HTMLElement;

    // Remove interactive edit controls, note buttons, inputs, selects, print:hidden elements from clone
    const elementsToRemove = clone.querySelectorAll(
      '.print\\:hidden, .no-print, button, input, select'
    );
    elementsToRemove.forEach((el) => el.remove());

    // Strip dark mode, layout constraints, and scrollbars on clone
    clone.classList.remove('dark', 'max-w-xl', 'max-w-5xl', 'mx-auto', 'shadow-2xl');
    clone.style.width = '100%';
    clone.style.maxWidth = 'none';
    clone.style.margin = '0';
    clone.style.padding = '0';
    clone.style.backgroundColor = '#ffffff';
    clone.style.color = '#000000';
    clone.style.overflow = 'hidden';

    if (is2Up) {
      clone.style.display = 'flex';
      clone.style.flexDirection = 'row';
      clone.style.justifyContent = 'center';
      clone.style.gap = `${gapPx}px`;
    } else {
      clone.style.display = 'flex';
      clone.style.justifyContent = 'center';
    }

    // Force all overflow containers inside clone to visible / hidden so no scrollbar is captured
    const overflowContainers = clone.querySelectorAll('.overflow-x-auto, .overflow-auto, .overflow-y-auto');
    overflowContainers.forEach((c) => {
      if (c instanceof HTMLElement) {
        c.style.overflow = 'hidden';
        c.style.overflowX = 'hidden';
        c.style.overflowY = 'hidden';
      }
    });

    // Enforce exact 3.5in width and crisp printable borders on cards
    const cards = clone.querySelectorAll('.csc-form-card');
    cards.forEach((card) => {
      if (card instanceof HTMLElement) {
        card.style.backgroundColor = '#ffffff';
        card.style.color = '#000000';
        card.style.borderColor = '#000000';
        card.style.borderWidth = '1.5px';
        card.style.borderStyle = 'solid';
        card.style.borderRadius = '0px';
        card.style.boxShadow = 'none';
        card.style.width = `${cardWidthPx}px`;
        card.style.minWidth = `${cardWidthPx}px`;
        card.style.maxWidth = `${cardWidthPx}px`;
        card.style.minHeight = `${cardHeightPx}px`;
        card.style.height = 'auto';
        card.style.maxHeight = 'none';
        card.style.boxSizing = 'border-box';
        card.style.overflow = 'visible';
      }
    });

    const tables = clone.querySelectorAll('table');
    tables.forEach((table) => {
      if (table instanceof HTMLElement) {
        table.style.width = '100%';
        table.style.tableLayout = 'fixed';
        table.style.borderCollapse = 'collapse';
        table.style.border = '1.5px solid #000000';
        table.style.borderBottom = '2px solid #000000';
        table.style.overflow = 'visible';
      }
    });

    const cells = clone.querySelectorAll('td, th');
    cells.forEach((cell) => {
      if (cell instanceof HTMLElement) {
        cell.style.borderColor = '#000000';
      }
    });

    // Ensure all total rows and last table rows have explicit solid bottom border in export
    const totalRows = clone.querySelectorAll('tr:last-child');
    totalRows.forEach((tr) => {
      if (tr instanceof HTMLElement) {
        tr.style.borderBottom = '2px solid #000000';
        tr.querySelectorAll('td').forEach((td) => {
          td.style.borderBottom = '2px solid #000000';
        });
      }
    });

    tempContainer.appendChild(clone);
    wrapper.appendChild(tempContainer);
    document.body.appendChild(wrapper);

    try {
      // Pass 1: Warm-up render for font/style initialization
      try {
        await toPng(tempContainer, { pixelRatio: 2, backgroundColor: '#ffffff' });
      } catch {
        // ignore warm-up error
      }

      return await toPng(tempContainer, {
        pixelRatio: 2.2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });
    } catch (err1) {
      console.warn('toPng capture on tempContainer failed, trying toJpeg fallback:', err1);
      try {
        return await toJpeg(tempContainer, {
          quality: 0.95,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
        });
      } catch (err2) {
        console.warn('toJpeg on tempContainer failed, trying toPng directly on element:', err2);
        return await toPng(element, {
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          filter: (node: Node) => {
            if (node instanceof HTMLElement) {
              if (
                node.classList.contains('print:hidden') ||
                node.classList.contains('no-print') ||
                node.tagName === 'BUTTON'
              ) {
                return false;
              }
            }
            return true;
          },
        });
      }
    } finally {
      if (wrapper.parentNode) {
        wrapper.parentNode.removeChild(wrapper);
      }
    }
  };

  // Single PDF Export Handler
  const handleExportPDF = async () => {
    if (!selectedPersonnel || !monthlyDTR) return;
    setEditingDay(null);
    await new Promise((r) => setTimeout(r, 50));

    const element = document.querySelector('.printable-csc-form') as HTMLElement;
    if (!element) return;

    setIsExportingPDF(true);
    try {
      const imgData = await captureFormImageData(element);

      const targetFormat = paperSize === 'auto' ? 'a4' : paperSize === 'legal' ? [215.9, 330.2] : paperSize;
      // ALWAYS PORTRAIT orientation even in 1-up or 2-up per user requirement
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: targetFormat
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // Official CSC Form 48 dimensions: 3.5 inches (88.9 mm) width x 8.5 inches (215.9 mm) height per form
      const singleWidthMM = 88.9;
      const singleHeightMM = 215.9;
      const gapMM = 4.0;

      const is2Up = printLayout === '2-up';
      const desiredWidthMM = is2Up ? singleWidthMM * 2 + gapMM : singleWidthMM;
      const desiredHeightMM = singleHeightMM;

      const marginX = 4;
      const marginY = 4;
      const maxW = pdfWidth - marginX * 2;
      const maxH = pdfHeight - marginY * 2;

      let renderW = desiredWidthMM;
      let renderH = desiredHeightMM;

      if (renderW > maxW) {
        const scale = maxW / renderW;
        renderW = maxW;
        renderH = renderH * scale;
      }
      if (renderH > maxH) {
        const scale = maxH / renderH;
        renderH = maxH;
        renderW = renderW * scale;
      }

      const posX = (pdfWidth - renderW) / 2;
      const posY = (pdfHeight - renderH) / 2;

      const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
      pdf.addImage(imgData, format, posX, posY, renderW, renderH, undefined, 'FAST');

      const cleanName = selectedPersonnel.name.replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`CSC_Form_48_${cleanName}_${monthNames[selectedMonth - 1]}_${selectedYear}.pdf`);

      onLogAudit(
        'CSC_FORM_48_PDF_EXPORT',
        'SYSTEM',
        `Exported official CSC Form 48 PDF for ${selectedPersonnel.name} (${monthNames[selectedMonth - 1]} ${selectedYear}).`
      );
    } catch (err) {
      console.error('PDF generation error:', err);
      alert(`Failed to generate PDF: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Batch PDF Export Handler for Selected / All Personnel
  const handleBatchExportPDF = async (customPersonnelList?: Personnel[]) => {
    const exportList = customPersonnelList || personnelList.filter((p) => selectedPersonnelIdsForBatch.includes(p.id));

    if (exportList.length === 0) {
      alert('Please select at least one personnel to export.');
      return;
    }

    setIsBatchModalOpen(false);
    const initialSelectedPerson = selectedPersonnel;
    setIsBatchExportingPDF(true);
    setEditingDay(null);
    setPdfBatchProgress({ current: 0, total: exportList.length });

    try {
      const targetFormat = paperSize === 'auto' ? 'a4' : paperSize === 'legal' ? [215.9, 330.2] : paperSize;
      // ALWAYS PORTRAIT orientation even in 1-up or 2-up per user requirement
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: targetFormat
      });

      for (let i = 0; i < exportList.length; i++) {
        const person = exportList[i];
        setPdfBatchProgress({ current: i + 1, total: exportList.length });
        
        // Select personnel to trigger React state update
        onSelectPersonnel(person);

        // Allow React DOM time to settle and render the new personnel's DTR
        await new Promise((r) => setTimeout(r, 300));

        const element = document.querySelector('.printable-csc-form') as HTMLElement;
        if (!element) throw new Error(`Print element not found for ${person.name}.`);

        let imgData: string;
        try {
          imgData = await captureFormImageData(element);
        } catch (captureError) {
          console.warn(`Retry capturing for ${person.name}...`, captureError);
          await new Promise((r) => setTimeout(r, 250));
          imgData = await captureFormImageData(element);
        }

        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const singleWidthMM = 88.9;
        const singleHeightMM = 215.9;
        const gapMM = 4.0;

        const is2Up = printLayout === '2-up';
        const desiredWidthMM = is2Up ? singleWidthMM * 2 + gapMM : singleWidthMM;
        const desiredHeightMM = singleHeightMM;

        const marginX = 4;
        const marginY = 4;
        const maxW = pdfWidth - marginX * 2;
        const maxH = pdfHeight - marginY * 2;

        let renderW = desiredWidthMM;
        let renderH = desiredHeightMM;

        if (renderW > maxW) {
          const scale = maxW / renderW;
          renderW = maxW;
          renderH = renderH * scale;
        }
        if (renderH > maxH) {
          const scale = maxH / renderH;
          renderH = maxH;
          renderW = renderW * scale;
        }

        const posX = (pdfWidth - renderW) / 2;
        const posY = (pdfHeight - renderH) / 2;

        if (i > 0) pdf.addPage(targetFormat, 'portrait');
        const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(imgData, format, posX, posY, renderW, renderH, undefined, 'FAST');
      }

      pdf.save(`CSC_Form_48_Batch_${exportList.length}_Personnel_${monthNames[selectedMonth - 1]}_${selectedYear}.pdf`);

      onLogAudit(
        'CSC_FORM_48_BATCH_PDF_EXPORT',
        'SYSTEM',
        `Exported batch CSC Form 48 PDF for ${exportList.length} selected personnel.`
      );
    } catch (err) {
      console.error('Batch PDF export error:', err);
      alert(`Batch PDF export error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsBatchExportingPDF(false);
      setPdfBatchProgress(null);
      if (initialSelectedPerson) {
        onSelectPersonnel(initialSelectedPerson);
      }
    }
  };

  // Day Note Application (Single Day or Date Range)
  const handleApplyDayNote = (
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
  ) => {
    const minDay = Math.min(startDay, endDay);
    const maxDay = Math.max(startDay, endDay);

    for (let d = minDay; d <= maxDay; d++) {
      if (applyToAll) {
        personnelList.forEach((person) => {
          onUpdateDTRDay(d, noteData, undefined, person.id);
        });
      } else {
        if (selectedPersonnel) {
          onUpdateDTRDay(d, noteData, undefined, selectedPersonnel.id);
        }
      }
    }

    const rangeLabel = minDay === maxDay ? `Day ${minDay}` : `Days ${minDay}–${maxDay}`;
    if (applyToAll) {
      onLogAudit(
        'DAY_NOTE_APPLIED_ALL',
        'DTR_EDIT',
        `Applied ${rangeLabel} note "${noteData.statusTag} - ${noteData.remarks}" to ALL ${personnelList.length} personnel.`
      );
    } else if (selectedPersonnel) {
      onLogAudit(
        'DAY_NOTE_APPLIED_SINGLE',
        'DTR_EDIT',
        `Applied ${rangeLabel} note "${noteData.statusTag} - ${noteData.remarks}" to ${selectedPersonnel.name}.`
      );
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (!selectedPersonnel || !monthlyDTR) return;
    const exportRows = monthlyDTR.days.map((d) => ({
      'Date': d.date || `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`,
      'Day': d.day,
      'A.M. Arrival': d.amArrival,
      'A.M. Departure': d.amDeparture,
      'P.M. Arrival': d.pmArrival,
      'P.M. Departure': d.pmDeparture,
      'Late (Mins)': d.lateMinutes || '',
      'Undertime (Mins)': d.undertimeMinutes || '',
      'Remarks': d.remarks || ''
    }));

    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'DTR_CSC_48');
    XLSX.writeFile(wb, `CSC_Form_48_${selectedPersonnel.employeeId}_${monthNames[selectedMonth - 1]}_${selectedYear}.xlsx`);

    onLogAudit(
      'CSC_FORM_48_EXCEL_EXPORT',
      'SYSTEM',
      `Exported CSC Form 48 Excel file for ${selectedPersonnel.name}.`
    );
  };

  if (!selectedPersonnel || !monthlyDTR || personnelList.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center text-slate-800 dark:text-slate-100 shadow-md space-y-4 my-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">No Personnel Selected or Found</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1">
            Add a personnel record to generate and manage Civil Service Form 48 Daily Time Records, or import attendance logs via Excel.
          </p>
        </div>
        {onOpenAddPersonnelModal && (
          <button
            onClick={onOpenAddPersonnelModal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white shadow-md transition inline-flex items-center space-x-2"
          >
            <span>+ Add Personnel Record</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Toolbar (Hidden during browser printing) */}
      <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-slate-800 dark:text-slate-100 flex flex-wrap items-center justify-between gap-3">
        
        {/* Personnel & Date Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 px-3 py-1.5 rounded-xl">
            <User className="w-4 h-4 text-violet-600 dark:text-sky-400 shrink-0" />
            <select
              value={selectedPersonnel.id}
              onChange={(e) => {
                const found = personnelList.find((p) => p.id === e.target.value);
                if (found) onSelectPersonnel(found);
              }}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer max-w-[220px] sm:max-w-[320px] truncate"
            >
              {personnelList.map((p) => (
                <option key={p.id} value={p.id} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {p.name} ({
                    p.personnelType === 'teaching'
                      ? 'Teacher'
                      : p.personnelType === 'non_teaching'
                      ? 'Non-Teaching'
                      : p.personnelType === 'teaching_related'
                      ? 'Teaching-Related'
                      : p.personnelType === 'jo'
                      ? 'Job Order Staff'
                      : 'Contractual Service Staff'
                  }) - {p.departmentName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 px-2.5 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              {monthNames.map((m, idx) => (
                <option key={idx + 1} value={idx + 1} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">
                  {m}
                </option>
              ))}
            </select>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-slate-800 dark:text-white focus:outline-none cursor-pointer"
            >
              <option value={2026} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">2026</option>
              <option value={2025} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">2025</option>
              <option value={2027} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">2027</option>
            </select>
          </div>

          <span className={`px-2 py-1 rounded-full text-[11px] font-bold border shrink-0 ${
            selectedPersonnel.personnelType === 'teaching'
              ? 'bg-blue-50 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30'
              : selectedPersonnel.personnelType === 'non_teaching'
              ? 'bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
              : selectedPersonnel.personnelType === 'teaching_related'
              ? 'bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-500/30'
              : selectedPersonnel.personnelType === 'jo'
              ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30'
              : 'bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30'
          }`}>
            {selectedPersonnel.personnelType === 'teaching'
              ? 'TEACHING'
              : selectedPersonnel.personnelType === 'non_teaching'
              ? 'NON-TEACHING'
              : selectedPersonnel.personnelType === 'teaching_related'
              ? 'TEACHING-RELATED'
              : selectedPersonnel.personnelType === 'jo'
              ? 'JO STAFF'
              : 'COS STAFF'}
          </span>

          {/* Edit Teacher Info Button */}
          {(currentRole === 'admin' || currentRole === 'dept_head') && onUpdatePersonnel && (
            <button
              onClick={() => setIsEditPersonnelOpen(true)}
              className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 border border-indigo-200 dark:border-indigo-500/40 text-xs font-bold text-indigo-700 dark:text-indigo-300 flex items-center space-x-1.5 transition shadow-sm"
              title="Edit Teacher Profile, Position, Schedule & Email"
            >
              <UserCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="hidden xl:inline">Edit Teacher</span>
            </button>
          )}

          {/* Edit In-Charge Button */}
          {(currentRole === 'admin' || currentRole === 'dept_head') && onUpdateInCharge && (
            <button
              onClick={() => setIsEditInChargeOpen(true)}
              className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 hover:bg-amber-100 dark:hover:bg-amber-500/30 border border-amber-200 dark:border-amber-500/40 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center space-x-1.5 transition shadow-sm"
              title="Edit In-Charge Signatory Name & Title"
            >
              <Award className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="hidden xl:inline">Edit Head</span>
            </button>
          )}
        </div>

        {/* Action Controls: Print Layout, Download, Excel */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Print 1-Up / 2-Up Switcher */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setPrintLayout('1-up')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                printLayout === '1-up'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="1-Up Single Form Layout"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">1-Up</span>
            </button>
            <button
              onClick={() => setPrintLayout('2-up')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center space-x-1 ${
                printLayout === '2-up'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
              title="2-Up Side-by-Side Form Layout"
            >
              <Copy className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">2-Up</span>
            </button>
          </div>

          {/* Paper Target Selector with CSC 3.5" x 10.0" Fixed Size Indicator */}
          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <span className="px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-800 dark:text-blue-200 text-[10px] font-extrabold uppercase tracking-tight">
              3.5" × 10" Card
            </span>
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1" />
            <select
              value={paperSize}
              onChange={(e) => setPaperSize(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-violet-700 dark:text-sky-300 focus:outline-none cursor-pointer"
              title="Target Paper Sheet for Print / PDF Export"
            >
              <option value="auto" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Auto Paper Sheet</option>
              <option value="a4" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">A4 Paper (8.27" × 11.69")</option>
              <option value="letter" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Letter Paper (8.5" × 11")</option>
              <option value="legal" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Legal Paper (8.5" × 13")</option>
            </select>
          </div>

          {/* Print Scale Density Selector */}
          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 rounded-xl px-2 py-1.5 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <select
              value={printScale}
              onChange={(e) => setPrintScale(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-amber-700 dark:text-amber-300 focus:outline-none cursor-pointer"
              title="Adjust table row height density"
            >
              <option value="fit" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Auto Fit</option>
              <option value="compact" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Compact</option>
              <option value="ultra" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">Ultra Fit</option>
            </select>
          </div>



          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || isBatchExportingPDF}
            className="p-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white shadow-md flex items-center space-x-1.5 transition disabled:opacity-50"
            title="Export active CSC Form 48 to PDF"
          >
            {isExportingPDF ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <FileText className="w-4 h-4 text-rose-100" />
            )}
            <span className="hidden lg:inline">{isExportingPDF ? 'Exporting...' : 'PDF'}</span>
          </button>

          {/* Batch Export PDF Button */}
          {personnelList.length > 0 && (
            <button
              onClick={handleOpenBatchModal}
              disabled={isExportingPDF || isBatchExportingPDF}
              className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/80 hover:bg-rose-100 dark:hover:bg-rose-900/90 border border-rose-200 dark:border-rose-800/80 text-xs font-semibold text-rose-800 dark:text-rose-200 flex items-center space-x-1.5 transition shadow-sm disabled:opacity-50"
              title="Select Personnel to Batch Export CSC Form 48 to PDF"
            >
              {isBatchExportingPDF ? (
                <Loader2 className="w-4 h-4 animate-spin text-rose-600 dark:text-rose-400" />
              ) : (
                <Layers className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              )}
              <span className="hidden xl:inline">
                {isBatchExportingPDF
                  ? `Batch (${pdfBatchProgress?.current}/${pdfBatchProgress?.total})`
                  : 'Batch Export'}
              </span>
            </button>
          )}

          {/* Print Button */}
          <button
            onClick={handlePrint}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-xs font-bold text-white shadow-md flex items-center space-x-1.5 transition"
            title="Print Form 48 (CSC Standard)"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* Date Range Selector Bar (Hidden during browser printing) */}
      <div className="print:hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm text-slate-800 dark:text-slate-100 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap gap-1">
                <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Print & Report Date Range</span>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30 text-[10px] font-extrabold uppercase">
                  {monthNames[selectedMonth - 1]} {actualStartDay}–{actualEndDay}, {selectedYear} ({filteredDays.length} Days)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Choose custom dates to render and print on Civil Service Form 48 or export to PDF/Excel.
              </p>
            </div>
          </div>

          {/* Quick Presets & Calendar Toggle */}
          <div className="flex items-center flex-wrap gap-1.5 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/80">
            <button
              onClick={() => {
                setRangePreset('full');
                setIsCalendarPickerOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                rangePreset === 'full'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>Full Month (1–{daysInMonth})</span>
            </button>

            <button
              onClick={() => {
                setRangePreset('1st-half');
                setIsCalendarPickerOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                rangePreset === '1st-half'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>1st Half (1–15)</span>
            </button>

            <button
              onClick={() => {
                setRangePreset('2nd-half');
                setIsCalendarPickerOpen(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                rangePreset === '2nd-half'
                  ? 'bg-amber-500 text-slate-950 shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <span>2nd Half (16–{daysInMonth})</span>
            </button>

            <button
              onClick={() => {
                setRangePreset('custom');
                setIsCalendarPickerOpen(!isCalendarPickerOpen);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center space-x-1 ${
                rangePreset === 'custom' || isCalendarPickerOpen
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 mr-1 text-amber-500 dark:text-amber-300" />
              <span>{isCalendarPickerOpen ? 'Close Calendar' : 'Custom Calendar Range'}</span>
            </button>
          </div>
        </div>

        {/* Custom Interactive Calendar Drawer */}
        {(rangePreset === 'custom' || isCalendarPickerOpen) && (
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 rounded-xl p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(actualStartDay).padStart(2, '0')}`}
                    min={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
                    max={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const parts = e.target.value.split('-');
                        const dayVal = parseInt(parts[2], 10);
                        if (!isNaN(dayVal)) {
                          setStartDay(dayVal);
                          if (dayVal > endDay) setEndDay(dayVal);
                          setRangePreset('custom');
                        }
                      }
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="text-slate-400 dark:text-slate-500 pt-4 font-bold">→</div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">End Date</label>
                  <input
                    type="date"
                    value={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(actualEndDay).padStart(2, '0')}`}
                    min={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`}
                    max={`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`}
                    onChange={(e) => {
                      if (e.target.value) {
                        const parts = e.target.value.split('-');
                        const dayVal = parseInt(parts[2], 10);
                        if (!isNaN(dayVal)) {
                          setEndDay(dayVal);
                          if (dayVal < startDay) setStartDay(dayVal);
                          setRangePreset('custom');
                        }
                      }
                    }}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 inline mr-1" />
                <span>Click any start and end date on the calendar grid to select your range visually.</span>
              </div>
            </div>

            {/* Calendar Grid Picker */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl max-w-lg mx-auto shadow-md">
              <div className="text-center text-xs font-extrabold text-amber-600 dark:text-amber-300 uppercase tracking-widest mb-2 flex items-center justify-center space-x-2">
                <span>{monthNames[selectedMonth - 1]} {selectedYear}</span>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase pb-1.5 border-b border-slate-200 dark:border-slate-800">
                <span className="text-rose-600 dark:text-rose-400">Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span className="text-amber-600 dark:text-amber-400">Sat</span>
              </div>

              {/* Calendar Grid Days */}
              <div className="grid grid-cols-7 gap-1 pt-2">
                {/* Blank cells before 1st of month */}
                {Array.from({ length: new Date(selectedYear, selectedMonth - 1, 1).getDay() }).map((_, i) => (
                  <div key={`blank-${i}`} className="h-9" />
                ))}

                {/* Days 1 to daysInMonth */}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
                  const isSelected = d >= actualStartDay && d <= actualEndDay;
                  const isStart = d === actualStartDay;
                  const isEnd = d === actualEndDay;

                  return (
                    <button
                      key={`day-${d}`}
                      onClick={() => {
                        setRangePreset('custom');
                        if (d < actualStartDay) {
                          setStartDay(d);
                        } else if (d > actualStartDay && actualStartDay === actualEndDay) {
                          setEndDay(d);
                        } else {
                          setStartDay(d);
                          setEndDay(d);
                        }
                      }}
                      className={`h-9 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center relative cursor-pointer ${
                        isStart || isEnd
                          ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md ring-2 ring-amber-400 scale-105 z-10'
                          : isSelected
                          ? 'bg-amber-100 dark:bg-amber-500/30 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/50'
                          : 'bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50'
                      }`}
                      title={`Click to set day ${d} range`}
                    >
                      <span>{d}</span>
                      {(isStart || isEnd) && (
                        <span className="text-[7px] leading-none uppercase tracking-tighter">
                          {isStart && isEnd ? 'ONLY' : isStart ? 'START' : 'END'}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>



      {/* CSC FORM NO. 48 PAPER RENDERING CANVAS */}
      <div className={`mx-auto bg-slate-100 dark:bg-slate-900/60 p-4 rounded-2xl print:bg-white print:border-none print:p-0 print:m-0 print:shadow-none print:rounded-none`}>
        {/* Dynamic @page paper size injection for browser print */}
        <style>{`
          @media print {
            @page {
              ${
                paperSize === 'a4'
                  ? 'size: 210mm 297mm;'
                  : paperSize === 'letter'
                  ? 'size: 8.5in 11in;'
                  : paperSize === 'legal'
                  ? 'size: 8.5in 13in;'
                  : 'size: portrait;'
              }
              margin: 4mm;
            }
          }
        `}</style>
        
        {/* Printable Container */}
        <div className={`printable-csc-form layout-${printLayout} paper-${paperSize} scale-${printScale} bg-white text-black p-3 rounded-none print:rounded-none print:p-0 ${
          printLayout === '2-up' ? 'flex flex-row justify-center items-center gap-6 mx-auto w-full' : 'flex justify-center items-center mx-auto w-full'
        }`}>
          
          {/* Form Copy 1 */}
          <SingleCSCFormCard
            selectedPersonnel={selectedPersonnel}
            monthlyDTR={monthlyDTR}
            departments={departments}
            monthName={monthNames[selectedMonth - 1]}
            selectedYear={selectedYear}
            startDay={actualStartDay}
            endDay={actualEndDay}
            filteredDays={filteredDays}
            editingDay={editingDay}
            setEditingDay={setEditingDay}
            onUpdateDTRDay={onUpdateDTRDay}
            onOpenNoteModal={(dayNum) => {
              setNoteModalDay(dayNum);
              setIsNoteModalOpen(true);
            }}
            onOpenEditInCharge={() => setIsEditInChargeOpen(true)}
            currentRole={currentRole}
            lang={lang}
            totalLate={totalLate}
            totalUndertime={totalUndertime}
            copyLabel={printLayout === '2-up' ? 'EMPLOYEE COPY' : undefined}
          />

          {/* Form Copy 2 (If 2-Up mode enabled) */}
          {printLayout === '2-up' && (
            <SingleCSCFormCard
              selectedPersonnel={selectedPersonnel}
              monthlyDTR={monthlyDTR}
              departments={departments}
              monthName={monthNames[selectedMonth - 1]}
              selectedYear={selectedYear}
              startDay={actualStartDay}
              endDay={actualEndDay}
              filteredDays={filteredDays}
              editingDay={editingDay}
              setEditingDay={setEditingDay}
              onUpdateDTRDay={onUpdateDTRDay}
              onOpenNoteModal={(dayNum) => {
                setNoteModalDay(dayNum);
                setIsNoteModalOpen(true);
              }}
              onOpenEditInCharge={() => setIsEditInChargeOpen(true)}
              currentRole={currentRole}
              lang={lang}
              totalLate={totalLate}
              totalUndertime={totalUndertime}
              copyLabel="HR / DIVISION COPY"
            />
          )}

        </div>
      </div>

      {/* Day Note / Suspension / Holiday Modal */}
      <DayNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        selectedPersonnel={selectedPersonnel}
        personnelList={personnelList}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        initialDay={noteModalDay}
        monthlyDTR={monthlyDTR}
        onApplyNote={handleApplyDayNote}
        lang={lang}
      />

      {/* Edit Personnel Info Modal */}
      {onUpdatePersonnel && (
        <EditPersonnelModal
          isOpen={isEditPersonnelOpen}
          onClose={() => setIsEditPersonnelOpen(false)}
          personnel={selectedPersonnel}
          departments={departments}
          onUpdatePersonnel={onUpdatePersonnel}
          onDeletePersonnel={onDeletePersonnel}
        />
      )}

      {/* Edit In-Charge / Dept Head Modal */}
      {onUpdateInCharge && (
        <EditInChargeModal
          isOpen={isEditInChargeOpen}
          onClose={() => setIsEditInChargeOpen(false)}
          selectedPersonnel={selectedPersonnel}
          departments={departments}
          currentInChargeName={
            monthlyDTR?.verifiedBy ||
            departments.find((d) => d.id === selectedPersonnel?.departmentId)?.headName ||
            'DR. ROBERTO V. GARCIA'
          }
          currentInChargeTitle={
            monthlyDTR?.verifiedByTitle ||
            departments.find((d) => d.id === selectedPersonnel?.departmentId)?.headTitle ||
            'In-Charge / Department Head'
          }
          currentVerifiedDate={monthlyDTR?.verifiedDate}
          onUpdateInCharge={(headName, headTitle, targetDeptId, applyToAll, verifiedDate) => {
            onUpdateInCharge(headName, headTitle, targetDeptId, applyToAll, verifiedDate);
            setIsEditInChargeOpen(false);
          }}
        />
      )}

      {/* Batch Export Personnel Selection Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Batch Export CSC Form 48 to PDF
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Select personnel to include in the exported batch document ({monthNames[selectedMonth - 1]} {selectedYear})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Controls & Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  value={batchSearchQuery}
                  onChange={(e) => setBatchSearchQuery(e.target.value)}
                  placeholder="Search personnel by name, position, or ID..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                {batchSearchQuery && (
                  <button
                    onClick={() => setBatchSearchQuery('')}
                    className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Quick Toggle Toolbar */}
              <div className="flex items-center justify-between text-xs pt-1">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSelectAllBatch}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200 transition"
                  >
                    Select All
                  </button>
                  <button
                    onClick={handleDeselectAllBatch}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200 transition"
                  >
                    Deselect All
                  </button>
                </div>
                <div className="font-semibold text-rose-600 dark:text-rose-400">
                  {selectedPersonnelIdsForBatch.length} of {personnelList.length} Selected
                </div>
              </div>
            </div>

            {/* Scrollable Personnel Checklist */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {(() => {
                const filtered = personnelList.filter((p) => {
                  if (!batchSearchQuery.trim()) return true;
                  const q = batchSearchQuery.toLowerCase();
                  const dept = departments.find((d) => d.id === p.departmentId);
                  return (
                    p.name.toLowerCase().includes(q) ||
                    p.position.toLowerCase().includes(q) ||
                    p.employeeId?.toLowerCase().includes(q) ||
                    dept?.name.toLowerCase().includes(q)
                  );
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No personnel matched "{batchSearchQuery}"
                    </div>
                  );
                }

                return filtered.map((person) => {
                  const isSelected = selectedPersonnelIdsForBatch.includes(person.id);
                  const dept = departments.find((d) => d.id === person.departmentId);

                  return (
                    <div
                      key={person.id}
                      onClick={() => togglePersonnelForBatch(person.id)}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition select-none ${
                        isSelected
                          ? 'bg-rose-50/70 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80'
                          : 'bg-white dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-rose-600 border-rose-600 text-white'
                              : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {person.name}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {person.position} {person.employeeId ? `• ID: ${person.employeeId}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-2">
                        {dept && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {dept.code || dept.name}
                          </span>
                        )}
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            person.personnelType === 'teaching'
                              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              : 'bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300'
                          }`}
                        >
                          {person.personnelType}
                        </span>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <div className="w-full sm:w-auto flex items-center space-x-2">
                <button
                  onClick={() => handleBatchExportPDF(personnelList)}
                  className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-bold text-slate-800 dark:text-slate-100 transition"
                  title="Export PDFs for all personnel"
                >
                  Export All ({personnelList.length})
                </button>

                <button
                  onClick={() => handleBatchExportPDF()}
                  disabled={selectedPersonnelIdsForBatch.length === 0}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-bold text-white shadow-md transition disabled:opacity-50 flex items-center justify-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Selected ({selectedPersonnelIdsForBatch.length})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
};

// Sub-component rendering exact CSC Form No. 48 structure
interface SingleCSCFormProps {
  selectedPersonnel: Personnel;
  monthlyDTR: MonthlyDTR;
  departments?: Department[];
  monthName: string;
  selectedYear: number;
  startDay: number;
  endDay: number;
  filteredDays: any[];
  editingDay: number | null;
  setEditingDay: (day: number | null) => void;
  onUpdateDTRDay: (dayNum: number, fieldOrObject: any, value?: any) => void;
  onOpenNoteModal: (dayNum: number) => void;
  onOpenEditInCharge?: () => void;
  currentRole: UserRole;
  lang: LanguageCode;
  totalLate: number;
  totalUndertime: number;
  copyLabel?: string;
}

const SingleCSCFormCard: React.FC<SingleCSCFormProps> = ({
  selectedPersonnel,
  monthlyDTR,
  departments = [],
  monthName,
  selectedYear,
  startDay,
  endDay,
  filteredDays,
  editingDay,
  setEditingDay,
  onUpdateDTRDay,
  onOpenNoteModal,
  onOpenEditInCharge,
  currentRole,
  lang,
  totalLate,
  totalUndertime,
  copyLabel
}) => {
  const t = translations[lang];

  const formatScheduleTime = (timeStr: string, defaultSuffix: string) => {
    if (!timeStr) return '';
    const clean = timeStr.trim();
    if (/AM|PM|NN/i.test(clean)) return clean;
    const formatted = formatCSCTime(clean);
    return `${formatted} ${defaultSuffix}`;
  };

  const isTeachingStaff = selectedPersonnel.personnelType === 'teaching' || selectedPersonnel.regularSchedule?.pmDeparture === '16:30' || selectedPersonnel.regularSchedule?.amArrival === '07:30';
  const amInFormatted = formatScheduleTime(
    selectedPersonnel.regularSchedule?.amArrival || (isTeachingStaff ? '07:30' : '08:00'),
    'AM'
  );
  const amOutFormatted = formatScheduleTime(
    selectedPersonnel.regularSchedule?.amDeparture || '12:00',
    'NN'
  );
  const pmInFormatted = formatScheduleTime(
    selectedPersonnel.regularSchedule?.pmArrival || '13:00',
    'PM'
  );
  const pmOutFormatted = formatScheduleTime(
    selectedPersonnel.regularSchedule?.pmDeparture || (isTeachingStaff ? '16:30' : '17:00'),
    'PM'
  );

  const officialHoursRegularText = `${amInFormatted} – ${amOutFormatted} / ${pmInFormatted} – ${pmOutFormatted}`;

  return (
    <div className="csc-form-card bg-white text-black font-serif border-2 border-black rounded-none print:rounded-none p-2 sm:p-2.5 shadow-2xl print:shadow-none text-[9.5px] leading-tight select-none font-sans print:font-sans w-[3.5in] min-w-[3.5in] max-w-[3.5in] min-h-[8.5in] h-auto mx-auto flex flex-col justify-start overflow-visible">
      {/* Optional Copy Tag */}
      {copyLabel && (
        <div className="text-[8px] font-mono tracking-widest font-bold text-gray-500 uppercase text-right border-b border-gray-300 pb-0.5 mb-1 print:text-black">
          {copyLabel}
        </div>
      )}

      {/* Header Block */}
      <div className="text-center space-y-0.5">
        <p className="text-[9px] font-bold tracking-widest text-gray-600 uppercase print:text-black">
          {t.civilServiceForm48}
        </p>
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-black border-b border-black pb-0.5 inline-block px-3">
          {t.dailyTimeRecord}
        </h2>
        <p className="text-[8px] italic text-gray-500 print:text-black font-serif">-----o0o-----</p>
      </div>

      {/* Personnel Details Section */}
      <div className="mt-1.5 space-y-0.5 text-[10.5px]">
        <div className="flex border-b border-black pb-0.5">
          <span className="font-bold text-black min-w-[42px] uppercase text-[9.5px]">{t.nameLabel}:</span>
          <span className="font-extrabold text-black uppercase tracking-wide underline ml-1 font-mono text-[11px]">
            {formatForm48Name(selectedPersonnel)}
          </span>
        </div>

        <div className="flex justify-between items-center border-b border-black pb-0.5">
          <div>
            <span className="font-bold text-black uppercase text-[9.5px]">{t.monthOfLabel}:</span>
            <span className="font-bold text-black ml-1 uppercase underline font-mono text-[10.5px]">
              {monthName} {startDay}–{endDay}, {selectedYear}
            </span>
          </div>
          <div className="text-[9.5px] font-semibold text-gray-700 print:text-black">
            ID: <span className="font-mono font-bold">{selectedPersonnel.employeeId}</span>
          </div>
        </div>

        <div className="text-[9.5px] leading-tight pt-0.5">
          <p className="font-medium text-black">
            <span className="font-bold">{t.officialHoursRegular}:</span>{' '}
            <span className="font-mono">{officialHoursRegularText}</span>
          </p>
          <p className="font-medium text-black">
            <span className="font-bold">{t.officialHoursSaturday}:</span>{' '}
            <span className="font-mono">
              {selectedPersonnel.regularSchedule?.saturdayHours && selectedPersonnel.regularSchedule.saturdayHours.toLowerCase() !== 'off'
                ? selectedPersonnel.regularSchedule.saturdayHours
                : 'As required'}
            </span>
          </p>
        </div>
      </div>

      {/* MAIN DTR TABLE GRID */}
      <div className="mt-2 overflow-visible">
        <table className="w-full border-collapse border-2 border-black text-center text-[10px] font-mono">
          <thead>
            {/* Header Level 1 */}
            <tr className="bg-gray-100 print:bg-transparent font-bold">
              <th rowSpan={2} className="border border-black px-0.5 py-1 w-6 uppercase text-[9px]">{t.dayHeader}</th>
              <th colSpan={2} className="border border-black py-0.5 uppercase text-[9px]">{t.amArrivalHeader} / {t.amDepartureHeader}</th>
              <th colSpan={2} className="border border-black py-0.5 uppercase text-[9px]">{t.pmArrivalHeader} / {t.pmDepartureHeader}</th>
              <th colSpan={2} className="border border-black py-0.5 uppercase text-[9px]">{t.undertimeHeader}</th>
            </tr>
            {/* Header Level 2 */}
            <tr className="bg-gray-50 print:bg-transparent font-bold text-[8.5px]">
              <th className="border border-black px-0.5 py-0.5 w-[54px]">ARR.</th>
              <th className="border border-black px-0.5 py-0.5 w-[54px]">DEP.</th>
              <th className="border border-black px-0.5 py-0.5 w-[54px]">ARR.</th>
              <th className="border border-black px-0.5 py-0.5 w-[54px]">DEP.</th>
              <th className="border border-black px-0.5 py-0.5 w-7">{t.hoursHeader}</th>
              <th className="border border-black px-0.5 py-0.5 w-7">{t.minutesHeader}</th>
            </tr>
          </thead>
          <tbody>
            {filteredDays.map((day) => {
              const isEditing = editingDay === day.day;
              const isSpecialFull = ['SATURDAY', 'SUNDAY', 'HOLIDAY', 'OB', 'LEAVE', 'CLASS_SUSPENDED'].includes(day.statusTag || '');
              const isAmSuspended = day.statusTag === 'CLASS_SUSPENDED_AM';
              const isPmSuspended = day.statusTag === 'CLASS_SUSPENDED_PM';

              return (
                <React.Fragment key={day.day}>
                  <tr
                    className={`border-b border-black hover:bg-yellow-50/80 transition ${
                      day.statusTag === 'SATURDAY' || day.statusTag === 'SUNDAY'
                        ? 'bg-gray-100/80 print:bg-gray-100 font-semibold text-gray-700 print:text-black'
                        : day.statusTag === 'CLASS_SUSPENDED' || day.statusTag === 'HOLIDAY' || isAmSuspended || isPmSuspended
                        ? 'bg-amber-50/80 print:bg-transparent font-bold text-amber-900 print:text-black'
                        : day.statusTag === 'OB' || day.statusTag === 'LEAVE'
                        ? 'bg-blue-50 print:bg-transparent font-bold text-blue-900 print:text-black'
                        : ''
                    }`}
                  >
                    {/* Day Column */}
                    <td
                      className="border-r border-black font-extrabold text-black py-[2px] text-center text-[10px]"
                      title={day.date || `${monthName} ${day.day}, ${selectedYear}`}
                    >
                      {day.day}
                    </td>

                    {/* Special Status Tag Row (Full Day: CLASS SUSPENDED / HOLIDAY / SATURDAY / SUNDAY / OB / LEAVE) */}
                    {isSpecialFull ? (
                      <>
                        <td colSpan={4} className="border-r border-black font-bold tracking-tight text-center py-[2px] uppercase text-[9px]">
                          {day.statusTag === 'CLASS_SUSPENDED' ? 'CLASS SUSPENDED' : day.statusTag}
                          {day.remarks ? ` — ${day.remarks}` : ''}
                        </td>
                        <td className="border-r border-black"></td>
                        <td className="border-r border-black"></td>
                      </>
                    ) : (
                      <>
                        {/* AM Session: Check if AM Half Day Class Suspended */}
                        {isAmSuspended ? (
                          <td colSpan={2} className="border-r border-black font-extrabold tracking-tight text-center py-[2px] uppercase text-[8.5px] bg-amber-100/90 print:bg-transparent text-amber-950 print:text-black">
                            CLASS SUSPENDED (AM)
                          </td>
                        ) : (
                          <>
                            {/* AM Arrival */}
                            <td className="border-r border-black py-[2px] font-bold text-black text-[10px]">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={day.amArrival}
                                  onChange={(e) => onUpdateDTRDay(day.day, 'amArrival', e.target.value)}
                                  className="w-full text-center bg-yellow-200 border border-black font-bold focus:outline-none text-[10px]"
                                />
                              ) : (
                                formatCSCTime(day.amArrival)
                              )}
                            </td>

                            {/* AM Departure */}
                            <td className="border-r border-black py-[2px] font-bold text-black text-[10px]">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={day.amDeparture}
                                  onChange={(e) => onUpdateDTRDay(day.day, 'amDeparture', e.target.value)}
                                  className="w-full text-center bg-yellow-200 border border-black font-bold focus:outline-none text-[10px]"
                                />
                              ) : (
                                formatCSCTime(day.amDeparture)
                              )}
                            </td>
                          </>
                        )}

                        {/* PM Session: Check if PM Half Day Class Suspended */}
                        {isPmSuspended ? (
                          <td colSpan={2} className="border-r border-black font-extrabold tracking-tight text-center py-[2px] uppercase text-[8.5px] bg-amber-100/90 print:bg-transparent text-amber-950 print:text-black">
                            CLASS SUSPENDED (PM)
                          </td>
                        ) : (
                          <>
                            {/* PM Arrival */}
                            <td className="border-r border-black py-[2px] font-bold text-black text-[10px]">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={day.pmArrival}
                                  onChange={(e) => onUpdateDTRDay(day.day, 'pmArrival', e.target.value)}
                                  className="w-full text-center bg-yellow-200 border border-black font-bold focus:outline-none text-[10px]"
                                />
                              ) : (
                                formatCSCTime(day.pmArrival)
                              )}
                            </td>

                            {/* PM Departure */}
                            <td className="border-r border-black py-[2px] font-bold text-black text-[10px]">
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={day.pmDeparture}
                                  onChange={(e) => onUpdateDTRDay(day.day, 'pmDeparture', e.target.value)}
                                  className="w-full text-center bg-yellow-200 border border-black font-bold focus:outline-none text-[10px]"
                                />
                              ) : (
                                formatCSCTime(day.pmDeparture)
                              )}
                            </td>
                          </>
                        )}

                        {/* Undertime Hours */}
                        <td className="border-r border-black py-[2px] text-center text-[9.5px] font-bold text-black">
                          {day.lateMinutes + day.undertimeMinutes >= 60
                            ? Math.floor((day.lateMinutes + day.undertimeMinutes) / 60)
                            : ''}
                        </td>

                        {/* Undertime Minutes */}
                        <td className="border-r border-black py-[2px] text-center text-[9.5px] font-bold text-black">
                          {(day.lateMinutes + day.undertimeMinutes) % 60 > 0
                            ? (day.lateMinutes + day.undertimeMinutes) % 60
                            : ''}
                        </td>
                      </>
                    )}

                    {/* Inline Edit Controls (Screen only) */}
                    <td className="print:hidden w-auto px-1 py-0.2 border-none text-right whitespace-nowrap">
                      {(currentRole === 'admin' || currentRole === 'dept_head') && (
                        <div className="inline-flex items-center space-x-1">
                          <button
                            onClick={() => onOpenNoteModal(day.day)}
                            className="text-[8.5px] font-bold text-amber-700 hover:text-amber-900 bg-amber-100 hover:bg-amber-200 px-1 py-0.2 rounded transition"
                            title="Add Note / Class Suspension / Holiday"
                          >
                            📝 Note
                          </button>
                          <button
                            onClick={() => setEditingDay(isEditing ? null : day.day)}
                            className="text-[8.5px] font-bold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-1 py-0.2 rounded transition"
                            title="Edit Log Times"
                          >
                            {isEditing ? '✓ Done' : '✏ Edit'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>

                  {/* Inline Expanded Editing Sub-Bar */}
                  {isEditing && (
                    <tr className="bg-yellow-100 border-b border-black text-[9px] print:hidden">
                      <td colSpan={7} className="p-1.5 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-gray-800">Status Tag:</span>
                          <select
                            value={day.statusTag || 'REGULAR'}
                            onChange={(e) => onUpdateDTRDay(day.day, 'statusTag', e.target.value)}
                            className="bg-white border border-gray-400 rounded px-1.5 py-0.5 font-bold text-xs cursor-pointer focus:outline-none"
                          >
                            <option value="REGULAR">☀️ REGULAR</option>
                            <option value="CLASS_SUSPENDED">🌧️ FULL DAY CLASS SUSPENDED</option>
                            <option value="CLASS_SUSPENDED_AM">🌤️ HALF DAY CLASS SUSPENDED (AM)</option>
                            <option value="CLASS_SUSPENDED_PM">🌧️ HALF DAY CLASS SUSPENDED (PM)</option>
                            <option value="HOLIDAY">🇵🇭 HOLIDAY</option>
                            <option value="OB">💼 OFFICIAL BUSINESS (OB)</option>
                            <option value="LEAVE">📄 LEAVE OF ABSENCE</option>
                            <option value="SATURDAY">🗓️ SATURDAY</option>
                            <option value="SUNDAY">🗓️ SUNDAY</option>
                          </select>

                          <span className="font-bold text-gray-800 ml-1">Note:</span>
                          <input
                            type="text"
                            value={day.remarks || ''}
                            onChange={(e) => onUpdateDTRDay(day.day, 'remarks', e.target.value)}
                            placeholder="e.g. Typhoon Signal Class Suspension"
                            className="flex-1 min-w-[150px] bg-white border border-gray-400 rounded px-1.5 py-0.5 font-mono text-xs focus:outline-none"
                          />

                          <button
                            onClick={() => setEditingDay(null)}
                            className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                          >
                            Save
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {/* TOTAL ROW */}
            <tr className="border-t-2 border-b-2 border-black font-extrabold bg-gray-100 print:bg-transparent">
              <td colSpan={5} className="border-r border-b-2 border-black px-1.5 py-1 text-right uppercase text-[9.5px]">
                {t.totalHeader}
              </td>
              <td className="border-r border-b-2 border-black py-1 text-center font-mono text-[10px]">
                {formatMinutesLabel(totalLate + totalUndertime).hrs || '0'}
              </td>
              <td className="border-r-0 border-b-2 border-black py-1 text-center font-mono text-[10px] text-rose-700 print:text-black">
                {formatMinutesLabel(totalLate + totalUndertime).mins || '0'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* FOOTER CERTIFICATION & SIGNATURE BLOCK */}
      <div className="mt-2.5 space-y-2 text-[9px] leading-tight">
        {/* Certification Text */}
        <p className="text-justify font-serif italic text-gray-800 print:text-black text-[8.5px] leading-snug">
          {t.certifyStatement}
        </p>

        {/* Employee Signature */}
        <div className="pt-2 text-center space-y-0.5">
          <p className="font-extrabold uppercase text-[11px] border-b border-black inline-block px-12 font-sans">
            {formatForm48Name(selectedPersonnel)}
          </p>
          <p className="text-[8.5px] font-bold text-gray-600 print:text-black tracking-wider uppercase">
            {t.employeeSignature}
          </p>
        </div>

        {/* Verification Text */}
        <p className="pt-1 font-serif italic text-gray-800 print:text-black text-[8.5px] leading-snug">
          {t.verifiedStatement}
        </p>

        {/* In-Charge / Principal Signature */}
        {(() => {
          const dept = departments.find((d) => d.id === selectedPersonnel.departmentId);
          const inChargeName = monthlyDTR?.verifiedBy || dept?.headName || 'DR. ROBERTO V. GARCIA';
          const inChargeTitle = monthlyDTR?.verifiedByTitle || dept?.headTitle || t.inChargeSignature || 'In-Charge / Department Head';
          const verifiedDateStr = monthlyDTR?.verifiedDate || `${monthName} ${endDay}, ${selectedYear}`;

          return (
            <div className="pt-2 text-center space-y-0.5 relative">
              <div className="inline-flex flex-col items-center group">
                <p className="font-extrabold uppercase text-[11px] border-b border-black inline-block px-12 font-sans">
                  {formatForm48Name(inChargeName)}
                </p>
                <p className="text-[8.5px] font-bold text-gray-600 print:text-black tracking-wider uppercase">
                  {inChargeTitle}
                </p>
                <p className="text-[8px] text-gray-600 print:text-black mt-0.5 font-sans">
                  Date: <span className="font-semibold underline">{verifiedDateStr}</span>
                </p>
                {(currentRole === 'admin' || currentRole === 'dept_head') && onOpenEditInCharge && (
                  <button
                    onClick={onOpenEditInCharge}
                    className="print:hidden mt-0.5 px-2 py-0.5 rounded bg-amber-100 hover:bg-amber-200 text-amber-900 text-[9px] font-bold transition shadow-sm inline-flex items-center space-x-1 border border-amber-300"
                    title="Edit In-Charge Signatory Name & Title"
                  >
                    <span>🖊️ Edit Signatory</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
