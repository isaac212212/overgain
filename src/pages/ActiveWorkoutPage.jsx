import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { 
  ArrowLeft, 
  Clock, 
  Check, 
  MoreVertical, 
  Timer, 
  Camera, 
  Upload, 
  Trash2, 
  Share2, 
  Flame, 
  Sparkles,
  Plus,
  StickyNote,
  Dumbbell
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import ExerciseSelectorModal from '../components/ui/ExerciseSelectorModal';
import './ActiveWorkoutPage.css';

export default function ActiveWorkoutPage() {
  const { user } = useAuth();
  const { 
    activeWorkout, 
    updateActiveWorkout, 
    cancelActiveWorkout, 
    finishActiveWorkout,
    groups
  } = useData();
  const navigate = useNavigate();

  // Stopwatch state
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    if (activeWorkout?.startTime) {
      return Math.max(0, Math.round((Date.now() - activeWorkout.startTime) / 1000));
    }
    return 0;
  });

  // Finish modal state
  const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
  const [isAddExerciseModalOpen, setIsAddExerciseModalOpen] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [workoutTitle, setWorkoutTitle] = useState(activeWorkout?.routineName || 'Treino Concluído');
  const [generalNotes, setGeneralNotes] = useState('');
  const [shareToGroup, setShareToGroup] = useState(true);
  const [isPublic, setIsPublic] = useState(user?.privacy?.publicRoutines ?? true);
  const [showWeights, setShowWeights] = useState(user?.privacy?.publicWeights ?? true);

  // Medal state: { "exerciseIdx-setIdx": { kg: "+2.5kg", reps: "+2 reps" } }
  const [medals, setMedals] = useState({});

  // REST TIMER ON-DEMAND STATE
  const [restEnabled, setRestEnabled] = useState(true);
  const [restDuration, setRestDuration] = useState(90); // default 90s (1m30s)
  const [restSecondsLeft, setRestSecondsLeft] = useState(0);
  const [isResting, setIsResting] = useState(false);
  const [totalRestSeconds, setTotalRestSeconds] = useState(0);
  const [restCompletedBanner, setRestCompletedBanner] = useState(false);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // If no active workout is running, redirect to /routines
  useEffect(() => {
    if (!activeWorkout) {
      navigate('/routines');
    }
  }, [activeWorkout, navigate]);

  // Running workout stopwatch
  useEffect(() => {
    if (!activeWorkout) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.round((Date.now() - activeWorkout.startTime) / 1000)));
    }, 1000);

    return () => clearInterval(interval);
  }, [activeWorkout]);

  // Running rest timer countdown & total rested accumulator
  useEffect(() => {
    let restInterval = null;

    if (isResting && restSecondsLeft > 0) {
      restInterval = setInterval(() => {
        setRestSecondsLeft(prev => {
          if (prev <= 1) {
            setIsResting(false);
            setRestCompletedBanner(true);
            setTimeout(() => setRestCompletedBanner(false), 5000);
            return 0;
          }
          return prev - 1;
        });
        setTotalRestSeconds(t => t + 1);
      }, 1000);
    } else if (restSecondsLeft === 0 && isResting) {
      setIsResting(false);
    }

    return () => {
      if (restInterval) clearInterval(restInterval);
    };
  }, [isResting, restSecondsLeft]);

  // Helper to start rest with specific seconds
  const startRestTimer = (seconds = restDuration) => {
    setRestDuration(seconds);
    setRestSecondsLeft(seconds);
    setIsResting(true);
    setRestCompletedBanner(false);
  };

  // Helper to add +30s to current rest
  const addRestTime = (extraSeconds = 30) => {
    setRestSecondsLeft(prev => prev + extraSeconds);
    if (!isResting) {
      setIsResting(true);
    }
  };

  // Helper to stop/skip rest
  const stopRestTimer = () => {
    setIsResting(false);
    setRestSecondsLeft(0);
  };

  // Format seconds to mm:ss or hh:mm:ss
  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hrs}:${remainingMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Compute live volume and completed sets
  let liveVolume = 0;
  let liveCompletedSets = 0;
  const muscleVolumes = {};

  activeWorkout?.exercises?.forEach(ex => {
    const muscle = ex.muscleGroup || 'Geral';
    if (!muscleVolumes[muscle]) muscleVolumes[muscle] = 0;

    ex.sets?.forEach(s => {
      if (s.completed) {
        const w = s.weight !== undefined && s.weight !== '' ? Number(s.weight) : (Number(s.previousWeight) || 0);
        const r = s.reps !== undefined && s.reps !== '' ? Number(s.reps) : (Number(s.previousReps) || 0);
        const vol = (isNaN(w) ? 0 : w) * (isNaN(r) ? 0 : r);
        liveVolume += vol;
        muscleVolumes[muscle] += vol;
        liveCompletedSets++;
      }
    });
  });

  // Toggle set completion with adopt-previous logic, medal check and auto-rest trigger
  const handleToggleSet = (exerciseIdx, setIdx) => {
    if (!activeWorkout) return;
    const updatedExercises = JSON.parse(JSON.stringify(activeWorkout.exercises));
    const targetSet = updatedExercises[exerciseIdx].sets[setIdx];
    
    if (!targetSet.completed) {
      // Marking as completed
      // If weight or reps is empty string, adopt previous value if exists or fallback
      if (targetSet.weight === undefined || targetSet.weight === '') {
        targetSet.weight = targetSet.previousWeight !== undefined ? targetSet.previousWeight : 0;
      }
      if (targetSet.reps === undefined || targetSet.reps === '') {
        targetSet.reps = targetSet.previousReps !== undefined ? targetSet.previousReps : 10;
      }
      targetSet.completed = true;

      // Medal check: compare with previous
      const medalKey = `${exerciseIdx}-${setIdx}`;
      const prevW = targetSet.previousWeight || 0;
      const prevR = targetSet.previousReps || 0;
      const curW = Number(targetSet.weight);
      const curR = Number(targetSet.reps);
      const newMedals = {};

      if (curW > prevW && prevW > 0) {
        newMedals.kg = `+${(curW - prevW).toFixed(1).replace(/\.0$/, '')}kg`;
      }
      if (curR > prevR && prevR > 0) {
        newMedals.reps = `+${curR - prevR} reps`;
      }

      if (newMedals.kg || newMedals.reps) {
        setMedals(prev => ({ ...prev, [medalKey]: newMedals }));
      }

      // Auto-trigger rest timer if enabled
      if (restEnabled) {
        startRestTimer(restDuration);
      }
    } else {
      // Unmarking
      targetSet.completed = false;
      const medalKey = `${exerciseIdx}-${setIdx}`;
      setMedals(prev => {
        const copy = { ...prev };
        delete copy[medalKey];
        return copy;
      });
    }

    updateActiveWorkout({ exercises: updatedExercises });
  };

  // Update set weight or reps
  const handleUpdateSet = (exerciseIdx, setIdx, field, val) => {
    if (!activeWorkout) return;
    const updatedExercises = JSON.parse(JSON.stringify(activeWorkout.exercises));
    updatedExercises[exerciseIdx].sets[setIdx][field] = Number(val) || 0;
    updateActiveWorkout({ exercises: updatedExercises });
  };

  // Update exercise notes (observation field)
  const handleUpdateNotes = (exerciseIdx, val) => {
    if (!activeWorkout) return;
    const updatedExercises = JSON.parse(JSON.stringify(activeWorkout.exercises));
    updatedExercises[exerciseIdx].notes = val;
    updateActiveWorkout({ exercises: updatedExercises });
  };

  // Add set
  const handleAddSet = (exerciseIdx) => {
    if (!activeWorkout) return;
    const updatedExercises = JSON.parse(JSON.stringify(activeWorkout.exercises));
    const sets = updatedExercises[exerciseIdx].sets;
    const lastSet = sets[sets.length - 1] || { previousWeight: 20, previousReps: 10 };
    const pw = lastSet.previousWeight || lastSet.weight || 20;
    const pr = lastSet.previousReps || lastSet.reps || 10;
    sets.push({
      setNumber: sets.length + 1,
      weight: 0,
      reps: 0,
      completed: false,
      previousWeight: pw,
      previousReps: pr,
      previous: `${pw}kg x ${pr}`
    });
    updateActiveWorkout({ exercises: updatedExercises });
  };

  // Handle Photo selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Discard / Cancel workout
  const handleDiscard = () => {
    if (confirm('Deseja cancelar esta sessão de treino? Os dados não serão salvos.')) {
      cancelActiveWorkout();
      navigate('/routines');
    }
  };

  // Confirm final finish
  const handleConfirmFinish = (e) => {
    e.preventDefault();

    if (shareToGroup && !photoPreview) {
      alert('Para validar seu treino no ranking do grupo e postar no feed, a inclusão da foto de comprovação é OBRIGATÓRIA! Caso deseje salvar apenas no seu histórico pessoal sem foto, desmarque a opção "Postar no grupo".');
      return;
    }

    finishActiveWorkout({
      photoUrl: photoPreview,
      notes: generalNotes,
      title: workoutTitle,
      shareToGroup,
      isPublic,
      showWeights,
      user
    });

    setIsFinishModalOpen(false);
    navigate('/groups');
  };

  if (!activeWorkout) return null;

  return (
    <div className="active-workout-page animate-fade-in">
      {/* Top Bar matching Image 2 */}
      <header className="active-workout-header">
        <button 
          className="header-back-btn"
          onClick={handleDiscard}
          title="Descartar treino"
        >
          <ArrowLeft size={18} />
          <span>Treino</span>
        </button>

        {/* Live Stopwatch with Clock Icon */}
        <div className="active-timer-pill">
          <Clock size={16} className="text-accent" />
          <span className="active-timer-digits">{formatTimer(elapsedSeconds)}</span>
        </div>

        {/* Big Blue Concluir Button */}
        <button 
          className="btn-concluir-action"
          onClick={() => setIsFinishModalOpen(true)}
          id="btn-concluir-workout"
        >
          Concluir
        </button>
      </header>

      {/* Metrics Row: Duração, Volume, Séries, Muscle Anatomy icon */}
      <div className="active-metrics-summary-bar">
        <div className="metric-cell">
          <span className="metric-label">Duração</span>
          <span className="metric-value text-accent">{formatTimer(elapsedSeconds)}</span>
        </div>

        <div className="metric-cell">
          <span className="metric-label">Volume</span>
          <span className="metric-value">{liveVolume.toLocaleString('pt-BR')} kg</span>
        </div>

        <div className="metric-cell">
          <span className="metric-label">Séries</span>
          <span className="metric-value">{liveCompletedSets}</span>
        </div>

        <div className="metric-anatomy-icon">
          <Dumbbell size={22} className="text-secondary" />
        </div>
      </div>

      {/* Live Volume by Muscle Group */}
      <div className="active-muscle-volumes">
        {Object.entries(muscleVolumes).map(([muscle, vol]) => (
          <div key={muscle} className="muscle-volume-badge">
            <span className="muscle-name">{muscle}</span>
            <strong className="muscle-vol-val">{vol.toLocaleString('pt-BR')} kg</strong>
          </div>
        ))}
      </div>

      {/* BANNER: REST COMPLETED ALERT */}
      {restCompletedBanner && (
        <div className="rest-completed-banner animate-bounce">
          <Sparkles size={18} />
          <strong>⏰ Tempo de descanso encerrado!</strong>
          <span>Bora pra próxima série! 💪</span>
        </div>
      )}

      {/* REST TIMER ON-DEMAND CONTROL PANEL */}
      <div className={`rest-timer-panel ${isResting ? 'rest-timer-panel-active' : ''}`}>
        <div className="rest-timer-top-row">
          <div className="rest-timer-status-title">
            <Timer size={18} className={isResting ? 'text-accent animate-pulse' : 'text-secondary'} />
            <div>
              <div className="rest-title-text">
                Cronômetro de Descanso
                {isResting && <span className="rest-active-badge">DESCANSANDO</span>}
              </div>
              <div className="rest-total-tracked">
                Total descansado nesta sessão: <strong>{formatTimer(totalRestSeconds)}</strong>
              </div>
            </div>
          </div>

          {/* Toggle On/Off Switch */}
          <label className="rest-toggle-switch" title="Ativar/Desativar disparo automático ao marcar série">
            <span className="rest-toggle-label">{restEnabled ? 'Ligado' : 'Desligado'}</span>
            <input 
              type="checkbox" 
              checked={restEnabled} 
              onChange={e => setRestEnabled(e.target.checked)} 
            />
            <span className="rest-slider"></span>
          </label>
        </div>

        {/* Live Countdown & Progress when resting */}
        {isResting && (
          <div className="rest-countdown-live-block">
            <div className="rest-countdown-digits-row">
              <span className="rest-countdown-big">{formatTimer(restSecondsLeft)}</span>
              <div className="rest-countdown-actions">
                <button 
                  type="button" 
                  className="rest-action-btn-add"
                  onClick={() => addRestTime(30)}
                  title="Adicionar 30 segundos"
                >
                  +30s
                </button>
                <button 
                  type="button" 
                  className="rest-action-btn-skip"
                  onClick={stopRestTimer}
                  title="Pular descanso"
                >
                  Pular
                </button>
              </div>
            </div>
            
            {/* Visual Progress Bar */}
            <div className="rest-progress-bar-bg">
              <div 
                className="rest-progress-bar-fill" 
                style={{ width: `${Math.min(100, Math.max(0, (restSecondsLeft / (restDuration || 90)) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Quick Duration Preset Pills */}
        <div className="rest-presets-row">
          <span className="rest-presets-label">Ajustar tempo:</span>
          <div className="rest-preset-buttons">
            {[
              { label: '30s', val: 30 },
              { label: '1m', val: 60 },
              { label: '1m30s', val: 90 },
              { label: '2m', val: 120 },
              { label: '3m', val: 180 },
            ].map(p => (
              <button
                key={p.val}
                type="button"
                className={`rest-preset-pill ${restDuration === p.val ? 'active' : ''}`}
                onClick={() => {
                  setRestDuration(p.val);
                  if (isResting) {
                    setRestSecondsLeft(p.val);
                  }
                }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {!isResting && (
            <button 
              type="button" 
              className="rest-start-manual-btn"
              onClick={() => startRestTimer(restDuration)}
            >
              Iniciar {formatTimer(restDuration)}
            </button>
          )}
        </div>
      </div>

      {/* Routine Title Sub-header */}
      <div className="active-routine-title-bar">
        <h2>{activeWorkout.routineName}</h2>
        <span className="active-routine-sub">Sessão em andamento</span>
      </div>

      {/* Exercise Cards matching Image 2 */}
      <div className="active-exercises-list">
        {activeWorkout.exercises?.map((exercise, eIdx) => (
          <Card key={exercise.id || eIdx} className="active-exercise-card" padding="md">
            {/* Exercise Header */}
            <div className="exercise-card-header">
              <div className="exercise-title-group">
                <span className="exercise-index-pill">#{eIdx + 1}</span>
                <h3 className="exercise-name-text">{exercise.name}</h3>
              </div>
              <button className="exercise-options-btn" aria-label="Opções do exercício">
                <MoreVertical size={18} />
              </button>
            </div>

            {/* MANDATORY FIELD: "Adicione notas aqui..." (Observações do Exercício) */}
            <div className="exercise-quick-notes-wrapper">
              <input
                type="text"
                className="exercise-notes-input"
                placeholder="Adicione notas aqui (ex: senti dor no cotovelo, aumentar carga)..."
                value={exercise.notes || ''}
                onChange={e => handleUpdateNotes(eIdx, e.target.value)}
              />
            </div>

            {/* Rest timer indicator */}
            <div className="exercise-rest-indicator">
              <Timer size={14} className={restEnabled ? 'text-accent' : 'text-secondary'} />
              <span>
                Descanso: <strong>{restEnabled ? `${formatTimer(restDuration)} (Automático)` : 'DESATIVADO'}</strong>
              </span>
              {!isResting && (
                <button 
                  type="button" 
                  className="quick-trigger-rest-link"
                  onClick={() => startRestTimer(restDuration)}
                >
                  Descansar agora
                </button>
              )}
            </div>

            {/* Sets Table matching Image 2 */}
            <div className="active-sets-table">
              <div className="sets-table-header-row">
                <span className="col-set">SÉRIE</span>
                <span className="col-prev">ANTERIOR</span>
                <span className="col-kg">🏋️ KG</span>
                <span className="col-reps">REPS</span>
                <span className="col-check">✓</span>
              </div>

              {exercise.sets?.map((setObj, sIdx) => {
                const medalKey = `${eIdx}-${sIdx}`;
                const medal = medals[medalKey];

                return (
                  <div key={sIdx}>
                    <div 
                      className={`set-table-row ${setObj.completed ? 'set-completed' : ''}`}
                    >
                      <span className="col-set set-number-badge">
                        {setObj.setNumber || sIdx + 1}
                      </span>

                      <span className="col-prev prev-badge">
                        {setObj.previous || '-'}
                      </span>

                      <div className="col-kg">
                        <input 
                          type="number"
                          className="table-input table-input-placeholder"
                          step="0.5"
                          placeholder={String(setObj.previousWeight || 20)}
                          value={setObj.weight || ''}
                          onChange={e => handleUpdateSet(eIdx, sIdx, 'weight', e.target.value)}
                        />
                      </div>

                      <div className="col-reps">
                        <input 
                          type="number"
                          className="table-input table-input-placeholder"
                          min="1"
                          placeholder={String(setObj.previousReps || 10)}
                          value={setObj.reps || ''}
                          onChange={e => handleUpdateSet(eIdx, sIdx, 'reps', e.target.value)}
                        />
                      </div>

                      {/* Checkmark button that turns blue/green */}
                      <div className="col-check">
                        <button
                          type="button"
                          className={`check-set-btn ${setObj.completed ? 'completed' : ''}`}
                          onClick={() => handleToggleSet(eIdx, sIdx)}
                          title={setObj.completed ? 'Concluída' : 'Marcar concluída'}
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Medal badge when progression detected */}
                    {medal && (
                      <div className="medal-badge animate-scale-in">
                        {medal.kg && <span className="medal-tag">🏅 {medal.kg}</span>}
                        {medal.reps && <span className="medal-tag">🏅 {medal.reps}</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Add Set Button */}
            <button 
              type="button" 
              className="btn-add-exercise-set"
              onClick={() => handleAddSet(eIdx)}
            >
              + Adicionar série
            </button>
          </Card>
        ))}

        {/* Button to add new exercise to live workout session */}
        <button
          type="button"
          className="btn-add-new-exercise-live"
          onClick={() => setIsAddExerciseModalOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            width: '100%',
            padding: '14px',
            background: 'var(--bg-card)',
            border: '1px dashed var(--accent)',
            borderRadius: 'var(--radius-lg)',
            color: 'var(--accent)',
            fontWeight: 700,
            fontSize: '0.9375rem',
            cursor: 'pointer',
            marginTop: 12
          }}
        >
          <Plus size={18} />
          <span>Adicionar Exercício do Catálogo</span>
        </button>
      </div>

      {/* Categorized Exercise Selector Modal for Live Workout */}
      {isAddExerciseModalOpen && (
        <ExerciseSelectorModal
          isOpen={isAddExerciseModalOpen}
          onClose={() => setIsAddExerciseModalOpen(false)}
          onSelectExercise={(selectedEx) => {
            const updatedExercises = JSON.parse(JSON.stringify(activeWorkout.exercises || []));
            updatedExercises.push({
              name: selectedEx.name,
              muscleGroup: selectedEx.muscleGroup,
              notes: '',
              sets: (selectedEx.sets || [{ setNumber: 1, weight: 0, reps: 0 }]).map((s, sIdx) => ({
                setNumber: sIdx + 1,
                weight: 0,
                reps: s.reps ?? 0,
                completed: false,
                previousWeight: 0,
                previousReps: 0,
                previous: '—'
              }))
            });
            updateActiveWorkout({ exercises: updatedExercises });
          }}
        />
      )}

      {/* Finish Workout Modal with Mandatory Photo Proof */}
      {isFinishModalOpen && (
        <Modal
          isOpen={isFinishModalOpen}
          onClose={() => setIsFinishModalOpen(false)}
          title="Finalizar Treino & Comprovar"
          size="md"
        >
          <form className="finish-workout-form" onSubmit={handleConfirmFinish}>
            <div className="finish-stats-preview">
              <div className="finish-stat-chip">
                <span>Duração:</span>
                <strong>{formatTimer(elapsedSeconds)}</strong>
              </div>
              <div className="finish-stat-chip">
                <span>Descanso:</span>
                <strong>{formatTimer(totalRestSeconds)}</strong>
              </div>
              <div className="finish-stat-chip">
                <span>Volume:</span>
                <strong>{liveVolume.toLocaleString('pt-BR')} kg</strong>
              </div>
              <div className="finish-stat-chip">
                <span>Séries:</span>
                <strong>{liveCompletedSets} concluídas</strong>
              </div>
            </div>

            {/* Photo Proof (MANDATORY REQUIREMENT) */}
            <div className="finish-photo-container">
              <label className="finish-field-label">
                Foto Comprobatória do Treino {shareToGroup ? <span className="text-accent">* Obrigatória para validar no Grupo</span> : <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(Opcional para registro pessoal)</span>}
              </label>

              {photoPreview ? (
                <div className="finish-photo-preview-box">
                  <img src={photoPreview} alt="Foto comprovante" className="finish-preview-img" />
                  <div className="finish-photo-overlay-stamp">
                    <span>OVERGAIN VERIFIED</span>
                    <small>{formatTimer(elapsedSeconds)} de treino</small>
                  </div>
                  <button 
                    type="button" 
                    className="retake-btn"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    Trocar Foto
                  </button>
                </div>
              ) : (
                <div className="finish-photo-upload-grid">
                  <button 
                    type="button" 
                    className="photo-btn-primary"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera size={28} />
                    <strong>Tirar Foto na Câmera</strong>
                    <span>Espelho / Equipamento</span>
                  </button>

                  <button 
                    type="button" 
                    className="photo-btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={20} />
                    <span>Escolher da Galeria</span>
                  </button>
                </div>
              )}

              <input 
                ref={cameraInputRef}
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handlePhotoSelect} 
                style={{ display: 'none' }} 
              />
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handlePhotoSelect} 
                style={{ display: 'none' }} 
              />
            </div>

            {/* Post Title */}
            <div className="finish-field">
              <label className="finish-field-label">Título da Postagem</label>
              <input 
                type="text"
                className="finish-text-input"
                placeholder="Ex: Push com Gabs, Puxar e empurrar..."
                value={workoutTitle}
                onChange={e => setWorkoutTitle(e.target.value)}
                required
              />
            </div>

            {/* General Notes */}
            <div className="finish-field">
              <label className="finish-field-label">Observações Gerais do Treino</label>
              <textarea 
                className="finish-textarea"
                rows={2}
                placeholder="Como foi o treino? Alguma dor, progresso de carga ou sensação?"
                value={generalNotes}
                onChange={e => setGeneralNotes(e.target.value)}
              />
            </div>

            {/* Auto post to group */}
            {groups.length > 0 && (
              <div className="finish-privacy-section" style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
                <label className="finish-share-toggle">
                  <input 
                    type="checkbox" 
                    checked={shareToGroup}
                    onChange={e => setShareToGroup(e.target.checked)}
                  />
                  <div className="share-toggle-text">
                    <strong>Postar automaticamente no grupo "{groups[0]?.name}"</strong>
                    <span>Seus amigos verão sua foto, o treino realizado e as cargas.</span>
                  </div>
                </label>
                
                {shareToGroup && (
                  <>
                    <label className="finish-share-toggle">
                      <input 
                        type="checkbox" 
                        checked={isPublic}
                        onChange={e => setIsPublic(e.target.checked)}
                      />
                      <div className="share-toggle-text">
                        <strong>Treino Público</strong>
                        <span>Permite que outros vejam seu treino no feed.</span>
                      </div>
                    </label>

                    <label className="finish-share-toggle">
                      <input 
                        type="checkbox" 
                        checked={showWeights}
                        onChange={e => setShowWeights(e.target.checked)}
                      />
                      <div className="share-toggle-text">
                        <strong>Mostrar Cargas</strong>
                        <span>Torna públicas as cargas/pesos do seu treino. A divisão continuará pública.</span>
                      </div>
                    </label>
                  </>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="finish-modal-actions">
              <Button type="button" variant="ghost" onClick={() => setIsFinishModalOpen(false)}>
                Continuar Treinando
              </Button>
              <Button type="submit" variant="success" size="lg" icon={Check}>
                Finalizar & Postar Treino
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
