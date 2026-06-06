import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, UserMinus, Loader, RefreshCw, Download, Filter } from 'lucide-react';

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

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 flex items-center gap-3">
      <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('dark:text-', 'dark:bg-') + '/10'}`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div>
        <p className="text-xl font-bold text-neutral-900 dark:text-neutral-50">{value}</p>
        <p className={`text-[10px] font-medium uppercase tracking-wider ${color}`}>{label}</p>
      </div>
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
  onManualCheckIn,
  onRefresh
}) {
  const [updatingId, setUpdatingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    if (participants.length > 0) {
      setLastUpdated(new Date());
    }
  }, [participants]);

  const handleStatusChange = async (attendanceId, reservistId, registrationId, newStatus) => {
    setUpdatingId(attendanceId || reservistId || registrationId);
    try {
      if (attendanceId) {
        await onStatusChange(attendanceId, newStatus);
      } else {
        // For manual check-in, pass both reservistId and registrationId
        await onManualCheckIn(reservistId, registrationId, newStatus);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredParticipants = participants?.filter(p => {
    const matchesSearch = !searchQuery || (() => {
      const q = searchQuery.toLowerCase();
      const name = `${p.rank || ''} ${p.first_name} ${p.last_name}`.toLowerCase();
      return name.includes(q) || (p.service_number || '').toLowerCase().includes(q) || (p.squadron_name || '').toLowerCase().includes(q);
    })();
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  }) || [];

  const handleExport = () => {
    const headers = ['Name', 'Rank', 'Service Number', eventType === 'internal' ? 'Squadron' : '', 'Status', 'Check-in Time', 'Scan Method'].filter(Boolean);
    const rows = filteredParticipants.map(p => [
      `${p.last_name}, ${p.first_name}`,
      p.rank || '',
      p.service_number || '',
      ...(eventType === 'internal' ? [p.squadron_name || ''] : []),
      p.status,
      p.check_in_time ? new Date(p.check_in_time).toLocaleTimeString() : '',
      p.scan_method || ''
    ]);

    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-${training?.title?.replace(/\s+/g, '-') || 'event'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <StatCard label="Total" value={stats.total_participants || stats.total_attendees || 0} color="text-neutral-600 dark:text-neutral-400" icon={AlertTriangle} />
          <StatCard label="Present" value={stats.present_count || 0} color="text-emerald-600 dark:text-emerald-400" icon={CheckCircle2} />
          <StatCard label="Absent" value={stats.absent_count || 0} color="text-red-600 dark:text-red-400" icon={XCircle} />
          <StatCard label="Late" value={stats.late_count || 0} color="text-amber-600 dark:text-amber-400" icon={Clock} />
          <StatCard label="Excused" value={stats.excused_count || 0} color="text-blue-600 dark:text-blue-400" icon={UserMinus} />
          <StatCard label="Pending" value={stats.pending_count || 0} color="text-neutral-500 dark:text-neutral-400" icon={AlertTriangle} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, service number, or squadron..."
            className="w-full px-4 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-8 pr-8 py-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 appearance-none"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="late">Late</option>
              <option value="excused">Excused</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="p-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={handleExport}
            className="p-2.5 text-sm bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
            title="Export CSV"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

      {lastUpdated && (
        <p className="text-[10px] text-neutral-400 dark:text-neutral-500">
          Last updated: {lastUpdated.toLocaleTimeString()} · {filteredParticipants.length} of {participants.length} shown
        </p>
      )}

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
              const isUpdating = updatingId === (p.attendance_id || p.reservist_id || p.registration_id);
              const uniqueKey = p.reservist_id || p.registration_id || p.attendance_id;
              return (
                <tr key={uniqueKey} className={`border-b border-neutral-100 dark:border-neutral-800 transition-colors ${
                  p.status === 'present' ? 'bg-emerald-50/30 dark:bg-emerald-950/10' :
                  p.status === 'absent' ? 'bg-red-50/30 dark:bg-red-950/10' :
                  p.status === 'late' ? 'bg-amber-50/30 dark:bg-amber-950/10' :
                  'hover:bg-neutral-50 dark:hover:bg-neutral-800/30'
                }`}>
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
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, p.registration_id, 'present')}
                            className="p-1.5 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 disabled:opacity-30"
                            title="Mark Present"
                            disabled={p.status === 'present'}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, p.registration_id, 'absent')}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 disabled:opacity-30"
                            title="Mark Absent"
                            disabled={p.status === 'absent'}
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, p.registration_id, 'late')}
                            className="p-1.5 rounded hover:bg-amber-100 dark:hover:bg-amber-900/30 text-amber-600 dark:text-amber-400 disabled:opacity-30"
                            title="Mark Late"
                            disabled={p.status === 'late'}
                          >
                            <Clock className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleStatusChange(p.attendance_id, p.reservist_id, p.registration_id, 'excused')}
                            className="p-1.5 rounded hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 disabled:opacity-30"
                            title="Mark Excused"
                            disabled={p.status === 'excused'}
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
                  {searchQuery || statusFilter !== 'all' ? 'No matching participants found' : 'No participants registered for this event'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
