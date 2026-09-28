import React, { useState } from 'react';
import { UserPlus, X, Sparkles, Building2, Clock, Award, FileText } from 'lucide-react';
import { Department, Personnel, PersonnelType, UserRole } from '../types';
import { extractPersonnelFromText, calculateStepIncrement } from '../utils/stepIncrementEngine';

interface AddPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  departments: Department[];
  onAddPersonnel: (p: Personnel) => void;
  onAddDepartment?: (d: Department) => void;
}

export const AddPersonnelModal: React.FC<AddPersonnelModalProps> = ({
  isOpen,
  onClose,
  departments,
  onAddPersonnel,
  onAddDepartment
}) => {
  // 12 Required Fields
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [positionTitle, setPositionTitle] = useState('Teacher I');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [tin, setTin] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [districtOrSchool, setDistrictOrSchool] = useState('Mangusu Integrated School');
  const [gsisBpNo, setGsisBpNo] = useState('');

  // Unformatted Text Extractor State
  const [rawText, setRawText] = useState('');
  const [showExtractor, setShowExtractor] = useState(false);

  // Classification & Schedule
  const [personnelType, setPersonnelType] = useState<PersonnelType>('teaching');
  const [role, setRole] = useState<UserRole>('teacher');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || '');
  const [effectiveStartDate, setEffectiveStartDate] = useState('2023-08-01');

  const [amArrival, setAmArrival] = useState('07:30');
  const [amDeparture, setAmDeparture] = useState('12:00');
  const [pmArrival, setPmArrival] = useState('13:00');
  const [pmDeparture, setPmDeparture] = useState('16:30');
  const [saturdayHours, setSaturdayHours] = useState('As required');

  const handleTypeChange = (type: PersonnelType) => {
    setPersonnelType(type);
    if (type === 'teaching') {
      setAmArrival('07:30');
      setAmDeparture('12:00');
      setPmArrival('13:00');
      setPmDeparture('16:30');
      setSaturdayHours('As required');
      setRole('teacher');
    } else {
      setAmArrival('08:00');
      setAmDeparture('12:00');
      setPmArrival('13:00');
      setPmDeparture('17:00');
      setSaturdayHours('As required');
      setRole('non_teaching');
    }
  };

  const handleSchedulePresetChange = (preset: '7:30-4:30' | '8:00-5:00') => {
    if (preset === '7:30-4:30') {
      setAmArrival('07:30');
      setAmDeparture('12:00');
      setPmArrival('13:00');
      setPmDeparture('16:30');
    } else {
      setAmArrival('08:00');
      setAmDeparture('12:00');
      setPmArrival('13:00');
      setPmDeparture('17:00');
    }
  };

  if (!isOpen) return null;

  const handleSmartExtract = () => {
    if (!rawText.trim()) return;
    const extracted = extractPersonnelFromText(rawText);
    if (extracted.lastName) setLastName(extracted.lastName);
    if (extracted.firstName) setFirstName(extracted.firstName);
    if (extracted.middleName) setMiddleName(extracted.middleName);
    if (extracted.positionTitle) setPositionTitle(extracted.positionTitle);
    if (extracted.employeeNumber) setEmployeeNumber(extracted.employeeNumber);
    if (extracted.itemNumber) setItemNumber(extracted.itemNumber);
    if (extracted.tin) setTin(extracted.tin);
    if (extracted.dateOfBirth) setDateOfBirth(extracted.dateOfBirth);
    if (extracted.placeOfBirth) setPlaceOfBirth(extracted.placeOfBirth);
    if (extracted.districtOrSchool) setDistrictOrSchool(extracted.districtOrSchool);
    if (extracted.gsisBpNo) setGsisBpNo(extracted.gsisBpNo);
    setShowExtractor(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const empNo = employeeNumber.trim() || `EMP-${Date.now().toString().slice(-6)}`;
    const fName = firstName.trim() || 'Personnel';
    const lName = lastName.trim() || 'Record';
    const mName = middleName.trim();
    const computedFullName = `${lName}, ${fName} ${mName}`.trim();

    const selectedDept = departments.find((d) => d.id === departmentId);
    const targetDeptId = selectedDept?.id || 'dept-1';
    const targetDeptName = selectedDept?.name || 'General Division';

    // Step Increment initial calculation
    const initialCalc = calculateStepIncrement({
      employeeNumber: empNo,
      fullName: computedFullName,
      itemNumber: itemNumber.trim() || 'OSEC-DECSB-2024',
      effectiveStartDate: effectiveStartDate || '2023-08-01',
      lastEventType: 'STEP_INCREMENT',
      maternityLeaveDays: 0,
      currentStep: 1,
    });

    const newPersonnel: Personnel = {
      id: `p-${Date.now()}`,
      // 12 Schema Fields
      fullName: computedFullName,
      lastName: lName,
      firstName: fName,
      middleName: mName,
      positionTitle: positionTitle.trim() || 'Teacher I',
      employeeNumber: empNo,
      itemNumber: itemNumber.trim(),
      tin: tin.trim(),
      dateOfBirth: dateOfBirth,
      placeOfBirth: placeOfBirth.trim(),
      districtOrSchool: districtOrSchool.trim() || 'Mangusu Integrated School',
      gsisBpNo: gsisBpNo.trim(),

      // Backward Compatibility
      employeeId: empNo,
      name: computedFullName,
      title: positionTitle.trim() || 'Teacher I',
      departmentId: targetDeptId,
      departmentName: targetDeptName,
      personnelType,
      status: 'permanent',
      role,
      email: `${empNo.toLowerCase()}@deped.gov.ph`,
      regularSchedule: {
        amArrival,
        amDeparture,
        pmArrival,
        pmDeparture,
        saturdayHours: saturdayHours.trim() || 'As required',
      },

      // Step Increment Tracking
      stepIncrementTracking: {
        currentStep: 1,
        effectiveStartDate: effectiveStartDate || '2023-08-01',
        lastEventType: 'STEP_INCREMENT',
        maternityLeaveDays: 0,
        adjustedNextDueDate: initialCalc.step_increment_tracking.adjusted_next_due_date,
        status: initialCalc.step_increment_tracking.status,
        notificationTrigger: initialCalc.step_increment_tracking.notification_trigger,
      },
    };

    onAddPersonnel(newPersonnel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl text-slate-800 dark:text-slate-100 relative max-h-[90vh] overflow-y-auto space-y-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-white">
                Add New DepEd / CSC Personnel
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Register complete 12-field HR record with Step Increment tracking
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowExtractor(!showExtractor)}
            className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 hover:bg-purple-100 transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            {showExtractor ? 'Close Extractor' : 'Paste & Extract Text'}
          </button>
        </div>

        {/* Unformatted Text Extraction Box */}
        {showExtractor && (
          <div className="p-4 bg-purple-50/60 dark:bg-purple-950/30 rounded-2xl border border-purple-200 dark:border-purple-800/40 space-y-2">
            <label className="block text-xs font-bold text-purple-900 dark:text-purple-200">
              Paste Unformatted HR Document / Text
            </label>
            <textarea
              rows={3}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Paste raw text e.g.: Full Name: Juan Dela Cruz, Employee No: EMP-2024-001, Item No: OSEC-DECSB-T1-01, Position: Teacher I, TIN: 123-456-789, GSIS BP: 2001928374..."
              className="w-full bg-white dark:bg-slate-900 border border-purple-200 dark:border-purple-800 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
            />
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSmartExtract}
                className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5" /> Auto-Extract to 12 Fields
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Name Components */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
              1. Personal Name Identification
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Santos"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Position & Official Station */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
              2. Position Title & Item Classification
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Position Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Teacher I, Master Teacher II"
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Employee Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EMP-2024-001"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Item Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OSEC-DECSB-T1-2024"
                  value={itemNumber}
                  onChange={(e) => setItemNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Dist. / Current School Station
                </label>
                <input
                  type="text"
                  placeholder="e.g. Central Elementary School"
                  value={districtOrSchool}
                  onChange={(e) => setDistrictOrSchool(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Department / Division
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Personnel Classification & Work Schedule */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                3. Personnel Classification & Official Work Schedule
              </span>
              <span className="text-[11px] font-semibold text-slate-500">
                {amArrival === '07:30' && pmDeparture === '16:30'
                  ? '7:30am – 4:30pm (Standard Teaching)'
                  : amArrival === '08:00' && pmDeparture === '17:00'
                  ? '8:00am – 5:00pm (Standard Staff)'
                  : `Custom (${amArrival} - ${pmDeparture})`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Personnel Classification *
                </label>
                <select
                  value={personnelType}
                  onChange={(e) => handleTypeChange(e.target.value as PersonnelType)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  <option value="teaching">Teaching Personnel</option>
                  <option value="non_teaching">Non-Teaching Staff</option>
                  <option value="jo">Job Order (JO) Staff</option>
                  <option value="cos">Contractual Service (COS) Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Saturday Official Schedule
                </label>
                <input
                  type="text"
                  value={saturdayHours}
                  onChange={(e) => setSaturdayHours(e.target.value)}
                  placeholder="e.g. As required"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            {/* Work Schedule Time Choice */}
            <div>
              <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                Official Work Schedule Option *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSchedulePresetChange('7:30-4:30')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-between ${
                    amArrival === '07:30' && pmDeparture === '16:30'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>7:30 AM – 4:30 PM</span>
                  </span>
                  <span className="text-[10px] opacity-80 font-normal">(7:30-12 / 1-4:30)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSchedulePresetChange('8:00-5:00')}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-between ${
                    amArrival === '08:00' && pmDeparture === '17:00'
                      ? 'bg-violet-600 text-white border-violet-600 shadow-sm'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    <span>8:00 AM – 5:00 PM</span>
                  </span>
                  <span className="text-[10px] opacity-80 font-normal">(8:00-12 / 1-5:00)</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">AM Arrival</label>
                <input
                  type="text"
                  value={amArrival}
                  onChange={(e) => setAmArrival(e.target.value)}
                  placeholder="07:30 or 08:00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">AM Departure</label>
                <input
                  type="text"
                  value={amDeparture}
                  onChange={(e) => setAmDeparture(e.target.value)}
                  placeholder="12:00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">PM Arrival</label>
                <input
                  type="text"
                  value={pmArrival}
                  onChange={(e) => setPmArrival(e.target.value)}
                  placeholder="13:00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-1">PM Departure</label>
                <input
                  type="text"
                  value={pmDeparture}
                  onChange={(e) => setPmDeparture(e.target.value)}
                  placeholder="16:30 or 17:00"
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-mono text-center"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Legal & Government Identification */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
              4. Government Accounts & Birth Information
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">TIN</label>
                <input
                  type="text"
                  placeholder="123-456-789-000"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">GSIS BP No.</label>
                <input
                  type="text"
                  placeholder="2001928374"
                  value={gsisBpNo}
                  onChange={(e) => setGsisBpNo(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Place of Birth</label>
                <input
                  type="text"
                  placeholder="e.g. Manila"
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Initial Step Increment Effective Date */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
              5. Step Increment Effective Date
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">
                  Effective Start Date of Step 1 / Current Position
                </label>
                <input
                  type="date"
                  value={effectiveStartDate}
                  onChange={(e) => setEffectiveStartDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
              <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 pt-5">
                The 3-year CSC step cycle will automatically generate Next Step Increment Due Date (+3 Years).
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Save Personnel Record
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
