import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useFrequencyStats } from '../hooks/useFrequencyStats';
import { 
  Camera, 
  Flame, 
  Calendar as CalendarIcon, 
  Trophy, 
  Dumbbell, 
  ChevronRight, 
  ChevronLeft,
  Clock, 
  Weight, 
  Repeat,
  PlusCircle,
  Users,
  Activity,
  AlertTriangle,
  Upload,
  Check
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Avatar from '../components/ui/Avatar';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import { 
  getMonthName, 
  getCalendarDaysCurrentOnly, 
  formatRelative, 
  isSameDay 
} from '../utils/dateHelpers';
import './DashboardPage.css';

export default function DashboardPage() {
  const { user } = useAuth();
  const { 
    checkins, 
    routines, 
    cardioRoutines,
    groups, 
    weeklySchedule, 
    logCardio, 
    addJustifiedAbsence, 
    justifiedAbsences 
  } = useData();
  const stats = useFrequencyStats();
  const navigate = useNavigate();

  // Integrated Cardio Timer state
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

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date());
  const currentMonth = viewDate.getMonth();
  const currentYear = viewDate.getFullYear();
  const calendarDays = getCalendarDaysCurrentOnly(currentYear, currentMonth);

  // Cardio Modal State
  const [isCardioModalOpen, setIsCardioModalOpen] = useState(false);
  const [cardioType, setCardioType] = useState('Corrida');
  const [cardioDuration, setCardioDuration] = useState('30');
  const [cardioDistance, setCardioDistance] = useState('');
  const [cardioCalories, setCardioCalories] = useState('');
  const [cardioNotes, setCardioNotes] = useState('');
  const [cardioPhoto, setCardioPhoto] = useState(null);
  const [cardioShareGroup, setCardioShareGroup] = useState(true);
  const [cardioError, setCardioError] = useState('');
  const cardioPhotoInputRef = useRef(null);

  // Absence Modal State
  const [isAbsenceModalOpen, setIsAbsenceModalOpen] = useState(false);
  const [absenceAction, setAbsenceAction] = useState('adiado'); // 'adiado' | 'cancelado'
  const [absenceReason, setAbsenceReason] = useState('Imprevisto');
  const [absenceNewDate, setAbsenceNewDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });

  const prevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const goToToday = () => {
    setViewDate(new Date());
  };

  const isCurrentMonthView = viewDate.getFullYear() === today.getFullYear() && viewDate.getMonth() === today.getMonth();

  const weeklyGoal = user?.weeklyGoal || 4;
  const monthlyGoal = weeklyGoal * 4;
  const weeklyProgress = Math.min(100, Math.round((stats.week / weeklyGoal) * 100));
  const monthlyProgress = Math.min(100, Math.round((stats.month / monthlyGoal) * 100));

  const todayDayOfWeek = today.getDay();
  const todaySchedule = weeklySchedule?.[todayDayOfWeek];
  const todayTrainedWorkout = checkins.some(c => c.type !== 'cardio' && isSameDay(c.date, today));
  const todayTrainedCardio = checkins.some(c => (c.type === 'cardio' || c.isCardio) && isSameDay(c.date, today));
  const todayHasAbsence = (justifiedAbsences || []).some(a => isSameDay(a.date, today));

  const DAYS_OF_WEEK_NAMES = {
    0: 'Domingo',
    1: 'Segunda-feira',
    2: 'Terça-feira',
    3: 'Quarta-feira',
    4: 'Quinta-feira',
    5: 'Sexta-feira',
    6: 'Sábado'
  };

  const matchedTodayRoutine = (routines || []).find(r => 
    r.scheduledDay === todayDayOfWeek || 
    (r.name && todaySchedule?.workoutLabel && r.name.toLowerCase() === todaySchedule.workoutLabel.toLowerCase()) ||
    (r.name && todaySchedule?.label && r.name.toLowerCase() === todaySchedule.label.toLowerCase())
  );

  // Handle Cardio Photo Change
  const handleCardioPhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setCardioPhoto(ev.target.result);
        setCardioError('');
      };
      reader.readAsDataURL(file);
    }
  };

  // Submit Cardio
  const handleSaveCardio = (e) => {
    e.preventDefault();
    setCardioError('');

    // Rule: If sharing to group, photo is MANDATORY!
    if (cardioShareGroup && !cardioPhoto) {
      setCardioError('A inclusão da foto de comprovação é OBRIGATÓRIA para validar seu cardio no ranking do grupo!');
      return;
    }

    logCardio({
      durationMinutes: Number(cardioDuration) || 30,
      cardioType,
      distanceKm: Number(cardioDistance) || 0,
      calories: Number(cardioCalories) || 0,
      notes: cardioNotes.trim(),
      photoUrl: cardioPhoto,
      shareToGroup: cardioShareGroup
    });

    setIsCardioModalOpen(false);
    setCardioPhoto(null);
    setCardioNotes('');
    setCardioDistance('');
    setCardioCalories('');
  };

  // Submit Absence
  const handleSaveAbsence = (e) => {
    e.preventDefault();
    addJustifiedAbsence({
      reason: absenceReason,
      action: absenceAction,
      newDate: absenceAction === 'adiado' ? absenceNewDate : null,
      routineName: todaySchedule?.label || 'Treino agendado'
    });
    setIsAbsenceModalOpen(false);
  };

  return (
    <div className="dashboard-page animate-fade-in">
      {/* Header Greeting */}
      <header className="dashboard-header">
        <div className="dashboard-greeting">
          <Avatar src={user?.avatar} name={user?.name || 'Usuário'} size="lg" />
          <div>
            <h1 className="dashboard-title">Olá, {user?.name?.split(' ')[0] || 'Atleta'}! 👋</h1>
            <p className="dashboard-subtitle">
              {stats.streak > 0 
                ? `Sequência incrível de ${stats.streak} dia(s) treinando! Não quebre o ritmo.`
                : 'Pronto para treinar hoje? Hora de registrar sua evolução.'}
            </p>
          </div>
        </div>

        {/* Hero Actions */}
        <div className="dashboard-cta-wrapper" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            className="hero-checkin-btn"
            onClick={() => navigate('/routines')}
            id="hero-start-workout-button"
          >
            <div className="hero-checkin-icon-glow">
              <Dumbbell size={26} />
            </div>
            <div className="hero-checkin-text">
              <span className="hero-checkin-label">INICIAR TREINO</span>
              <span className="hero-checkin-sub">Começar musculação</span>
            </div>
            <ChevronRight size={22} className="hero-checkin-arrow" />
          </button>


          {/* Adiar / Cancelar Treino de Hoje */}
          {todaySchedule?.type === 'workout' && !todayTrainedWorkout && !todayHasAbsence && (
            <button
              type="button"
              onClick={() => setIsAbsenceModalOpen(true)}
              style={{
                padding: '10px 14px',
                background: 'rgba(234, 179, 8, 0.12)',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                borderRadius: 'var(--radius-md)',
                color: '#eab308',
                fontSize: '0.8125rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <span>⚠️</span>
              <span>Adiar / Justificar Falta de Hoje</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Left Column: Metrics & Calendar */}
        <div className="dashboard-col-main">
          {/* Programação do Dia com Treino Principal + Cardio como Sub-Treino Organizado */}
          <section className="dashboard-section daily-program-section">
            <div className="section-header">
              <h2 className="section-title">
                📅 Programação de Hoje ({DAYS_OF_WEEK_NAMES[todayDayOfWeek]})
              </h2>
              <span className="section-badge">
                {todaySchedule?.hasWorkout && todaySchedule?.hasCardio 
                  ? 'Treino + Cardio' 
                  : (todaySchedule?.hasWorkout || todaySchedule?.type === 'workout') 
                    ? 'Musculação' 
                    : (todaySchedule?.hasCardio || todaySchedule?.type === 'cardio') 
                      ? 'Cardio' 
                      : 'Descanso'}
              </span>
            </div>

            <Card className="daily-schedule-unified-card" padding="lg">
              {/* 1. Treino Principal */}
              {(todaySchedule?.hasWorkout || todaySchedule?.type === 'workout' || todaySchedule?.type === 'both' || !todaySchedule || todaySchedule.type !== 'rest') && (
                <div className="daily-schedule-workout-box">
                  <div className="daily-box-top">
                    <div className="daily-box-title-group">
                      <span className="daily-box-tag">🏋️ [TREINO PRINCIPAL]</span>
                      <h3 className="daily-box-name">
                        {todaySchedule?.workoutLabel || matchedTodayRoutine?.name || todaySchedule?.label || 'Treino de Musculação'}
                      </h3>
                    </div>
                    {todayTrainedWorkout ? (
                      <span className="daily-status-pill done">✅ Treino Concluído</span>
                    ) : (
                      <span className="daily-status-pill pending">⏳ Pendente</span>
                    )}
                  </div>

                  {/* Exercises list preview */}
                  {matchedTodayRoutine?.exercises?.length > 0 && (
                    <ul className="daily-exercises-list-preview">
                      {matchedTodayRoutine.exercises.map((ex, i) => (
                        <li key={i}>• {ex.name} {ex.muscleGroup ? `(${ex.muscleGroup})` : ''}</li>
                      ))}
                    </ul>
                  )}

                  <div className="daily-box-footer">
                    <Button 
                      variant={todayTrainedWorkout ? "secondary" : "primary"}
                      size="sm"
                      onClick={() => {
                        if (matchedTodayRoutine) {
                          startActiveWorkout(matchedTodayRoutine);
                        } else {
                          startActiveWorkout({
                            id: 'today_workout',
                            name: todaySchedule?.workoutLabel || 'Treino do Dia',
                            exercises: []
                          });
                        }
                        navigate('/workout/active');
                      }}
                    >
                      {todayTrainedWorkout ? "Treinar Novamente" : "Iniciar Treino Principal"}
                    </Button>
                  </div>
                </div>
              )}

              {/* 2. Cardio como Sub-Treino Organizado logo abaixo */}
              {(todaySchedule?.hasCardio || todaySchedule?.type === 'cardio' || todaySchedule?.type === 'both' || todayTrainedCardio) && (() => {
                const matchedTodayCardio = (cardioRoutines || []).find(c => 
                  c.scheduledDay === todayDayOfWeek || 
                  (c.name && todaySchedule?.cardioLabel && c.name.toLowerCase().includes(todaySchedule.cardioLabel.toLowerCase()))
                );
                const cardioName = todaySchedule?.cardioLabel || matchedTodayCardio?.name || 'Sessão de Cardio';

                return (
                  <div className="daily-schedule-cardio-box">
                    <div className="daily-box-top">
                      <div className="daily-box-title-group">
                        <span className="daily-box-tag tag-cardio">🏃 [CARDIO / SUB-TREINO]</span>
                        <h3 className="daily-box-name name-cardio">
                          {cardioName}
                        </h3>
                      </div>
                      {todayTrainedCardio ? (
                        <span className="daily-status-pill done">✅ Cardio Concluído</span>
                      ) : (
                        <span className="daily-status-pill pending-cardio">⏳ Pendente</span>
                      )}
                    </div>

                    {/* Detalhes (Duração / Distância / Meta) */}
                    <div style={{
                      display: 'flex',
                      gap: 14,
                      flexWrap: 'wrap',
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      margin: '6px 0 10px 0'
                    }}>
                      <span>⏱️ <strong>Duração:</strong> {matchedTodayCardio?.targetDuration || 30} min</span>
                      {matchedTodayCardio?.targetDistance > 0 && (
                        <span>📏 <strong>Distância:</strong> {matchedTodayCardio.targetDistance} km</span>
                      )}
                      {matchedTodayCardio?.targetCalories > 0 && (
                        <span>🔥 <strong>Meta:</strong> {matchedTodayCardio.targetCalories} kcal</span>
                      )}
                    </div>

                    {matchedTodayCardio?.notes && (
                      <p style={{ margin: '0 0 10px 0', fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>
                        "{matchedTodayCardio.notes}"
                      </p>
                    )}

                    {/* Cronômetro / Timer Integrado */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'rgba(245, 158, 11, 0.08)',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      marginBottom: 12,
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase' }}>
                          ⏱️ CRONÔMETRO:
                        </span>
                        <span style={{ fontSize: '1.25rem', fontWeight: 900, fontFamily: 'monospace', color: '#f59e0b' }}>
                          {formatTimer(cardioTimerSeconds)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button 
                          type="button"
                          variant={isCardioTimerRunning ? "danger" : "secondary"}
                          size="sm"
                          onClick={() => setIsCardioTimerRunning(!isCardioTimerRunning)}
                          style={{ minWidth: 70 }}
                        >
                          {isCardioTimerRunning ? 'Pausar' : 'Iniciar'}
                        </Button>
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setIsCardioTimerRunning(false);
                            setCardioTimerSeconds(0);
                          }}
                        >
                          Zerar
                        </Button>
                      </div>
                    </div>

                    <div className="daily-box-footer">
                      <Button 
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          const timerMinutes = cardioTimerSeconds > 0 
                            ? Math.max(1, Math.round(cardioTimerSeconds / 60)) 
                            : (matchedTodayCardio?.targetDuration || 30);
                          setCardioDuration(String(timerMinutes));

                          if (matchedTodayCardio?.modality) {
                            setCardioType(matchedTodayCardio.modality.split(' ')[0] || 'Corrida');
                          } else if (todaySchedule?.cardioLabel) {
                            setCardioType(todaySchedule.cardioLabel.split(' ')[0] || 'Corrida');
                          }

                          if (matchedTodayCardio?.targetDistance) {
                            setCardioDistance(String(matchedTodayCardio.targetDistance));
                          }
                          if (matchedTodayCardio?.targetCalories) {
                            setCardioCalories(String(matchedTodayCardio.targetCalories));
                          }
                          setIsCardioModalOpen(true);
                        }}
                        style={{ borderColor: 'rgba(245, 158, 11, 0.4)', color: '#f59e0b' }}
                      >
                        {todayTrainedCardio ? "Registrar Novo Cardio" : "Bater Ponto Cardio"}
                      </Button>
                    </div>
                  </div>
                );
              })()}

              {/* Descanso */}
              {todaySchedule?.type === 'rest' && !todaySchedule?.hasWorkout && !todaySchedule?.hasCardio && !todayTrainedWorkout && !todayTrainedCardio && (
                <div className="daily-rest-placeholder">
                  <span style={{ fontSize: '1.5rem' }}>💤</span>
                  <div>
                    <h4>Dia de Descanso Programado</h4>
                    <p>Aproveite para recuperar as energias ou registre um cardio avulso caso deseje se movimentar hoje!</p>
                  </div>
                </div>
              )}
            </Card>
          </section>

          {/* Frequency Metrics Grid */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Frequência em Tempo Real</h2>
              <span className="section-badge">Meta: {weeklyGoal}x / sem</span>
            </div>

            <div className="frequency-cards-grid">
              {/* Semana */}
              <Card className="freq-card freq-week">
                <div className="freq-card-header">
                  <span className="freq-card-title">Esta Semana</span>
                  <div className="freq-chip">{weeklyProgress}%</div>
                </div>
                <div className="freq-value-row">
                  <span className="freq-value">{stats.week}</span>
                  <span className="freq-goal">/{weeklyGoal} dias</span>
                </div>
                <div className="freq-progress-bar">
                  <div 
                    className="freq-progress-fill" 
                    style={{ width: `${weeklyProgress}%` }}
                  />
                </div>
                {stats.weekCardio > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
                    🏃 {stats.weekCardio} {stats.weekCardio === 1 ? 'cardio realizado' : 'cardios realizados'}
                  </span>
                )}
              </Card>

              {/* Mês */}
              <Card className="freq-card">
                <div className="freq-card-header">
                  <span className="freq-card-title">Este Mês</span>
                  <div className="freq-chip">{monthlyProgress}%</div>
                </div>
                <div className="freq-value-row">
                  <span className="freq-value">{stats.month}</span>
                  <span className="freq-goal">/{monthlyGoal} treinos</span>
                </div>
                <div className="freq-progress-bar">
                  <div 
                    className="freq-progress-fill" 
                    style={{ width: `${monthlyProgress}%` }}
                  />
                </div>
                {stats.monthCardio > 0 && (
                  <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600, marginTop: 4 }}>
                    🏃 {stats.monthCardio} cardio(s) no mês
                  </span>
                )}
              </Card>

              {/* Ano */}
              <Card className="freq-card">
                <div className="freq-card-header">
                  <span className="freq-card-title">Este Ano ({currentYear})</span>
                  <Trophy size={16} className="text-muted" />
                </div>
                <div className="freq-value-row">
                  <span className="freq-value">{stats.year}</span>
                  <span className="freq-unit">treinos</span>
                </div>
                <p className="freq-hint">Consistência acumulada</p>
              </Card>

              {/* Total / Desde Sempre */}
              <Card className="freq-card freq-total">
                <div className="freq-card-header">
                  <span className="freq-card-title">Desde Sempre</span>
                  <Flame size={16} className="freq-flame-icon" />
                </div>
                <div className="freq-value-row">
                  <span className="freq-value">{stats.total}</span>
                  <span className="freq-unit">treinos</span>
                </div>
                <p className="freq-hint">
                  {stats.streak > 0 ? `🔥 ${stats.streak} dias de sequência!` : 'Histórico total'}
                </p>
              </Card>
            </div>
          </section>

          {/* Calendar View */}
          <section className="dashboard-section">
            <div className="section-header calendar-section-header">
              <h2 className="section-title">Calendário de Treinos</h2>
              
              <div className="calendar-nav-controls">
                {!isCurrentMonthView && (
                  <button 
                    type="button" 
                    className="cal-btn-today" 
                    onClick={goToToday}
                    title="Ir para o mês atual"
                  >
                    Hoje
                  </button>
                )}
                <div className="calendar-month-selector">
                  <button 
                    type="button" 
                    className="cal-month-nav-btn" 
                    onClick={prevMonth}
                    title="Mês anterior"
                    aria-label="Mês anterior"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="calendar-month-name">
                    {getMonthName(currentMonth)} de {currentYear}
                  </span>
                  <button 
                    type="button" 
                    className="cal-month-nav-btn" 
                    onClick={nextMonth}
                    title="Próximo mês"
                    aria-label="Próximo mês"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>

            <Card className="calendar-card" padding="lg">
              <div className="calendar-weekdays">
                <span>Seg</span>
                <span>Ter</span>
                <span>Qua</span>
                <span>Qui</span>
                <span>Sex</span>
                <span>Sáb</span>
                <span>Dom</span>
              </div>
              <div className="calendar-days-grid">
                {calendarDays.map((dObj, idx) => {
                  if (!dObj) {
                    return <div key={`blank-${idx}`} className="calendar-day-cell calendar-day-blank" />;
                  }

                  const targetDate = new Date(dObj.year, dObj.month, dObj.day);
                  const dayOfWeek = targetDate.getDay();
                  const scheduled = weeklySchedule?.[dayOfWeek];
                  
                  const workout = checkins.find(c => c.type !== 'cardio' && isSameDay(c.date, targetDate));
                  const cardio = checkins.find(c => (c.type === 'cardio' || c.isCardio) && isSameDay(c.date, targetDate));
                  const absence = (justifiedAbsences || []).find(a => isSameDay(a.date, targetDate));

                  const isCurrentDay = dObj.year === today.getFullYear() && 
                                       dObj.month === today.getMonth() && 
                                       dObj.day === today.getDate();
                  
                  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isPast = targetDate < startOfToday;

                  let cellClass = '';
                  let dotContent = null;
                  let titleText = '';

                  if (workout && cardio) {
                    cellClass = 'calendar-day-done-green';
                    dotContent = (
                      <>
                        <div className="calendar-dot-green" />
                        <span className="cal-cardio-done-icon">🏃</span>
                      </>
                    );
                    titleText = 'Treino e Cardio concluídos hoje!';
                  } else if (workout) {
                    cellClass = 'calendar-day-done-green';
                    dotContent = <div className="calendar-dot-green" />;
                    titleText = `Treino concluído: ${workout.routineName || 'Treino'}`;
                  } else if (cardio) {
                    cellClass = 'calendar-day-done-green';
                    dotContent = <span className="cal-cardio-done-icon">🏃</span>;
                    titleText = `Cardio concluído: ${cardio.cardioType || 'Cardio'}`;
                  } else if (absence) {
                    cellClass = 'calendar-day-justified';
                    dotContent = <span className="cal-justified-icon">⚠️</span>;
                    titleText = `Falta Justificada: ${absence.reason} (${absence.action === 'adiado' ? 'Adiado' : 'Cancelado'})`;
                  } else if (scheduled?.type === 'cardio') {
                    if (isPast) {
                      cellClass = 'calendar-day-missed';
                      dotContent = <div className="calendar-dot-red" />;
                      titleText = 'Falta: Cardio agendado não realizado';
                    } else {
                      cellClass = 'calendar-day-pending-cardio';
                      dotContent = <div className="calendar-dot-cardio-orange" />;
                      titleText = 'Cardio Pendente';
                    }
                  } else if (scheduled?.type === 'rest') {
                    cellClass = 'calendar-day-rest';
                    dotContent = <span className="cal-rest-icon">zZ</span>;
                    titleText = 'Dia de descanso programado';
                  } else if (isPast && scheduled?.type === 'workout') {
                    cellClass = 'calendar-day-missed';
                    dotContent = <div className="calendar-dot-red" />;
                    titleText = `Falta: ${scheduled?.label || 'Treino'} não realizado`;
                  } else if (scheduled?.type === 'workout') {
                    cellClass = 'calendar-day-pending-blue';
                    dotContent = <div className="calendar-dot-blue" />;
                    titleText = `Pendente: ${scheduled?.label || 'Treino'}`;
                  }

                  return (
                    <div
                      key={idx}
                      className={`calendar-day-cell ${cellClass} ${isCurrentDay ? 'calendar-day-today' : ''}`}
                      title={titleText}
                    >
                      <span className="calendar-day-number">{dObj.day}</span>
                      {dotContent}
                    </div>
                  );
                })}
              </div>
              <div className="calendar-legend">
                <span className="legend-item">
                  <span className="legend-dot legend-dot-green" /> Concluído
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-red" /> Falta
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-blue" /> Treino Pendente
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-orange" /> Cardio Pendente
                </span>
                <span className="legend-item">
                  <span className="legend-dot legend-dot-justified" /> Falta Justificada
                </span>
                <span className="legend-item">
                  <span className="legend-text-rest">zZ</span> Descanso
                </span>
              </div>
            </Card>
          </section>

          {/* Recent Workouts Feed */}
          <section className="dashboard-section">
            <div className="section-header">
              <h2 className="section-title">Últimos Bate Pontos Realizados</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                Ver todos
              </Button>
            </div>

            <div className="recent-workouts-list">
              {checkins.slice(0, 4).map((item) => (
                <Card key={item.id} className="workout-feed-card" padding="md">
                  <div className="workout-card-inner">
                    {/* Photo thumbnail */}
                    {item.photoUrl ? (
                      <div className="workout-thumbnail-wrapper">
                        <img src={item.photoUrl} alt="Foto do Treino" className="workout-thumbnail" />
                        <div className="workout-photo-badge">
                          <Camera size={12} />
                        </div>
                      </div>
                    ) : (
                      <div className="workout-thumbnail-placeholder">
                        <Dumbbell size={24} />
                      </div>
                    )}

                    {/* Workout Details */}
                    <div className="workout-info">
                      <div className="workout-info-top">
                        <h3 className="workout-routine-name">{item.routineName || 'Treino Livre'}</h3>
                        <span className="workout-time-relative">{formatRelative(item.date)}</span>
                      </div>

                      <div className="workout-stats-chips">
                        {item.durationMinutes && (
                          <span className="w-stat-chip">
                            <Clock size={13} /> {item.durationMinutes} min
                          </span>
                        )}
                        {item.totalVolumeKg && (
                          <span className="w-stat-chip">
                            <Weight size={13} /> {item.totalVolumeKg} kg
                          </span>
                        )}
                        {item.totalReps && (
                          <span className="w-stat-chip">
                            <Repeat size={13} /> {item.totalReps} reps
                          </span>
                        )}
                      </div>

                      {/* Observations note if any */}
                      {item.notes && (
                        <p className="workout-notes-preview">
                          <strong>Observação:</strong> "{item.notes}"
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Quick Routines & Community shortcuts */}
        <aside className="dashboard-col-sidebar">
          {/* Quick Routines List */}
          <Card className="side-card" padding="lg">
            <div className="side-card-header">
              <div className="side-card-title-wrap">
                <Dumbbell size={18} className="side-card-icon" />
                <h3>Suas Rotinas</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                icon={PlusCircle}
                onClick={() => navigate('/routines')}
              >
                Criar
              </Button>
            </div>

            <div className="side-routines-list">
              {routines.slice(0, 4).map(r => (
                <div 
                  key={r.id} 
                  className="side-routine-item"
                  onClick={() => navigate('/routines')}
                >
                  <div className="side-routine-info">
                    <span className="side-routine-name">{r.name}</span>
                    <span className="side-routine-count">{r.exercises?.length || 0} exercícios</span>
                  </div>
                  <ChevronRight size={16} className="side-routine-arrow" />
                </div>
              ))}
            </div>

            <Button 
              variant="secondary" 
              size="md" 
              fullWidth 
              onClick={() => navigate('/routines')}
              className="mt-md"
            >
              Ver Todas as Rotinas
            </Button>
          </Card>

          {/* Social Groups Teaser */}
          <Card className="side-card" padding="lg">
            <div className="side-card-header">
              <div className="side-card-title-wrap">
                <Users size={18} className="side-card-icon" />
                <h3>Seus Grupos</h3>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/groups')}
              >
                Explorar
              </Button>
            </div>

            <p className="side-card-text">
              Compita com seus amigos, acompanhe o feed de fotos e veja o ranking semanal.
            </p>

            <div className="side-groups-list">
              {groups.map(g => (
                <div 
                  key={g.id} 
                  className="side-group-item"
                  onClick={() => navigate(`/groups`)}
                >
                  <div className="side-group-avatar">
                    <Users size={16} />
                  </div>
                  <div className="side-group-info">
                    <span className="side-group-name">{g.name}</span>
                    <span className="side-group-code">Cód: {g.inviteCode}</span>
                  </div>
                  <span className="side-group-badge">{g.members?.length || 1} membros</span>
                </div>
              ))}
            </div>

            <Button 
              variant="primary" 
              size="md" 
              fullWidth 
              onClick={() => navigate('/groups')}
              className="mt-md"
            >
              Acessar Ranking & Feed
            </Button>
          </Card>
        </aside>
      </div>

      {/* MODAL: REGISTRAR CARDIO */}
      {isCardioModalOpen && (
        <Modal
          isOpen={isCardioModalOpen}
          onClose={() => setIsCardioModalOpen(false)}
          title="Registrar Cardio"
          size="md"
        >
          <form onSubmit={handleSaveCardio} className="modal-form-body">
            {cardioError && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: '0.8125rem',
                marginBottom: 14
              }}>
                {cardioError}
              </div>
            )}

            <div className="form-group-custom" style={{ marginBottom: 14 }}>
              <label className="input-label-custom">Modalidade de Cardio</label>
              <div className="gender-selector-pills" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Corrida', 'Esteira', 'Bicicleta', 'Caminhada', 'Escada', 'Elíptico', 'Outro'].map(type => (
                  <button
                    key={type}
                    type="button"
                    className={`gender-pill ${cardioType === type ? 'active' : ''}`}
                    onClick={() => setCardioType(type)}
                    style={{ flex: '1 0 calc(33% - 6px)', minWidth: 80 }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <Input
                label="Duração (minutos)"
                type="number"
                min="1"
                value={cardioDuration}
                onChange={e => setCardioDuration(e.target.value)}
                required
              />
              <Input
                label="Distância (km) - Opcional"
                type="number"
                step="0.1"
                min="0"
                placeholder="Ex: 5.2"
                value={cardioDistance}
                onChange={e => setCardioDistance(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <Input
                label="Calorias estimadas (kcal) - Opcional"
                type="number"
                min="0"
                placeholder="Ex: 350"
                value={cardioCalories}
                onChange={e => setCardioCalories(e.target.value)}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <Input
                label="Observações / Como se sentiu"
                placeholder="Ex: Ritmo moderado, fôlego em dia"
                value={cardioNotes}
                onChange={e => setCardioNotes(e.target.value)}
              />
            </div>

            {/* Checkbox: Postar no Feed do Grupo */}
            <div style={{
              padding: '12px 14px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: 14
            }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: '0.875rem' }}>
                <input
                  type="checkbox"
                  checked={cardioShareGroup}
                  onChange={e => setCardioShareGroup(e.target.checked)}
                />
                <strong>Postar no Feed do Grupo & Validar no Ranking</strong>
              </label>
              <p style={{ fontSize: '0.75rem', color: cardioShareGroup ? 'var(--accent)' : 'var(--text-tertiary)', marginTop: 4 }}>
                {cardioShareGroup 
                  ? '⚠️ Para validar no ranking do grupo, a foto de comprovação é obrigatória!'
                  : 'Apenas registro pessoal no seu histórico. Foto é opcional.'}
              </p>
            </div>

            {/* Foto de Comprovação */}
            <div style={{ marginBottom: 18 }}>
              <label className="input-label-custom" style={{ display: 'block', marginBottom: 6 }}>
                Foto de Comprovação {cardioShareGroup ? <span style={{ color: '#ef4444' }}>* (Obrigatória para o grupo)</span> : <span style={{ color: 'var(--text-tertiary)' }}>(Opcional)</span>}
              </label>

              {cardioPhoto ? (
                <div style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', maxHeight: 200 }}>
                  <img src={cardioPhoto} alt="Comprovante Cardio" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => setCardioPhoto(null)}
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: 'rgba(0,0,0,0.7)',
                      border: 'none',
                      color: '#fff',
                      padding: '4px 10px',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      fontSize: '0.75rem'
                    }}
                  >
                    Trocar Foto
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => cardioPhotoInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '16px',
                    border: '1px dashed var(--border-color)',
                    background: 'var(--bg-elevated)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    fontSize: '0.875rem'
                  }}
                >
                  <Camera size={18} />
                  <span>Tirar foto ou anexar print da esteira/app</span>
                </button>
              )}

              <input
                ref={cardioPhotoInputRef}
                type="file"
                accept="image/*"
                onChange={handleCardioPhotoUpload}
                style={{ display: 'none' }}
              />
            </div>

            <div className="modal-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <Button type="button" variant="ghost" onClick={() => setIsCardioModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary">
                Salvar Cardio
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ADIAR OU CANCELAR TREINO (FALTA JUSTIFICADA) */}
      {isAbsenceModalOpen && (
        <Modal
          isOpen={isAbsenceModalOpen}
          onClose={() => setIsAbsenceModalOpen(false)}
          title="Adiar ou Justificar Treino"
          size="sm"
        >
          <form onSubmit={handleSaveAbsence} className="modal-form-body">
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 16 }}>
              Não conseguirá treinar hoje? Justifique sua ausência para avisar seus amigos no grupo (não pontua na meta semanal).
            </p>

            <div className="form-group-custom" style={{ marginBottom: 14 }}>
              <label className="input-label-custom">O que deseja fazer?</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  className={`gender-pill ${absenceAction === 'adiado' ? 'active' : ''}`}
                  onClick={() => setAbsenceAction('adiado')}
                  style={{ flex: 1 }}
                >
                  📅 Adiar Treino
                </button>
                <button
                  type="button"
                  className={`gender-pill ${absenceAction === 'cancelado' ? 'active' : ''}`}
                  onClick={() => setAbsenceAction('cancelado')}
                  style={{ flex: 1 }}
                >
                  ❌ Cancelar Hoje
                </button>
              </div>
            </div>

            <div className="form-group-custom" style={{ marginBottom: 14 }}>
              <label className="input-label-custom">Motivo da Falta</label>
              <select
                className="onboarding-input"
                style={{ marginTop: 6 }}
                value={absenceReason}
                onChange={e => setAbsenceReason(e.target.value)}
              >
                <option value="Feriado">Feriado</option>
                <option value="Lesão / Dor muscular">Lesão / Dor muscular</option>
                <option value="Imprevisto">Imprevisto</option>
                <option value="Trabalho / Estudo">Trabalho / Estudo</option>
                <option value="Descanso Extra">Descanso Extra</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {absenceAction === 'adiado' && (
              <div className="form-group-custom" style={{ marginBottom: 14 }}>
                <label className="input-label-custom">Nova Data para Realizar o Treino</label>
                <input
                  type="date"
                  className="onboarding-input"
                  style={{ marginTop: 6 }}
                  value={absenceNewDate}
                  onChange={e => setAbsenceNewDate(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="modal-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <Button type="button" variant="ghost" onClick={() => setIsAbsenceModalOpen(false)}>
                Voltar
              </Button>
              <Button type="submit" variant="primary">
                Confirmar Justificativa
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
