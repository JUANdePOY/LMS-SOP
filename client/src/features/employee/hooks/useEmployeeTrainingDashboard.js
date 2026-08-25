import { useState, useEffect, useCallback } from 'react';
import {
  getAnnouncements,
  getEvents,
  getMyTasks,
  getUserCertificates,
} from '@/services/api';
import { getEmployeeEnrollmentsWithCourses } from '../api/employee.api';
import { getEmployeeSopSummary } from '../api/employeeSop.api';
import { getMyAssessmentSummary } from '@/features/assessments/api/attempt.api';
import { useAuth } from '@/contexts/AuthContext';

function unwrap(res) {
  if (!res || !res.data) return null;
  if (res.data && typeof res.data === 'object' && 'success' in res.data && 'data' in res.data) {
    return res.data.data ?? null;
  }
  return res.data;
}

function ensureArray(val, fallback = []) {
  return Array.isArray(val) ? val : fallback;
}

// The server already derives `status` per task (Overdue from deadline, parent
// status from children, etc.) and attaches `progress_rate`. We only upgrade a
// task to Completed when its progress is fully done, so the cards match the
// employee's real standing on the My Tasks page.
function getEffectiveTaskStatus(task) {
  const rate = Number(task?.progress_rate || 0);
  if (rate >= 100) return 'Completed';

  const raw = task?.status;
  if (raw === 'Completed' || raw === 'Cancelled') return raw;
  return raw || 'Pending';
}

export default function useEmployeeTrainingDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [assignedSops, setAssignedSops] = useState({ total: 0, items: [] });
  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [assessmentSummary, setAssessmentSummary] = useState({ passed: 0, total: 0 });

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = user?.id;
      const [announcementsRes, eventsRes, myTasksRes, summaryRes, enrollmentsRes, certificatesRes, assessmentSummaryRes] = await Promise.all([
        getAnnouncements({ limit: 10 }),
        getEvents({ limit: 10 }),
        getMyTasks({ limit: 50 }),
        getEmployeeSopSummary().catch(() => null),
        getEmployeeEnrollmentsWithCourses({ limit: 100 }).catch(() => null),
        userId ? getUserCertificates(userId).catch(() => ({ data: { rows: [] } })) : Promise.resolve({ data: { rows: [] } }),
        getMyAssessmentSummary().catch(() => ({ data: { passed: 0, total: 0 } })),
      ]);

      const announcementsData = ensureArray(unwrap(announcementsRes), []);
      const eventsData = ensureArray(unwrap(eventsRes), []);

      const myTasksRaw = unwrap(myTasksRes);
      const myTasksList = myTasksRaw && typeof myTasksRaw === 'object' && !Array.isArray(myTasksRaw)
        ? (myTasksRaw.rows || myTasksRaw.data || [])
        : ensureArray(myTasksRaw, []);

      const enrollmentsData = ensureArray(unwrap(enrollmentsRes), []);
      const certificatesData = unwrap(certificatesRes);
      const certificatesList = certificatesData && typeof certificatesData === 'object' && !Array.isArray(certificatesData)
        ? (certificatesData.rows || certificatesData.data || [])
        : ensureArray(certificatesData, []);

      const summaryData = unwrap(summaryRes) || { total: 0, items: [] };
      const assignedSopsData = {
        total: summaryData.total || 0,
        items: Array.isArray(summaryData.items) ? summaryData.items : [],
      };

      setAssessmentSummary(unwrap(assessmentSummaryRes) || { passed: 0, total: 0 });

      setAnnouncements(announcementsData.slice(0, 4));
      setEvents(eventsData.slice(0, 4));
      setMyTasks(myTasksList);
      setAssignedSops(assignedSopsData);
      setEnrollments(enrollmentsData);
      setCertificates(certificatesList);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const myCourses = enrollments.filter((e) => e.course).map((e) => ({ enrollment: e, course: e.course }));

  const completedCourses = myCourses.filter((e) => (e.enrollment.progress_percentage || 0) >= 100).length;
  const totalCourses = myCourses.length;
  const trainingProgress = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0;

  const todoTasks = myTasks.filter((t) => getEffectiveTaskStatus(t) === 'Pending').length;
  const inProgressTasks = myTasks.filter((t) => getEffectiveTaskStatus(t) === 'In Progress').length;
  const completedTasks = myTasks.filter((t) => getEffectiveTaskStatus(t) === 'Completed').length;
  const overdueTasks = myTasks.filter((t) => getEffectiveTaskStatus(t) === 'Overdue').length;

  const totalSops = assignedSops.total;
  const assignedItems = assignedSops.items || [];
  const toPercent = (count) => (totalSops > 0 ? Math.round((count / totalSops) * 100) : 0);

  // "SOPs by Status" reflects completion status of the employee's actual
  // assigned SOPs (resolved via sop_assignments + course modules), not the
  // acknowledgement table which is only a publish-time side effect.
  const acknowledgedCount = assignedItems.filter((s) => s.acknowledged).length;
  const notAcknowledgedCount = assignedItems.length - acknowledgedCount;
  const sopStatus = [
    { name: 'Acknowledged', value: toPercent(acknowledgedCount), count: acknowledgedCount, color: '#10B981' },
    { name: 'Not Acknowledged', value: toPercent(notAcknowledgedCount), count: notAcknowledgedCount, color: '#F59E0B' },
  ].filter((s) => s.count > 0);

  const certificatesEarned = certificates.length;
  const assessmentsPassed = Number(assessmentSummary.passed) || 0;
  const assessmentsTotal = Number(assessmentSummary.total) || 0;

  const sopHighlights = assignedItems.slice(0, 4).map((sop) => {
    const status = sop.acknowledged ? 'Completed' : 'In Progress';
    return {
      title: sop.title || 'Untitled SOP',
      status,
      progress: sop.acknowledged ? 100 : 0,
      updated: '',
    };
  });

  const formattedEvents = events.slice(0, 4).map((evt) => {
    const dateVal = evt.event_date || evt.start_date || evt.created_at;
    const d = new Date(dateVal);
    return {
      title: evt.title,
      date: !isNaN(d.getTime()) ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : String(dateVal),
      time: !isNaN(d.getTime()) ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    };
  });

  return {
    loading,
    error,
    refetch: fetchDashboard,
    stats: {
      sopsAssigned: totalSops,
      trainingProgress,
      assessmentsPassed: String(assessmentsPassed),
      assessmentsTotal,
      certificatesEarned: String(certificatesEarned),
    },
    announcements: announcements.slice(0, 4),
    events: formattedEvents,
    taskCounts: {
      todo: todoTasks,
      in_progress: inProgressTasks,
      completed: completedTasks,
      overdue: overdueTasks,
    },
    sopHighlights,
    sopStatus,
    trainingChartData: [
      { date: 'Week 1', value: Math.max(0, trainingProgress - 20) },
      { date: 'Week 2', value: Math.max(0, trainingProgress - 10) },
      { date: 'Week 3', value: Math.max(0, trainingProgress - 5) },
      { date: 'Week 4', value: trainingProgress },
    ],
  };
}
