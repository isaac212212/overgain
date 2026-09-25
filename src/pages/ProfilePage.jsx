import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useData } from '../contexts/DataContext';
import { useFrequencyStats } from '../hooks/useFrequencyStats';
import { 
  Edit3, 
  Calendar as CalendarIcon, 
  Clock, 
  Weight, 
  Repeat, 
  Camera, 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Award,
  Ruler,
  TrendingUp,
  Activity,
  Check,
  Calendar,
  Sparkles,
  Shield,
  Layers,
  Dumbbell,
  Trash2,
  ChevronDown,
  ChevronUp,
  History,
  Zap,
  Target
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import AnatomyMannequin from '../components/ui/AnatomyMannequin';
import { 
  getMonthName, 
  getCalendarDaysCurrentOnly, 
  formatDate,
  formatDateTime, 
  isSameDay 
} from '../utils/dateHelpers';
import './ProfilePage.css';

const DAYS_OF_WEEK = [
  { id: 1, name: 'Segunda-feira', short: 'Seg' },
  { id: 2, name: 'Terça-feira', short: 'Ter' },
  { id: 3, name: 'Quarta-feira', short: 'Qua' },
  { id: 4, name: 'Quinta-feira', short: 'Qui' },
  { id: 5, name: 'Sexta-feira', short: 'Sex' },
  { id: 6, name: 'Sábado', short: 'Sáb' },
  { id: 0, name: 'Domingo', short: 'Dom' },
];

const MUSCLE_GROUPS = [
  { id: 'Peitoral', label: 'Peito', icon: '🏋️' },
  { id: 'Costas', label: 'Costas', icon: '🦅' },
  { id: 'Pernas', label: 'Pernas', icon: '🦵' },
  { id: 'Ombros', label: 'Ombros', icon: '🛡️' },
  { id: 'Bíceps', label: 'Bíceps', icon: '💪' },
  { id: 'Tríceps', label: 'Tríceps', icon: '⚡' },
  { id: 'Abdômen', label: 'Abdômen', icon: '🧱' },
  { id: 'Trapézio', label: 'Trapézio', icon: '⛰️' },
  { id: 'Antebraço', label: 'Antebraço', icon: '✊' },
  { id: 'Geral', label: 'Geral / Cardio', icon: '🔥' },
];

// Helper to normalize muscle group strings
const matchMuscle = (targetGroup, exGroup, exName = '') => {
  const t = targetGroup.toLowerCase();
  const g = (exGroup || '').toLowerCase();
  const n = (exName || '').toLowerCase();

  if (t === 'peitoral' || t === 'peito') {
    return g.includes('peit') || n.includes('supino') || n.includes('crucifixo') || n.includes('crossover') || n.includes('peck deck') || n.includes('flexão');
  }
  if (t === 'costas') {
    return g.includes('cost') || g.includes('dors') || n.includes('puxada') || n.includes('remada') || n.includes('barra fixa') || n.includes('pulldown') || n.includes('serrote');
  }
  if (t === 'ombros') {
    return g.includes('omb') || g.includes('delt') || n.includes('desenvolvimento') || n.includes('elevação') || n.includes('arnold');
  }
  if (t === 'bíceps' || t === 'biceps') {
    return g.includes('bíc') || g.includes('bic') || n.includes('rosca') || n.includes('scott') || n.includes('martelo');
  }
  if (t === 'tríceps' || t === 'triceps') {
    return g.includes('tríc') || g.includes('tric') || n.includes('tríceps') || n.includes('testa') || n.includes('pulley') || n.includes('frances') || n.includes('mergulho');
  }
  if (t === 'pernas') {
    return g.includes('pern') || g.includes('quad') || g.includes('post') || g.includes('pant') || g.includes('coxa') || g.includes('glút') || n.includes('agachamento') || n.includes('leg press') || n.includes('extensora') || n.includes('flexora') || n.includes('stiff') || n.includes('panturrilha') || n.includes('afundo') || n.includes('hack');
  }
  if (t === 'abdômen' || t === 'abdomen') {
    return g.includes('abd') || g.includes('core') || n.includes('abdominal') || n.includes('prancha') || n.includes('infra') || n.includes('crunch');
  }
  if (t === 'trapézio' || t === 'trapezio') {
    return g.includes('trap') || n.includes('encolhimento') || n.includes('remada alta');
  }
  if (t === 'antebraço' || t === 'antebraco') {
    return g.includes('anteb') || n.includes('punho') || n.includes('inversa');
  }
  return true;
};

// Helper: Calculate time difference in readable Portuguese format
const formatTimeInterval = (date1, date2) => {
  if (!date1 || !date2) return '';
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffMs = Math.abs(d1 - d2);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'no mesmo dia';
  if (diffDays === 1) return 'em 1 dia';
  if (diffDays < 7) return `em ${diffDays} dias`;
  if (diffDays < 14) return 'em 1 semana';
  if (diffDays < 30) {
    const weeks = Math.round(diffDays / 7);
    return `em ${weeks} semanas (${diffDays} dias)`;
  }
  if (diffDays < 60) return `em 1 mês (${diffDays} dias)`;
  const months = Math.round(diffDays / 30);
  return `em ${months} meses (${diffDays} dias)`;
};

export default function ProfilePage() {
  const { user, updateProfile, addMeasurement, updatePrivacy, updateWeeklyGoal, updatePassword } = useAuth();
  const { checkins, routines, weeklySchedule, updateWeeklySchedule } = useData();
  const stats = useFrequencyStats();
  const navigate = useNavigate();

  // Selected Muscle Group for Analytics & Mannequin
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState('Peitoral');
  const [timeframe, setTimeframe] = useState('weeks'); // 'days' | 'weeks' | 'months' | 'years'
  const [activeMetric, setActiveMetric] = useState('volume'); // 'volume' | 'sets' | 'prs'

  // Calendar month state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const calMonth = calendarDate.getMonth();
  const calYear = calendarDate.getFullYear();
  const calendarDays = getCalendarDaysCurrentOnly(calYear, calMonth);

  // Measurements Modal & History State
  const [isMeasurementsModalOpen, setIsMeasurementsModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const measurementsHistory = useMemo(() => {
    return (user?.measurementsHistory || []).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  }, [user?.measurementsHistory]);

  const latestMeasurement = measurementsHistory[0] || {
    weight: 0,
    height: 0,
    leftArm: 0,
    rightArm: 0,
    waist: 0,
    chest: 0,
    leftThigh: 0,
    rightThigh: 0,
    calves: 0,
    date: new Date().toISOString().slice(0, 10)
  };

  const previousMeasurement = measurementsHistory[1] || null;

  const [formMeasurements, setFormMeasurements] = useState(latestMeasurement);
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(user?.weeklyGoal || 4);
  const [tempPassword, setTempPassword] = useState('');
  const [tempConfirmPassword, setTempConfirmPassword] = useState('');
  const [modalPasswordError, setModalPasswordError] = useState('');

  // Weekly Schedule Modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [tempSchedule, setTempSchedule] = useState(() => ({ ...weeklySchedule }));

  const prevMonth = () => {
    setCalendarDate(new Date(calYear, calMonth - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calYear, calMonth + 1, 1));
  };

  const hasWorkoutOnDay = (dObj) => {
    if (!dObj || !dObj.isCurrentMonth) return false;
    const target = new Date(dObj.year, dObj.month, dObj.day);
    return checkins.some(c => isSameDay(c.date, target));
  };

  // IMC Calculation helper
  const calcIMC = (w, h) => {
    const weightNum = Number(w);
    const heightNum = Number(h);
    if (!weightNum || !heightNum || heightNum <= 0) return { val: '-', label: 'Dados insuficientes', color: 'gray' };
    const hInMeters = heightNum / 100;
    const imc = weightNum / (hInMeters * hInMeters);
    const val = imc.toFixed(1);

    if (imc < 18.5) return { val, label: 'Abaixo do peso', color: '#38bdf8' };
    if (imc <= 24.9) return { val, label: 'Peso ideal / Normal', color: '#22c55e' };
    if (imc <= 29.9) return { val, label: 'Sobrepeso saudável', color: '#f59e0b' };
    return { val, label: 'Obesidade', color: '#ef4444' };
  };

  const userIMC = calcIMC(latestMeasurement.weight, latestMeasurement.height);
  const formLiveIMC = calcIMC(formMeasurements.weight, formMeasurements.height);

  // Handle Save Measurements
  const handleSaveMeasurements = (e) => {
    e.preventDefault();
    addMeasurement({
      weight: Number(formMeasurements.weight) || 0,
      height: Number(formMeasurements.height) || 0,
      leftArm: Number(formMeasurements.leftArm) || 0,
      rightArm: Number(formMeasurements.rightArm) || 0,
      waist: Number(formMeasurements.waist) || 0,
      chest: Number(formMeasurements.chest) || 0,
      leftThigh: Number(formMeasurements.leftThigh) || 0,
      rightThigh: Number(formMeasurements.rightThigh) || 0,
      calves: Number(formMeasurements.calves) || 0,
      date: formMeasurements.date || new Date().toISOString().slice(0, 10)
    });
    setIsMeasurementsModalOpen(false);
  };

  // Handle Delete Measurement from history
  const handleDeleteMeasurement = (entryId) => {
    if (!user) return;
    const updated = (user.measurementsHistory || []).filter(m => m.id !== entryId);
    updateProfile({ measurementsHistory: updated });
  };

  // Handle Save Schedule
  const handleSaveSchedule = (e) => {
    e.preventDefault();
    updateWeeklySchedule(tempSchedule);
    setIsScheduleModalOpen(false);
  };

  // =========================================================================
  // MUSCLE GROUP ANALYTICS COMPUTATIONS (PRs, Sets, Exercises, Volume)
  // =========================================================================
  const muscleAnalytics = useMemo(() => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    let weeklySets = 0;
    let monthlySets = 0;
    let totalSets = 0;
    let weeklyVolume = 0;
    let monthlyVolume = 0;
    let totalVolume = 0;

    // Map of exercises: { [name]: { maxWeight, maxReps, estimated1RM, totalSets, totalReps, totalVolume, lastDate, prHistory: [] } }
    const exercisesMap = {};

    checkins.forEach(c => {
      const cDate = new Date(c.date);
      const isPastWeek = cDate >= oneWeekAgo;
      const isPastMonth = cDate >= oneMonthAgo;

      (c.exercises || []).forEach(ex => {
        if (matchMuscle(selectedMuscleGroup, ex.muscleGroup, ex.name)) {
          const exKey = ex.name.trim();
          if (!exercisesMap[exKey]) {
            exercisesMap[exKey] = {
              name: exKey,
              muscleGroup: ex.muscleGroup || selectedMuscleGroup,
              maxWeight: 0,
              maxReps: 0,
              estimated1RM: 0,
              totalSets: 0,
              totalReps: 0,
              totalVolume: 0,
              lastDate: c.date,
              sessionsCount: 0
            };
          }

          exercisesMap[exKey].sessionsCount += 1;
          if (new Date(c.date) > new Date(exercisesMap[exKey].lastDate)) {
            exercisesMap[exKey].lastDate = c.date;
          }

          (ex.sets || []).forEach(s => {
            if (s.completed) {
              const w = Number(s.weight) || 0;
              const r = Number(s.reps) || 0;
              const vol = w * r;

              totalSets += 1;
              totalVolume += vol;
              exercisesMap[exKey].totalSets += 1;
              exercisesMap[exKey].totalReps += r;
              exercisesMap[exKey].totalVolume += vol;

              if (isPastWeek) {
                weeklySets += 1;
                weeklyVolume += vol;
              }
              if (isPastMonth) {
                monthlySets += 1;
                monthlyVolume += vol;
              }

              // PR evaluation
              if (w > exercisesMap[exKey].maxWeight) {
                exercisesMap[exKey].maxWeight = w;
                exercisesMap[exKey].maxReps = r;
              }

              // 1RM Calculation (Brzycki Formula: w * (36 / (37 - r)))
              if (w > 0 && r > 0) {
                const e1rm = r === 1 ? w : Math.round(w * (36 / Math.max(1, 37 - Math.min(36, r))));
                if (e1rm > exercisesMap[exKey].estimated1RM) {
                  exercisesMap[exKey].estimated1RM = e1rm;
                }
              }
            }
          });
        }
      });
    });

    // Exercise ranking list sorted by maxWeight / volume
    const exerciseList = Object.values(exercisesMap).sort((a, b) => b.maxWeight - a.maxWeight || b.totalVolume - a.totalVolume);

    // Personal records (PRs) count & list
    const prList = exerciseList.filter(e => e.maxWeight > 0);
    const prCount = prList.length;

    return {
      weeklySets,
      monthlySets,
      totalSets,
      weeklyVolume,
      monthlyVolume,
      totalVolume,
      exerciseList,
      prList,
      prCount
    };
  }, [checkins, selectedMuscleGroup]);

  // Dynamic Chart Data based on selected muscle group, timeframe and metric
  const chartData = useMemo(() => {
    const grouped = {};

    checkins.forEach(c => {
      const d = new Date(c.date);
      let key = '';
      let label = '';

      if (timeframe === 'days') {
        key = d.toLocaleDateString();
        label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      } else if (timeframe === 'weeks') {
        const weekNum = Math.ceil(d.getDate() / 7);
        key = `${d.getMonth() + 1}-W${weekNum}`;
        label = `Sem ${weekNum}`;
      } else if (timeframe === 'months') {
        key = `${d.getFullYear()}-${d.getMonth()}`;
        label = getMonthName(d.getMonth()).substring(0, 3);
      } else {
        key = `${d.getFullYear()}`;
        label = d.getFullYear().toString();
      }

      if (!grouped[key]) {
        grouped[key] = { label, volume: 0, sets: 0, prs: 0, sortKey: d.getTime() };
      }

      // Filter exercises by selected muscle group
      (c.exercises || []).forEach(ex => {
        if (matchMuscle(selectedMuscleGroup, ex.muscleGroup, ex.name)) {
          (ex.sets || []).forEach(s => {
            if (s.completed) {
              const w = Number(s.weight) || 0;
              const r = Number(s.reps) || 0;
              grouped[key].volume += w * r;
              grouped[key].sets += 1;
              if (w >= 50) grouped[key].prs += 1;
            }
          });
        }
      });
    });

    const result = Object.values(grouped).sort((a, b) => a.sortKey - b.sortKey).slice(-7).map(g => {
      let val = 0;
      let display = '';
      if (activeMetric === 'volume') {
        val = g.volume;
        display = g.volume >= 10000 ? (g.volume / 1000).toFixed(1) + 't' : g.volume > 0 ? `${g.volume.toLocaleString('pt-BR')} kg` : '0 kg';
      } else if (activeMetric === 'sets') {
        val = g.sets;
        display = `${g.sets} séries`;
      } else {
        val = g.prs;
        display = `${g.prs} PRs`;
      }
      return { label: g.label, val, display };
    });

    if (result.length === 0 || result.every(r => r.val === 0)) {
      return [
        { label: 'Sem 1', val: 0, display: '0' },
        { label: 'Sem 2', val: 0, display: '0' },
        { label: 'Sem 3', val: 0, display: '0' },
        { label: 'Atual', val: 0, display: '0' }
      ];
    }
    return result;
  }, [checkins, selectedMuscleGroup, timeframe, activeMetric]);

  const maxChartVal = Math.max(...chartData.map(d => d.val), 1);

  return (
    <div className="profile-page animate-fade-in">
      {/* Top Profile Card */}
      <Card className="profile-header-card" padding="lg">
        <div className="profile-header-inner">
          <Avatar 
            src={user?.avatar} 
            name={user?.name || 'João Silva'} 
            size="xl" 
            className="profile-avatar"
          />

          <div className="profile-meta-info">
            <div className="profile-name-row">
              <h1 className="profile-username">{user?.username || 'atleta'}</h1>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={Shield}
                  onClick={() => {
                    setTempPassword('');
                    setTempConfirmPassword('');
                    setModalPasswordError('');
                    setIsEditingGoal(true);
                  }}
                  title="Privacidade & Meta Semanal"
                >
                  Privacidade
                </Button>
                <Button 
                  variant="secondary" 
                  size="sm" 
                  icon={Edit3}
                  onClick={() => navigate('/settings')}
                >
                  Editar perfil
                </Button>
              </div>
            </div>
            <p className="profile-fullname">{user?.name || 'João Silva'}</p>

            {/* Counts */}
            <div className="profile-social-counts">
              <div className="count-item" onClick={() => setIsEditingGoal(true)} style={{ cursor: 'pointer' }}>
                <strong className="text-accent">{user?.weeklyGoal || 4}x</strong>
                <span>Meta Semanal ✎</span>
              </div>
              <div className="count-item">
                <strong>{stats.total}</strong>
                <span>Treinos</span>
              </div>
              <div className="count-item">
                <strong>{user?.followersCount || 0}</strong>
                <span>Seguidores</span>
              </div>
              <div className="count-item">
                <strong>{user?.followingCount || 0}</strong>
                <span>Seguindo</span>
              </div>
              <div className="count-item">
                <strong className="text-flame">
                  <Flame size={16} style={{ display: 'inline' }} /> {stats.streak}d
                </strong>
                <span>Streak</span>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* =========================================================================
          SECTION 1: REFORMULAÇÃO DE PROGRESSO E ESTATÍSTICAS POR GRUPO MUSCULAR
          ========================================================================= */}
      <Card className="profile-muscle-analytics-card" padding="lg">
        <div className="muscle-analytics-header">
          <div className="header-titles">
            <h2 className="profile-section-title">
              <Activity size={20} className="text-accent" /> Progresso & Estatísticas por Grupo Muscular
            </h2>
            <p className="profile-section-subtitle">
              Selecione o músculo para visualizar gráfico de volume, séries semanais/mensais, PRs e ranking de exercícios.
            </p>
          </div>
        </div>

        {/* Muscle Selector Pills */}
        <div className="muscle-selector-scroll">
          {MUSCLE_GROUPS.map(mg => {
            const isActive = selectedMuscleGroup === mg.id || (selectedMuscleGroup === 'Peitoral' && mg.id === 'Peito');
            return (
              <button
                key={mg.id}
                type="button"
                className={`muscle-pill-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedMuscleGroup(mg.id)}
              >
                <span className="muscle-pill-icon">{mg.icon}</span>
                <span className="muscle-pill-label">{mg.label}</span>
              </button>
            );
          })}
        </div>

        {/* Layout Grid: Interactive Anatomy Mannequin + Dynamic Charts & Stats */}
        <div className="muscle-analytics-main-grid">
          {/* Left: Anatomical Human Body Mannequin */}
          <div className="anatomy-column">
            <AnatomyMannequin 
              selectedGroup={selectedMuscleGroup} 
              onSelectGroup={(groupName) => setSelectedMuscleGroup(groupName)}
            />
          </div>

          {/* Right: Evolution Chart, Metric Counters, and PR Highlights */}
          <div className="analytics-details-column">
            {/* Stat Counter Cards Row (Volume Semanal, Mensal, Séries, PRs) */}
            <div className="muscle-stat-counters-grid">
              <div className="m-stat-card highlight-accent">
                <div className="m-stat-icon-wrap">
                  <Layers size={18} />
                </div>
                <div className="m-stat-content">
                  <span className="m-stat-label">Séries Semanais</span>
                  <strong className="m-stat-val">{muscleAnalytics.weeklySets}</strong>
                  <span className="m-stat-sub">nesta semana</span>
                </div>
              </div>

              <div className="m-stat-card">
                <div className="m-stat-icon-wrap">
                  <CalendarIcon size={18} />
                </div>
                <div className="m-stat-content">
                  <span className="m-stat-label">Séries Mensais</span>
                  <strong className="m-stat-val">{muscleAnalytics.monthlySets}</strong>
                  <span className="m-stat-sub">últimos 30 dias</span>
                </div>
              </div>

              <div className="m-stat-card highlight-flame">
                <div className="m-stat-icon-wrap">
                  <Award size={18} />
                </div>
                <div className="m-stat-content">
                  <span className="m-stat-label">Recordes (PRs)</span>
                  <strong className="m-stat-val">{muscleAnalytics.prCount}</strong>
                  <span className="m-stat-sub">neste grupo</span>
                </div>
              </div>

              <div className="m-stat-card">
                <div className="m-stat-icon-wrap">
                  <Weight size={18} />
                </div>
                <div className="m-stat-content">
                  <span className="m-stat-label">Volume Total</span>
                  <strong className="m-stat-val">
                    {muscleAnalytics.totalVolume >= 10000 
                      ? `${(muscleAnalytics.totalVolume / 1000).toFixed(1)}t` 
                      : `${muscleAnalytics.totalVolume.toLocaleString('pt-BR')} kg`}
                  </strong>
                  <span className="m-stat-sub">histórico acumulado</span>
                </div>
              </div>
            </div>

            {/* Visual Volume Evolution Chart for Selected Muscle */}
            <div className="muscle-chart-box">
              <div className="chart-controls-bar">
                <div className="chart-metric-pills">
                  <button 
                    type="button" 
                    className={`chart-metric-tab ${activeMetric === 'volume' ? 'active' : ''}`}
                    onClick={() => setActiveMetric('volume')}
                  >
                    Volume (kg)
                  </button>
                  <button 
                    type="button" 
                    className={`chart-metric-tab ${activeMetric === 'sets' ? 'active' : ''}`}
                    onClick={() => setActiveMetric('sets')}
                  >
                    Séries
                  </button>
                  <button 
                    type="button" 
                    className={`chart-metric-tab ${activeMetric === 'prs' ? 'active' : ''}`}
                    onClick={() => setActiveMetric('prs')}
                  >
                    PRs
                  </button>
                </div>

                <div className="chart-timeframe-pills">
                  <button 
                    type="button" 
                    className={`tf-pill ${timeframe === 'weeks' ? 'active' : ''}`}
                    onClick={() => setTimeframe('weeks')}
                  >
                    4 Semanas
                  </button>
                  <button 
                    type="button" 
                    className={`tf-pill ${timeframe === 'months' ? 'active' : ''}`}
                    onClick={() => setTimeframe('months')}
                  >
                    Meses
                  </button>
                </div>
              </div>

              {/* Bar Chart Bars */}
              <div className="muscle-bars-track-wrap">
                {chartData.map((d, idx) => {
                  const heightPct = d.val > 0 ? Math.max(18, (d.val / maxChartVal) * 100) : 8;
                  const isCurrent = idx === chartData.length - 1;

                  return (
                    <div key={idx} className="muscle-bar-col">
                      <span className={`bar-value-number ${d.val > 0 ? 'has-data' : 'zero'}`}>
                        {d.display}
                      </span>
                      <div className="bar-track-outer">
                        <div 
                          className={`bar-fill-inner ${d.val > 0 ? 'active' : 'empty'} ${isCurrent ? 'current-period' : ''}`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="bar-footer-label">{d.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PRs Highlight Banner if any exist for this muscle */}
            {muscleAnalytics.prList.length > 0 && (
              <div className="muscle-prs-highlight-box">
                <div className="prs-box-header">
                  <Sparkles size={16} className="text-warning" />
                  <h4>Recordes Pessoais (PRs) de {selectedMuscleGroup}</h4>
                </div>
                <div className="prs-badges-row">
                  {muscleAnalytics.prList.slice(0, 4).map((pr, idx) => (
                    <div key={idx} className="pr-trophy-badge">
                      <span className="pr-ex-name">{pr.name}:</span>
                      <strong className="pr-weight-val">{pr.maxWeight} kg</strong>
                      {pr.estimated1RM > 0 && (
                        <span className="pr-1rm-sub">1RM ~{pr.estimated1RM}kg</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Ranking & List of All Practiced Exercises for this Muscle Group */}
        <div className="muscle-exercises-ranking-section">
          <div className="ranking-section-title-row">
            <h3 className="sub-section-title">
              <Dumbbell size={18} className="text-accent" /> Exercícios Praticados de {selectedMuscleGroup} ({muscleAnalytics.exerciseList.length})
            </h3>
            <span className="ranking-hint-tag">Ordenado por Carga Máxima & Volume</span>
          </div>

          {muscleAnalytics.exerciseList.length > 0 ? (
            <div className="exercises-ranking-cards-list">
              {muscleAnalytics.exerciseList.map((ex, idx) => (
                <div key={idx} className="exercise-ranking-row-card">
                  <div className="rank-position-col">
                    <span className={`rank-number-badge ${idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : ''}`}>
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="ex-main-info-col">
                    <strong className="ex-title">{ex.name}</strong>
                    <div className="ex-meta-chips">
                      <span className="chip-item">Sessões: <strong>{ex.sessionsCount}x</strong></span>
                      <span className="chip-item">Total Séries: <strong>{ex.totalSets}</strong></span>
                      <span className="chip-item">Último treino: <strong>{formatDate(ex.lastDate)}</strong></span>
                    </div>
                  </div>

                  <div className="ex-pr-stats-col">
                    <div className="stat-pr-block">
                      <span className="stat-label">Carga Máxima (PR)</span>
                      <strong className="stat-val-highlight">{ex.maxWeight > 0 ? `${ex.maxWeight} kg` : 'Sem carga'}</strong>
                    </div>
                    {ex.estimated1RM > 0 && (
                      <div className="stat-pr-block 1rm-block">
                        <span className="stat-label">1RM Estimado</span>
                        <strong className="stat-val-1rm">{ex.estimated1RM} kg</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-muscle-exercises-box">
              <Dumbbell size={32} className="empty-icon" />
              <p>Nenhum exercício registrado para <strong>{selectedMuscleGroup}</strong> ainda.</p>
              <span>Conclua um treino contendo exercícios deste músculo para ver o ranking e histórico aqui!</span>
            </div>
          )}
        </div>
      </Card>

      {/* =========================================================================
          SECTION 2: HISTÓRICO E EVOLUÇÃO NA ABA DE MEDIDAS CORPORAIS
          ========================================================================= */}
      <Card className="profile-measurements-card" padding="lg">
        <div className="profile-card-header-action">
          <div>
            <h3 className="profile-section-title">
              <Ruler size={18} className="text-accent" /> Medidas Corporais & Evolução
            </h3>
            <p className="profile-section-subtitle">
              {latestMeasurement.date 
                ? `Última medição registrada em: ${formatDate(latestMeasurement.date)}` 
                : 'Nenhuma medição registrada ainda. Clique em "Atualizar Medidas" para registrar.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {measurementsHistory.length > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                icon={History}
                onClick={() => setIsHistoryModalOpen(true)}
              >
                Ver Histórico ({measurementsHistory.length})
              </Button>
            )}
            <Button 
              variant="primary" 
              size="sm" 
              icon={Ruler}
              onClick={() => {
                setFormMeasurements({ ...latestMeasurement, date: new Date().toISOString().slice(0, 10) });
                setIsMeasurementsModalOpen(true);
              }}
            >
              Atualizar Medidas
            </Button>
          </div>
        </div>

        {/* IMC Highlight Banner */}
        <div className="profile-imc-banner">
          <div className="imc-left">
            <span className="imc-tag">ÍNDICE DE MASSA CORPORAL (IMC)</span>
            <div className="imc-number-row">
              <strong className="imc-number">{userIMC.val}</strong>
              <span className="imc-label-badge" style={{ backgroundColor: `${userIMC.color}22`, color: userIMC.color, borderColor: userIMC.color }}>
                ● {userIMC.label}
              </span>
            </div>
          </div>
          <div className="imc-meta-pills">
            <div className="imc-stat-pill">
              <span>Peso</span>
              <strong>{latestMeasurement.weight > 0 ? `${latestMeasurement.weight} kg` : '-'}</strong>
            </div>
            <div className="imc-stat-pill">
              <span>Altura</span>
              <strong>{latestMeasurement.height > 0 ? `${latestMeasurement.height} cm` : '-'}</strong>
            </div>
          </div>
        </div>

        {/* Current Measurements Grid */}
        <div className="profile-measurements-grid">
          <div className="measurement-cell">
            <span className="m-label">Braço Esquerdo</span>
            <strong className="m-val">{latestMeasurement.leftArm > 0 ? `${latestMeasurement.leftArm} cm` : '-'}</strong>
          </div>
          <div className="measurement-cell">
            <span className="m-label">Braço Direito</span>
            <strong className="m-val">{latestMeasurement.rightArm > 0 ? `${latestMeasurement.rightArm} cm` : '-'}</strong>
          </div>
          <div className="measurement-cell">
            <span className="m-label">Cintura</span>
            <strong className="m-val">{latestMeasurement.waist > 0 ? `${latestMeasurement.waist} cm` : '-'}</strong>
          </div>
          <div className="measurement-cell">
            <span className="m-label">Peitoral</span>
            <strong className="m-val">{latestMeasurement.chest > 0 ? `${latestMeasurement.chest} cm` : '-'}</strong>
          </div>
          <div className="measurement-cell">
            <span className="m-label">Coxa Esquerda</span>
            <strong className="m-val">{latestMeasurement.leftThigh > 0 ? `${latestMeasurement.leftThigh} cm` : '-'}</strong>
          </div>
          <div className="measurement-cell">
            <span className="m-label">Coxa Direita</span>
            <strong className="m-val">{latestMeasurement.rightThigh > 0 ? `${latestMeasurement.rightThigh} cm` : '-'}</strong>
          </div>
          <div className="measurement-cell">
            <span className="m-label">Panturrilhas</span>
            <strong className="m-val">{latestMeasurement.calves > 0 ? `${latestMeasurement.calves} cm` : '-'}</strong>
          </div>
        </div>

        {/* Evolution comparison with exact time interval */}
        {previousMeasurement && (
          <div className="measurements-evolution-banner">
            <div className="evolution-header-line">
              <span className="evol-title">
                📈 <strong>Evolução Corporal</strong> em relação a {formatDate(previousMeasurement.date)}:
              </span>
              <span className="evol-interval-pill">
                ⏱️ {formatTimeInterval(latestMeasurement.date, previousMeasurement.date)}
              </span>
            </div>

            <div className="evol-items-chips-grid">
              {[
                { label: 'Braço E.', curr: latestMeasurement.leftArm, prev: previousMeasurement.leftArm, unit: 'cm' },
                { label: 'Braço D.', curr: latestMeasurement.rightArm, prev: previousMeasurement.rightArm, unit: 'cm' },
                { label: 'Peitoral', curr: latestMeasurement.chest, prev: previousMeasurement.chest, unit: 'cm' },
                { label: 'Cintura', curr: latestMeasurement.waist, prev: previousMeasurement.waist, unit: 'cm', invertColor: true },
                { label: 'Coxa E.', curr: latestMeasurement.leftThigh, prev: previousMeasurement.leftThigh, unit: 'cm' },
                { label: 'Coxa D.', curr: latestMeasurement.rightThigh, prev: previousMeasurement.rightThigh, unit: 'cm' },
                { label: 'Panturrilha', curr: latestMeasurement.calves, prev: previousMeasurement.calves, unit: 'cm' },
                { label: 'Peso', curr: latestMeasurement.weight, prev: previousMeasurement.weight, unit: 'kg' },
              ].filter(item => Number(item.curr) > 0 && Number(item.prev) > 0).map(item => {
                const diff = (Number(item.curr) - Number(item.prev)).toFixed(1);
                const isPositive = Number(diff) > 0;
                const isZero = Number(diff) === 0;
                
                // For waist, reduction is positive (green)
                const isFavorable = item.invertColor ? Number(diff) < 0 : Number(diff) > 0;

                return (
                  <div key={item.label} className="evol-chip-card">
                    <span className="chip-label">{item.label}</span>
                    <div className="chip-values">
                      <span className="chip-prev">{item.prev}{item.unit}</span>
                      <span className="chip-arrow">→</span>
                      <strong className="chip-curr">{item.curr}{item.unit}</strong>
                    </div>
                    <span className={`chip-diff-tag ${isZero ? 'zero' : isFavorable ? 'favorable' : 'neutral'}`}>
                      {isPositive ? `+${diff}` : diff} {item.unit}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Mini Timeline of Recent Updates */}
        {measurementsHistory.length > 0 && (
          <div className="measurements-timeline-wrap">
            <div className="timeline-header-row">
              <span className="timeline-title">
                📋 Registro de Histórico ({measurementsHistory.length} {measurementsHistory.length === 1 ? 'medição' : 'medições'})
              </span>
              <button 
                type="button" 
                className="view-all-history-btn"
                onClick={() => setIsHistoryModalOpen(true)}
              >
                Ver todos os registros →
              </button>
            </div>

            <div className="timeline-cards-list">
              {measurementsHistory.slice(0, 3).map((m, idx) => {
                const prevM = measurementsHistory[idx + 1] || null;
                const interval = prevM ? formatTimeInterval(m.date, prevM.date) : null;

                return (
                  <div key={m.id || idx} className="history-timeline-entry">
                    <div className="entry-header">
                      <strong className="entry-date">📅 {formatDate(m.date)}</strong>
                      {interval && (
                        <span className="entry-interval">({interval} após medição anterior)</span>
                      )}
                    </div>
                    <div className="entry-metrics-row">
                      {m.weight > 0 && <span className="m-val-badge">Peso: <strong>{m.weight} kg</strong></span>}
                      {m.leftArm > 0 && <span className="m-val-badge">Braço E.: <strong>{m.leftArm} cm</strong></span>}
                      {m.rightArm > 0 && <span className="m-val-badge">Braço D.: <strong>{m.rightArm} cm</strong></span>}
                      {m.chest > 0 && <span className="m-val-badge">Peitoral: <strong>{m.chest} cm</strong></span>}
                      {m.waist > 0 && <span className="m-val-badge">Cintura: <strong>{m.waist} cm</strong></span>}
                      {m.leftThigh > 0 && <span className="m-val-badge">Coxa: <strong>{m.leftThigh} cm</strong></span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* =========================================================================
          SECTION 3: ESCALA SEMANAL DE TREINOS NO PERFIL
          ========================================================================= */}
      <Card className="profile-schedule-card" padding="lg">
        <div className="profile-card-header-action">
          <div>
            <h3 className="profile-section-title">
              <Calendar size={18} className="text-accent" /> Escala Semanal de Treinos
            </h3>
            <p className="profile-section-subtitle">
              Seu planejamento de rotina fixado para cada dia da semana.
            </p>
          </div>
          <Button 
            variant="secondary" 
            size="sm" 
            icon={Edit3}
            onClick={() => {
              setTempSchedule({ ...weeklySchedule });
              setIsScheduleModalOpen(true);
            }}
          >
            Editar Escala
          </Button>
        </div>

        <div className="profile-schedule-days-grid">
          {DAYS_OF_WEEK.map(day => {
            const entry = weeklySchedule?.[day.id] || { type: 'rest', label: 'Descanso' };
            const isRest = entry.type === 'rest' || (!entry.hasWorkout && !entry.hasCardio && entry.type !== 'workout' && entry.type !== 'cardio' && entry.type !== 'both');
            const hasW = entry.hasWorkout || entry.type === 'workout' || entry.type === 'both';
            const hasC = entry.hasCardio || entry.type === 'cardio' || entry.type === 'both';

            return (
              <div key={day.id} className={`profile-schedule-day-box ${isRest ? 'is-rest' : hasC && !hasW ? 'is-cardio' : 'is-workout'}`}>
                <span className="p-sched-day-name">{day.name}</span>
                <div className="p-sched-day-badge" style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {isRest ? (
                    <span className="p-sched-rest-text">💤 Descanso</span>
                  ) : (
                    <>
                      {hasW && (
                        <strong className="p-sched-workout-text" title={entry.workoutLabel || entry.label}>
                          🏋️ {entry.workoutLabel || entry.label || 'Treino'}
                        </strong>
                      )}
                      {hasC && (
                        <strong className="p-sched-cardio-text" title={entry.cardioLabel || 'Cardio'}>
                          🏃 {entry.cardioLabel || 'Cardio'}
                        </strong>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Calendar Card */}
      <Card className="profile-calendar-card" padding="lg">
        <div className="profile-cal-nav">
          <button className="cal-nav-btn" onClick={prevMonth} aria-label="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <h3 className="cal-nav-title">
            {getMonthName(calMonth)} de {calYear}
          </h3>
          <button className="cal-nav-btn" onClick={nextMonth} aria-label="Próximo mês">
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="profile-cal-weekdays">
          <span>Seg</span>
          <span>Ter</span>
          <span>Qua</span>
          <span>Qui</span>
          <span>Sex</span>
          <span>Sáb</span>
          <span>Dom</span>
        </div>

        <div className="profile-cal-grid">
          {calendarDays.map((dObj, idx) => {
            if (!dObj) {
              return <div key={`blank-${idx}`} className="profile-cal-cell calendar-day-blank" />;
            }
            const trained = hasWorkoutOnDay(dObj);
            return (
              <div 
                key={idx}
                className={`profile-cal-cell ${trained ? 'trained-active' : ''}`}
              >
                <span className="cal-num">{dObj.day}</span>
              </div>
            );
          })}
        </div>
      </Card>

      {/* MODAL: HISTÓRICO COMPLETO DE MEDIÇÕES */}
      {isHistoryModalOpen && (
        <Modal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          title="Histórico Completo de Medidas Corporais"
          size="md"
        >
          <div className="full-history-modal-body">
            <p className="history-modal-intro">
              Todas as atualizações de medidas registradas na sua conta ao longo do tempo.
            </p>

            <div className="full-history-scroll-list">
              {measurementsHistory.map((m, idx) => {
                const prevM = measurementsHistory[idx + 1] || null;
                const interval = prevM ? formatTimeInterval(m.date, prevM.date) : null;

                return (
                  <div key={m.id || idx} className="full-history-card-item">
                    <div className="card-top-row">
                      <div className="date-box">
                        <strong>📅 {formatDate(m.date)}</strong>
                        {interval && <span className="time-interval-tag">⏱️ {interval}</span>}
                      </div>
                      <button 
                        type="button" 
                        className="delete-measurement-btn"
                        onClick={() => handleDeleteMeasurement(m.id)}
                        title="Excluir este registro"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="metrics-grid-compact">
                      {m.weight > 0 && <div><span>Peso:</span><strong>{m.weight} kg</strong></div>}
                      {m.height > 0 && <div><span>Altura:</span><strong>{m.height} cm</strong></div>}
                      {m.leftArm > 0 && <div><span>Braço E.:</span><strong>{m.leftArm} cm</strong></div>}
                      {m.rightArm > 0 && <div><span>Braço D.:</span><strong>{m.rightArm} cm</strong></div>}
                      {m.chest > 0 && <div><span>Peitoral:</span><strong>{m.chest} cm</strong></div>}
                      {m.waist > 0 && <div><span>Cintura:</span><strong>{m.waist} cm</strong></div>}
                      {m.leftThigh > 0 && <div><span>Coxa E.:</span><strong>{m.leftThigh} cm</strong></div>}
                      {m.rightThigh > 0 && <div><span>Coxa D.:</span><strong>{m.rightThigh} cm</strong></div>}
                      {m.calves > 0 && <div><span>Panturrilhas:</span><strong>{m.calves} cm</strong></div>}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions-bar">
              <Button type="button" variant="primary" onClick={() => setIsHistoryModalOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL: ATUALIZAR MEDIDAS CORPORAIS & IMC */}
      {isMeasurementsModalOpen && (
        <Modal
          isOpen={isMeasurementsModalOpen}
          onClose={() => setIsMeasurementsModalOpen(false)}
          title="Medidas Corporais & Avaliação Física"
          size="md"
        >
          <form className="measurements-form" onSubmit={handleSaveMeasurements}>
            {/* Live IMC preview in modal */}
            <div className="modal-imc-preview">
              <div className="modal-imc-left">
                <span>Cálculo Automático de IMC</span>
                <strong>{formLiveIMC.val}</strong>
              </div>
              <span className="modal-imc-status" style={{ backgroundColor: `${formLiveIMC.color}25`, color: formLiveIMC.color }}>
                {formLiveIMC.label}
              </span>
            </div>

            <div className="measurements-inputs-grid">
              <div className="m-input-field" style={{ gridColumn: 'span 2' }}>
                <label>Data da Medição</label>
                <input 
                  type="date"
                  value={formMeasurements.date || new Date().toISOString().slice(0, 10)}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div className="m-input-field">
                <label>Peso Corporal (kg)</label>
                <input 
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.weight === 0 ? '' : formMeasurements.weight}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, weight: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Altura (cm)</label>
                <input 
                  type="number"
                  step="1"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.height === 0 ? '' : formMeasurements.height}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, height: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Braço Esquerdo (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.leftArm === 0 ? '' : formMeasurements.leftArm}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, leftArm: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Braço Direito (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.rightArm === 0 ? '' : formMeasurements.rightArm}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, rightArm: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Cintura (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.waist === 0 ? '' : formMeasurements.waist}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, waist: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Peitoral (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.chest === 0 ? '' : formMeasurements.chest}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, chest: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Coxa Esquerda (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.leftThigh === 0 ? '' : formMeasurements.leftThigh}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, leftThigh: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Coxa Direita (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.rightThigh === 0 ? '' : formMeasurements.rightThigh}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, rightThigh: e.target.value }))}
                />
              </div>

              <div className="m-input-field">
                <label>Panturrilhas (cm)</label>
                <input 
                  type="number"
                  step="0.5"
                  min="0"
                  placeholder="0"
                  value={formMeasurements.calves === 0 ? '' : formMeasurements.calves}
                  onChange={e => setFormMeasurements(prev => ({ ...prev, calves: e.target.value }))}
                />
              </div>
            </div>

            <div className="modal-form-actions">
              <Button type="button" variant="ghost" onClick={() => setIsMeasurementsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="primary" icon={Check}>
                Salvar Medidas
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL: ESCALA SEMANAL NO PERFIL */}
      {isScheduleModalOpen && (
        <Modal
          isOpen={isScheduleModalOpen}
          onClose={() => setIsScheduleModalOpen(false)}
          title="Escala Semanal & Dias de Treino"
          size="md"
        >
          <form className="schedule-form" onSubmit={handleSaveSchedule}>
            <p className="schedule-intro-text">
              Defina o nome do treino a se realizar em cada dia da semana ou marque descanso.
            </p>

            <div className="schedule-days-list">
              {DAYS_OF_WEEK.map(day => {
                const currentEntry = tempSchedule[day.id] || { type: 'rest', label: 'Descanso' };
                const isRest = currentEntry.type === 'rest';

                return (
                  <div key={day.id} className="schedule-day-row">
                    <span className="schedule-day-name">{day.name}</span>
                    
                    <div className="schedule-day-controls">
                      {!isRest ? (
                        <input
                          type="text"
                          className="schedule-text-input"
                          placeholder="Digite o nome do treino..."
                          value={currentEntry.label || ''}
                          onChange={e => {
                            const val = e.target.value;
                            setTempSchedule(prev => ({
                              ...prev,
                              [day.id]: { type: 'workout', label: val }
                            }));
                          }}
                        />
                      ) : (
                        <div className="schedule-rest-indicator-badge">
                          <span>💤 Descanso Programado</span>
                        </div>
                      )}

                      <button
                        type="button"
                        className={`btn-toggle-rest ${isRest ? 'is-rest' : ''}`}
                        onClick={() => {
                          if (isRest) {
                            setTempSchedule(prev => ({
                              ...prev,
                              [day.id]: { type: 'workout', label: 'Treino' }
                            }));
                          } else {
                            setTempSchedule(prev => ({
                              ...prev,
                              [day.id]: { type: 'rest', label: 'Descanso' }
                            }));
                          }
                        }}
                      >
                        {isRest ? 'Definir Treino' : '💤 Marcar Descanso'}
                      </button>
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

      {/* MODAL: EDIT GOAL & PRIVACY */}
      {isEditingGoal && (
        <Modal
          isOpen={isEditingGoal}
          onClose={() => setIsEditingGoal(false)}
          title="Configurações de Perfil"
          size="sm"
        >
          <div className="settings-form">
            <div className="settings-section">
              <label>Meta Semanal de Treinos (dias)</label>
              <input
                type="number"
                min="1"
                max="7"
                className="onboarding-input"
                style={{ marginTop: 8 }}
                value={tempGoal}
                onChange={e => setTempGoal(Number(e.target.value))}
              />
            </div>

            <div className="settings-section" style={{ marginTop: 16 }}>
              <label>Alterar Senha da Conta (Opcional)</label>
              <input
                type="password"
                className="onboarding-input"
                style={{ marginTop: 8 }}
                placeholder="Nova senha (mín. 6 caracteres)"
                value={tempPassword}
                onChange={e => { setTempPassword(e.target.value); setModalPasswordError(''); }}
              />
              {tempPassword && (
                <input
                  type="password"
                  className="onboarding-input"
                  style={{ marginTop: 8 }}
                  placeholder="Confirme a nova senha"
                  value={tempConfirmPassword}
                  onChange={e => { setTempConfirmPassword(e.target.value); setModalPasswordError(''); }}
                />
              )}
              {modalPasswordError && (
                <span style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: 4, display: 'block', fontWeight: 600 }}>
                  ⚠️ {modalPasswordError}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, display: 'block' }}>
                Deixe em branco caso não queira alterar sua senha atual.
              </span>
            </div>
            
            <div className="settings-section" style={{ marginTop: 24 }}>
              <h4>Configurações de Privacidade do Perfil</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 12 }}>
                Escolha o que os outros atletas e membros de grupos podem visualizar:
              </p>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={user?.privacy?.publicMeasurements ?? false}
                  onChange={e => updatePrivacy({ publicMeasurements: e.target.checked })}
                />
                <span>Mostrar Medidas Corporais no Perfil</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={user?.privacy?.publicWeights ?? false}
                  onChange={e => updatePrivacy({ publicWeights: e.target.checked })}
                />
                <span>Mostrar Cargas / Pesos dos Treinos no Feed</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12, cursor: 'pointer' }}>
                <input 
                  type="checkbox"
                  checked={user?.privacy?.publicPRs ?? false}
                  onChange={e => updatePrivacy({ publicPRs: e.target.checked })}
                />
                <span>Mostrar Recordes Pessoais (PRs)</span>
              </label>

              <div style={{ marginTop: 16, padding: '12px 14px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>
                  <span>📋 Rotinas de Treino: Públicas</span>
                </div>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: 4, lineHeight: 1.4 }}>
                  Suas rotinas ficam disponíveis para amigos poderem ver quais exercícios você faz.
                </p>

                <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, cursor: 'pointer', fontSize: '0.8125rem' }}>
                  <input 
                    type="checkbox"
                    checked={user?.privacy?.publicRoutineWeights ?? false}
                    onChange={e => updatePrivacy({ publicRoutineWeights: e.target.checked })}
                  />
                  <span>Mostrar pesos e cargas nas rotinas (desmarque para ocultar pesos)</span>
                </label>
              </div>
            </div>

            <div className="modal-form-actions" style={{ marginTop: 24 }}>
              <Button type="button" variant="ghost" onClick={() => setIsEditingGoal(false)}>Cancelar</Button>
              <Button type="button" variant="primary" onClick={() => {
                if (tempPassword || tempConfirmPassword) {
                  if (tempPassword.length < 6) {
                    setModalPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
                    return;
                  }
                  if (tempPassword !== tempConfirmPassword) {
                    setModalPasswordError('As senhas não coincidem. Confirme a nova senha.');
                    return;
                  }
                }

                updateWeeklyGoal(tempGoal);
                if (tempPassword && tempPassword === tempConfirmPassword) {
                  updatePassword(tempPassword);
                  setTempPassword('');
                  setTempConfirmPassword('');
                }
                setIsEditingGoal(false);
              }}>Salvar</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Workout History Log Feed */}
      <div className="profile-history-section">
        <h2 className="history-section-title">Histórico Geral de Sessões</h2>

        <div className="history-cards-stack">
          {checkins.map(item => {
            const routineRef = routines.find(r => r.id === item.routineId);

            return (
              <Card key={item.id} className="history-workout-card" padding="lg">
                {/* Header */}
                <div className="history-header">
                  <div className="history-user-info">
                    <Avatar src={user?.avatar} name={user?.name} size="sm" />
                    <div>
                      <span className="history-username">{user?.username || 'atleta'}</span>
                      <span className="history-timestamp">{formatDateTime(item.date)} • Só você</span>
                    </div>
                  </div>

                  <span className="history-routine-badge">
                    {item.routineName || 'Treino'}
                  </span>
                </div>

                {/* Metrics */}
                <div className="history-metrics-bar">
                  <div className="h-metric">
                    <span className="h-metric-label">Duração</span>
                    <strong className="h-metric-val">{item.durationMinutes} min</strong>
                  </div>
                  <div className="h-metric">
                    <span className="h-metric-label">Volume</span>
                    <strong className="h-metric-val">{item.totalVolumeKg?.toLocaleString('pt-BR')} kg</strong>
                  </div>
                  <div className="h-metric">
                    <span className="h-metric-label">Repetições</span>
                    <strong className="h-metric-val">{item.totalReps || 0}</strong>
                  </div>
                </div>

                {/* Photo if present */}
                {item.photoUrl && (
                  <div className="history-photo-preview">
                    <img src={item.photoUrl} alt="Comprovante" />
                  </div>
                )}

                {/* Exercises overview */}
                {item.exercises && item.exercises.length > 0 && (
                  <div className="history-exercises-breakdown">
                    {item.exercises.map((ex, exIdx) => (
                      <div key={ex.id || exIdx} className="history-exercise-line">
                        <div className="line-left">
                          <span className="line-sets-badge">{ex.sets?.length || 3} séries</span>
                          <span className="line-exercise-name">{ex.name}</span>
                        </div>
                        {ex.notes && (
                          <span className="line-notes-badge" title={ex.notes}>
                            Obs: {ex.notes.slice(0, 40)}...
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Session Notes */}
                {item.notes && (
                  <div className="history-session-notes">
                    <strong>Anotação da sessão:</strong> {item.notes}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
