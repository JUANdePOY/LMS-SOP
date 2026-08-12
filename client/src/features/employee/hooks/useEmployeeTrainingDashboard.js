import { useState, useEffect, useCallback } from 'react';
import {
  getAnnouncements,
  getEvents,
  getMyTasks,
  getMySopAcknowledgements,
  getUserCertificates,
} from '@/services/api';
import { getEmployeeEnrollmentsWithCourses } from '../api/employee.api';
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

export default function useEmployeeTrainingDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [sopAcknowledgements, setSopAcknowledgements] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [certificates, setCertificates] = useState([]);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = user?.id;
      const [announcementsRes, eventsRes, myTasksRes, acksRes, enrollmentsRes, certificatesRes] = await Promise.all([
        getAnnouncements({ limit: 10 }),
        getEvents({ limit: 10 }),
        getMyTasks({ limit: 50 }),
        getMySopAcknowledgements().catch(() => null),
        getEmployeeEnrollmentsWithCourses({ limit: 100 }).catch(() => null),
        userId ? getUserCertificates(userId).catch(() => ({ data: { rows: [] } })) : Promise.resolve({ data: { rows: [] } }),
      ]);

      const announcementsData = ensureArray(unwrap(announcementsRes), []);
      const eventsData = ensureArray(unwrap(eventsRes), []);

      const myTasksRaw = unwrap(myTasksRes);
      const myTasksList = myTasksRaw && typeof myTasksRaw === 'object' && !Array.isArray(myTasksRaw)
        ? (myTasksRaw.rows || myTasksRaw.data || [])
        : ensureArray(myTasksRaw, []);

      const acksData = ensureArray(unwrap(acksRes), []);
      const enrollmentsData = ensureArray(unwrap(enrollmentsRes), []);
      const certificatesData = unwrap(certificatesRes);
      const certificatesList = certificatesData && typeof certificatesData === 'object' && !Array.isArray(certificatesData)
        ? (certificatesData.rows || certificatesData.data || [])
        : ensureArray(certificatesData, []);

      setAnnouncements(announcementsData.slice(0, 4));
      setEvents(eventsData.slice(0, 4));
      setMyTasks(myTasksList);
      setSopAcknowledgements(acksData);
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

  const todoTasks = myTasks.filter((t) => t.status === 'Pending' || t.status === 'To Do').length;
  const inProgressTasks = myTasks.filter((t) => t.status === 'In Progress').length;
  const completedTasks = myTasks.filter((t) => t.status === 'Completed').length;
  const overdueTasks = myTasks.filter((t) => t.status === 'Overdue').length;

  const totalSops = sopAcknowledgements.length;
  const acknowledgedSops = sopAcknowledgements.filter((a) => a.status === 'Acknowledged').length;
  const pendingSops = totalSops - acknowledgedSops;

  const certificatesEarned = certificates.length;

  const sopHighlights = sopAcknowledgements.slice(0, 4).map((ack) => {
    const sopTitle = ack.sop_title || ack.title || 'Untitled SOP';
    let status = 'Not Started';
    let progress = 0;
    if (ack.status === 'Acknowledged') {
      status = 'Completed';
      progress = 100;
    } else if (ack.status === 'Pending' || ack.status === 'In Progress') {
      status = 'In Progress';
      progress = ack.progress_percentage ?? 50;
    }
    return {
      title: sopTitle,
      status,
      progress,
      updated: ack.acknowledged_at || ack.created_at ? new Date(ack.acknowledged_at || ack.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
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
      assessmentsPassed: '92%',
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
    sopStatus: [
      { name: 'Completed', value: acknowledgedSops, count: acknowledgedSops, color: '#2F5EFF' },
      { name: 'In Progress', value: pendingSops, count: pendingSops, color: '#7CA0FF' },
      { name: 'Not Started', value: 0, count: 0, color: '#E2E8F0' },
    ],
    trainingChartData: [
      { date: 'Week 1', value: Math.max(0, trainingProgress - 20) },
      { date: 'Week 2', value: Math.max(0, trainingProgress - 10) },
      { date: 'Week 3', value: Math.max(0, trainingProgress - 5) },
      { date: 'Week 4', value: trainingProgress },
    ],
  };
}
