import { useState, useMemo, useEffect, useCallback } from "react";
import { UserSquare, Plus, Loader, Upload, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { getReservists, createReservist, updateReservist, deleteReservist } from "@/services/api";
import * as XLSX from "xlsx";
import AirbasePageHeader from "@/components/airbase/AirbasePageHeader";
import { PrimaryButton } from "@/components/airbase/AirbaseUI";
import ReservistStatsBar    from "@/components/reservists/ReservistStatsBar";
import ReservistTable       from "@/components/reservists/ReservistTable";
import ReservistModal       from "@/components/reservists/ReservistModal";
import ReservistViewModal from "@/components/reservists/ReservistViewModal";
import BulkUploadModal from "@/components/reservists/BulkUploadModal";
import ReservistDetailPanel from "@/components/reservists/ReservistDetailPanel";
import SearchAndFilters, { DEFAULT_FILTERS } from "@/components/reservists/SearchAndFilters";

const EMPTY_FORM = {
  id: '', userId: '', assignmentId: '',
  firstName: '', lastName: '', serialNo: '', dateEnlisted: '',
  rank: '', status: 'active', squadronId: '', groupId: '', arcen: '', airbase: '',
  specialization: '', civilOccupation: '', contact: '', address: '',
  email: '', password: '', position: '',
  dateOfBirth: '', placeOfBirth: '', age: '', sex: '', civilStatus: '',
  citizenship: 'Filipino', height: '', weight: '', bloodType: '',
  reserveCenter: '', category: '', rankDateOfAppointment: '',
  sourceOfCommission: '', reserveStatus: 'Ready Reserve',
  highestEducation: '', courseDegree: '', school: '', yearGraduated: '',
  employerCompany: '', officeAddress: '',
  basicTraining: '', basicTrainingDateCompleted: '',
  emergencyContactName: '', emergencyContactNumber: '', emergencyContactAddress: '',
};

export default function Reservists() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modal, setModal] = useState({ open: false, mode: "add", row: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [detailRow, setDetailRow] = useState(null);
  const [viewRow, setViewRow] = useState(null);
  const [bulkUploadModal, setBulkUploadModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const formatDate = (val) => {
    if (!val) return '';
    if (typeof val === 'string') {
      return val.slice(0, 10);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const transformReservistData = (apiData) => {
    return apiData.map(r => ({
      id: r.id,
      userId: r.user_id,
      firstName: r.first_name || '',
      lastName: r.last_name || '',
      serialNo: r.service_number || '',
      rank: r.rank || '',
      status: r.is_active ? 'active' : 'inactive',
      position: r.position || '',
      dateOfBirth: formatDate(r.date_of_birth),
      placeOfBirth: r.place_of_birth || '',
      age: r.age != null ? String(r.age) : '',
      sex: r.sex || '',
      civilStatus: r.civil_status || '',
      citizenship: r.citizenship || 'Filipino',
      height: r.height != null ? String(r.height) : '',
      weight: r.weight != null ? String(r.weight) : '',
      bloodType: r.blood_type || '',
      contact: r.phone_number || '',
      address: r.address || '',
      email: r.email || '',
      reserveCenter: r.reserve_center != null ? String(r.reserve_center) : '',
      category: r.category || '',
      dateEnlisted: formatDate(r.date_enlisted),
      sourceOfCommission: r.source_of_commission || '',
      rankDateOfAppointment: formatDate(r.rank_date_appointment),
      specialization: r.specialization || '',
      reserveStatus: r.reserve_status || 'Ready Reserve',
      highestEducation: r.highest_education || '',
      courseDegree: r.course_degree || '',
      school: r.school || '',
      yearGraduated: r.year_graduated != null ? String(r.year_graduated) : '',
      civilOccupation: r.occupation || '',
      employerCompany: r.employer || '',
      officeAddress: r.office_address || '',
      basicTraining: r.basic_training_completed || '',
      basicTrainingDateCompleted: formatDate(r.basic_training_date),
      emergencyContactName: r.emergency_contact_name || '',
      emergencyContactNumber: r.emergency_contact_phone || '',
      emergencyContactAddress: r.emergency_contact_address || '',
      assignmentId: r.assignment_id || '',
      squadronId: r.squadron_id != null ? String(r.squadron_id) : '',
      groupId: r.group_id != null ? String(r.group_id) : '',
      squadron: r.squadron_name || '',
      group: r.group_name || '',
      arcen: r.arcen_name || '',
      airbase: r.squadron_location || '',
    }));
  };

  useEffect(() => {
    loadReservists(1);
  }, [search, filters]);

  const loadReservists = async (page = 1) => {
    setLoading(true);
    setError(null);
    setCurrentPage(page);
    try {
      const params = { page, limit: 100 };
      if (search) params.search = search;
      if (filters.status && filters.status !== '' && filters.status !== 'all') params.status = filters.status;
      if (filters.squadronId && filters.squadronId !== '') params.squadron_id = parseInt(filters.squadronId, 10);
      if (filters.groupId && filters.groupId !== '') params.group_id = parseInt(filters.groupId, 10);
      if (filters.rank && filters.rank !== '') params.rank = filters.rank;
      if (filters.reserveStatus && filters.reserveStatus !== '') params.reserve_status = filters.reserveStatus;
      if (filters.airbase && filters.airbase !== '') params.airbase = filters.airbase;
      if (filters.arcen && filters.arcen !== '') params.arcen = filters.arcen;
      if (filters.group && filters.group !== '') params.group = filters.group;
      if (filters.squadron && filters.squadron !== '') params.squadron = filters.squadron;
      if (filters.specialization && filters.specialization !== '') params.specialization = filters.specialization;
      if (filters.category && filters.category !== '') params.category = filters.category;
      if (filters.sourceOfCommission && filters.sourceOfCommission !== '') params.sourceOfCommission = filters.sourceOfCommission;
      if (filters.bloodType && filters.bloodType !== '') params.bloodType = filters.bloodType;
      if (filters.sex && filters.sex !== '') params.sex = filters.sex;
      if (filters.civilStatus && filters.civilStatus !== '') params.civilStatus = filters.civilStatus;
      const response = await getReservists(params);
      if (response.data.status === 'success') {
        setData(transformReservistData(response.data.data));
        setTotalPages(response.data.pagination?.pages || 1);
        setTotalCount(response.data.pagination?.total || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load reservists');
    } finally {
      setLoading(false);
    }
  };

  const filteredData = useMemo(() => {
    return data.filter((r) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          r.firstName?.toLowerCase().includes(q) ||
          r.lastName?.toLowerCase().includes(q)  ||
          r.serialNo?.toLowerCase().includes(q)  ||
          r.rank?.toLowerCase().includes(q)      ||
          r.squadron?.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.airbase        && r.airbase        !== filters.airbase)        return false;
      if (filters.arcen          && r.arcen          !== filters.arcen)          return false;
      if (filters.group          && r.group          !== filters.group)          return false;
      if (filters.squadron       && r.squadron       !== filters.squadron)       return false;
      if (filters.rank           && r.rank           !== filters.rank)           return false;
      if (filters.specialization && r.specialization !== filters.specialization) return false;
      if (filters.status         && r.status         !== filters.status)         return false;
      if (filters.category       && r.category       !== filters.category)       return false;
      if (filters.sourceOfCommission && r.sourceOfCommission !== filters.sourceOfCommission) return false;
      if (filters.bloodType      && r.bloodType      !== filters.bloodType)      return false;
      if (filters.sex            && r.sex            !== filters.sex)            return false;
      if (filters.civilStatus    && r.civilStatus    !== filters.civilStatus)    return false;
      if (filters.reserveStatus  && r.reserveStatus  !== filters.reserveStatus)  return false;
      return true;
    });
  }, [data, search, filters]);

  const openAdd = () => {
    setForm(EMPTY_FORM);
    setModal({ open: true, mode: "add", row: null });
  };

  const openEdit = (row) => {
    setForm({
      ...EMPTY_FORM,
      id: row.id || '',
      userId: row.userId || '',
      assignmentId: row.assignmentId || '',
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      serialNo: row.serialNo || '',
      dateEnlisted: row.dateEnlisted || '',
      rank: row.rank || '',
      status: row.status || 'active',
      position: row.position || '',
      squadronId: row.squadronId != null ? String(row.squadronId) : '',
      groupId: row.groupId != null ? String(row.groupId) : '',
      arcen: row.arcen || '',
      airbase: row.airbase || '',
      specialization: row.specialization || '',
      civilOccupation: row.civilOccupation || '',
      contact: row.contact || '',
      address: row.address || '',
      email: row.email || '',
      dateOfBirth: row.dateOfBirth || '',
      placeOfBirth: row.placeOfBirth || '',
      age: row.age != null ? String(row.age) : '',
      sex: row.sex || '',
      civilStatus: row.civilStatus || '',
      citizenship: row.citizenship || 'Filipino',
      height: row.height != null ? String(row.height) : '',
      weight: row.weight != null ? String(row.weight) : '',
      bloodType: row.bloodType || '',
      reserveCenter: row.reserveCenter != null ? String(row.reserveCenter) : '',
      category: row.category || '',
      rankDateOfAppointment: row.rankDateOfAppointment || '',
      sourceOfCommission: row.sourceOfCommission || '',
      reserveStatus: row.reserveStatus || 'Ready Reserve',
      highestEducation: row.highestEducation || '',
      courseDegree: row.courseDegree || '',
      school: row.school || '',
      yearGraduated: row.yearGraduated != null ? String(row.yearGraduated) : '',
      employerCompany: row.employerCompany || '',
      officeAddress: row.officeAddress || '',
      basicTraining: row.basicTraining || '',
      basicTrainingDateCompleted: row.basicTrainingDateCompleted || '',
      emergencyContactName: row.emergencyContactName || '',
      emergencyContactNumber: row.emergencyContactNumber || '',
      emergencyContactAddress: row.emergencyContactAddress || '',
    });
    setModal({ open: true, mode: "edit", row });
    setDetailRow(null);
    setViewRow(null);
  };

  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSubmit = async () => {
    try {
      if (modal.mode === "add") {
        const requestData = {
          email: form.email || `${form.firstName.toLowerCase()}.${form.lastName.toLowerCase()}@example.com`,
          password: form.password || 'password123',
          first_name: form.firstName,
          last_name: form.lastName,
          service_number: form.serialNo,
          rank: form.rank,
          position: form.position,
          phone_number: form.contact,
          address: form.address,
          specialization: form.specialization,
          occupation: form.civilOccupation,
          date_of_birth: form.dateOfBirth,
          place_of_birth: form.placeOfBirth,
          age: form.age ? parseInt(form.age, 10) : null,
          sex: form.sex,
          civil_status: form.civilStatus,
          citizenship: form.citizenship,
          height: form.height ? parseFloat(form.height) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          blood_type: form.bloodType,
          reserve_center: form.reserveCenter,
          category: form.category,
          date_enlisted: form.dateEnlisted,
          source_of_commission: form.sourceOfCommission,
          rank_date_appointment: form.rankDateOfAppointment,
          reserve_status: form.reserveStatus,
          highest_education: form.highestEducation,
          course_degree: form.courseDegree,
          school: form.school,
          year_graduated: form.yearGraduated ? parseInt(form.yearGraduated, 10) : null,
          employer: form.employerCompany,
          office_address: form.officeAddress,
          basic_training_completed: form.basicTraining,
          basic_training_date: form.basicTrainingDateCompleted,
          emergency_contact_name: form.emergencyContactName,
          emergency_contact_phone: form.emergencyContactNumber,
          emergency_contact_address: form.emergencyContactAddress,
        };

        const response = await createReservist(requestData);
        if (response.data.status === 'success') {
          setData((prev) => [...prev, transformReservistData([response.data.data])[0]]);
        }
      } else {
        const response = await updateReservist(modal.row.id, {
          first_name: form.firstName,
          last_name: form.lastName,
          rank: form.rank,
          position: form.position,
          phone_number: form.contact,
          address: form.address,
          specialization: form.specialization,
          occupation: form.civilOccupation,
          date_of_birth: form.dateOfBirth,
          place_of_birth: form.placeOfBirth,
          age: form.age ? parseInt(form.age, 10) : null,
          sex: form.sex,
          civil_status: form.civilStatus,
          citizenship: form.citizenship,
          height: form.height ? parseFloat(form.height) : null,
          weight: form.weight ? parseFloat(form.weight) : null,
          blood_type: form.bloodType,
          reserve_center: form.reserveCenter,
          category: form.category,
          date_enlisted: form.dateEnlisted,
          source_of_commission: form.sourceOfCommission,
          rank_date_appointment: form.rankDateOfAppointment,
          reserve_status: form.reserveStatus,
          highest_education: form.highestEducation,
          course_degree: form.courseDegree,
          school: form.school,
          year_graduated: form.yearGraduated ? parseInt(form.yearGraduated, 10) : null,
          employer: form.employerCompany,
          office_address: form.officeAddress,
          basic_training_completed: form.basicTraining,
          basic_training_date: form.basicTrainingDateCompleted,
          emergency_contact_name: form.emergencyContactName,
          emergency_contact_phone: form.emergencyContactNumber,
          emergency_contact_address: form.emergencyContactAddress,
        });
        if (response.data.status === 'success') {
          const updatedReservist = transformReservistData([response.data.data])[0];
          setData((prev) =>
            prev.map((r) => r.id === modal.row.id ? updatedReservist : r)
          );
          if (detailRow?.id === modal.row.id) {
            setDetailRow(updatedReservist);
          }
          if (viewRow?.id === modal.row.id) {
            setViewRow(updatedReservist);
          }
        }
      }
      closeModal();
    } catch (err) {
      setError(err.response?.data?.message || 'Operation failed');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this reservist? This action cannot be undone.")) return;
    try {
      await deleteReservist(id);
      setData((prev) => prev.filter((r) => r.id !== id));
      if (detailRow?.id === id) setDetailRow(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const reservist = data.find(r => r.id === id);
      const response = await updateReservist(id, {
        is_active: reservist.status !== 'active'
      });
      if (response.data.status === 'success') {
        const updatedReservist = transformReservistData([response.data.data])[0];
        setData((prev) =>
          prev.map((r) =>
            r.id === id ? updatedReservist : r
          )
        );
        if (detailRow?.id === id) {
          setDetailRow(updatedReservist);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleExport = () => {
    const exportData = filteredData.map((r, idx) => ({
      'No.': idx + 1,
      'Serial No.': r.serialNo,
      'Last Name': r.lastName,
      'First Name': r.firstName,
      'Rank': r.rank,
      'Status': r.status,
      'Squadron': r.squadron,
      'Group': r.group,
      'ARCEN': r.arcen,
      'Contact': r.contact,
      'Email': r.email,
      'Date Enlisted': r.dateEnlisted,
      'Specialization': r.specialization,
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reservists');
    XLSX.writeFile(wb, `reservists_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="flex flex-col gap-6 pb-10">
      {loading && (
        <div className="flex h-40 items-center justify-center">
          <Loader className="h-6 w-6 animate-spin text-indigo-500" />
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/30 p-4 text-sm text-red-800 dark:text-red-200">
          {error}
        </div>
      )}

      {!loading && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <PrimaryButton icon={Upload} onClick={() => setBulkUploadModal(true)} variant="secondary" className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Bulk Upload</span>
                <span className="sm:hidden">Upload</span>
              </PrimaryButton>
              <PrimaryButton icon={Download} onClick={handleExport} variant="secondary" className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Export All</span>
                <span className="sm:hidden">Export</span>
              </PrimaryButton>
              <PrimaryButton icon={Plus} onClick={openAdd} className="flex-1 sm:flex-none">
                <span className="hidden sm:inline">Add Reservist</span>
                <span className="sm:hidden">Add</span>
              </PrimaryButton>
            </div>

            <ReservistStatsBar data={data} />

<SearchAndFilters
              search={search}
              onSearchChange={setSearch}
              filters={filters}
              onFiltersChange={setFilters}
              resultCount={filteredData.length}
            />

            <ReservistTable
              data={filteredData}
              onView={setViewRow}
              onEdit={openEdit}
              onDelete={handleDelete}
              onToggleStatus={toggleStatus}
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-500">
                <div>
                  Showing {(currentPage - 1) * 100 + 1}–{Math.min(currentPage * 100, totalCount)} of {totalCount}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => loadReservists(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    ← Prev
                  </button>
                  <span className="px-2 tabular-nums">Page {currentPage} / {totalPages}</span>
                  <button
                    onClick={() => loadReservists(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-neutral-300 dark:border-neutral-700 px-3 py-1 disabled:opacity-40 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}

            <ReservistModal
            open={modal.open}
            mode={modal.mode}
            form={form}
            onChange={setForm}
            onClose={closeModal}
            onSubmit={handleSubmit}
          />

          <BulkUploadModal
            isOpen={bulkUploadModal}
            onClose={() => setBulkUploadModal(false)}
            onSuccess={loadReservists}
          />

          {detailRow && (
            <ReservistDetailPanel
              reservist={detailRow}
              onClose={() => setDetailRow(null)}
              onEdit={() => openEdit(detailRow)}
            />
          )}

          <ReservistViewModal
            reservist={viewRow}
            onClose={() => setViewRow(null)}
            onEdit={(row) => { setViewRow(null); openEdit(row); }}
          />
        </>
      )}
    </div>
  );
}
