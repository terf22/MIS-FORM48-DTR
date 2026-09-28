import React, { useState, useEffect } from 'react';
import { UserCheck, X, Clock } from 'lucide-react';
import { Department, Personnel, PersonnelType, UserRole, EmploymentStatus } from '../types';

interface EditPersonnelModalProps {
  isOpen: boolean;
  onClose: () => void;
  personnel: Personnel | null;
  departments: Department[];
  onUpdatePersonnel: (updated: Personnel) => void;
  onAddDepartment?: (d: Department) => void;
}

export const EditPersonnelModal: React.FC<EditPersonnelModalProps> = ({
  isOpen,
  onClose,
  personnel,
  departments,
  onUpdatePersonnel,
}) => {
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [positionTitle, setPositionTitle] = useState('');
  const [employeeNumber, setEmployeeNumber] = useState('');
  const [itemNumber, setItemNumber] = useState('');
  const [tin, setTin] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [placeOfBirth, setPlaceOfBirth] = useState('');
  const [districtOrSchool, setDistrictOrSchool] = useState('');
  const [gsisBpNo, setGsisBpNo] = useState('');

  const [personnelType, setPersonnelType] = useState<PersonnelType>('teaching');
  const [status, setStatus] = useState<EmploymentStatus>('permanent');
  const [role, setRole] = useState<UserRole>('teacher');
  const [departmentId, setDepartmentId] = useState('');
  const [email, setEmail] = useState('');

  const [amArrival, setAmArrival] = useState('07:30');
  const [amDeparture, setAmDeparture] = useState('12:00');
  const [pmArrival, setPmArrival] = useState('13:00');
  const [pmDeparture, setPmDeparture] = useState('16:30');
  const [saturdayHours, setSaturdayHours] = useState('As required');

  useEffect(() => {
    if (personnel) {
      setLastName(personnel.lastName || (personnel.name ? personnel.name.split(',')[0] : ''));
      setFirstName(personnel.firstName || '');
      setMiddleName(personnel.middleName || '');
      setPositionTitle(personnel.positionTitle || personnel.title || 'Teacher I');
      setEmployeeNumber(personnel.employeeNumber || personnel.employeeId || '');
      setItemNumber(personnel.itemNumber || 'OSEC-DECSB-2024');
      setTin(personnel.tin || '123-456-789-000');
      setDateOfBirth(personnel.dateOfBirth || '1990-01-15');
      setPlaceOfBirth(personnel.placeOfBirth || 'Manila');
      setDistrictOrSchool(personnel.districtOrSchool || 'Mangusu Integrated School');
      setGsisBpNo(personnel.gsisBpNo || '2001928374');

      const pType = personnel.personnelType || 'teaching';
      const isTeach = pType === 'teaching';
      setPersonnelType(pType);
      setStatus(personnel.status || 'permanent');
      setRole(personnel.role || 'teacher');
      setDepartmentId(personnel.departmentId || departments[0]?.id || '');
      setEmail(personnel.email || '');

      setAmArrival(personnel.regularSchedule?.amArrival || (isTeach ? '07:30' : '08:00'));
      setAmDeparture(personnel.regularSchedule?.amDeparture || '12:00');
      setPmArrival(personnel.regularSchedule?.pmArrival || '13:00');
      setPmDeparture(personnel.regularSchedule?.pmDeparture || (isTeach ? '16:30' : '17:00'));
      setSaturdayHours(
        personnel.regularSchedule?.saturdayHours && personnel.regularSchedule.saturdayHours.toLowerCase() !== 'off'
          ? personnel.regularSchedule.saturdayHours
          : 'As required'
      );
    }
  }, [personnel, departments]);

  const handleTypeSelect = (type: PersonnelType) => {
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

  if (!isOpen || !personnel) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const empNo = employeeNumber.trim() || personnel.employeeId;
    const fName = firstName.trim();
    const lName = lastName.trim();
    const mName = middleName.trim();
    const computedFullName = `${lName}, ${fName} ${mName}`.trim();

    const matchedDept = departments.find((d) => d.id === departmentId);
    const targetDeptName = matchedDept ? matchedDept.name : personnel.departmentName;

    const updatedPersonnel: Personnel = {
      ...personnel,
      fullName: computedFullName,
      lastName: lName,
      firstName: fName,
      middleName: mName,
      positionTitle: positionTitle.trim(),
      employeeNumber: empNo,
      itemNumber: itemNumber.trim(),
      tin: tin.trim(),
      dateOfBirth,
      placeOfBirth: placeOfBirth.trim(),
      districtOrSchool: districtOrSchool.trim(),
      gsisBpNo: gsisBpNo.trim(),

      // Backward compatibility
      employeeId: empNo,
      name: computedFullName,
      title: positionTitle.trim(),
      departmentId,
      departmentName: targetDeptName,
      personnelType,
      status,
      role,
      email: email.trim() || `${empNo.toLowerCase()}@deped.gov.ph`,
      regularSchedule: {
        amArrival: amArrival.trim() || (personnelType === 'teaching' ? '07:30' : '08:00'),
        amDeparture: amDeparture.trim() || '12:00',
        pmArrival: pmArrival.trim() || '13:00',
        pmDeparture: pmDeparture.trim() || (personnelType === 'teaching' ? '16:30' : '17:00'),
        saturdayHours: saturdayHours.trim() || 'As required',
      },
    };

    onUpdatePersonnel(updatedPersonnel);
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

        <div className="flex items-center space-x-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              Edit Personnel Profile & 12 HR Data Fields
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Update DepEd / CSC personnel records and official station assignment
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Section 1: Name Components */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
              1. Personal Name Identification
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Position & Item */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
              2. Position & Official Station
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Position Title</label>
                <input
                  type="text"
                  required
                  value={positionTitle}
                  onChange={(e) => setPositionTitle(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Employee Number</label>
                <input
                  type="text"
                  required
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Item Number</label>
                <input
                  type="text"
                  required
                  value={itemNumber}
                  onChange={(e) => setItemNumber(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Dist. / Current School</label>
                <input
                  type="text"
                  value={districtOrSchool}
                  onChange={(e) => setDistrictOrSchool(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">Department Unit</label>
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

          {/* Section 3: Classification & Official Work Schedule */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
                3. Personnel Classification & Work Schedule
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
                  onChange={(e) => handleTypeSelect(e.target.value as PersonnelType)}
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

          {/* Section 4: Legal & Accounts */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl space-y-3">
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider block">
              4. Legal Accounts & Birth Data
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">TIN</label>
                <input
                  type="text"
                  value={tin}
                  onChange={(e) => setTin(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 dark:text-slate-300 mb-1">GSIS BP No.</label>
                <input
                  type="text"
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
                  value={placeOfBirth}
                  onChange={(e) => setPlaceOfBirth(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs"
                />
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
              Update Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
