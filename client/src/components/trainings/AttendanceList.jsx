import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, UserMinus, Loader } from 'lucide-react';

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-100 dark:bg-emerald-900/40', icon: CheckCircle2 },
  absent: { label: 'Absent', color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/40', icon: XCircle },
  late: { label: 'Late', color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/40', icon: Clock },
  excused: { label: 'Excused', color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/40', icon: UserMinus },
  pending: { label: 'Pending', color: 'text-neutral-500 dark:text-neutral-400', bg: 'bg-neutral-100 dark:bg-neutral-800', icon: AlertTriangle },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full ${config.bg} ${config.color}`}>
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <p className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
      <p className={`text-xs font-medium mt-1 ${color}`}>{label}</p>
    </div>
  );
}

export default function AttendanceList({
  eventType,
  training,
  participants,
  stats,
  loading,
  onStatusChange,
  onManualCheckIn
}) {
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleStatusChange = async (attendanceId, reservistId, newStatus) => {
    setUpdatingId(attendanceId || reservistId);
    try {
      if (attendanceId) {
        await onStatusChange(attendanceId, newStatus);
      } else {
        await onManualCheckIn(reservistId, newStatus);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredParticipants = participants?.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    const name = `${p.rank || ''} ${p.first_name} ${p.last_name}`.toLowerCase();
    return name.includes(q) || (p.service_number || '').toLowerCase().includes(q) || (p.squadron_name || '').toLowerCase().includes(q);
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.total_participants || stats.total_attendees || 0} color="text-neutral-500 dark:text-neutral-400" />
          <StatCard label="Present" value={stats.present_count || 0} color="text-emerald-600 dark:text-emerald-400" />
          <StatCard label="Absent" value={stats.absent_count || 0} color="text-red-600 dark:text-red-400" />
          <StatCard label="Late" value={stats.late_count || 0} color="text-amber-600 dark:text-amber-400" />
          <StatCard label="Excused" value={stats.excused_count || 0} color="text-blue-600 dark:text-blue-400" />
          <StatCard label="Pending" value={stats.pending_count || 0} color="text-neutral-500 dark:text-neutral-400" />
        </div>
      )}

      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, service number, or squadron..."
          className="w-full px-4 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-neutral-200 dark:border-neutral-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-200 dark:border-neutral-700">
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Name</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Rank</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Service #</th>
              {eventType === 'internal' && (
                <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Squadron</th>
              )}
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Status</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Check-in</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Method</th>
              <th className="px-4 py-3 text-left font-medium text-neutral-600 dark:text-neutral-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParticipants.length > 0 ? filteredParticipants.map((p) => {
              const isUpdating = updatingId === (p.attendance_id || p.reservist_id);
              return (
                <tr key={p.reservist_id} className="border-b border-neutral-100 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-neutral-900 dark:text-neutral-100">
                    {p.last_name}, {p.first_name}
                  </td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{p.rank || '—'}</td>
                  <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400 font-mono text-xs">{p.service_number || '—'}</td>
                  {eventType === 'internal' && (
                    <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{p.squadron_name || '—'}</td>
                  )}
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs">
                    {p.check_in_time ? new Date(p.check_in_time).toLocaleTimeString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400 text-xs capitalize">
                    {p.scan_method ? p.scan_method.replace('_', ' ') : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {isUpdating ? (
                        <Loader className="h-4 w-4 animate-spin text-indigo-500" />
                      ) : (
                        <>
                          <button
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, 'present')}
                            className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                            title="Mark Present"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, 'absent')}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400"
                            title="Mark Absent"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, 'late')}
                            className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400"
                            title="Mark Late"
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, 'excused')}
                            className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                            title="Mark Excused"
                          >
                            <UserMinus className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={eventType === 'internal' ? 8 : 7} className="px-4 py-8 text-center text-neutral-500">
                  {searchQuery ? 'No matching participants found' : 'No participants registered for this event'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
