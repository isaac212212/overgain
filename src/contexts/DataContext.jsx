import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { storage, generateId } from '../utils/storage';
import { DEFAULT_WEEKLY_SCHEDULE } from '../utils/initialData';

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

  const DEFAULT_CARDIO_ROUTINES = [
    {
      id: 'cardio_natacao',
      name: 'Natação',
      modality: 'Natação',
      targetDuration: 40,
      targetDistance: 1.5,
      targetCalories: 350,
      notes: 'Estilos crawl e costas intervalados',
      scheduledDay: 1,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cardio_esteira',
      name: 'Esteira (Caminhada / Corrida)',
      modality: 'Esteira (Caminhada / Corrida)',
      targetDuration: 30,
      targetDistance: 4,
      targetCalories: 280,
      notes: 'Aquecimento 5 min caminhando + 25 min corrida',
      scheduledDay: 3,
      createdAt: new Date().toISOString()
    },
    {
      id: 'cardio_bike',
      name: 'Bicicleta Ergométrica',
      modality: 'Bicicleta Ergométrica',
      targetDuration: 35,
      targetDistance: 12,
      targetCalories: 300,
      notes: 'Giro moderado constante',
      scheduledDay: 5,
      createdAt: new Date().toISOString()
    }
  ];

  const [cardioRoutines, setCardioRoutines] = useState(() => {
    return user?.id ? storage.get(`cardioRoutines_${user.id}`, DEFAULT_CARDIO_ROUTINES) : DEFAULT_CARDIO_ROUTINES;
  });

  const [activeWorkout, setActiveWorkout] = useState(() => {
    return user?.id ? storage.get(`activeWorkout_${user.id}`, null) : null;
  });

  // ---- GLOBAL SHARED GROUPS & MESSAGES DATABASE ----
  const [allGroups, setAllGroups] = useState(() => storage.get('groups_db', []));
  const [allMessages, setAllMessages] = useState(() => storage.get('messages_db', []));

  // Reload user-specific data whenever active user switches
  useEffect(() => {
    if (user?.id) {
      setRoutines(storage.get(`routines_${user.id}`, []));
      setCardioRoutines(storage.get(`cardioRoutines_${user.id}`, DEFAULT_CARDIO_ROUTINES));
      setCheckins(storage.get(`checkins_${user.id}`, []));
      setWeeklySchedule(storage.get(`schedule_${user.id}`, DEFAULT_WEEKLY_SCHEDULE));
      setActiveWorkout(storage.get(`activeWorkout_${user.id}`, null));
    } else {
      setRoutines([]);
      setCardioRoutines(DEFAULT_CARDIO_ROUTINES);
      setCheckins([]);
      setWeeklySchedule(DEFAULT_WEEKLY_SCHEDULE);
      setActiveWorkout(null);
    }
  }, [user?.id]);

  // Persist user-specific data on changes
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

  const [justifiedAbsences, setJustifiedAbsences] = useState(() => storage.get('absences_db', []));

  useEffect(() => {
    storage.set('messages_db', allMessages);
  }, [allMessages]);

  useEffect(() => {
    storage.set('absences_db', justifiedAbsences);
  }, [justifiedAbsences]);

  // ---- ROUTINES ACTIONS ----
  const addRoutine = useCallback((routine) => {
    const newRoutine = {
      id: generateId(),
      createdAt: new Date().toISOString(),
      ...routine,
      exercises: routine.exercises || []
    };
    setRoutines(prev => [...prev, newRoutine]);
    return newRoutine;
  }, []);

  const updateRoutine = useCallback((id, updates) => {
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }, []);

  const deleteRoutine = useCallback((id) => {
    setRoutines(prev => prev.filter(r => r.id !== id));
  }, []);

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
      return [...prev, copy];
    });
  }, []);

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
    setCardioRoutines(prev => [...prev, newRoutine]);

    // If scheduledDay is provided, also sync to weeklySchedule
    if (newRoutine.scheduledDay !== null && newRoutine.scheduledDay !== undefined) {
      setWeeklySchedule(prev => {
        const existing = prev[newRoutine.scheduledDay] || { type: 'rest', label: 'Descanso' };
        const hasW = Boolean(existing.hasWorkout || existing.type === 'workout' || existing.type === 'both');
        const wLabel = existing.workoutLabel || (hasW ? existing.label : '');
        return {
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
      });
    }

    return newRoutine;
  }, []);

  const updateCardioRoutine = useCallback((id, updates) => {
    setCardioRoutines(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const deleteCardioRoutine = useCallback((id) => {
    setCardioRoutines(prev => prev.filter(c => c.id !== id));
  }, []);

  // ---- ACTIVE WORKOUT SESSION ----
  const startActiveWorkout = useCallback((routine) => {
    // Helper: find the last checkin that contains an exercise with this exact name
    const findPreviousSets = (exerciseName) => {
      for (const checkin of checkins) {
        const match = checkin.exercises?.find(ex => ex.name === exerciseName);
        if (match && match.sets?.length > 0) {
          return match.sets;
        }
      }
      return null;
    };

    // Clone exercises and ensure each set has completed: false
    const exercises = (routine?.exercises || []).map(ex => {
      const prevSets = findPreviousSets(ex.name);

      return {
        ...ex,
        notes: ex.notes || '',
        sets: (ex.sets || []).map((s, idx) => {
          const prevSet = prevSets?.[idx];
          const prevWeight = prevSet?.weight ?? s.weight ?? 20;
          const prevReps = prevSet?.reps ?? s.reps ?? 10;

          return {
            setNumber: idx + 1,
            weight: 0,
            reps: 0,
            completed: false,
            previousWeight: prevWeight,
            previousReps: prevReps,
            previous: `${prevWeight}kg x ${prevReps}`
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

    // Compute volume, completed sets, and reps
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

    // Save checkin in user's history
    setCheckins(prev => [checkinData, ...prev]);

    // Update routine notes if routine exists
    if (activeWorkout.routineId && activeWorkout.routineId !== 'free_workout') {
      setRoutines(prev => prev.map(r => {
        if (r.id === activeWorkout.routineId) {
          const updatedExercises = r.exercises.map(origEx => {
            const executedEx = activeWorkout.exercises.find(e => e.name === origEx.name);
            return executedEx ? { ...origEx, notes: executedEx.notes } : origEx;
          });
          return { ...r, exercises: updatedExercises };
        }
        return r;
      }));
    }

    // Auto post to user's joined groups feed if enabled
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
          return { ...g, feed: [feedItem, ...(g.feed || [])] };
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
          return { ...g, feed: [feedItem, ...(g.feed || [])] };
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

    // Publish "Falta Justificada" in joined groups feed
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
        return { ...g, feed: [feedItem, ...(g.feed || [])] };
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
    return newCheckin;
  }, [user]);

  const deleteCheckin = useCallback((id) => {
    setCheckins(prev => prev.filter(c => c.id !== id));
  }, []);

  // ---- GROUPS SYSTEM (FULL FUNCTIONALITY) ----
  const createGroup = useCallback((groupData) => {
    // Generate clean 6-char alphanumeric invite code
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
    return newGroup;
  }, [user]);

  const joinGroup = useCallback((rawInput, memberProfile, pin) => {
    if (!rawInput) return { success: false, error: 'Código de convite inválido.' };

    let cleaned = String(rawInput).trim();

    // If full URL was pasted, extract the code/join parameter
    if (cleaned.includes('join=')) {
      cleaned = cleaned.split('join=')[1].split('&')[0];
    } else if (cleaned.includes('/groups/')) {
      cleaned = cleaned.split('/groups/')[1].split('?')[0].split('/')[0];
    }

    // Remove common prefixes and symbols
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

    // Find in allGroups by inviteCode or ID (case-insensitive)
    let targetGroup = allGroups.find(g => {
      const gCode = (g.inviteCode || '').toUpperCase();
      const gId = (g.id || '').toUpperCase();
      return gCode === normalizedCode || gId === normalizedCode || gCode === cleaned.toUpperCase() || g.id === cleaned;
    });

    // Support encoded group payload for seamless cross-device sharing without backend
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

    // Verify PIN if group is protected
    if (targetGroup.pin && targetGroup.pin !== pin) {
      return { success: false, error: 'PIN de acesso incorreto para este grupo.' };
    }

    // Add member if not already joined
    setAllGroups(prev => prev.map(g => {
      if (g.id === targetGroup.id || g.inviteCode === targetGroup.inviteCode) {
        const memberExists = (g.members || []).some(m => m.id === newMember.id);
        if (!memberExists) {
          return { ...g, members: [...(g.members || []), newMember] };
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
        return {
          ...g,
          members: (g.members || []).filter(m => m.id !== user.id)
        };
      }
      return g;
    }));
  }, [user?.id]);

  const deleteGroup = useCallback((groupId) => {
    setAllGroups(prev => prev.filter(g => g.id !== groupId));
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
        return { ...g, feed: [item, ...(g.feed || [])] };
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
        return { ...g, feed: updatedFeed };
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
        return { ...g, feed: updatedFeed };
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
    setAllMessages(prev => [...prev, newMessage]);
    return newMessage;
  }, [user]);

  const getGroupMessages = useCallback((groupId) => {
    return allMessages.filter(m => m.groupId === groupId);
  }, [allMessages]);

  // ---- SCHEDULE ----
  const updateWeeklySchedule = useCallback((newSchedule) => {
    setWeeklySchedule(newSchedule);
  }, []);

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
      getGroupMessages
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
