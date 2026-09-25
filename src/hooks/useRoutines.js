import { useData } from '../contexts/DataContext';

export function useRoutines() {
  const {
    routines,
    cardioRoutines,
    weeklySchedule,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
    addCardioRoutine,
    updateCardioRoutine,
    deleteCardioRoutine,
    updateWeeklySchedule,
    syncWithCloud
  } = useData();

  return {
    routines,
    cardioRoutines,
    weeklySchedule,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    duplicateRoutine,
    addCardioRoutine,
    updateCardioRoutine,
    deleteCardioRoutine,
    updateWeeklySchedule,
    syncWithCloud
  };
}

export default useRoutines;
