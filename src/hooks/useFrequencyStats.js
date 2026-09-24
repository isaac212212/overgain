import { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { isSameWeek, isSameMonth, isSameYear } from '../utils/dateHelpers';

export function useFrequencyStats() {
  const { checkins } = useData();

  const stats = useMemo(() => {
    const now = new Date();
    
    const workoutCheckins = checkins.filter(c => c.type !== 'cardio');
    const cardioCheckins = checkins.filter(c => c.type === 'cardio' || c.isCardio);

    const weekWorkouts = workoutCheckins.filter(c => isSameWeek(c.date, now));
    const weekCardios = cardioCheckins.filter(c => isSameWeek(c.date, now));

    const monthWorkouts = workoutCheckins.filter(c => isSameMonth(c.date, now));
    const monthCardios = cardioCheckins.filter(c => isSameMonth(c.date, now));

    const yearWorkouts = workoutCheckins.filter(c => isSameYear(c.date, now));
    const yearCardios = cardioCheckins.filter(c => isSameYear(c.date, now));

    // Get unique days in the current week for workouts (musculação)
    const uniqueWeekDays = new Set(
      weekWorkouts.map(c => new Date(c.date).toDateString())
    ).size;

    // Current streak (based on workouts)
    let streak = 0;
    const sortedDates = [...new Set(workoutCheckins.map(c => new Date(c.date).toDateString()))]
      .sort((a, b) => new Date(b) - new Date(a));
    
    if (sortedDates.length > 0) {
      let currentDate = new Date();
      currentDate.setHours(0, 0, 0, 0);
      
      // Check if trained today, if not check yesterday
      if (sortedDates[0] !== currentDate.toDateString()) {
        currentDate.setDate(currentDate.getDate() - 1);
        if (sortedDates[0] !== currentDate.toDateString()) {
          streak = 0;
        } else {
          streak = 1;
          let idx = 1;
          while (idx < sortedDates.length) {
            currentDate.setDate(currentDate.getDate() - 1);
            if (sortedDates[idx] === currentDate.toDateString()) {
              streak++;
              idx++;
            } else {
              break;
            }
          }
        }
      } else {
        streak = 1;
        let idx = 1;
        while (idx < sortedDates.length) {
          currentDate.setDate(currentDate.getDate() - 1);
          if (sortedDates[idx] === currentDate.toDateString()) {
            streak++;
            idx++;
          } else {
            break;
          }
        }
      }
    }

    // Weekly data for chart (last 12 weeks)
    const weeklyData = [];
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (weekStart.getDay() || 7) + 1 - (i * 7));
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const count = workoutCheckins.filter(c => {
        const d = new Date(c.date);
        return d >= weekStart && d <= weekEnd;
      }).length;
      
      weeklyData.push({ weekStart, weekEnd, count });
    }

    return {
      week: uniqueWeekDays,
      weekCardio: weekCardios.length,
      month: monthWorkouts.length,
      monthCardio: monthCardios.length,
      year: yearWorkouts.length,
      yearCardio: yearCardios.length,
      total: workoutCheckins.length,
      totalCardio: cardioCheckins.length,
      streak,
      weeklyData
    };
  }, [checkins]);

  return stats;
}
