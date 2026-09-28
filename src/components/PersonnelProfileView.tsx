import React, { useState } from 'react';
import {
  Users,
  Search,
  Plus,
  Building2,
  FileText,
  Edit3,
  Check,
  X,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { Personnel, LanguageCode } from '../types';

interface PersonnelProfileViewProps {
  personnelList: Personnel[];
  onUpdatePersonnel: (updated: Personnel) => void;
  onSelectPersonnelForForm48: (p: Personnel) => void;
  onOpenAddPersonnelModal: () => void;
  onLogAudit: (action: string, category: 'SYSTEM', details: string) => void;
  lang?: LanguageCode;
}

export const PersonnelProfileView: React.FC<PersonnelProfileViewProps> = ({
  personnelList,
  onUpdatePersonnel,
  onSelectPersonnelForForm48,
  onOpenAddPersonnelModal,
  onLogAudit,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'teaching' | 'non_teaching' | 'jo' | 'cos'>('ALL');
  const [selectedPersonnelId, setSelectedPersonnelId] = useState<string>(
    personnelList.length > 0 ? personnelList[0].id : ''
  );

  // Editing 12 DepEd/CSC fields
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Personnel>>({});

  // Filter personnel list
  const filteredPersonnel = personnelList.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      p.name.toLowerCase().includes(term) ||
      p.employeeId.toLowerCase().includes(term) ||
      (p.fullName && p.fullName.toLowerCase().includes(term)) ||
      (p.positionTitle && p.positionTitle.toLowerCase().includes(term)) ||
      (p.departmentName && p.departmentName.toLowerCase().includes(term)) ||
      (p.tin && p.tin.toLowerCase().includes(term));

    const matchesType = typeFilter === 'ALL' || p.personnelType === typeFilter;
    return matchesSearch && matchesType;
  });

  // Active selected personnel
  const selectedPersonnel = personnelList.find((p) => p.id === selectedPersonnelId) || filteredPersonnel[0] || personnelList[0];

  const handleSelectPerson = (p: Personnel) => {
    setSelectedPersonnelId(p.id);
    setIsEditingProfile(false);
    setEditForm({});
  };

  const handleStartEditing = () => {
    if (!selectedPersonnel) return;
    setEditForm({ ...selectedPersonnel });
    setIsEditingProfile(true);
  };

  const handleCancelEditing = () => {
    setIsEditingProfile(false);
    setEditForm({});
  };

  const handleSaveProfile = () => {
    if (!selectedPersonnel || !editForm) return;

    const updated: Personnel = {
      ...selectedPersonnel,
      ...editForm,
      fullName: editForm.fullName || `${editForm.lastName || ''}, ${editForm.firstName || ''} ${editForm.middleName || ''}`.trim(),
      name: editForm.fullName || selectedPersonnel.name,
      title: editForm.positionTitle || selectedPersonnel.title,
    };

    onUpdatePersonnel(updated);
    setIsEditingProfile(false);
    onLogAudit('UPDATE_PERSONNEL_PROFILE', 'SYSTEM', `Updated personnel profile for ${updated.name} (${updated.employeeId}).`);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
        <div>
          <div className="flex items-center space-x-2 text-violet-600 dark:text-violet-400 font-bold text-xs mb-1">
            <UserCheck className="w-4 h-4" />
            <span>Mangusu Integrated School • CSC Form 48 DTR Portal</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Personnel Profile Center
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Mangusu Integrated School Faculty & Staff Roster with Official CSC Form 48 Parameters
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenAddPersonnelModal}
            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl text-xs font-semibold flex items-center space-x-2 shadow-md shadow-violet-500/20 active:scale-[0.98] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Personnel</span>
          </button>
        </div>
      </div>

      {/* Main Container: Left Roster List + Right Detailed Personnel Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Personnel List Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-4 shadow-sm space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, ID, position, TIN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-2xl pl-9 pr-3 py-2.5 outline-none border border-slate-100 dark:border-slate-700"
              />
            </div>

            {/* Type Filters */}
            <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-[11px] font-semibold text-slate-500">
              {(['ALL', 'teaching', 'non_teaching', 'jo', 'cos'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2.5 py-1 rounded-xl whitespace-nowrap transition ${
                    typeFilter === t
                      ? 'bg-violet-600 text-white shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {t === 'ALL'
                    ? 'All Staff'
                    : t === 'teaching'
                    ? 'Teaching'
                    : t === 'non_teaching'
                    ? 'Non-Teaching'
                    : t === 'jo'
                    ? 'JO'
                    : 'CoS'}
                </button>
              ))}
            </div>

            {/* Total Personnel Counter */}
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Showing {filteredPersonnel.length} of {personnelList.length} Personnel
            </div>

            {/* Personnel Scrollable List */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {filteredPersonnel.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
                  <p className="text-xs font-semibold">No personnel match your filter</p>
                </div>
              ) : (
                filteredPersonnel.map((person) => {
                  const isSelected = selectedPersonnel?.id === person.id;
                  return (
                    <div
                      key={person.id}
                      onClick={() => handleSelectPerson(person)}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? 'bg-violet-50 dark:bg-violet-950/50 border-violet-200 dark:border-violet-800 shadow-sm'
                          : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <img
                          src={
                            person.avatarUrl ||
                            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'
                          }
                          alt={person.name}
                          className={`w-10 h-10 rounded-xl object-cover ring-2 ${
                            isSelected ? 'ring-violet-600' : 'ring-slate-200 dark:ring-slate-700'
                          }`}
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                            {person.fullName || person.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 truncate">{person.positionTitle || person.title}</p>
                          <div className="flex items-center space-x-2 mt-0.5 text-[9px]">
                            <span className="font-mono text-slate-500 font-semibold">{person.employeeId}</span>
                            <span>•</span>
                            <span className="text-slate-400">{person.departmentName}</span>
                          </div>
                        </div>
                      </div>

                      <ChevronRight className={`w-4 h-4 shrink-0 ${isSelected ? 'text-violet-600' : 'text-slate-300'}`} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Personnel Detailed Profile & Service Records (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {!selectedPersonnel ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-12 text-center text-slate-400">
              <Users className="w-12 h-12 mx-auto mb-2 text-slate-300 dark:text-slate-700" />
              <p className="text-sm font-semibold">Select a personnel from the left roster to view profile</p>
            </div>
          ) : (
            <>
              {/* Selected Personnel Header Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-center space-x-4">
                    <img
                      src={
                        selectedPersonnel.avatarUrl ||
                        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120'
                      }
                      alt={selectedPersonnel.name}
                      className="w-16 h-16 rounded-2xl object-cover ring-4 ring-violet-500/20 shadow-md"
                    />
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-extrabold text-slate-800 dark:text-slate-100">
                          {selectedPersonnel.fullName || selectedPersonnel.name}
                        </h2>
                        <span
                          className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                            selectedPersonnel.personnelType === 'teaching'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300'
                              : 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/80 dark:text-cyan-300'
                          }`}
                        >
                          {selectedPersonnel.personnelType === 'teaching' ? 'Teaching Faculty' : 'Non-Teaching Staff'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 mt-0.5">
                        {selectedPersonnel.positionTitle || selectedPersonnel.title}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{selectedPersonnel.departmentName}</span>
                        </span>
                        <span className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg font-mono">
                          <span>Emp ID: {selectedPersonnel.employeeId}</span>
                        </span>
                        <span className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg font-mono">
                          <span>Plantilla Item: {selectedPersonnel.itemNumber || 'N/A'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Header Toolbar */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => onSelectPersonnelForForm48(selectedPersonnel)}
                      className="px-4 py-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-semibold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 active:scale-[0.98]"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Open CSC Form 48 DTR</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 12 DEPED/CSC HR PERSONAL & JOB FIELDS */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                        12 DepEd / CSC Required Personal Data Fields
                      </h3>
                      <p className="text-xs text-slate-400">Official Personnel Profile for DepEd Senior Admin & Civil Service Records</p>
                    </div>

                    {!isEditingProfile ? (
                      <button
                        onClick={handleStartEditing}
                        className="px-3 py-1.5 bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-300 font-semibold text-xs rounded-xl hover:bg-violet-100 transition flex items-center space-x-1.5"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Profile</span>
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleSaveProfile}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition flex items-center space-x-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                        <button
                          onClick={handleCancelEditing}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-xs rounded-xl hover:bg-slate-200 transition"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 12 Fields Display Grid / Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Field 1: Full Name */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        1. Full Name (Last, First Middle)
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.fullName ?? selectedPersonnel.fullName ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100"
                        />
                      ) : (
                        <div className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                          {selectedPersonnel.fullName || selectedPersonnel.name}
                        </div>
                      )}
                    </div>

                    {/* Field 2 & 3 & 4: Last, First, Middle */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">2. Last Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.lastName ?? selectedPersonnel.lastName ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-slate-800 dark:text-slate-100"
                          />
                        ) : (
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedPersonnel.lastName || '-'}</div>
                        )}
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">3. First Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.firstName ?? selectedPersonnel.firstName ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-slate-800 dark:text-slate-100"
                          />
                        ) : (
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedPersonnel.firstName || '-'}</div>
                        )}
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">4. Middle Name</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.middleName ?? selectedPersonnel.middleName ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, middleName: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-slate-800 dark:text-slate-100"
                          />
                        ) : (
                          <div className="font-semibold text-slate-800 dark:text-slate-200">{selectedPersonnel.middleName || '-'}</div>
                        )}
                      </div>
                    </div>

                    {/* Field 5: Position Title */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        5. Official Position Designation
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.positionTitle ?? selectedPersonnel.positionTitle ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, positionTitle: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100"
                        />
                      ) : (
                        <div className="font-bold text-slate-800 dark:text-slate-100">{selectedPersonnel.positionTitle || selectedPersonnel.title}</div>
                      )}
                    </div>

                    {/* Field 6: Employee / Plantilla Number */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        6. Employee ID Number
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.employeeNumber ?? selectedPersonnel.employeeNumber ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, employeeNumber: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono"
                        />
                      ) : (
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedPersonnel.employeeNumber || selectedPersonnel.employeeId}</div>
                      )}
                    </div>

                    {/* Field 7: Plantilla Item Number */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        7. Plantilla Item Number
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.itemNumber ?? selectedPersonnel.itemNumber ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, itemNumber: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono"
                        />
                      ) : (
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedPersonnel.itemNumber || '-'}</div>
                      )}
                    </div>

                    {/* Field 8: TIN Number */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        8. Tax Identification Number (TIN)
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.tin ?? selectedPersonnel.tin ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, tin: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono"
                        />
                      ) : (
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedPersonnel.tin || '-'}</div>
                      )}
                    </div>

                    {/* Field 9 & 10: Date of Birth & Place of Birth */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">9. Date of Birth</label>
                        {isEditingProfile ? (
                          <input
                            type="date"
                            value={editForm.dateOfBirth ?? selectedPersonnel.dateOfBirth ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-slate-800 dark:text-slate-100"
                          />
                        ) : (
                          <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPersonnel.dateOfBirth || '-'}</div>
                        )}
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">10. Place of Birth</label>
                        {isEditingProfile ? (
                          <input
                            type="text"
                            value={editForm.placeOfBirth ?? selectedPersonnel.placeOfBirth ?? ''}
                            onChange={(e) => setEditForm({ ...editForm, placeOfBirth: e.target.value })}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1 text-slate-800 dark:text-slate-100"
                          />
                        ) : (
                          <div className="font-medium text-slate-800 dark:text-slate-200">{selectedPersonnel.placeOfBirth || '-'}</div>
                        )}
                      </div>
                    </div>

                    {/* Field 11: District / Station / School */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        11. District / Station / School Assignment
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.districtOrSchool ?? selectedPersonnel.districtOrSchool ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, districtOrSchool: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100"
                        />
                      ) : (
                        <div className="font-bold text-slate-800 dark:text-slate-100">{selectedPersonnel.districtOrSchool || selectedPersonnel.departmentName || '-'}</div>
                      )}
                    </div>

                    {/* Field 12: GSIS BP Number */}
                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        12. GSIS BP Number
                      </label>
                      {isEditingProfile ? (
                        <input
                          type="text"
                          value={editForm.gsisBpNo ?? selectedPersonnel.gsisBpNo ?? ''}
                          onChange={(e) => setEditForm({ ...editForm, gsisBpNo: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-slate-800 dark:text-slate-100 font-mono"
                        />
                      ) : (
                        <div className="font-mono font-bold text-slate-800 dark:text-slate-100">{selectedPersonnel.gsisBpNo || '-'}</div>
                      )}
                    </div>
                  </div>
                </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
