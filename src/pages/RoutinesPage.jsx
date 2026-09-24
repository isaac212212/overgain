import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  Plus, 
  ChevronRight, 
  ChevronDown, 
  Dumbbell, 
  MoreHorizontal, 
  Trash2, 
  Copy, 
  Edit3, 
  Play, 
  Check, 
  StickyNote,
  X,
  Compass,
  Calendar,
  RotateCw,
  FolderPlus,
  ClipboardList,
  Camera,
  Upload,
  Activity
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import ExerciseSelectorModal from '../components/ui/ExerciseSelectorModal';
import { generateId } from '../utils/storage';
import './RoutinesPage.css';

const DEFAULT_MUSCLE_GROUPS = [
  'Peitoral', 
  'Costas', 
  'Ombros', 
  'Trapézio',
  'Quadríceps', 
  'Posterior de Coxa e Glúteos', 
  'Panturrilha', 
  'Bíceps', 
  'Tríceps', 
  'Antebraço', 
  'Abdômen e Core', 
  'Cardio'
];

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda-feira', short: 'Seg' },
  { id: 2, name: 'Terça-feira', short: 'Ter' },
  { id: 3, name: 'Quarta-feira', short: 'Qua' },
  { id: 4, name: 'Quinta-feira', short: 'Qui' },
  { id: 5, name: 'Sexta-feira', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
  { id: 0, name: 'Domingo', short: 'Dom' },
];

export default function RoutinesPage() {
  const { 
    routines, 
    cardioRoutines,
    checkins,
    addRoutine, 
    updateRoutine, 
    deleteRoutine, 
    duplicateRoutine,
    addCardioRoutine,
    updateCardioRoutine,
    deleteCardioRoutine,
    startActiveWorkout,
    weeklySchedule,
    updateWeeklySchedule,
    logCardio
  } = useData();
  const { user, updateWeeklyGoal } = useAuth();
  const navigate = useNavigate();

  // State
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false);
  const [exerciseModalCategory, setExerciseModalCategory] = useState('Todos');
  const [editingRoutine, setEditingRoutine] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [folderOpen, setFolderOpen] = useState(true);
  const [cardioFolderOpen, setCardioFolderOpen] = useState(true);

  // Editor form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScheduledDay, setFormScheduledDay] = useState('');
  const [formExercises, setFormExercises] = useState([]);

  // Cardio Editor form state
  const [isCardioEditorOpen, setIsCardioEditorOpen] = useState(false);
  const [editingCardio, setEditingCardio] = useState(null);
  const [cardioFormName, setCardioFormName] = useState('');
  const [cardioFormModality, setCardioFormModality] = useState('Natação');
  const [cardioFormDuration, setCardioFormDuration] = useState('30');
  const [cardioFormDistance, setCardioFormDistance] = useState('');
  const [cardioFormCalories, setCardioFormCalories] = useState('');
  const [cardioFormNotes, setCardioFormNotes] = useState('');
  const [cardioFormScheduledDay, setCardioFormScheduledDay] = useState('');

  // Cardio Checkin Modal in RoutinesPage
  const [isCardioCheckinOpen, setIsCardioCheckinOpen] = useState(false);
  const [checkinCardioName, setCheckinCardioName] = useState('');
  const [checkinCardioModality, setCheckinCardioModality] = useState('Corrida');
  const [checkinCardioDuration, setCheckinCardioDuration] = useState('30');
  const [checkinCardioDistance, setCheckinCardioDistance] = useState('');
  const [checkinCardioCalories, setCheckinCardioCalories] = useState('');
  const [checkinCardioNotes, setCheckinCardioNotes] = useState('');
  const [checkinCardioPhoto, setCheckinCardioPhoto] = useState(null);
  const [checkinCardioShare, setCheckinCardioShare] = useState(true);
  const [checkinCardioError, setCheckinCardioError] = useState('');
  const cardioPhotoRef = useRef(null);

  // Integrated Cardio Timer
  const [cardioTimerSeconds, setCardioTimerSeconds] = useState(0);
  const [isCardioTimerRunning, setIsCardioTimerRunning] = useState(false);

  useEffect(() => {
    let interval = null;
    if (isCardioTimerRunning) {
      interval = setInterval(() => {
        setCardioTimerSeconds(prev => prev + 1);
      }, 1000);
    } else if (!isCardioTimerRunning && cardioTimerSeconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isCardioTimerRunning, cardioTimerSeconds]);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Schedule form state
  const [tempSchedule, setTempSchedule] = useState(() => ({ ...weeklySchedule }));

  // Start Live Workout with routine
  const handleStartWorkout = (routine) => {
    startActiveWorkout(routine);
    navigate('/workout/active');
  };

  // Start Blank Live Workout
  const handleStartEmptyWorkout = () => {
    startActiveWorkout({
      id: 'blank',
      name: 'Treino Avulso',
      exercises: []
    });
    navigate('/workout/active');
  };

  // Helper: find last recorded loads for an exercise by name across all checkins and routines
  const findPreviousLoads = (exerciseName) => {
    if (!exerciseName) return null;
    const nameNorm = exerciseName.trim().toLowerCase();
    
    // First check historical checkins (most recent first)
    if (checkins && checkins.length > 0) {
      for (const checkin of checkins) {
        const match = checkin.exercises?.find(ex => ex.name?.trim().toLowerCase() === nameNorm);
        if (match && match.sets?.length > 0 && match.sets.some(s => Number(s.weight) > 0)) {
          return match.sets;
        }
      }
    }

    // Next check other saved routines
    if (routines && routines.length > 0) {
      for (const r of routines) {
        const match = r.exercises?.find(ex => ex.name?.trim().toLowerCase() === nameNorm);
        if (match && match.sets?.length > 0 && match.sets.some(s => Number(s.weight) > 0)) {
          return match.sets;
        }
      }
    }

    return null;
  };

  // Open editor for new routine (starts TOTALLY BLANK as requested)
  const handleOpenNewRoutine = () => {
    setEditingRoutine(null);
    setFormName('');
    setFormDescription('');
    setFormScheduledDay('');
    setFormExercises([]); // Totally blank!
    setIsEditorOpen(true);
  };

  // Open editor for existing routine
  const handleOpenEditRoutine = (routine) => {
    setEditingRoutine(routine);
    setFormName(routine.name);
    setFormDescription(routine.description || '');
    setFormScheduledDay(routine.scheduledDay !== undefined && routine.scheduledDay !== null ? String(routine.scheduledDay) : '');
    setFormExercises(JSON.parse(JSON.stringify(routine.exercises || [])));
    setIsEditorOpen(true);
    setActiveMenuId(null);
  };

  // ---- CARDIO HANDLERS ----
  const handleOpenNewCardio = () => {
    setEditingCardio(null);
    setCardioFormName('');
    setCardioFormModality('Natação');
    setCardioFormDuration('30');
    setCardioFormDistance('');
    setCardioFormCalories('');
    setCardioFormNotes('');
    setCardioFormScheduledDay('');
    setIsCardioEditorOpen(true);
  };

  const handleOpenEditCardio = (cardio) => {
    setEditingCardio(cardio);
    setCardioFormName(cardio.name || '');
    setCardioFormModality(cardio.modality || 'Natação');
    setCardioFormDuration(String(cardio.targetDuration || 30));
    setCardioFormDistance(cardio.targetDistance ? String(cardio.targetDistance) : '');
    setCardioFormCalories(cardio.targetCalories ? String(cardio.targetCalories) : '');
    setCardioFormNotes(cardio.notes || '');
    setCardioFormScheduledDay(cardio.scheduledDay !== undefined && cardio.scheduledDay !== null ? String(cardio.scheduledDay) : '');
    setIsCardioEditorOpen(true);
  };

  const handleSaveCardio = (e) => {
    e.preventDefault();
    if (!cardioFormName.trim()) return;

    const data = {
      name: cardioFormName.trim(),
      modality: cardioFormModality,
      targetDuration: Number(cardioFormDuration) || 30,
      targetDistance: Number(cardioFormDistance) || 0,
      targetCalories: Number(cardioFormCalories) || 0,
      notes: cardioFormNotes.trim(),
      scheduledDay: cardioFormScheduledDay !== '' ? Number(cardioFormScheduledDay) : null
    };

    if (editingCardio) {
      updateCardioRoutine(editingCardio.id, data);
    } else {
      addCardioRoutine(data);
    }
    setIsCardioEditorOpen(false);
  };

  const handleOpenCardioCheckin = (name, modality, duration, distance, calories) => {
    const timerMins = cardioTimerSeconds > 0 
      ? Math.max(1, Math.round(cardioTimerSeconds / 60)) 
      : (Number(duration) || 30);
    setCheckinCardioName(name || 'Cardio');
    setCheckinCardioModality(modality || 'Corrida');
    setCheckinCardioDuration(String(timerMins));
    setCheckinCardioDistance(distance ? String(distance) : '');
    setCheckinCardioCalories(calories ? String(calories) : '');
    setCheckinCardioNotes('');
    setCheckinCardioPhoto(null);
    setCheckinCardioError('');
    setIsCardioCheckinOpen(true);
  };

  const handleConfirmCardioCheckin = (e) => {
    e.preventDefault();
    setCheckinCardioError('');

    // Rule: photo mandatory ONLY if sharing to group
    if (checkinCardioShare && !checkinCardioPhoto) {
      setCheckinCardioError('A inclusão da foto de comprovação é OBRIGATÓRIA para validar e postar no feed do grupo! Desmarque a opção para salvar apenas no seu histórico pessoal.');
      return;
    }

    logCardio({
      durationMinutes: Number(checkinCardioDuration) || 30,
      cardioType: checkinCardioModality,
      distanceKm: Number(checkinCardioDistance) || 0,
      calories: Number(checkinCardioCalories) || 0,
      notes: checkinCardioNotes.trim(),
      photoUrl: checkinCardioPhoto,
      shareToGroup: checkinCardioShare
    });

    setIsCardioCheckinOpen(false);
    setIsCardioTimerRunning(false);
    setCardioTimerSeconds(0);
  };

  // Add exercise to form
  const handleAddExercise = () => {
    setFormExercises(prev => [
      ...prev,
      {
        id: generateId(),
        muscleGroup: 'Peito',
        name: '',
        notes: '',
        sets: [
          { setNumber: 1, weight: 0, reps: 0 }
        ]
      }
    ]);
  };

  // Remove exercise from form
  const handleRemoveExercise = (idx) => {
    setFormExercises(prev => prev.filter((_, i) => i !== idx));
  };

  // Update exercise field
  const handleUpdateExercise = (idx, field, value) => {
    setFormExercises(prev => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };

      // If the name changed, check for previous loads from other routines/checkins
      if (field === 'name' && value.trim().length > 2) {
        const prevSets = findPreviousLoads(value);
        if (prevSets) {
          // Pre-fill weights from previous executions, keep reps at 0
          copy[idx].sets = copy[idx].sets.map((s, sIdx) => {
            const prevSet = prevSets[sIdx];
            return {
              ...s,
              weight: prevSet?.weight ?? s.weight
            };
          });
        }
      }

      return copy;
    });
  };

  // Add set to exercise
  const handleAddSet = (exerciseIdx) => {
    setFormExercises(prev => {
      const copy = [...prev];
      const ex = copy[exerciseIdx];
      ex.sets.push({
        setNumber: ex.sets.length + 1,
        weight: 0,
        reps: 0
      });
      return copy;
    });
  };

  // Remove set from exercise
  const handleRemoveSet = (exerciseIdx, setIdx) => {
    setFormExercises(prev => {
      const copy = [...prev];
      const ex = copy[exerciseIdx];
      ex.sets = ex.sets.filter((_, i) => i !== setIdx).map((s, idx) => ({
        ...s,
        setNumber: idx + 1
      }));
      return copy;
    });
  };

  // Update set values
  const handleUpdateSet = (exerciseIdx, setIdx, field, value) => {
    setFormExercises(prev => {
      const copy = [...prev];
      const ex = copy[exerciseIdx];
      ex.sets[setIdx] = { ...ex.sets[setIdx], [field]: Number(value) || 0 };
      return copy;
    });
  };

  // Save routine
  const handleSaveRoutine = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const routineData = {
      name: formName.trim(),
      description: formDescription.trim(),
      scheduledDay: formScheduledDay !== '' ? Number(formScheduledDay) : null,
      folder: 'Minhas rotinas',
      exercises: formExercises.filter(ex => ex.name.trim().length > 0)
    };

    if (editingRoutine) {
      updateRoutine(editingRoutine.id, routineData);
    } else {
      addRoutine(routineData);
    }

    if (formScheduledDay !== '') {
      const dayId = Number(formScheduledDay);
      const existing = weeklySchedule?.[dayId] || {};
      const hasC = existing.hasCardio && existing.cardioLabel?.trim();
      updateWeeklySchedule({
        ...weeklySchedule,
        [dayId]: {
          ...existing,
          type: hasC ? 'both' : 'workout',
          hasWorkout: true,
          workoutLabel: formName.trim(),
          label: hasC ? `${formName.trim()} + Cardio: ${existing.cardioLabel}` : formName.trim()
        }
      });
    }

    setIsEditorOpen(false);
  };

  // Save Schedule changes
  const handleSaveSchedule = (e) => {
    e.preventDefault();
    const finalSchedule = {};
    DAYS_OF_WEEK.forEach(d => {
      const entry = tempSchedule[d.id] || {};
      const hasW = Boolean(entry.hasWorkout && entry.workoutLabel?.trim());
      const hasC = Boolean(entry.hasCardio && entry.cardioLabel?.trim());
      const wLabel = entry.workoutLabel?.trim() || '';
      const cLabel = entry.cardioLabel?.trim() || '';

      let type = 'rest';
      let label = 'Descanso';
      if (hasW && hasC) {
        type = 'both';
        label = `${wLabel} + Cardio: ${cLabel}`;
      } else if (hasW) {
        type = 'workout';
        label = wLabel;
      } else if (hasC) {
        type = 'cardio';
        label = `Cardio: ${cLabel}`;
      }

      finalSchedule[d.id] = {
        type,
        label,
        hasWorkout: hasW,
        workoutLabel: wLabel,
        hasCardio: hasC,
        cardioLabel: cLabel
      };
    });
    updateWeeklySchedule(finalSchedule);
    setIsScheduleModalOpen(false);
  };

  return (
    <div className="routines-page-v2 animate-fade-in">
      {/* Top Bar matching Image 1: Treino ⌵, PRO badge, Refresh */}
      <header className="treino-topbar">
        <div className="treino-title-dropdown">
          <h1>Treino</h1>
          <ChevronDown size={20} className="treino-caret" />
        </div>

        <div className="treino-topbar-right">
          <button className="icon-refresh-btn" onClick={() => window.location.reload()} title="Atualizar">
            <RotateCw size={18} />
          </button>
        </div>
      </header>

      {/* Button: "+ Iniciar treino vazio" matching Image 1 */}
      <button 
        className="btn-start-empty-workout"
        onClick={handleStartEmptyWorkout}
        id="btn-iniciar-treino-vazio"
      >
        <Plus size={20} />
        <span>Iniciar treino vazio</span>
      </button>

      {/* Section Header: Rotinas */}
      <div className="rotinas-section-title-bar">
        <h2>Rotinas</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button 
            type="button"
            className="routine-freq-pill-btn"
            onClick={() => setIsScheduleModalOpen(true)}
            title="Alterar frequência de treinos da semana"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-full)',
              padding: '6px 12px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--accent)',
              cursor: 'pointer'
            }}
          >
            <Calendar size={14} />
            <span>Frequência: {user?.weeklyGoal || 4}x/sem</span>
          </button>
          <button 
            className="folder-plus-btn" 
            onClick={() => setIsScheduleModalOpen(true)}
            title="Escala Semanal & Dias de Treino"
          >
            <Calendar size={18} />
          </button>
        </div>
      </div>

      {/* Action Buttons Row: [ Nova rotina ] [ Escala Semanal ] [ Nova Rotina Cardio ] */}
      <div className="rotinas-quick-actions-grid">
        <button 
          className="rotina-action-box"
          onClick={handleOpenNewRoutine}
          id="btn-nova-rotina"
        >
          <ClipboardList size={22} className="action-box-icon" />
          <span>Nova rotina</span>
        </button>

        <button 
          className="rotina-action-box"
          onClick={() => setIsScheduleModalOpen(true)}
          id="btn-escala-semanal"
        >
          <Calendar size={22} className="action-box-icon" />
          <span>Escala Semanal</span>
        </button>

        <button 
          className="rotina-action-box cardio-action-box"
          onClick={handleOpenNewCardio}
          id="btn-nova-rotina-cardio"
          style={{ border: '1px solid rgba(245, 158, 11, 0.35)' }}
        >
          <span style={{ fontSize: '1.25rem', lineHeight: 1 }}>🏃</span>
          <span style={{ color: '#f59e0b' }}>Nova Rotina Cardio</span>
        </button>
      </div>

      {/* PROGRAMAÇÃO DO DIA: TREINO PRINCIPAL + CARDIO COMO SUB-TREINO ORGANIZADO */}
      {(() => {
        const todayDayOfWeek = new Date().getDay();
        const todaySchedule = weeklySchedule?.[todayDayOfWeek];
        const dayNames = {
          0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira', 3: 'Quarta-feira',
          4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado'
        };
        const hasW = todaySchedule?.hasWorkout || todaySchedule?.type === 'workout' || todaySchedule?.type === 'both';
        const hasC = todaySchedule?.hasCardio || todaySchedule?.type === 'cardio' || todaySchedule?.type === 'both';
        const wTitle = todaySchedule?.workoutLabel || todaySchedule?.label || 'Treino de Musculação';
        const cTitle = todaySchedule?.cardioLabel || 'Sessão de Cardio';
        const matchedRoutine = routines.find(r => r.scheduledDay === todayDayOfWeek || (r.name && todaySchedule?.workoutLabel && r.name.toLowerCase() === todaySchedule.workoutLabel.toLowerCase()));
        const matchedCardio = (cardioRoutines || []).find(c => c.scheduledDay === todayDayOfWeek || (c.name && todaySchedule?.cardioLabel && c.name.toLowerCase().includes(todaySchedule.cardioLabel.toLowerCase())));

        if (!hasW && !hasC) return null;

        return (
          <div className="daily-program-today-box" style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-lg)',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            marginBottom: 12
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--accent)', letterSpacing: 0.5 }}>
                  PROGRAMAÇÃO DE HOJE
                </span>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {dayNames[todayDayOfWeek].toUpperCase()}
                </h3>
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-elevated)',
                color: 'var(--text-secondary)'
              }}>
                {hasW && hasC ? 'Musculação + Cardio' : hasW ? 'Musculação' : 'Cardio'}
              </span>
            </div>

            {/* Treino Principal */}
            {hasW && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)',
                borderLeft: '4px solid var(--accent)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--accent)' }}>
                      🏋️ [TREINO PRINCIPAL]: {wTitle}
                    </span>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)', margin: '2px 0 0 0' }}>
                      {wTitle}
                    </h4>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    icon={Play}
                    onClick={() => {
                      if (matchedRoutine) {
                        handleStartWorkout(matchedRoutine);
                      } else {
                        handleStartEmptyWorkout();
                      }
                    }}
                  >
                    Bate-Ponto Musculação
                  </Button>
                </div>

                {matchedRoutine?.exercises?.length > 0 && (
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {matchedRoutine.exercises.map((ex, i) => (
                      <li key={i}>• {ex.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Cardio / Sub-treino Organizado logo abaixo */}
            {hasC && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                padding: '12px 14px',
                background: 'rgba(245, 158, 11, 0.04)',
                borderRadius: 'var(--radius-md)',
                border: '1px dashed rgba(245, 158, 11, 0.35)',
                borderLeft: '4px solid #f59e0b'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#f59e0b' }}>
                      🏃 [CARDIO / SUB-TREINO]: {cTitle}
                    </span>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f59e0b', margin: '2px 0 0 0' }}>
                      {cTitle}
                    </h4>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleOpenCardioCheckin(cTitle, matchedCardio?.modality, matchedCardio?.targetDuration, matchedCardio?.targetDistance, matchedCardio?.targetCalories)}
                    style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
                  >
                    Bater Ponto Cardio
                  </Button>
                </div>

                {/* Detalhes (Duração / Distância / Meta) */}
                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                  <span>⏱️ <strong>Duração:</strong> {matchedCardio?.targetDuration || 30} min</span>
                  {matchedCardio?.targetDistance > 0 && <span>📏 <strong>Distância:</strong> {matchedCardio.targetDistance} km</span>}
                  {matchedCardio?.targetCalories > 0 && <span>🔥 <strong>Meta:</strong> {matchedCardio.targetCalories} kcal</span>}
                </div>

                {matchedCardio?.notes && (
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                    "{matchedCardio.notes}"
                  </p>
                )}

                {/* Cronômetro / Timer */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'rgba(245, 158, 11, 0.08)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  marginTop: 4,
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b' }}>CRONÔMETRO:</span>
                    <span style={{ fontSize: '1.1875rem', fontWeight: 900, fontFamily: 'monospace', color: '#f59e0b' }}>
                      {formatTimer(cardioTimerSeconds)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Button 
                      type="button" 
                      variant={isCardioTimerRunning ? "danger" : "secondary"} 
                      size="sm"
                      onClick={() => setIsCardioTimerRunning(!isCardioTimerRunning)}
                    >
                      {isCardioTimerRunning ? 'Pausar' : 'Iniciar'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => { setIsCardioTimerRunning(false); setCardioTimerSeconds(0); }}
                    >
                      Zerar
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Minhas rotinas toggle matching Image 1 */}
      <div className="minhas-rotinas-header" onClick={() => setFolderOpen(!folderOpen)}>
        {folderOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span>Minhas rotinas ({routines.length})</span>
      </div>

      {/* Routine Cards Stack */}
      {folderOpen && (
        <div className="routine-cards-stack-v2">
          {routines.length === 0 ? (
            <div className="routines-empty-box animate-fade-in" style={{
              padding: '32px 20px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-secondary)'
            }}>
              <Dumbbell size={36} style={{ color: 'var(--accent)', margin: '0 auto 12px auto', display: 'block' }} />
              <h3 style={{ color: 'var(--text-primary)', fontSize: '1.125rem', fontWeight: 700, marginBottom: '6px' }}>
                Nenhuma rotina criada ainda
              </h3>
              <p style={{ fontSize: '0.875rem', maxWidth: '380px', margin: '0 auto 16px auto', color: 'var(--text-secondary)' }}>
                Monte sua ficha personalizada com exercícios, séries e cargas tocando em <strong>Nova rotina</strong> acima, ou comece agora mesmo com um <strong>Treino vazio</strong>!
              </p>
              <Button variant="primary" icon={Plus} onClick={handleOpenNewRoutine}>
                Criar Minha Primeira Rotina
              </Button>
            </div>
          ) : (
            routines.map(routine => {
              const exercisesSummary = routine.exercises?.length > 0
                ? routine.exercises.map(e => e.name).join(', ')
                : 'Nenhum exercício cadastrado';

              return (
                <div 
                  key={routine.id} 
                  className="routine-card-v2"
                  onClick={() => setSelectedRoutine(routine)}
                >
                  {/* Header with Title and ... menu */}
                  <div className="routine-card-v2-header">
                    <div>
                      <h3 className="routine-v2-name">{routine.name}</h3>
                      {routine.scheduledDay !== undefined && routine.scheduledDay !== null && (
                        <span style={{
                          display: 'inline-block',
                          fontSize: '0.6875rem',
                          padding: '2px 8px',
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          borderRadius: 'var(--radius-full)',
                          fontWeight: 600,
                          marginTop: 4
                        }}>
                          📅 {DAYS_OF_WEEK.find(d => d.id === routine.scheduledDay)?.name || 'Dia agendado'}
                        </span>
                      )}
                    </div>
                    <div className="menu-wrap" onClick={e => e.stopPropagation()}>
                      <button 
                        className="routine-more-btn"
                        onClick={() => setActiveMenuId(activeMenuId === routine.id ? null : routine.id)}
                      >
                        <MoreHorizontal size={20} />
                      </button>

                      {activeMenuId === routine.id && (
                        <div className="routine-popover-menu animate-scale-in">
                          <button 
                            className="popover-item"
                            onClick={() => {
                              handleStartWorkout(routine);
                              setActiveMenuId(null);
                            }}
                          >
                            <Play size={15} /> Começar rotina
                          </button>
                          <button 
                            className="popover-item"
                            onClick={() => handleOpenEditRoutine(routine)}
                          >
                            <Edit3 size={15} /> Editar Ficha
                          </button>
                          <button 
                            className="popover-item"
                            onClick={() => {
                              duplicateRoutine(routine.id);
                              setActiveMenuId(null);
                            }}
                          >
                            <Copy size={15} /> Duplicar
                          </button>
                          <button 
                            className="popover-item item-danger"
                            onClick={() => {
                              if (confirm(`Excluir rotina "${routine.name}"?`)) {
                                deleteRoutine(routine.id);
                              }
                              setActiveMenuId(null);
                            }}
                          >
                            <Trash2 size={15} /> Excluir
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Exercises summary line */}
                  <p className="routine-v2-summary">{exercisesSummary}</p>

                  {/* THE ICONIC BLUE "Começar rotina" BUTTON */}
                  <button 
                    className="btn-comecar-rotina-blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartWorkout(routine);
                    }}
                    id={`btn-start-${routine.id}`}
                  >
                    Começar rotina
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Minhas rotinas de cardio section */}
      <div className="minhas-rotinas-header" onClick={() => setCardioFolderOpen(!cardioFolderOpen)} style={{ marginTop: 8 }}>
        {cardioFolderOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span>Minhas rotinas de cardio ({cardioRoutines?.length || 0})</span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleOpenNewCardio();
          }}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: '#f59e0b',
            fontSize: '0.8125rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <Plus size={15} /> Nova
        </button>
      </div>

      {cardioFolderOpen && (
        <div className="routine-cards-stack-v2">
          {(!cardioRoutines || cardioRoutines.length === 0) ? (
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              background: 'var(--bg-card)',
              border: '1px dashed rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-lg)',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontSize: '1.75rem', display: 'block', marginBottom: 6 }}>🏃</span>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)' }}>Nenhuma rotina de cardio salva</p>
              <p style={{ margin: '4px 0 12px 0', fontSize: '0.8125rem' }}>Crie fichas para natação, esteira, bike ou corrida.</p>
              <Button variant="secondary" size="sm" onClick={handleOpenNewCardio} style={{ borderColor: '#f59e0b', color: '#f59e0b' }}>
                + Criar Rotina de Cardio
              </Button>
            </div>
          ) : (
            cardioRoutines.map(cardio => (
              <div key={cardio.id} className="routine-card-v2" style={{ borderLeft: '4px solid #f59e0b' }}>
                <div className="routine-card-v2-header">
                  <div>
                    <h3 className="routine-v2-name" style={{ color: '#f59e0b' }}>🏃 {cardio.name}</h3>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      <span style={{ fontSize: '0.6875rem', padding: '2px 8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                        {cardio.modality || 'Cardio'}
                      </span>
                      {cardio.scheduledDay !== undefined && cardio.scheduledDay !== null && (
                        <span style={{ fontSize: '0.6875rem', padding: '2px 8px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', borderRadius: 'var(--radius-full)', fontWeight: 600 }}>
                          📅 {DAYS_OF_WEEK.find(d => d.id === cardio.scheduledDay)?.name || 'Dia agendado'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="routine-more-btn"
                      onClick={() => handleOpenEditCardio(cardio)}
                      title="Editar rotina de cardio"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      className="routine-more-btn"
                      onClick={() => {
                        if (confirm(`Excluir rotina de cardio "${cardio.name}"?`)) {
                          deleteCardioRoutine(cardio.id);
                        }
                      }}
                      title="Excluir rotina de cardio"
                      style={{ color: '#ef4444' }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '10px 0' }}>
                  <span>⏱️ {cardio.targetDuration || 30} min</span>
                  {cardio.targetDistance > 0 && <span>📏 {cardio.targetDistance} km</span>}
                  {cardio.targetCalories > 0 && <span>🔥 {cardio.targetCalories} kcal</span>}
                </div>

                {cardio.notes && (
                  <p style={{ margin: '0 0 12px 0', fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                    "{cardio.notes}"
                  </p>
                )}

                <button
                  className="btn-comecar-rotina-blue"
                  onClick={() => handleOpenCardioCheckin(cardio.name, cardio.modality, cardio.targetDuration, cardio.targetDistance, cardio.targetCalories)}
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
                >
                  Bater Ponto Cardio
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Routine Detail Modal */}
      {selectedRoutine && (
        <Modal
          isOpen={!!selectedRoutine}
          onClose={() => setSelectedRoutine(null)}
          title={`Ficha: ${selectedRoutine.name}`}
          size="lg"
        >
          <div className="routine-detail-modal">
            {selectedRoutine.description && (
              <p className="routine-modal-desc">{selectedRoutine.description}</p>
            )}

            <div className="routine-modal-exercises">
              {selectedRoutine.exercises?.map((exercise, idx) => (
                <div key={exercise.id || idx} className="exercise-detail-card">
                  <div className="exercise-detail-header">
                    <span className="exercise-number">{idx + 1}</span>
                    <div className="exercise-titles">
                      <span className="exercise-group-tag">{exercise.muscleGroup || 'Geral'}</span>
                      <h4 className="exercise-title-text">{exercise.name}</h4>
                    </div>
                  </div>

                  <div className="exercise-sets-table">
                    <div className="sets-table-head">
                      <span>Série</span>
                      <span>Carga</span>
                      <span>Repetições</span>
                    </div>
                    {exercise.sets?.map((s, sIdx) => (
                      <div key={sIdx} className="sets-table-row">
                        <span className="set-num">{s.setNumber || sIdx + 1}</span>
                        <span className="set-val">{s.weight} kg</span>
                        <span className="set-val">{s.reps} reps</span>
                      </div>
                    ))}
                  </div>

                  {/* Observações / Anotações Pessoais salvas */}
                  <div className="exercise-notes-box">
                    <div className="notes-box-header">
                      <StickyNote size={14} className="notes-icon" />
                      <span>Observações & Ajustes de Carga</span>
                    </div>
                    <p className="notes-box-content">
                      {exercise.notes ? (
                        exercise.notes
                      ) : (
                        <em className="text-muted">Nenhuma anotação registrada para este exercício.</em>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="routine-modal-footer">
              <Button 
                variant="secondary" 
                onClick={() => {
                  const r = selectedRoutine;
                  setSelectedRoutine(null);
                  handleOpenEditRoutine(r);
                }}
                icon={Edit3}
              >
                Editar
              </Button>
              <Button 
                variant="primary" 
                icon={Play}
                size="lg"
                onClick={() => {
                  const r = selectedRoutine;
                  setSelectedRoutine(null);
                  handleStartWorkout(r);
                }}
              >
                Começar Rotina Agora
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Routine Editor Modal */}
      {isEditorOpen && (
        <Modal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title={editingRoutine ? `Editar: ${editingRoutine.name}` : 'Nova Rotina de Treino'}
          size="lg"
        >
          <form className="routine-editor-form" onSubmit={handleSaveRoutine}>
            <Input 
              label="Nome da Rotina" 
              placeholder="Ex: Treino empurrar, Pernas pesadas, PPL dia A..."
              value={formName}
              onChange={e => setFormName(e.target.value)}
              required
              autoFocus
            />

            <Input 
              label="Descrição ou Foco (Opcional)"
              placeholder="Escreva aqui a descrição do treino"
              value={formDescription}
              onChange={e => setFormDescription(e.target.value)}
            />

            <div className="form-group-custom" style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Vincular a um Dia da Semana (Opcional)
              </label>
              <select
                className="editor-select"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: 4 }}
                value={formScheduledDay}
                onChange={e => setFormScheduledDay(e.target.value)}
              >
                <option value="">Nenhum dia específico</option>
                <option value="1">Segunda-feira</option>
                <option value="2">Terça-feira</option>
                <option value="3">Quarta-feira</option>
                <option value="4">Quinta-feira</option>
                <option value="5">Sexta-feira</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
              <small style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                Ao vincular, esta rotina será automaticamente programada para esse dia na sua escala semanal.
              </small>
            </div>

            <div className="editor-exercises-section">
              <div className="editor-section-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Exercícios da Ficha ({formExercises.length})</h3>

                {/* BOTÃO PRINCIPAL ÚNICO: + Adicionar Exercício */}
                <Button 
                  type="button" 
                  variant="primary" 
                  size="md" 
                  icon={Plus}
                  onClick={() => {
                    setExerciseModalCategory('Todos');
                    setIsExerciseSelectorOpen(true);
                  }}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', fontSize: '0.9375rem' }}
                >
                  + Adicionar Exercício
                </Button>
              </div>

              {formExercises.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '32px 16px',
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px dashed var(--border-subtle)',
                  margin: '12px 0'
                }}>
                  <Dumbbell size={28} style={{ color: 'var(--accent)', margin: '0 auto 8px auto', display: 'block' }} />
                  <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                    Nenhum exercício na ficha ainda
                  </p>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    Toque no botão <strong>+ Adicionar Exercício</strong> acima para escolher na lista categorizada com busca rápida.
                  </p>
                </div>
              ) : (
                formExercises.map((exercise, eIdx) => (
                  <div key={exercise.id} className="editor-exercise-card">
                    <div className="editor-exercise-top-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="editor-exercise-idx" style={{ background: 'var(--accent)', color: '#fff', padding: '2px 8px', borderRadius: 'var(--radius-sm)', fontWeight: 800, fontSize: '0.75rem' }}>
                          #{eIdx + 1}
                        </span>
                        <div>
                          <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}>
                            {exercise.muscleGroup || 'Musculação'}
                          </span>
                          <h4 style={{ margin: 0, fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                            {exercise.name}
                          </h4>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        className="editor-remove-btn"
                        onClick={() => handleRemoveExercise(eIdx)}
                        title="Remover exercício"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                  {/* Sets */}
                  <div className="editor-sets-section">
                    <label className="input-label-sm">Séries, Cargas e Repetições</label>
                    <div className="editor-sets-table">
                      <div className="editor-set-row-header">
                        <span className="col-num">Série</span>
                        <span className="col-weight">Carga (kg)</span>
                        <span className="col-reps">Repetições</span>
                        <span className="col-action"></span>
                      </div>
                      {exercise.sets.map((setObj, sIdx) => (
                        <div key={sIdx} className="editor-set-row">
                          <div className="editor-set-num">{setObj.setNumber || (sIdx + 1)}</div>
                          <input 
                            type="number" 
                            className="editor-set-input"
                            min="0"
                            step="0.5"
                            placeholder="0"
                            value={setObj.weight === 0 ? '' : setObj.weight}
                            onChange={e => handleUpdateSet(eIdx, sIdx, 'weight', e.target.value)}
                          />
                          <input 
                            type="number" 
                            className="editor-set-input"
                            min="0"
                            placeholder="0"
                            value={setObj.reps === 0 ? '' : setObj.reps}
                            onChange={e => handleUpdateSet(eIdx, sIdx, 'reps', e.target.value)}
                          />
                          <button 
                            type="button" 
                            className="editor-set-remove-btn"
                            onClick={() => handleRemoveSet(eIdx, sIdx)}
                            disabled={exercise.sets.length <= 1}
                            title="Remover série"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button 
                      type="button" 
                      className="editor-add-set-btn"
                      onClick={() => handleAddSet(eIdx)}
                    >
                      + Adicionar Série
                    </button>
                  </div>

                  {/* Observações / Anotações Pessoais */}
                  <div className="editor-notes-section">
                    <label className="input-label-sm">
                      <StickyNote size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Observações / Anotações Rápidas de Carga
                    </label>
                    <textarea 
                      className="editor-notes-textarea"
                      rows={2}
                      placeholder="Escreva aqui suas observações sobre o exercício"
                      value={exercise.notes}
                      onChange={e => handleUpdateExercise(eIdx, 'notes', e.target.value)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

            <div className="editor-form-footer">
              <Button type="button" variant="ghost" onClick={() => setIsEditorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={Check} size="lg">
                Salvar Rotina
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Weekly Schedule Modal (USER REQUIREMENT: quais dias e quantas vezes na semana) */}
      {isScheduleModalOpen && (
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title="Escala Semanal & Dias de Treino"
          size="md"
        >
          <form className="schedule-form" onSubmit={handleSaveSchedule}>
            {/* Frequency selector */}
            <div className="schedule-frequency-section" style={{ marginBottom: 20 }}>
              <label style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: 8 }}>
                Quantas vezes por semana você quer treinar?
              </label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[1, 2, 3, 4, 5, 6, 7].map(n => (
                  <button
                    key={n}
                    type="button"
                    className={`onboarding-goal-btn ${(user?.weeklyGoal || 4) === n ? 'active' : ''}`}
                    style={{
                      padding: '10px 18px',
                      borderRadius: 'var(--radius-md)',
                      border: (user?.weeklyGoal || 4) === n ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                      background: (user?.weeklyGoal || 4) === n ? 'var(--accent-muted)' : 'var(--bg-card)',
                      color: (user?.weeklyGoal || 4) === n ? 'var(--accent)' : 'var(--text-secondary)',
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: '1rem',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={() => updateWeeklyGoal(n)}
                  >
                    {n}x
                  </button>
                ))}
              </div>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: 6, display: 'block' }}>
                Meta atual: <strong>{user?.weeklyGoal || 4}x</strong> por semana
              </span>
            </div>

            <p className="schedule-intro-text">
              Defina a rotina de cada dia ou marque como <strong>Descanso</strong>. Os treinos concluídos com foto aparecerão em <strong>Verde</strong> no calendário do grupo!
            </p>

            <div className="schedule-days-list">
              {DAYS_OF_WEEK.map(day => {
                const currentEntry = tempSchedule[day.id] || { type: 'rest', label: 'Descanso' };
                const hasW = currentEntry.hasWorkout ?? (currentEntry.type === 'workout' || currentEntry.type === 'both');
                const hasC = currentEntry.hasCardio ?? (currentEntry.type === 'cardio' || currentEntry.type === 'both');
                const wLabel = currentEntry.workoutLabel || (currentEntry.type === 'workout' ? currentEntry.label : '');
                const cLabel = currentEntry.cardioLabel || (currentEntry.type === 'cardio' ? currentEntry.label : 'Esteira');

                return (
                  <div key={day.id} className="schedule-day-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, padding: '14px', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="schedule-day-name" style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {day.name}
                      </span>
                      <button
                        type="button"
                        style={{
                          padding: '4px 10px',
                          fontSize: '0.6875rem',
                          fontWeight: 700,
                          borderRadius: 'var(--radius-full)',
                          border: '1px solid var(--border-color)',
                          background: (!hasW && !hasC) ? 'rgba(139, 92, 246, 0.25)' : 'var(--bg-elevated)',
                          color: (!hasW && !hasC) ? '#a78bfa' : 'var(--text-tertiary)',
                          cursor: 'pointer'
                        }}
                        onClick={() => {
                          setTempSchedule(prev => ({
                            ...prev,
                            [day.id]: {
                              type: 'rest',
                              label: 'Descanso',
                              hasWorkout: false,
                              workoutLabel: '',
                              hasCardio: false,
                              cardioLabel: ''
                            }
                          }));
                        }}
                      >
                        💤 {!hasW && !hasC ? 'Descanso Ativo' : 'Marcar Descanso'}
                      </button>
                    </div>
                    
                    {/* Treino Principal */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: hasW ? 'rgba(56, 189, 248, 0.05)' : 'var(--bg-elevated)', border: `1px solid ${hasW ? 'rgba(56, 189, 248, 0.3)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: hasW ? '#38bdf8' : 'var(--text-secondary)' }}>
                          🏋️ TREINO PRINCIPAL (MUSCULAÇÃO)
                        </span>
                        <button
                          type="button"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: hasW ? '#38bdf8' : 'var(--border-color)',
                            background: hasW ? '#38bdf8' : 'transparent',
                            color: hasW ? '#000' : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setTempSchedule(prev => ({
                              ...prev,
                              [day.id]: {
                                ...currentEntry,
                                hasWorkout: !hasW,
                                workoutLabel: !hasW ? (wLabel || 'Treino') : '',
                                type: (!hasW && hasC) ? 'both' : (!hasW ? 'workout' : (hasC ? 'cardio' : 'rest'))
                              }
                            }));
                          }}
                        >
                          {hasW ? 'Ativado' : '+ Ativar Treino'}
                        </button>
                      </div>

                      {hasW && (
                        <input
                          type="text"
                          className="schedule-text-input"
                          placeholder="Nome do treino (ex: PUSH (Peito/Tríceps/Ombro), Pernas...)"
                          value={wLabel}
                          onChange={e => {
                            const val = e.target.value;
                            setTempSchedule(prev => ({
                              ...prev,
                              [day.id]: {
                                ...currentEntry,
                                hasWorkout: true,
                                workoutLabel: val,
                                type: hasC ? 'both' : 'workout'
                              }
                            }));
                          }}
                        />
                      )}
                    </div>

                    {/* Cardio / Sub-Treino */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: hasC ? 'rgba(245, 158, 11, 0.05)' : 'var(--bg-elevated)', border: `1px solid ${hasC ? 'rgba(245, 158, 11, 0.35)' : 'var(--border-subtle)'}`, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: hasC ? '#f59e0b' : 'var(--text-secondary)' }}>
                          🏃 CARDIO (SUB-TREINO ORGANIZADO)
                        </span>
                        <button
                          type="button"
                          style={{
                            padding: '3px 8px',
                            fontSize: '0.6875rem',
                            fontWeight: 700,
                            borderRadius: 'var(--radius-sm)',
                            border: '1px solid',
                            borderColor: hasC ? '#f59e0b' : 'var(--border-color)',
                            background: hasC ? '#f59e0b' : 'transparent',
                            color: hasC ? '#000' : 'var(--text-secondary)',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setTempSchedule(prev => ({
                              ...prev,
                              [day.id]: {
                                ...currentEntry,
                                hasCardio: !hasC,
                                cardioLabel: !hasC ? (cLabel || 'Natação') : '',
                                type: (hasW && !hasC) ? 'both' : (!hasC ? 'cardio' : (hasW ? 'workout' : 'rest'))
                              }
                            }));
                          }}
                        >
                          {hasC ? 'Ativado' : '+ Ativar Cardio'}
                        </button>
                      </div>

                      {hasC && (
                        <input
                          type="text"
                          className="schedule-text-input"
                          style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
                          placeholder="Modalidade de cardio (ex: Natação, Esteira 30 min, Bicicleta...)"
                          value={cLabel}
                          onChange={e => {
                            const val = e.target.value;
                            setTempSchedule(prev => ({
                              ...prev,
                              [day.id]: {
                                ...currentEntry,
                                hasCardio: true,
                                cardioLabel: val,
                                type: hasW ? 'both' : 'cardio'
                              }
                            }));
                          }}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="schedule-form-actions">
              <Button type="button" variant="ghost" onClick={() => setIsScheduleModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={Check}>
                Salvar Escala
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Categorized & Fast Exercise Selector Modal */}
      {isExerciseSelectorOpen && (
        <ExerciseSelectorModal
          isOpen={isExerciseSelectorOpen}
          initialCategory={exerciseModalCategory}
          onClose={() => setIsExerciseSelectorOpen(false)}
          onSelectExercise={(selectedEx) => {
            setFormExercises(prev => [
              ...prev,
              {
                id: generateId(),
                muscleGroup: selectedEx.muscleGroup,
                name: selectedEx.name,
                notes: '',
                sets: selectedEx.sets || [
                  { setNumber: 1, weight: 0, reps: 10 }
                ]
              }
            ]);
          }}
        />
      )}
      {/* Nova Rotina Cardio Modal */}
      {isCardioEditorOpen && (
        <Modal
          isOpen={isCardioEditorOpen}
          onClose={() => setIsCardioEditorOpen(false)}
          title={editingCardio ? `Editar Cardio: ${editingCardio.name}` : 'Nova Rotina de Cardio'}
          size="md"
        >
          <form className="routine-editor-form" onSubmit={handleSaveCardio}>
            <Input
              label="Nome da Rotina de Cardio"
              placeholder="Ex: Natação Treino A, Esteira 40 min, Bike HIIT..."
              value={cardioFormName}
              onChange={e => setCardioFormName(e.target.value)}
              required
              autoFocus
            />

            <div className="form-group-custom" style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Modalidade de Cardio
              </label>
              <select
                className="editor-select"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: 4 }}
                value={cardioFormModality}
                onChange={e => {
                  setCardioFormModality(e.target.value);
                  if (!cardioFormName) setCardioFormName(e.target.value);
                }}
              >
                <option value="Natação">🏊 Natação</option>
                <option value="Esteira (Caminhada / Corrida)">🏃 Esteira (Caminhada / Corrida)</option>
                <option value="Bicicleta Ergométrica">🚴 Bicicleta Ergométrica</option>
                <option value="Elíptico / Transport">⚡ Elíptico / Transport</option>
                <option value="Remo Seco">🚣 Remo Seco</option>
                <option value="Simulador de Escada">🪜 Simulador de Escada</option>
                <option value="Corda de Pular">🪢 Corda de Pular</option>
                <option value="Corrida / Caminhada ao Ar Livre">🌳 Corrida / Caminhada ao Ar Livre</option>
                <option value="Outro">✨ Outra Modalidade</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 12 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Duração (min)
                </label>
                <input
                  type="number"
                  min="1"
                  className="editor-text-input"
                  style={{ marginTop: 4 }}
                  value={cardioFormDuration}
                  onChange={e => setCardioFormDuration(e.target.value)}
                  required
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Distância (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="editor-text-input"
                  placeholder="0.0"
                  style={{ marginTop: 4 }}
                  value={cardioFormDistance}
                  onChange={e => setCardioFormDistance(e.target.value)}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Calorias (kcal)
                </label>
                <input
                  type="number"
                  min="0"
                  className="editor-text-input"
                  placeholder="0"
                  style={{ marginTop: 4 }}
                  value={cardioFormCalories}
                  onChange={e => setCardioFormCalories(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group-custom" style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Vincular a um Dia da Semana (Opcional)
              </label>
              <select
                className="editor-select"
                style={{ width: '100%', padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', marginTop: 4 }}
                value={cardioFormScheduledDay}
                onChange={e => setCardioFormScheduledDay(e.target.value)}
              >
                <option value="">Nenhum dia específico</option>
                <option value="1">Segunda-feira</option>
                <option value="2">Terça-feira</option>
                <option value="3">Quarta-feira</option>
                <option value="4">Quinta-feira</option>
                <option value="5">Sexta-feira</option>
                <option value="6">Sábado</option>
                <option value="0">Domingo</option>
              </select>
              <small style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                Ao vincular, esta rotina de cardio ficará automaticamente programada como sub-treino logo abaixo do treino principal do dia!
              </small>
            </div>

            <div className="form-group-custom" style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Observações ou Instruções (Opcional)
              </label>
              <textarea
                className="editor-notes-textarea"
                rows={2}
                placeholder="Ex: Treino contínuo, tiros de velocidade, manter FC na zona 3..."
                value={cardioFormNotes}
                onChange={e => setCardioFormNotes(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>

            <div className="editor-form-footer" style={{ marginTop: 18 }}>
              <Button type="button" variant="ghost" onClick={() => setIsCardioEditorOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={Check} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Salvar Rotina Cardio
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Bate-Ponto Cardio Modal */}
      {isCardioCheckinOpen && (
        <Modal
          isOpen={isCardioCheckinOpen}
          onClose={() => setIsCardioCheckinOpen(false)}
          title={`🏃 Bate-Ponto: ${checkinCardioName}`}
          size="md"
        >
          <form className="routine-editor-form" onSubmit={handleConfirmCardioCheckin}>
            {checkinCardioError && (
              <div style={{ padding: '10px 14px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-md)', color: '#ef4444', fontSize: '0.8125rem', marginBottom: 12 }}>
                ⚠️ {checkinCardioError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Input
                label="Duração Realizada (minutos)"
                type="number"
                min="1"
                value={checkinCardioDuration}
                onChange={e => setCheckinCardioDuration(e.target.value)}
                required
              />
              <Input
                label="Distância (km) - Opcional"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.0"
                value={checkinCardioDistance}
                onChange={e => setCheckinCardioDistance(e.target.value)}
              />
            </div>

            <Input
              label="Calorias Queimadas (kcal) - Opcional"
              type="number"
              min="0"
              placeholder="0"
              value={checkinCardioCalories}
              onChange={e => setCheckinCardioCalories(e.target.value)}
            />

            <div className="form-group-custom" style={{ marginTop: 12 }}>
              <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Como foi a sessão de cardio?
              </label>
              <textarea
                className="editor-notes-textarea"
                rows={2}
                placeholder="Ex: Ritmo forte na esteira, ótimo fôlego!"
                value={checkinCardioNotes}
                onChange={e => setCheckinCardioNotes(e.target.value)}
                style={{ marginTop: 4 }}
              />
            </div>

            {/* Foto Comprobatória - Regra: Opcional pessoal, obrigatória para grupo */}
            <div className="form-group-custom" style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  📸 Foto Comprobatória
                </label>
                <span style={{ fontSize: '0.6875rem', fontWeight: 700, color: checkinCardioShare ? '#ef4444' : 'var(--text-tertiary)' }}>
                  {checkinCardioShare ? '* Obrigatório para postar no grupo' : '(Opcional para registro pessoal)'}
                </span>
              </div>

              {checkinCardioPhoto ? (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 180 }}>
                  <img src={checkinCardioPhoto} alt="Comprovante de cardio" style={{ width: '100%', maxHeight: 180, objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setCheckinCardioPhoto(null)}
                    style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => cardioPhotoRef.current?.click()}
                  style={{
                    border: '1px dashed var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '16px',
                    textAlign: 'center',
                    background: 'var(--bg-elevated)',
                    cursor: 'pointer'
                  }}
                >
                  <Camera size={24} style={{ color: '#f59e0b', margin: '0 auto 6px auto', display: 'block' }} />
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Tirar foto ou anexar imagem</span>
                  <input
                    type="file"
                    ref={cardioPhotoRef}
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = ev => setCheckinCardioPhoto(ev.target?.result);
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Toggle postar no feed */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, padding: '10px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <input
                type="checkbox"
                id="checkin-cardio-share"
                checked={checkinCardioShare}
                onChange={e => setCheckinCardioShare(e.target.checked)}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: '#f59e0b' }}
              />
              <label htmlFor="checkin-cardio-share" style={{ fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>
                Postar no Feed do Grupo (Requer foto)
              </label>
            </div>

            <div className="editor-form-footer" style={{ marginTop: 18 }}>
              <Button type="button" variant="ghost" onClick={() => setIsCardioCheckinOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={Check} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                Confirmar Bate-Ponto Cardio
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
