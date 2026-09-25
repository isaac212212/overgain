import React, { useMemo } from 'react';
import { useData } from '../contexts/DataContext';
import { isSameWeek, isSameMonth, isSameYear, isSameDay } from '../utils/dateHelpers';

export function useFrequencyStats() {
  const { checkins, weeklySchedule, justifiedAbsences } = useData();

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

    // Unique days trained this week
    const uniqueWeekDays = new Set(
      workoutCheckins.filter(c => isSameWeek(c.date, now)).map(c => new Date(c.date).toDateString())
    ).size;

    // =========================================================================
    // STREAK CALCULATION (DIAS SEGUIDOS / OFENSIVA COM SUPORTE A FALTA JUSTIFICADA)
    // =========================================================================
    let streak = 0;

    // Set of dates where workouts/cardios were completed
    const doneDatesSet = new Set(
      checkins.map(c => new Date(c.date).toDateString())
    );

    // Set of dates where an absence was justified
    const justifiedDatesSet = new Set(
      (justifiedAbsences || []).map(a => new Date(a.date).toDateString())
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStr = today.toDateString();
    const trainedToday = doneDatesSet.has(todayStr);
    const justifiedToday = justifiedDatesSet.has(todayStr);

    // Determine whether to start evaluation from today or yesterday
    let currentEvalDate = new Date(today);
    
    if (trainedToday) {
      streak++;
      currentEvalDate.setDate(currentEvalDate.getDate() - 1);
    } else if (justifiedToday) {
      currentEvalDate.setDate(currentEvalDate.getDate() - 1);
    } else {
      // Check if today was a scheduled day. If not trained yet today, we check from yesterday
      currentEvalDate.setDate(currentEvalDate.getDate() - 1);
    }

    // Step backwards through past days (up to 365 days)
    for (let i = 0; i < 365; i++) {
      const evalDateStr = currentEvalDate.toDateString();
      const dayOfWeek = currentEvalDate.getDay(); // 0 = Domingo, 1 = Segunda, ...

      const scheduleEntry = weeklySchedule?.[dayOfWeek] || { type: 'rest' };
      const isScheduledWorkoutDay = Boolean(
        scheduleEntry.hasWorkout || 
        scheduleEntry.hasCardio || 
        scheduleEntry.type === 'workout' || 
        scheduleEntry.type === 'cardio' || 
        scheduleEntry.type === 'both'
      );

      const didTrain = doneDatesSet.has(evalDateStr);
      const wasJustified = justifiedDatesSet.has(evalDateStr);

      if (didTrain) {
        streak++;
      } else if (wasJustified) {
        // Justified absence preserves the streak counter
      } else if (isScheduledWorkoutDay) {
        // Scheduled workout day missed without justified absence -> Streak is broken / reset to 0!
        break;
      } else {
        // Scheduled rest day: preserves streak without requiring workout
      }

      currentEvalDate.setDate(currentEvalDate.getDate() - 1);
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
  }, [checkins, weeklySchedule, justifiedAbsences]);

  return stats;
}

export default useFrequencyStats;
