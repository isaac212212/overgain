import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { storage, generateId } from '../utils/storage';
import { DEFAULT_WEEKLY_SCHEDULE } from '../utils/initialData';
import { 
  fetchCloudGroups, 
  syncGroupToCloud, 
  deleteCloudGroup, 
  fetchCloudCheckins, 
  syncCheckinToCloud, 
  fetchCloudRoutines, 
  syncRoutinesToCloud, 
  fetchCloudCardioRoutines, 
  syncCardioRoutinesToCloud, 
  fetchCloudSchedule, 
  syncScheduleToCloud, 
  fetchCloudMessages, 
  syncMessagesToCloud,
  isCloudEnabled,
  supabase 
} from '../lib/supabase';

const DataContext = createContext();

export function DataProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id || 'guest';

  // ---- PER-USER DATA ----
  const [routines, setRoutines] = useState(() => {
    return user?.id ? storage.get(`routines_${user.id}`, []) : [];
  });

  const [checkins, setCheckins] = useState(() => {
    return user?.id ? storage.get(`checkins_${user.id}`, []) : [];
  });

  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    return user?.id ? storage.get(`schedule_${user.id}`, DEFAULT_WEEKLY_SCHEDULE) : DEFAULT_WEEKLY_SCHEDULE;
  });

  const filterLegacyMockCardios = (cardios) => {
    if (!Array.isArray(cardios)) return [];
    return cardios.filter(c => c.id !== 'cardio_natacao' && c.id !== 'cardio_esteira' && c.id !== 'cardio_bike');
  };

  const [cardioRoutines, setCardioRoutines] = useState(() => {
    const stored = user?.id ? storage.get(`cardioRoutines_${user.id}`, []) : [];
    return filterLegacyMockCardios(stored);
  });

  const [activeWorkout, setActiveWorkout] = useState(() => {
    return user?.id ? storage.get(`activeWorkout_${user.id}`, null) : null;
  });

  // ---- GLOBAL SHARED GROUPS & MESSAGES DATABASE ----
  const [allGroups, setAllGroups] = useState(() => storage.get('groups_db', []));
  const [allMessages, setAllMessages] = useState(() => storage.get('messages_db', []));
  const [justifiedAbsences, setJustifiedAbsences] = useState(() => storage.get('absences_db', []));

  // Reload user-specific data from local cache whenever active user switches
  useEffect(() => {
    if (user?.id) {
      setRoutines(storage.get(`routines_${user.id}`, []));
      setCardioRoutines(filterLegacyMockCardios(storage.get(`cardioRoutines_${user.id}`, [])));
      setCheckins(storage.get(`checkins_${user.id}`, []));
      setWeeklySchedule(storage.get(`schedule_${user.id}`, DEFAULT_WEEKLY_SCHEDULE));
      setActiveWorkout(storage.get(`activeWorkout_${user.id}`, null));
    } else {
      setRoutines([]);
      setCardioRoutines([]);
      setCheckins([]);
      setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
      setActiveWorkout(null);
    }
  }, [user?.id]);

  // Persist user-specific data on local changes
  useEffect(() => {
    if (user?.id) {
      storage.set(`routines_${user.id}`, routines);
    }
  }, [routines, user?.id]);

  useEffect(() => {
    if (user?.id) {
      storage.set(`cardioRoutines_${user.id}`, cardioRoutines);
    }
  }, [cardioRoutines, user?.id]);

  useEffect(() => {
    if (user?.id) {
      storage.set(`checkins_${user.id}`, checkins);
    }
  }, [checkins, user?.id]);

  useEffect(() => {
    if (user?.id) {
      storage.set(`schedule_${user.id}`, weeklySchedule);
    }
  }, [weeklySchedule, user?.id]);

  useEffect(() => {
    if (user?.id) {
      if (activeWorkout) {
        storage.set(`activeWorkout_${user.id}`, activeWorkout);
      } else {
        storage.remove(`activeWorkout_${user.id}`);
      }
    }
  }, [activeWorkout, user?.id]);

  // Persist global groups & messages on changes
  useEffect(() => {
    storage.set('groups_db', allGroups);
  }, [allGroups]);

  useEffect(() => {
    storage.set('messages_db', allMessages);
  }, [allMessages]);

  useEffect(() => {
    storage.set('absences_db', justifiedAbsences);
  }, [justifiedAbsences]);

  // =========================================================================
  // SUPABASE 2-WAY CLOUD SYNC ENGINE (CROSS-DEVICE: PC <-> MOBILE)
  // =========================================================================
  const syncWithCloud = useCallback(async () => {
    try {
      // 1. Sync Groups
      const cloudGroups = await fetchCloudGroups();
      if (Array.isArray(cloudGroups) && cloudGroups.length > 0) {
        setAllGroups(prev => {
          const map = new Map();
          // First add all cloud groups
          cloudGroups.forEach(g => {
            if (g && g.id) map.set(g.id, g);
          });
          // Then merge local groups that might have new updates
          (prev || []).forEach(localG => {
            if (!map.has(localG.id)) {
              map.set(localG.id, localG);
              // Push local group to cloud
              syncGroupToCloud(localG);
            } else {
              const cg = map.get(localG.id);
              // Merge members
              const memberMap = new Map();
              (cg.members || []).forEach(m => memberMap.set(m.id, m));
              (localG.members || []).forEach(m => memberMap.set(m.id, m));
              // Merge feed
              const feedMap = new Map();
              (cg.feed || []).forEach(f => feedMap.set(f.id, f));
              (localG.feed || []).forEach(f => feedMap.set(f.id, f));
              const mergedFeed = Array.from(feedMap.values()).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

              map.set(localG.id, {
                ...cg,
                ...localG,
                members: Array.from(memberMap.values()),
                feed: mergedFeed
              });
            }
          });
          const result = Array.from(map.values());
          storage.set('groups_db', result);
          return result;
        });
      } else if (allGroups.length > 0) {
        // Push local groups to cloud if cloud was empty
        allGroups.forEach(g => syncGroupToCloud(g));
      }

      // 2. Sync User Specific Data (Checkins, Routines, Cardios, Schedule)
      if (user?.id) {
        const [cloudCheckins, cloudRoutines, cloudCardios, cloudSchedule] = await Promise.all([
          fetchCloudCheckins(user.id),
          fetchCloudRoutines(user.id),
          fetchCloudCardioRoutines(user.id),
          fetchCloudSchedule(user.id)
        ]);

        // Checkins merge
        if (Array.isArray(cloudCheckins) && cloudCheckins.length > 0) {
          setCheckins(prev => {
            const map = new Map();
            cloudCheckins.forEach(c => map.set(c.id, c));
            (prev || []).forEach(c => {
              if (!map.has(c.id)) {
                map.set(c.id, c);
                syncCheckinToCloud(c);
              }
            });
            const merged = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
            storage.set(`checkins_${user.id}`, merged);
            return merged;
          });
        } else if (checkins.length > 0) {
          checkins.forEach(c => syncCheckinToCloud(c));
        }

        // Routines merge
        if (Array.isArray(cloudRoutines) && cloudRoutines.length > 0) {
          setRoutines(prev => {
            if (!prev || prev.length === 0) {
              storage.set(`routines_${user.id}`, cloudRoutines);
              return cloudRoutines;
            }
            return prev;
          });
        } else if (routines.length > 0) {
          syncRoutinesToCloud(user.id, routines);
        }

        // Cardio merge
        if (Array.isArray(cloudCardios) && cloudCardios.length > 0) {
          setCardioRoutines(prev => {
            if (!prev || prev.length === 0) {
              storage.set(`cardioRoutines_${user.id}`, cloudCardios);
              return cloudCardios;
            }
            return prev;
          });
        } else if (cardioRoutines.length > 0) {
          syncCardioRoutinesToCloud(user.id, cardioRoutines);
        }

        // Schedule merge
        if (cloudSchedule && typeof cloudSchedule === 'object' && Object.keys(cloudSchedule).length > 0) {
          setWeeklySchedule(cloudSchedule);
          storage.set(`schedule_${user.id}`, cloudSchedule);
        } else if (weeklySchedule) {
          syncScheduleToCloud(user.id, weeklySchedule);
        }
      }
    } catch (err) {
      console.warn('Cloud sync background error:', err);
    }
  }, [user?.id]);

  // Initial cloud sync on mount & when user logs in
  useEffect(() => {
    syncWithCloud();

    // Periodic sync every 20 seconds to keep devices aligned
    const interval = setInterval(() => {
      syncWithCloud();
    }, 20000);

    // Sync on window focus / tab switch
    const onFocus = () => syncWithCloud();
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncWithCloud]);

  // ---- ROUTINES ACTIONS ----
  const addRoutine = useCallback((routine) => {
    const newRoutine = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...routine,
      exercises: routine.exercises || []
    };
    setRoutines(prev => {
      const updated = [...prev, newRoutine];
      if (user?.id) syncRoutinesToCloud(user.id, updated);
      return updated;
    });
    return newRoutine;
  }, [user?.id]);

  const updateRoutine = useCallback((id, updates) => {
    setRoutines(prev => {
      const updated = prev.map(r => r.id === id ? { ...r, ...updates } : r);
      if (user?.id) syncRoutinesToCloud(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  const deleteRoutine = useCallback((id) => {
    setRoutines(prev => {
      const updated = prev.filter(r => r.id !== id);
      if (user?.id) syncRoutinesToCloud(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  const duplicateRoutine = useCallback((id) => {
    setRoutines(prev => {
      const original = prev.find(r => r.id === id);
      if (!original) return prev;
      const copy = {
        ...original,
        id: generateId(),
        name: `${original.name} (Cópia)`,
        createdAt: new Date().toISOString()
      };
      const updated = [...prev, copy];
      if (user?.id) syncRoutinesToCloud(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  // ---- CARDIO ROUTINES ACTIONS ----
  const addCardioRoutine = useCallback((routine) => {
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
    setCardioRoutines(prev => {
      const updated = [...prev, newRoutine];
      if (user?.id) syncCardioRoutinesToCloud(user.id, updated);
      return updated;
    });

    // If scheduledDay is provided, also sync to weeklySchedule
    if (newRoutine.scheduledDay !== null && newRoutine.scheduledDay !== undefined) {
      setWeeklySchedule(prev => {
        const existing = prev[newRoutine.scheduledDay] || { type: 'rest', label: 'Descanso' };
        const hasW = Boolean(existing.hasWorkout || existing.type === 'workout' || existing.type === 'both');
        const wLabel = existing.workoutLabel || (hasW ? existing.label : '');
        const updatedSched = {
          ...prev,
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
        if (user?.id) syncScheduleToCloud(user.id, updatedSched);
        return updatedSched;
      });
    }

    return newRoutine;
  }, [user?.id]);

  const updateCardioRoutine = useCallback((id, updates) => {
    setCardioRoutines(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, ...updates } : c);
      if (user?.id) syncCardioRoutinesToCloud(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  const deleteCardioRoutine = useCallback((id) => {
    setCardioRoutines(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (user?.id) syncCardioRoutinesToCloud(user.id, updated);
      return updated;
    });
  }, [user?.id]);

  // ---- ACTIVE WORKOUT SESSION ----
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

  const finishActiveWorkout = useCallback(({ 
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

    // Save checkin in user's history and sync to cloud
    setCheckins(prev => [checkinData, ...prev]);
    syncCheckinToCloud(checkinData);

    // Update routine notes if routine exists
    if (activeWorkout.routineId && activeWorkout.routineId !== 'free_workout') {
      setRoutines(prev => {
        const updated = prev.map(r => {
          if (r.id === activeWorkout.routineId) {
            const updatedExercises = r.exercises.map(origEx => {
              const executedEx = activeWorkout.exercises.find(e => e.name === origEx.name);
              return executedEx ? { ...origEx, notes: executedEx.notes } : origEx;
            });
            return { ...r, exercises: updatedExercises };
          }
          return r;
        });
        if (user?.id) syncRoutinesToCloud(user.id, updated);
        return updated;
      });
    }

    // Auto post to user's joined groups feed if enabled and sync group to cloud
    if (shareToGroup) {
      setAllGroups(prev => prev.map(g => {
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
          const updatedG = { ...g, feed: [feedItem, ...(g.feed || [])] };
          syncGroupToCloud(updatedG);
          return updatedG;
        }
        return g;
      }));
    }

    // Clear active workout
    setActiveWorkout(null);
    return checkinData;
  }, [activeWorkout, user]);

  // Log standalone or complementary Cardio
  const logCardio = useCallback(({
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

    setCheckins(prev => [checkinData, ...prev]);
    syncCheckinToCloud(checkinData);

    if (shareToGroup) {
      setAllGroups(prev => prev.map(g => {
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
          const updatedG = { ...g, feed: [feedItem, ...(g.feed || [])] };
          syncGroupToCloud(updatedG);
          return updatedG;
        }
        return g;
      }));
    }

    return checkinData;
  }, [user]);

  // Add Justified Absence (Adiar ou Cancelar Treino)
  const addJustifiedAbsence = useCallback(({ date, reason, action, newDate, routineName }) => {
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
    setJustifiedAbsences(prev => [absenceItem, ...prev]);

    setAllGroups(prev => prev.map(g => {
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
        const updatedG = { ...g, feed: [feedItem, ...(g.feed || [])] };
        syncGroupToCloud(updatedG);
        return updatedG;
      }
      return g;
    }));

    return absenceItem;
  }, [user]);

  // ---- CHECK-INS ----
  const addCheckin = useCallback((checkin) => {
    const newCheckin = {
      id: generateId(),
      date: new Date().toISOString(),
      userId: user?.id,
      userName: user?.name,
      userAvatar: user?.avatar,
      ...checkin
    };
    setCheckins(prev => [newCheckin, ...prev]);
    syncCheckinToCloud(newCheckin);
    return newCheckin;
  }, [user]);

  const deleteCheckin = useCallback((id) => {
    setCheckins(prev => prev.filter(c => c.id !== id));
  }, []);

  // ---- GROUPS SYSTEM ----
  const createGroup = useCallback((groupData) => {
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

    setAllGroups(prev => {
      const exists = prev.some(g => g.id === newGroup.id || (g.inviteCode && g.inviteCode === newGroup.inviteCode));
      return exists ? prev : [newGroup, ...prev];
    });

    // Sync to Supabase Cloud immediately
    syncGroupToCloud(newGroup);

    return newGroup;
  }, [user]);

  const joinGroup = useCallback((rawInput, memberProfile, pin) => {
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

    let targetGroup = allGroups.find(g => {
      const gCode = (g.inviteCode || '').toUpperCase();
      const gId = (g.id || '').toUpperCase();
      return gCode === normalizedCode || gId === normalizedCode || gCode === cleaned.toUpperCase() || g.id === cleaned;
    });

    if (!targetGroup && (cleaned.startsWith('OGP_') || cleaned.startsWith('ogp_'))) {
      try {
        const base64Data = cleaned.slice(4);
        const parsed = JSON.parse(decodeURIComponent(escape(atob(base64Data))));
        if (parsed && parsed.name) {
          targetGroup = {
            id: parsed.id || 'grp_' + generateId(),
            name: parsed.name,
            description: parsed.description || '',
            photoUrl: parsed.photoUrl || null,
            category: parsed.category || 'Geral',
            isPrivate: parsed.isPrivate || false,
            pin: parsed.pin || null,
            inviteCode: parsed.inviteCode || normalizedCode,
            createdBy: parsed.createdBy || 'creator',
            createdAt: parsed.createdAt || new Date().toISOString(),
            members: parsed.members || [],
            feed: parsed.feed || []
          };
          setAllGroups(prev => [targetGroup, ...prev.filter(g => g.id !== targetGroup.id)]);
        }
      } catch (err) {
        console.warn('Failed to parse encoded group payload:', err);
      }
    }

    if (!targetGroup) {
      return { success: false, error: 'Grupo não encontrado. Verifique o código com o criador!' };
    }

    if (targetGroup.pin && targetGroup.pin !== pin) {
      return { success: false, error: 'PIN de acesso incorreto para este grupo.' };
    }

    setAllGroups(prev => prev.map(g => {
      if (g.id === targetGroup.id || g.inviteCode === targetGroup.inviteCode) {
        const memberExists = (g.members || []).some(m => m.id === newMember.id);
        if (!memberExists) {
          const updated = { ...g, members: [...(g.members || []), newMember] };
          syncGroupToCloud(updated);
          return updated;
        }
      }
      return g;
    }));

    return { success: true, group: targetGroup };
  }, [user, allGroups]);

  const leaveGroup = useCallback((groupId) => {
    if (!user?.id) return;
    setAllGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const updated = {
          ...g,
          members: (g.members || []).filter(m => m.id !== user.id)
        };
        syncGroupToCloud(updated);
        return updated;
      }
      return g;
    }));
  }, [user?.id]);

  const deleteGroup = useCallback((groupId) => {
    setAllGroups(prev => prev.filter(g => g.id !== groupId));
    deleteCloudGroup(groupId);
  }, []);

  const addGroupFeedItem = useCallback((groupId, feedItem) => {
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

    setAllGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        const updated = { ...g, feed: [item, ...(g.feed || [])] };
        syncGroupToCloud(updated);
        return updated;
      }
      return g;
    }));
    return item;
  }, [user]);

  const toggleFeedPostLike = useCallback((groupId, postId) => {
    if (!user?.id) return;
    setAllGroups(prev => prev.map(g => {
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
        const updated = { ...g, feed: updatedFeed };
        syncGroupToCloud(updated);
        return updated;
      }
      return g;
    }));
  }, [user?.id]);

  const addFeedPostComment = useCallback((groupId, postId, commentText) => {
    if (!commentText.trim() || !user?.id) return;
    const comment = {
      id: generateId(),
      userId: user.id,
      userName: user.name || 'Atleta',
      userAvatar: user.avatar,
      text: commentText.trim(),
      date: new Date().toISOString()
    };

    setAllGroups(prev => prev.map(g => {
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
        const updated = { ...g, feed: updatedFeed };
        syncGroupToCloud(updated);
        return updated;
      }
      return g;
    }));
  }, [user]);

  // ---- MESSAGES SYSTEM ----
  const sendMessage = useCallback((groupId, messageData) => {
    const newMessage = {
      id: generateId(),
      groupId,
      userId: user?.id,
      userName: user?.name || 'Atleta',
      userAvatar: user?.avatar,
      timestamp: new Date().toISOString(),
      ...messageData
    };
    setAllMessages(prev => {
      const updated = [...prev, newMessage];
      syncMessagesToCloud(groupId, updated.filter(m => m.groupId === groupId));
      return updated;
    });
    return newMessage;
  }, [user]);

  const getGroupMessages = useCallback((groupId) => {
    return allMessages.filter(m => m.groupId === groupId);
  }, [allMessages]);

  // ---- SCHEDULE ----
  const updateWeeklySchedule = useCallback((newSchedule) => {
    setWeeklySchedule(newSchedule);
    if (user?.id) syncScheduleToCloud(user.id, newSchedule);
  }, [user?.id]);

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
      addRoutine,
      updateRoutine,
      deleteRoutine,
      duplicateRoutine,
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
      addGroupFeedItem,
      toggleFeedPostLike,
      addFeedPostComment,
      sendMessage,
      getGroupMessages,
      syncWithCloud
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
