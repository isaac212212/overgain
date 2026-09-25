import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { generateId, storage } from '../utils/storage';
import { DEFAULT_WEEKLY_SCHEDULE } from '../utils/initialData';
import { 
  fetchCloudGroups, 
  syncGroupsToCloud,
  syncGroupToCloud, 
  deleteCloudGroup, 
  fetchCloudCheckins, 
  syncCheckinsToCloud,
  syncCheckinToCloud, 
  fetchCloudRoutines, 
  syncRoutinesToCloud, 
  fetchCloudCardioRoutines, 
  syncCardioRoutinesToCloud, 
  fetchCloudSchedule, 
  syncScheduleToCloud, 
  fetchCloudMessages, 
  syncMessagesToCloud,
  fetchCloudAbsences,
  syncAbsencesToCloud,
  isCloudEnabled,
  supabase 
} from '../lib/supabase';
import { showToast } from './ToastContext';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || null;

  // ---- USER DATA STATES (SINGLE SOURCE OF TRUTH: SUPABASE CLOUD) ----
  const [routines, setRoutines] = useState([]);
  const [cardioRoutines, setCardioRoutines] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [weeklySchedule, setWeeklySchedule] = useState(DEFAULT_WEEKLY_SCHEDULE);
  const [activeWorkout, setActiveWorkout] = useState(null);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  // ---- GLOBAL SHARED GROUPS & MESSAGES DATABASE ----
  const [allGroups, setAllGroups] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [justifiedAbsences, setJustifiedAbsences] = useState([]);

  // Queue ref for pending offline syncs
  const isSyncingRef = useRef(false);

  const filterLegacyMockCardios = (cardios) => {
    if (!Array.isArray(cardios)) return [];
    return cardios.filter(c => c && c.id !== 'cardio_natacao' && c.id !== 'cardio_esteira' && c.id !== 'cardio_bike');
  };

  // =========================================================================
  // 1. OFFLINE QUEUE & RETRY ENGINE
  // =========================================================================
  const getOfflineQueue = useCallback(() => {
    return storage.get('offline_sync_queue', []);
  }, []);

  const addToOfflineQueue = useCallback((action) => {
    const current = storage.get('offline_sync_queue', []);
    const updated = [...current, { id: generateId(), timestamp: Date.now(), ...action }];
    storage.set('offline_sync_queue', updated);
    showToast('Salvo em modo offline. Será sincronizado ao reconectar.', 'info', 4000);
  }, []);

  const processOfflineQueue = useCallback(async () => {
    if (isSyncingRef.current) return;
    const queue = storage.get('offline_sync_queue', []);
    if (!queue || queue.length === 0) return;

    isSyncingRef.current = true;
    showToast('Conexão restabelecida! Sincronizando dados pendentes...', 'info', 3000);

    const remaining = [];
    for (const item of queue) {
      try {
        if (item.type === 'checkins' && item.userId) {
          await syncCheckinsToCloud(item.userId, item.payload);
        } else if (item.type === 'routines' && item.userId) {
          await syncRoutinesToCloud(item.userId, item.payload);
        } else if (item.type === 'cardio' && item.userId) {
          await syncCardioRoutinesToCloud(item.userId, item.payload);
        } else if (item.type === 'schedule' && item.userId) {
          await syncScheduleToCloud(item.userId, item.payload);
        } else if (item.type === 'groups') {
          await syncGroupsToCloud(item.payload);
        } else if (item.type === 'absences' && item.userId) {
          await syncAbsencesToCloud(item.userId, item.payload);
        } else if (item.type === 'messages' && item.groupId) {
          await syncMessagesToCloud(item.groupId, item.payload);
        }
      } catch (err) {
        console.error('Falha ao processar item da fila offline:', item, err);
        remaining.push(item);
      }
    }

    storage.set('offline_sync_queue', remaining);
    isSyncingRef.current = false;

    if (remaining.length === 0) {
      showToast('Todos os treinos e dados foram sincronizados na nuvem!', 'success', 4000);
      syncWithCloud();
    }
  }, []);

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOfflineQueue();
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast('Você está sem conexão. Os treinos serão salvos localmente.', 'info', 4000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    if (navigator.onLine) {
      processOfflineQueue();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [processOfflineQueue]);

  // =========================================================================
  // 2. SUPABASE DIRECT CLOUD FETCH (CROSS-DEVICE: PC <-> MOBILE)
  // =========================================================================
  const syncWithCloud = useCallback(async () => {
    if (!navigator.onLine) {
      setIsDataLoading(false);
      return;
    }

    try {
      // 1. Fetch Global Groups from Supabase
      const cloudGroups = await fetchCloudGroups();
      if (Array.isArray(cloudGroups)) {
        setAllGroups(cloudGroups);
      }

      // 2. Fetch User-Specific Data directly from Supabase
      if (user?.id) {
        const [cloudCheckins, cloudRoutines, cloudCardios, cloudSchedule, cloudAbsences] = await Promise.all([
          fetchCloudCheckins(user.id),
          fetchCloudRoutines(user.id),
          fetchCloudCardioRoutines(user.id),
          fetchCloudSchedule(user.id),
          fetchCloudAbsences(user.id)
        ]);

        if (Array.isArray(cloudCheckins)) {
          setCheckins(cloudCheckins);
        }

        if (Array.isArray(cloudRoutines)) {
          setRoutines(cloudRoutines);
        }

        if (Array.isArray(cloudCardios)) {
          setCardioRoutines(filterLegacyMockCardios(cloudCardios));
        }

        if (cloudSchedule && typeof cloudSchedule === 'object' && Object.keys(cloudSchedule).length > 0) {
          setWeeklySchedule(cloudSchedule);
        }

        if (Array.isArray(cloudAbsences)) {
          setJustifiedAbsences(cloudAbsences);
        }
      }
    } catch (err) {
      console.error('Erro ao sincronizar com o Supabase:', err);
    } finally {
      setIsDataLoading(false);
    }
  }, [user?.id]);

  // Load from Supabase on mount and whenever user switches
  useEffect(() => {
    if (user?.id) {
      setIsDataLoading(true);
      syncWithCloud();
    } else {
      setRoutines([]);
      setCardioRoutines([]);
      setCheckins([]);
      setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
      setActiveWorkout(null);
      setJustifiedAbsences([]);
      setIsDataLoading(false);
    }
  }, [user?.id, syncWithCloud]);

  // Periodic automatic sync every 15 seconds to ensure PC <-> Mobile alignment
  useEffect(() => {
    const interval = setInterval(() => {
      syncWithCloud();
    }, 15000);

    const onFocus = () => syncWithCloud();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncWithCloud]);

  // =========================================================================
  // 3. ROUTINES ACTIONS (WITH REORDERING & DIRECT CLOUD / OFFLINE PERSISTENCE)
  // =========================================================================
  const addRoutine = useCallback(async (routine) => {
    const newRoutine = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...routine,
      exercises: routine.exercises || []
    };

    const updated = [...routines, newRoutine];
    setRoutines(updated);

    if (user?.id) {
      if (navigator.onLine) {
        const res = await syncRoutinesToCloud(user.id, updated);
        if (!res) {
          addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
        }
      } else {
        addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
      }
    }
    return newRoutine;
  }, [routines, user?.id, addToOfflineQueue]);

  const updateRoutine = useCallback(async (id, updates) => {
    const updated = routines.map(r => r.id === id ? { ...r, ...updates } : r);
    setRoutines(updated);

    if (user?.id) {
      if (navigator.onLine) {
        const res = await syncRoutinesToCloud(user.id, updated);
        if (!res) {
          addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
        }
      } else {
        addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
      }
    }
    return updated;
  }, [routines, user?.id, addToOfflineQueue]);

  const deleteRoutine = useCallback(async (id) => {
    const updated = routines.filter(r => r.id !== id);
    setRoutines(updated);

    if (user?.id) {
      if (navigator.onLine) {
        const res = await syncRoutinesToCloud(user.id, updated);
        if (!res) {
          addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
        }
      } else {
        addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
      }
    }
    return updated;
  }, [routines, user?.id, addToOfflineQueue]);

  const duplicateRoutine = useCallback(async (id) => {
    const original = routines.find(r => r.id === id);
    if (!original) return routines;
    const copy = {
      ...original,
      id: generateId(),
      name: `${original.name} (Cópia)`,
      createdAt: new Date().toISOString()
    };
    const updated = [...routines, copy];
    setRoutines(updated);

    if (user?.id) {
      if (navigator.onLine) {
        await syncRoutinesToCloud(user.id, updated);
      } else {
        addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
      }
    }
    return updated;
  }, [routines, user?.id, addToOfflineQueue]);

  // Reorder exercises inside a saved routine
  const reorderRoutineExercises = useCallback(async (routineId, newExercises) => {
    const updated = routines.map(r => r.id === routineId ? { ...r, exercises: newExercises } : r);
    setRoutines(updated);
    if (user?.id) {
      if (navigator.onLine) {
        await syncRoutinesToCloud(user.id, updated);
      } else {
        addToOfflineQueue({ type: 'routines', userId: user.id, payload: updated });
      }
    }
  }, [routines, user?.id, addToOfflineQueue]);

  // ---- CARDIO ROUTINES ACTIONS ----
  const addCardioRoutine = useCallback(async (routine) => {
    const newRoutine = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      name: routine.name || 'Nova Rotina de Cardio',
      modality: routine.modality || routine.name || 'Esteira (Caminhada / Corrida)',
      targetDuration: Number(routine.targetDuration) || 30,
      targetDistance: Number(routine.targetDistance) || 0,
      targetCalories: Number(routine.targetCalories) || 0,
      notes: routine.notes || '',
      scheduledDay: routine.scheduledDay !== undefined && routine.scheduledDay !== '' && routine.scheduledDay !== null ? Number(routine.scheduledDay) : null,
      ...routine
    };

    const updated = [...cardioRoutines, newRoutine];
    setCardioRoutines(updated);

    if (user?.id) {
      if (navigator.onLine) {
        await syncCardioRoutinesToCloud(user.id, updated);
      } else {
        addToOfflineQueue({ type: 'cardio', userId: user.id, payload: updated });
      }
    }

    if (newRoutine.scheduledDay !== null && newRoutine.scheduledDay !== undefined) {
      const existing = weeklySchedule[newRoutine.scheduledDay] || { type: 'rest', label: 'Descanso' };
      const hasW = Boolean(existing.hasWorkout || existing.type === 'workout' || existing.type === 'both');
      const wLabel = existing.workoutLabel || (hasW ? existing.label : '');
      const updatedSched = {
        ...weeklySchedule,
        [newRoutine.scheduledDay]: {
          ...existing,
          hasCardio: true,
          cardioLabel: newRoutine.name,
          cardioRoutineId: newRoutine.id,
          cardioDetails: {
            modality: newRoutine.modality,
            duration: newRoutine.targetDuration,
            distance: newRoutine.targetDistance,
            calories: newRoutine.targetCalories,
            notes: newRoutine.notes
          },
          type: hasW ? 'both' : 'cardio',
          label: hasW ? `${wLabel} + Cardio: ${newRoutine.name}` : `Cardio: ${newRoutine.name}`
        }
      };
      setWeeklySchedule(updatedSched);
      if (user?.id) {
        if (navigator.onLine) {
          await syncScheduleToCloud(user.id, updatedSched);
        } else {
          addToOfflineQueue({ type: 'schedule', userId: user.id, payload: updatedSched });
        }
      }
    }

    return newRoutine;
  }, [cardioRoutines, weeklySchedule, user?.id, addToOfflineQueue]);

  const updateCardioRoutine = useCallback(async (id, updates) => {
    const updated = cardioRoutines.map(c => c.id === id ? { ...c, ...updates } : c);
    setCardioRoutines(updated);

    if (user?.id) {
      if (navigator.onLine) {
        await syncCardioRoutinesToCloud(user.id, updated);
      } else {
        addToOfflineQueue({ type: 'cardio', userId: user.id, payload: updated });
      }
    }
    return updated;
  }, [cardioRoutines, user?.id, addToOfflineQueue]);

  const deleteCardioRoutine = useCallback(async (id) => {
    const updated = cardioRoutines.filter(c => c.id !== id);
    setCardioRoutines(updated);

    if (user?.id) {
      if (navigator.onLine) {
        await syncCardioRoutinesToCloud(user.id, updated);
      } else {
        addToOfflineQueue({ type: 'cardio', userId: user.id, payload: updated });
      }
    }
    return updated;
  }, [cardioRoutines, user?.id, addToOfflineQueue]);

  // =========================================================================
  // 4. ACTIVE WORKOUT SESSION & FINISH WITH OFFLINE SUPPORT
  // =========================================================================
  const startActiveWorkout = useCallback((routine) => {
    const findPreviousSets = (exerciseName) => {
      for (const checkin of checkins) {
        const match = checkin.exercises?.find(ex => ex.name === exerciseName);
        if (match && match.sets?.length > 0) {
          return match.sets;
        }
      }
      return null;
    };

    const exercises = (routine?.exercises || []).map(ex => {
      const prevSets = findPreviousSets(ex.name);

      return {
        ...ex,
        notes: ex.notes || '',
        sets: (ex.sets || []).map((s, idx) => {
          const prevSet = prevSets?.[idx];
          const prevWeight = prevSet?.weight ?? s.weight ?? 0;
          const prevReps = prevSet?.reps ?? s.reps ?? 0;

          return {
            setNumber: idx + 1,
            weight: 0,
            reps: 0,
            completed: false,
            previousWeight: prevWeight,
            previousReps: prevReps,
            previous: (prevWeight > 0 || prevReps > 0) ? `${prevWeight}kg x ${prevReps}` : '—'
          };
        })
      };
    });

    if (exercises.length === 0) {
      exercises.push({
        id: generateId(),
        muscleGroup: 'Geral',
        name: 'Exercício 1',
        notes: '',
        sets: [
          { setNumber: 1, weight: 0, reps: 0, completed: false, previousWeight: 0, previousReps: 0, previous: '—' }
        ]
      });
    }

    const session = {
      id: generateId(),
      routineId: routine?.id || 'free_workout',
      routineName: routine?.name || 'Treino Livre',
      startTime: Date.now(),
      exercises
    };

    setActiveWorkout(session);
    return session;
  }, [checkins]);

  const updateActiveWorkout = useCallback((updates) => {
    setActiveWorkout(prev => prev ? { ...prev, ...updates } : prev);
  }, []);

  const cancelActiveWorkout = useCallback(() => {
    setActiveWorkout(null);
  }, []);

  const finishActiveWorkout = useCallback(async ({ 
    photoUrl, 
    notes, 
    title, 
    shareToGroup = true, 
    isPublic = true, 
    showWeights = true 
  } = {}) => {
    if (!activeWorkout) return null;

    const durationSeconds = Math.max(1, Math.round((Date.now() - activeWorkout.startTime) / 1000));
    const durationMinutes = Math.max(1, Math.round(durationSeconds / 60));

    let totalVolume = 0;
    let completedSetsCount = 0;
    let completedRepsCount = 0;
    const muscleStats = {};

    activeWorkout.exercises.forEach(ex => {
      const muscle = ex.muscleGroup || 'Geral';
      if (!muscleStats[muscle]) {
        muscleStats[muscle] = { volume: 0, reps: 0, sets: 0 };
      }

      ex.sets.forEach(s => {
        if (s.completed) {
          const w = Number(s.weight) || 0;
          const r = Number(s.reps) || 0;
          totalVolume += w * r;
          completedSetsCount++;
          completedRepsCount += r;
          muscleStats[muscle].volume += w * r;
          muscleStats[muscle].reps += r;
          muscleStats[muscle].sets += 1;
        }
      });
    });

    const checkinData = {
      id: generateId(),
      type: 'workout',
      date: new Date().toISOString(),
      routineId: activeWorkout.routineId,
      routineName: activeWorkout.routineName,
      title: title || activeWorkout.routineName,
      durationMinutes,
      totalVolumeKg: totalVolume,
      totalSets: completedSetsCount,
      totalReps: completedRepsCount,
      muscleStats,
      photoUrl: photoUrl || null,
      notes: notes || 'Treino concluído com sucesso!',
      userId: user?.id,
      userName: user?.name || 'Atleta',
      userAvatar: user?.avatar,
      isPublic,
      showWeights,
      exercises: activeWorkout.exercises.map(ex => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        notes: ex.notes,
        sets: ex.sets.map(s => ({ weight: s.weight, reps: s.reps, completed: s.completed }))
      }))
    };

    const updatedCheckins = [checkinData, ...checkins];
    setCheckins(updatedCheckins);

    if (user?.id) {
      if (navigator.onLine) {
        const res = await syncCheckinsToCloud(user.id, updatedCheckins);
        if (!res) {
          addToOfflineQueue({ type: 'checkins', userId: user.id, payload: updatedCheckins });
        }
      } else {
        addToOfflineQueue({ type: 'checkins', userId: user.id, payload: updatedCheckins });
      }
    }

    // Update routine notes if routine exists
    if (activeWorkout.routineId && activeWorkout.routineId !== 'free_workout') {
      const updatedRoutines = routines.map(r => {
        if (r.id === activeWorkout.routineId) {
          const updatedExercises = r.exercises.map(origEx => {
            const executedEx = activeWorkout.exercises.find(e => e.name === origEx.name);
            return executedEx ? { ...origEx, notes: executedEx.notes } : origEx;
          });
          return { ...r, exercises: updatedExercises };
        }
        return r;
      });
      setRoutines(updatedRoutines);
      if (user?.id) {
        if (navigator.onLine) {
          await syncRoutinesToCloud(user.id, updatedRoutines);
        } else {
          addToOfflineQueue({ type: 'routines', userId: user.id, payload: updatedRoutines });
        }
      }
    }

    // Auto post to user's joined groups feed if enabled
    if (shareToGroup) {
      const updatedGroups = allGroups.map(g => {
        const isMember = g.members?.some(m => m.id === user?.id);
        if (isMember) {
          const feedItem = {
            id: generateId(),
            type: 'workout',
            userId: user?.id,
            userName: user?.name || 'Atleta',
            userAvatar: user?.avatar,
            routineName: activeWorkout.routineName,
            title: title || activeWorkout.routineName,
            date: new Date().toISOString(),
            durationMinutes,
            totalVolumeKg: totalVolume,
            totalSets: completedSetsCount,
            totalReps: completedRepsCount,
            notes: notes || 'Treino finalizado com foco total!',
            photoUrl: checkinData.photoUrl,
            likes: 0,
            likedBy: [],
            isPublic,
            showWeights,
            exercises: checkinData.exercises,
            comments: []
          };
          return { ...g, feed: [feedItem, ...(g.feed || [])] };
        }
        return g;
      });
      setAllGroups(updatedGroups);
      if (navigator.onLine) {
        await syncGroupsToCloud(updatedGroups);
      } else {
        addToOfflineQueue({ type: 'groups', payload: updatedGroups });
      }
    }

    setActiveWorkout(null);
    showToast('Treino concluído e salvo com sucesso!', 'success');
    return checkinData;
  }, [activeWorkout, user, checkins, routines, allGroups, addToOfflineQueue]);

  // Log standalone or complementary Cardio
  const logCardio = useCallback(async ({
    date,
    durationMinutes = 30,
    cardioType = 'Corrida',
    distanceKm = 0,
    calories = 0,
    notes = '',
    photoUrl = null,
    shareToGroup = true
  }) => {
    const checkinData = {
      id: generateId(),
      type: 'cardio',
      isCardio: true,
      date: date || new Date().toISOString(),
      routineName: `Cardio: ${cardioType}`,
      title: `Cardio (${cardioType})`,
      durationMinutes: Number(durationMinutes) || 30,
      cardioType,
      distanceKm: Number(distanceKm) || 0,
      calories: Number(calories) || 0,
      totalVolumeKg: 0,
      totalSets: 0,
      totalReps: 0,
      muscleStats: {},
      photoUrl: photoUrl || null,
      notes: notes || 'Cardio finalizado com sucesso!',
      userId: user?.id,
      userName: user?.name || 'Atleta',
      userAvatar: user?.avatar,
      isPublic: true,
      showWeights: false,
      exercises: []
    };

    const updatedCheckins = [checkinData, ...checkins];
    setCheckins(updatedCheckins);

    if (user?.id) {
      if (navigator.onLine) {
        await syncCheckinsToCloud(user.id, updatedCheckins);
      } else {
        addToOfflineQueue({ type: 'checkins', userId: user.id, payload: updatedCheckins });
      }
    }

    if (shareToGroup) {
      const updatedGroups = allGroups.map(g => {
        const isMember = g.members?.some(m => m.id === user?.id);
        if (isMember) {
          const feedItem = {
            id: generateId(),
            type: 'cardio',
            userId: user?.id,
            userName: user?.name || 'Atleta',
            userAvatar: user?.avatar,
            routineName: `Cardio: ${cardioType}`,
            title: `Cardio Finalizado (${cardioType})`,
            date: new Date().toISOString(),
            durationMinutes: Number(durationMinutes) || 30,
            distanceKm: Number(distanceKm) || 0,
            calories: Number(calories) || 0,
            notes: notes || 'Sessão de cardio concluída!',
            photoUrl: checkinData.photoUrl,
            likes: 0,
            likedBy: [],
            comments: []
          };
          return { ...g, feed: [feedItem, ...(g.feed || [])] };
        }
        return g;
      });
      setAllGroups(updatedGroups);
      if (navigator.onLine) {
        await syncGroupsToCloud(updatedGroups);
      } else {
        addToOfflineQueue({ type: 'groups', payload: updatedGroups });
      }
    }

    showToast('Cardio salvo com sucesso!', 'success');
    return checkinData;
  }, [user, checkins, allGroups, addToOfflineQueue]);

  // Add Justified Absence
  const addJustifiedAbsence = useCallback(async ({ date, reason, action, newDate, routineName }) => {
    const absenceItem = {
      id: generateId(),
      date: date || new Date().toISOString(),
      reason: reason || 'Imprevisto',
      action: action || 'cancelado',
      newDate: newDate || null,
      routineName: routineName || 'Treino do dia',
      userId: user?.id,
      userName: user?.name || 'Atleta'
    };

    const updatedAbsences = [absenceItem, ...justifiedAbsences];
    setJustifiedAbsences(updatedAbsences);

    if (user?.id) {
      if (navigator.onLine) {
        await syncAbsencesToCloud(user.id, updatedAbsences);
      } else {
        addToOfflineQueue({ type: 'absences', userId: user.id, payload: updatedAbsences });
      }
    }

    const updatedGroups = allGroups.map(g => {
      const isMember = g.members?.some(m => m.id === user?.id);
      if (isMember) {
        const feedItem = {
          id: generateId(),
          type: 'justified_absence',
          userId: user?.id,
          userName: user?.name || 'Atleta',
          userAvatar: user?.avatar,
          title: `Falta Justificada: ${absenceItem.routineName}`,
          reason: absenceItem.reason,
          action: absenceItem.action,
          newDate: absenceItem.newDate,
          date: new Date().toISOString(),
          notes: absenceItem.action === 'adiado'
            ? `Treino adiado para ${absenceItem.newDate ? new Date(absenceItem.newDate).toLocaleDateString('pt-BR') : 'outra data'} (Motivo: ${absenceItem.reason})`
            : `Treino de hoje cancelado (Motivo: ${absenceItem.reason})`,
          likes: 0,
          likedBy: [],
          comments: []
        };
        return { ...g, feed: [feedItem, ...(g.feed || [])] };
      }
      return g;
    });

    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }

    showToast('Falta justificada registrada. Seu streak está protegido!', 'success');
    return absenceItem;
  }, [user, justifiedAbsences, allGroups, addToOfflineQueue]);

  // ---- CHECK-INS ----
  const addCheckin = useCallback(async (checkin) => {
    const newCheckin = {
      id: generateId(),
      date: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name,
      userAvatar: user?.avatar,
      ...checkin
    };

    const updated = [newCheckin, ...checkins];
    setCheckins(updated);
    if (user?.id) {
      if (navigator.onLine) {
        await syncCheckinsToCloud(user.id, updated);
      } else {
        addToOfflineQueue({ type: 'checkins', userId: user.id, payload: updated });
      }
    }
    return newCheckin;
  }, [user, checkins, addToOfflineQueue]);

  const deleteCheckin = useCallback(async (id) => {
    const updated = checkins.filter(c => c.id !== id);
    setCheckins(updated);
    if (user?.id) {
      if (navigator.onLine) {
        await syncCheckinsToCloud(user.id, updated);
      } else {
        addToOfflineQueue({ type: 'checkins', userId: user.id, payload: updated });
      }
    }
    return updated;
  }, [user?.id, checkins, addToOfflineQueue]);

  // =========================================================================
  // 5. GROUPS SYSTEM & MANAGEMENT (PERMISSIONS, LEAVE, DELETE, PROMOTE, KICK)
  // =========================================================================
  const createGroup = useCallback(async (groupData) => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let inviteCode = '';
    for (let i = 0; i < 6; i++) {
      inviteCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const creatorMember = {
      id: user?.id || 'usr_' + Date.now(),
      name: user?.name || 'Atleta',
      username: user?.username || 'atleta',
      avatar: user?.avatar || null,
      role: 'admin',
      isCreator: true,
      weeklyGoal: user?.weeklyGoal || 4,
      weeklyCheckins: 0,
      streak: 0,
      joinedAt: new Date().toISOString()
    };

    const newGroup = {
      ...groupData,
      id: 'grp_' + generateId(),
      name: groupData.name.trim(),
      description: groupData.description?.trim() || 'Comunidade de treinos Overgain',
      photoUrl: groupData.photoUrl || null,
      category: groupData.category || 'Geral',
      isPrivate: groupData.isPrivate || false,
      pin: groupData.pin || null,
      inviteCode: groupData.inviteCode || inviteCode,
      createdBy: user?.id,
      createdAt: new Date().toISOString(),
      members: groupData.members && groupData.members.length > 0 ? groupData.members : [creatorMember],
      feed: groupData.feed || []
    };

    const updatedGroups = [newGroup, ...allGroups.filter(g => g.id !== newGroup.id)];
    setAllGroups(updatedGroups);

    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }

    showToast(`Grupo "${newGroup.name}" criado com sucesso!`, 'success');
    return newGroup;
  }, [user, allGroups, addToOfflineQueue]);

  const joinGroup = useCallback(async (rawInput, memberProfile, pin) => {
    if (!rawInput) return { success: false, error: 'Código de convite inválido.' };

    let cleaned = String(rawInput).trim();
    if (cleaned.includes('join=')) {
      cleaned = cleaned.split('join=')[1].split('&')[0];
    } else if (cleaned.includes('/groups/')) {
      cleaned = cleaned.split('/groups/')[1].split('?')[0].split('/')[0];
    }

    const normalizedCode = cleaned.replace(/^OG[-_]/i, '').replace(/[\s-]/g, '').toUpperCase();

    const newMember = memberProfile || {
      id: user?.id || 'usr_' + Date.now(),
      name: user?.name || 'Atleta',
      username: user?.username || 'atleta',
      avatar: user?.avatar || null,
      role: 'member',
      weeklyGoal: user?.weeklyGoal || 4,
      weeklyCheckins: 0,
      streak: 0,
      joinedAt: new Date().toISOString()
    };

    const cloudGroups = navigator.onLine ? await fetchCloudGroups() : allGroups;
    const currentGroups = (cloudGroups && cloudGroups.length > 0) ? cloudGroups : allGroups;

    let targetGroup = currentGroups.find(g => {
      const gCode = (g.inviteCode || '').toUpperCase();
      const gId = (g.id || '').toUpperCase();
      return gCode === normalizedCode || gId === normalizedCode || gCode === cleaned.toUpperCase() || g.id === cleaned;
    });

    if (!targetGroup) {
      return { success: false, error: 'Grupo não encontrado. Verifique o código com o criador!' };
    }

    if (targetGroup.pin && targetGroup.pin !== pin) {
      return { success: false, error: 'PIN de acesso incorreto para este grupo.' };
    }

    const updatedGroups = currentGroups.map(g => {
      if (g.id === targetGroup.id || g.inviteCode === targetGroup.inviteCode) {
        const memberExists = (g.members || []).some(m => m.id === newMember.id);
        if (!memberExists) {
          return { ...g, members: [...(g.members || []), newMember] };
        }
      }
      return g;
    });

    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }

    showToast(`Você entrou no grupo "${targetGroup.name}"!`, 'success');
    return { success: true, group: targetGroup };
  }, [user, allGroups, addToOfflineQueue]);

  // Leave group (Membro sai do grupo)
  const leaveGroup = useCallback(async (groupId) => {
    if (!user?.id) return;
    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        return {
          ...g,
          members: (g.members || []).filter(m => m.id !== user.id)
        };
      }
      return g;
    });
    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    showToast('Você saiu do grupo.', 'info');
  }, [user?.id, allGroups, addToOfflineQueue]);

  // Delete group permanently (Criador exclui o grupo)
  const deleteGroup = useCallback(async (groupId) => {
    const updatedGroups = allGroups.filter(g => g.id !== groupId);
    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    showToast('Grupo excluído definitivamente.', 'info');
  }, [allGroups, addToOfflineQueue]);

  // Promote Member to Admin
  const promoteMember = useCallback(async (groupId, memberId) => {
    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        const updatedMembers = (g.members || []).map(m => m.id === memberId ? { ...m, role: 'admin' } : m);
        return { ...g, members: updatedMembers };
      }
      return g;
    });
    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    showToast('Membro promovido a Administrador!', 'success');
  }, [allGroups, addToOfflineQueue]);

  // Demote Member to regular Member
  const demoteMember = useCallback(async (groupId, memberId) => {
    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        const updatedMembers = (g.members || []).map(m => m.id === memberId ? { ...m, role: 'member' } : m);
        return { ...g, members: updatedMembers };
      }
      return g;
    });
    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    showToast('Administrador rebaixado a membro.', 'info');
  }, [allGroups, addToOfflineQueue]);

  // Kick / Remove Member from Group
  const kickMember = useCallback(async (groupId, memberId) => {
    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        const updatedMembers = (g.members || []).filter(m => m.id !== memberId);
        return { ...g, members: updatedMembers };
      }
      return g;
    });
    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    showToast('Membro removido do grupo.', 'info');
  }, [allGroups, addToOfflineQueue]);

  // Transfer Ownership of Group
  const transferGroupOwnership = useCallback(async (groupId, newOwnerId) => {
    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        const updatedMembers = (g.members || []).map(m => {
          if (m.id === newOwnerId) return { ...m, role: 'admin', isCreator: true };
          if (m.id === user?.id) return { ...m, role: 'admin', isCreator: false };
          return m;
        });
        return {
          ...g,
          createdBy: newOwnerId,
          members: updatedMembers
        };
      }
      return g;
    });
    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    showToast('Posse do grupo transferida com sucesso!', 'success');
  }, [user?.id, allGroups, addToOfflineQueue]);

  // =========================================================================
  // 6. FEED COMMENTS & LIKES (WITH DIRECT CLOUD PERSISTENCE)
  // =========================================================================
  const addGroupFeedItem = useCallback(async (groupId, feedItem) => {
    const item = {
      id: generateId(),
      date: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name || 'Atleta',
      userAvatar: user?.avatar,
      likes: 0,
      likedBy: [],
      comments: [],
      ...feedItem
    };

    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        return { ...g, feed: [item, ...(g.feed || [])] };
      }
      return g;
    });

    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    return item;
  }, [user, allGroups, addToOfflineQueue]);

  const toggleFeedPostLike = useCallback(async (groupId, postId) => {
    if (!user?.id) return;
    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        const updatedFeed = (g.feed || []).map(post => {
          if (post.id === postId) {
            const likedBy = post.likedBy || [];
            const alreadyLiked = likedBy.includes(user.id);
            const newLikedBy = alreadyLiked
              ? likedBy.filter(id => id !== user.id)
              : [...likedBy, user.id];
            return {
              ...post,
              likes: newLikedBy.length,
              likedBy: newLikedBy
            };
          }
          return post;
        });
        return { ...g, feed: updatedFeed };
      }
      return g;
    });

    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
  }, [user?.id, allGroups, addToOfflineQueue]);

  const addFeedPostComment = useCallback(async (groupId, postId, commentText) => {
    if (!commentText || !commentText.trim() || !user?.id) return;
    const comment = {
      id: generateId(),
      userId: user.id,
      userName: user.name || 'Atleta',
      userAvatar: user.avatar,
      text: commentText.trim(),
      date: new Date().toISOString()
    };

    const updatedGroups = allGroups.map(g => {
      if (g.id === groupId) {
        const updatedFeed = (g.feed || []).map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), comment]
            };
          }
          return post;
        });
        return { ...g, feed: updatedFeed };
      }
      return g;
    });

    setAllGroups(updatedGroups);
    if (navigator.onLine) {
      await syncGroupsToCloud(updatedGroups);
    } else {
      addToOfflineQueue({ type: 'groups', payload: updatedGroups });
    }
    showToast('Comentário publicado!', 'success');
  }, [user, allGroups, addToOfflineQueue]);

  // ---- MESSAGES SYSTEM ----
  const sendMessage = useCallback(async (groupId, messageData) => {
    const newMessage = {
      id: generateId(),
      groupId,
      userId: user?.id,
      userName: user?.name || 'Atleta',
      userAvatar: user?.avatar,
      timestamp: new Date().toISOString(),
      ...messageData
    };

    const currentGroupMsgs = allMessages.filter(m => m.groupId === groupId);
    const updatedGroupMsgs = [...currentGroupMsgs, newMessage];

    setAllMessages(prev => [...prev.filter(m => m.groupId !== groupId), ...updatedGroupMsgs]);

    if (navigator.onLine) {
      await syncMessagesToCloud(groupId, updatedGroupMsgs);
    } else {
      addToOfflineQueue({ type: 'messages', groupId, payload: updatedGroupMsgs });
    }
    return newMessage;
  }, [user, allMessages, addToOfflineQueue]);

  const getGroupMessages = useCallback((groupId) => {
    return allMessages.filter(m => m.groupId === groupId);
  }, [allMessages]);

  // ---- SCHEDULE ----
  const updateWeeklySchedule = useCallback(async (newSchedule) => {
    setWeeklySchedule(newSchedule);
    if (user?.id) {
      if (navigator.onLine) {
        await syncScheduleToCloud(user.id, newSchedule);
      } else {
        addToOfflineQueue({ type: 'schedule', userId: user.id, payload: newSchedule });
      }
    }
  }, [user?.id, addToOfflineQueue]);

  // Filter groups user is currently a member of
  const myGroups = allGroups.filter(g => g.members?.some(m => m.id === user?.id));

  return (
    <DataContext.Provider value={{
      routines,
      cardioRoutines,
      checkins,
      groups: myGroups,
      allGroups,
      messages: allMessages,
      weeklySchedule,
      activeWorkout,
      justifiedAbsences,
      isDataLoading,
      isOnline,
      addRoutine,
      updateRoutine,
      deleteRoutine,
      duplicateRoutine,
      reorderRoutineExercises,
      addCardioRoutine,
      updateCardioRoutine,
      deleteCardioRoutine,
      startActiveWorkout,
      updateActiveWorkout,
      cancelActiveWorkout,
      finishActiveWorkout,
      logCardio,
      addJustifiedAbsence,
      updateWeeklySchedule,
      addCheckin,
      deleteCheckin,
      createGroup,
      joinGroup,
      leaveGroup,
      deleteGroup,
      promoteMember,
      demoteMember,
      kickMember,
      transferGroupOwnership,
      addGroupFeedItem,
      toggleFeedPostLike,
      addFeedPostComment,
      sendMessage,
      getGroupMessages,
      syncWithCloud,
      processOfflineQueue
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
