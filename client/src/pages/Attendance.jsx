import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Calendar, MapPin, Users, Loader, AlertCircle, ScanLine } from 'lucide-react';
import AttendanceScanner from '@/components/trainings/AttendanceScanner';
import AttendanceList from '@/components/trainings/AttendanceList';
import {
  scanInternalTraining,
  scanExternalTraining,
  manualCheckInInternal,
  manualCheckInExternal,
  getInternalAttendance,
  getExternalAttendance,
  updateAttendanceStatus,
} from '@/services/attendanceApiService';

export default function Attendance() {
  const [eventType, setEventType] = useState('internal');
  const [trainingId, setTrainingId] = useState(null);
  const [training, setTraining] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('scan');

  const urlParams = new URLSearchParams(window.location.search);
  const urlEventType = urlParams.get('type') || 'internal';
  const urlTrainingId = urlParams.get('trainingId') ? Number(urlParams.get('trainingId')) : null;

  useEffect(() => {
    if (urlTrainingId) {
      setEventType(urlEventType);
      setTrainingId(urlTrainingId);
    }
  }, [urlTrainingId, urlEventType]);

  const loadAttendance = useCallback(async () => {
    if (!trainingId) return;
    setLoading(true);
    setError(null);
    try {
      let response;
      if (eventType === 'internal') {
        response = await getInternalAttendance(trainingId);
      } else {
        response = await getExternalAttendance(trainingId);
      }
      const data = response.data?.data;
      if (data) {
        setTraining(data.training);
        setParticipants(data.participants || data.attendees || []);
        setStats(data.stats);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  }, [trainingId, eventType]);

  useEffect(() => {
    if (trainingId) {
      loadAttendance();
    }
  }, [trainingId, loadAttendance]);

  const handleScan = async (barcode, scanMethod) => {
    let response;
    if (eventType === 'internal') {
      response = await scanInternalTraining(trainingId, barcode, scanMethod);
    } else {
      response = await scanExternalTraining(trainingId, barcode, scanMethod);
    }
    await loadAttendance();
    return response?.data?.data;
  };

  const handleStatusChange = async (attendanceId, newStatus) => {
    await updateAttendanceStatus(attendanceId, eventType, newStatus);
    await loadAttendance();
  };

  const handleManualCheckIn = async (reservistId, status) => {
    if (eventType === 'internal') {
      await manualCheckInInternal(trainingId, reservistId, status);
    } else {
      await manualCheckInExternal(trainingId, reservistId, status);
    }
    await loadAttendance();
  };

  if (!trainingId) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50 mb-4">Attendance Management</h1>
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">No training selected</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                Navigate to a training event and click "Take Attendance" to begin scanning.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Attendance</h1>
          {training && (
            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-neutral-500 dark:text-neutral-400">
              <span className="font-medium text-neutral-700 dark:text-neutral-300">{training.title}</span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {training.start_datetime
                  ? new Date(training.start_datetime).toLocaleDateString()
                  : training.start_date}
              </span>
              {training.venue && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {training.venue}
                </span>
              )}
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                training.status === 'ongoing' || training.status === 'open'
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}>
                {training.status}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEventType('internal')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              eventType === 'internal'
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            Internal
          </button>
          <button
            onClick={() => setEventType('external')}
            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
              eventType === 'external'
                ? 'bg-indigo-600 text-white'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
            }`}
          >
            External
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="flex gap-1 border-b border-neutral-200 dark:border-neutral-700">
        <button
          onClick={() => setActiveTab('scan')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'scan'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <ScanLine className="h-4 w-4" />
            Scan
          </span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'list'
              ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
              : 'border-transparent text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          <span className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Attendance List
          </span>
        </button>
      </div>

      {activeTab === 'scan' && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Barcode Scanning</h2>
          <AttendanceScanner
            onScan={handleScan}
            disabled={loading}
          />
        </div>
      )}

      {activeTab === 'list' && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-4">Attendance Records</h2>
          <AttendanceList
            eventType={eventType}
            training={training}
            participants={participants}
            stats={stats}
            loading={loading}
            onStatusChange={handleStatusChange}
            onManualCheckIn={handleManualCheckIn}
          />
        </div>
      )}
    </div>
  );
}
