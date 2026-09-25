import { useData } from '../contexts/DataContext';

export function useWorkouts() {
  const {
    checkins,
    activeWorkout,
    startActiveWorkout,
    updateActiveWorkout,
    cancelActiveWorkout,
    finishActiveWorkout,
    logCardio,
    addCheckin,
    deleteCheckin,
    syncWithCloud
  } = useData();

  return {
    workouts: checkins,
    checkins,
    activeWorkout,
    startActiveWorkout,
    updateActiveWorkout,
    cancelActiveWorkout,
    finishActiveWorkout,
    logCardio,
    addCheckin,
    deleteCheckin,
    syncWithCloud
  };
}

export default useWorkouts;
