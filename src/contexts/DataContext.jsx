import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { generateId } from '../utils/storage';
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

  // ---- GLOBAL SHARED GROUPS & MESSAGES DATABASE ----
  const [allGroups, setAllGroups] = useState([]);
  const [allMessages, setAllMessages] = useState([]);
  const [justifiedAbsences, setJustifiedAbsences] = useState([]);

  const filterLegacyMockCardios = (cardios) => {
    if (!Array.isArray(cardios)) return [];
    return cardios.filter(c => c && c.id !== 'cardio_natacao' && c.id !== 'cardio_esteira' && c.id !== 'cardio_bike');
  };

  // =========================================================================
  // SUPABASE DIRECT CLOUD FETCH (CROSS-DEVICE: PC <-> MOBILE)
  // =========================================================================
  const syncWithCloud = useCallback(async () => {
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

  // ---- ROUTINES ACTIONS (DIRECT SUPABASE PERSISTENCE) ----
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
      const res = await syncRoutinesToCloud(user.id, updated);
      if (!res) {
        console.error('Falha ao salvar nova rotina no Supabase.');
      }
    }
    return newRoutine;
  }, [routines, user?.id]);

  const updateRoutine = useCallback(async (id, updates) => {
    const updated = routines.map(r => r.id === id ? { ...r, ...updates } : r);
    setRoutines(updated);

    if (user?.id) {
      const res = await syncRoutinesToCloud(user.id, updated);
      if (!res) {
        console.error('Falha ao atualizar rotina no Supabase.');
      }
    }
    return updated;
  }, [routines, user?.id]);

  const deleteRoutine = useCallback(async (id) => {
    const updated = routines.filter(r => r.id !== id);
    setRoutines(updated);

    if (user?.id) {
      const res = await syncRoutinesToCloud(user.id, updated);
      if (!res) {
        console.error('Falha ao deletar rotina no Supabase.');
      }
    }
    return updated;
  }, [routines, user?.id]);

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
      await syncRoutinesToCloud(user.id, updated);
    }
    return updated;
  }, [routines, user?.id]);

  // ---- CARDIO ROUTINES ACTIONS (DIRECT SUPABASE PERSISTENCE) ----
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
      await syncCardioRoutinesToCloud(user.id, updated);
    }

    // If scheduledDay is provided, also sync to weeklySchedule
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
        await syncScheduleToCloud(user.id, updatedSched);
      }
    }

    return newRoutine;
  }, [cardioRoutines, weeklySchedule, user?.id]);

  const updateCardioRoutine = useCallback(async (id, updates) => {
    const updated = cardioRoutines.map(c => c.id === id ? { ...c, ...updates } : c);
    setCardioRoutines(updated);

    if (user?.id) {
      await syncCardioRoutinesToCloud(user.id, updated);
    }
    return updated;
  }, [cardioRoutines, user?.id]);

  const deleteCardioRoutine = useCallback(async (id) => {
    const updated = cardioRoutines.filter(c => c.id !== id);
    setCardioRoutines(updated);

    if (user?.id) {
      await syncCardioRoutinesToCloud(user.id, updated);
    }
    return updated;
  }, [cardioRoutines, user?.id]);

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

    // Save checkin in state and directly to Supabase cloud
    const updatedCheckins = [checkinData, ...checkins];
    setCheckins(updatedCheckins);
    if (user?.id) {
      await syncCheckinsToCloud(user.id, updatedCheckins);
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
        await syncRoutinesToCloud(user.id, updatedRoutines);
      }
    }

    // Auto post to user's joined groups feed if enabled and sync group to cloud
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
      await syncGroupsToCloud(updatedGroups);
    }

    // Clear active workout
    setActiveWorkout(null);
    return checkinData;
  }, [activeWorkout, user, checkins, routines, allGroups]);

  // Log standalone or complementary Cardio (DIRECT SUPABASE PERSISTENCE)
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
      await syncCheckinsToCloud(user.id, updatedCheckins);
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
      await syncGroupsToCloud(updatedGroups);
    }

    return checkinData;
  }, [user, checkins, allGroups]);

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
      await syncAbsencesToCloud(user.id, updatedAbsences);
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
    await syncGroupsToCloud(updatedGroups);

    return absenceItem;
  }, [user, justifiedAbsences, allGroups]);

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
      await syncCheckinsToCloud(user.id, updated);
    }
    return newCheckin;
  }, [user, checkins]);

  const deleteCheckin = useCallback(async (id) => {
    const updated = checkins.filter(c => c.id !== id);
    setCheckins(updated);
    if (user?.id) {
      await syncCheckinsToCloud(user.id, updated);
    }
    return updated;
  }, [user?.id, checkins]);

  // ---- GROUPS SYSTEM (DIRECT SUPABASE PERSISTENCE) ----
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

    // Sync to Supabase directly
    await syncGroupsToCloud(updatedGroups);

    return newGroup;
  }, [user, allGroups]);

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

    // Ensure we have freshest groups from cloud
    const cloudGroups = await fetchCloudGroups();
    const currentGroups = cloudGroups.length > 0 ? cloudGroups : allGroups;

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
    await syncGroupsToCloud(updatedGroups);

    return { success: true, group: targetGroup };
  }, [user, allGroups]);

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
    await syncGroupsToCloud(updatedGroups);
  }, [user?.id, allGroups]);

  const deleteGroup = useCallback(async (groupId) => {
    const updatedGroups = allGroups.filter(g => g.id !== groupId);
    setAllGroups(updatedGroups);
    await syncGroupsToCloud(updatedGroups);
  }, [allGroups]);

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
    await syncGroupsToCloud(updatedGroups);
    return item;
  }, [user, allGroups]);

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
    await syncGroupsToCloud(updatedGroups);
  }, [user?.id, allGroups]);

  const addFeedPostComment = useCallback(async (groupId, postId, commentText) => {
    if (!commentText.trim() || !user?.id) return;
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
    await syncGroupsToCloud(updatedGroups);
  }, [user, allGroups]);

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
    await syncMessagesToCloud(groupId, updatedGroupMsgs);
    return newMessage;
  }, [user, allMessages]);

  const getGroupMessages = useCallback((groupId) => {
    return allMessages.filter(m => m.groupId === groupId);
  }, [allMessages]);

  // ---- SCHEDULE ----
  const updateWeeklySchedule = useCallback(async (newSchedule) => {
    setWeeklySchedule(newSchedule);
    if (user?.id) {
      await syncScheduleToCloud(user.id, newSchedule);
    }
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
      isDataLoading,
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
