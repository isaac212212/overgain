import { useState } from 'react';
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
  ClipboardList
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
    checkins,
    addRoutine, 
    updateRoutine, 
    deleteRoutine, 
    duplicateRoutine,
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

  // Editor form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formScheduledDay, setFormScheduledDay] = useState('');
  const [formExercises, setFormExercises] = useState([]);

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

  // Open editor for new routine
  const handleOpenNewRoutine = () => {
    setEditingRoutine(null);
    setFormName('');
    setFormDescription('');
    setFormScheduledDay('');
    setFormExercises([
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

      {/* Action Buttons Row matching Image 1: [ Nova rotina ] [ Explorar ] */}
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
      </div>

      {/* PROGRAMAÇÃO DE HOJE: TREINO PRINCIPAL + CARDIO COMO SUB-TREINO */}
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
                      🏋️ TREINO PRINCIPAL
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
                    Iniciar Treino
                  </Button>
                </div>

                {matchedRoutine?.exercises?.length > 0 && (
                  <ul style={{ margin: '4px 0 0 0', paddingLeft: 16, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                    {matchedRoutine.exercises.map((ex, i) => (
                      <li key={i}>{ex.name}</li>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.6875rem', fontWeight: 800, color: '#f59e0b' }}>
                      🏃 CARDIO / SUB-TREINO
                    </span>
                    <h4 style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#f59e0b', margin: '2px 0 0 0' }}>
                      {cTitle}
                    </h4>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => navigate('/')}
                    style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
                  >
                    Bater Ponto Cardio
                  </Button>
                </div>
                <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  • {cTitle}
                </p>
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
              <div className="editor-section-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>Exercícios & Cardio da Ficha ({formExercises.length})</h3>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleAddExercise}
                  >
                    + Linha Vazia
                  </Button>
                </div>

                {/* BOTÕES CENTRAIS: Adicionar Exercício e Adicionar Cardio */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%' }}>
                  <Button 
                    type="button" 
                    variant="primary" 
                    size="md" 
                    icon={Plus}
                    onClick={() => {
                      setExerciseModalCategory('Todos');
                      setIsExerciseSelectorOpen(true);
                    }}
                    style={{ justifyContent: 'center' }}
                  >
                    Adicionar Exercício
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    size="md" 
                    onClick={() => {
                      setExerciseModalCategory('Cardio');
                      setIsExerciseSelectorOpen(true);
                    }}
                    style={{ borderColor: '#f59e0b', color: '#f59e0b', justifyContent: 'center' }}
                  >
                    🏃 Adicionar Cardio
                  </Button>
                </div>
              </div>

              {formExercises.map((exercise, eIdx) => (
                <div key={exercise.id} className="editor-exercise-card">
                  <div className="editor-exercise-top-bar">
                    <span className="editor-exercise-idx">Exercício #{eIdx + 1}</span>
                    <button 
                      type="button" 
                      className="editor-remove-btn"
                      onClick={() => handleRemoveExercise(eIdx)}
                      title="Remover exercício"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="editor-exercise-fields">
                    <div className="editor-muscle-group-select">
                      <label className="input-label-sm">Grupo Muscular</label>
                      <select
                        className="editor-select"
                        value={exercise.muscleGroup}
                        onChange={e => handleUpdateExercise(eIdx, 'muscleGroup', e.target.value)}
                      >
                        {DEFAULT_MUSCLE_GROUPS.map(mg => (
                          <option key={mg} value={mg}>{mg}</option>
                        ))}
                      </select>
                    </div>

                    <div className="editor-exercise-name-input">
                      <label className="input-label-sm">Nome do Exercício</label>
                      <input 
                        type="text"
                        className="editor-text-input"
                        placeholder="Escreva aqui o nome do exercício (ex: Supino Reto)"
                        value={exercise.name}
                        onChange={e => handleUpdateExercise(eIdx, 'name', e.target.value)}
                        required
                      />
                    </div>
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
              ))}
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
    </div>
  );
}
