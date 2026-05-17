import { useState, useEffect } from 'react';

// Mock trainings data
const mockTrainings = [
  {
    id: 1,
    title: 'Basic Flight Training',
    description: 'Introduction to flight principles and basic maneuvers',
    type: 'internal',
    status: 'active',
    startDate: '2026-05-01',
    endDate: '2026-05-30',
    location: 'Airbase Alpha',
    instructor: 'Col. Smith',
    maxParticipants: 25,
    participants: [
      { id: 1, name: 'John Doe', rank: '2nd Lt', unit: '1st Squadron' },
      { id: 2, name: 'Jane Smith', rank: '1st Lt', unit: '2nd Squadron' }
    ],
    activities: [
      { id: 1, title: 'Ground School', startTime: '2026-05-01T08:00:00', endTime: '2026-05-01T12:00:00', location: 'Classroom A', instructor: 'Col. Smith', status: 'completed' },
      { id: 2, title: 'Simulator Training', startTime: '2026-05-02T09:00:00', endTime: '2026-05-02T17:00:00', location: 'Simulator Bay', instructor: 'Maj. Johnson', status: 'active' }
    ]
  },
  {
    id: 2,
    title: 'Advanced Navigation Course',
    description: 'Advanced navigation techniques for cross-country flights',
    type: 'external',
    status: 'planned',
    startDate: '2026-06-15',
    endDate: '2026-06-30',
    location: 'Training Center Bravo',
    instructor: 'Lt. Col. Davis',
    maxParticipants: 20,
    participants: [],
    activities: []
  }
];

const useTrainings = () => {
  const [trainings, setTrainings] = useState(mockTrainings);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Simulate API call
  const fetchTrainings = async () => {
    setLoading(true);
    try {
      // In a real app, this would be an API call
      // For now, we'll just return the mock data after a delay
      await new Promise(resolve => setTimeout(resolve, 500));
      setTrainings(mockTrainings);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate creating a training
  const createTraining = async (trainingData) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      const newTraining = {
        ...trainingData,
        id: Date.now(), // Temporary ID
        participants: [],
        activities: []
      };
      setTrainings(prev => [...prev, newTraining]);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate updating a training
  const updateTraining = async (id, trainingData) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTrainings(prev =>
        prev.map(training =>
          training.id === id ? { ...training, ...trainingData } : training
        )
      );
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Simulate deleting a training
  const deleteTraining = async (id) => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTrainings(prev => prev.filter(training => training.id !== id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Refetch trainings
  const refresh = () => {
    fetchTrainings();
  };

  // Initial fetch
  useEffect(() => {
    fetchTrainings();
  }, []);

  return {
    trainings,
    loading,
    error,
    createTraining,
    updateTraining,
    deleteTraining,
    refresh
  };
};

export default useTrainings;