import React, { useState } from 'react';
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
  Shield
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
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

export default function ProfilePage() {
  const { user, updateProfile, addMeasurement, updatePrivacy, updateWeeklyGoal, updatePassword } = useAuth();
  const { checkins, routines, weeklySchedule, updateWeeklySchedule } = useData();
  const stats = useFrequencyStats();
  const navigate = useNavigate();

  // Stats controls: timeframe and metric
  const [timeframe, setTimeframe] = useState('weeks'); // 'days' | 'weeks' | 'months' | 'years'
  const [activeMetric, setActiveMetric] = useState('volume'); // 'volume' | 'prs' | 'workouts'
  
  // Calendar month state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const calMonth = calendarDate.getMonth();
  const calYear = calendarDate.getFullYear();
  const calendarDays = getCalendarDaysCurrentOnly(calYear, calMonth);

  // Measurements Modal state
  const [isMeasurementsModalOpen, setIsMeasurementsModalOpen] = useState(false);
  const latestMeasurement = user?.measurementsHistory?.[0] || {
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
  const previousMeasurement = user?.measurementsHistory?.[1] || null;

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

  // Handle Save Schedule
  const handleSaveSchedule = (e) => {
    e.preventDefault();
    updateWeeklySchedule(tempSchedule);
    setIsScheduleModalOpen(false);
  };

  // Dynamic Chart Data based on timeframe and metric
  const getChartData = () => {
    // Generate chart from real checkins
    const grouped = {};
    checkins.forEach(c => {
      const d = new Date(c.date);
      let key = '';
      let label = '';
      if (timeframe === 'days') {
        // Last 7 days
        key = d.toLocaleDateString();
        label = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      } else if (timeframe === 'weeks') {
        // Group by week of year approx (or last 4 weeks)
        key = `Week ${Math.ceil(d.getDate() / 7)}`;
        label = `Semana`;
      } else if (timeframe === 'months') {
        key = d.getMonth();
        label = getMonthName(d.getMonth()).substring(0, 3);
      } else {
        key = d.getFullYear();
        label = d.getFullYear().toString();
      }

      if (!grouped[key]) grouped[key] = { label, volume: 0, prs: 0, workouts: 0, sortKey: d.getTime() };
      
      grouped[key].volume += c.totalVolumeKg || 0;
      grouped[key].workouts += 1;
      // We simulate PRs based on volume increase for simplicity
      grouped[key].prs += (c.totalVolumeKg > 2000 ? 1 : 0);
    });

    // Convert to array and sort
    const result = Object.values(grouped).sort((a, b) => a.sortKey - b.sortKey).slice(-7).map(g => {
      let val = 0;
      let display = '';
      if (activeMetric === 'volume') {
        val = g.volume;
        display = g.volume >= 10000 ? (g.volume / 1000).toFixed(1) + 't' : g.volume.toLocaleString('pt-BR') + ' kg';
      } else if (activeMetric === 'prs') {
        val = g.prs;
        display = g.prs + ' PRs';
      } else {
        val = g.workouts;
        display = g.workouts + 'x';
      }
      return { label: g.label, val, display };
    });

    if (result.length === 0) {
      return [{ label: 'Sem dados', val: 0, display: '0' }];
    }
    return result;
  };

  const chartData = getChartData();
  const maxVal = Math.max(...chartData.map(d => d.val), 1);

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
                <strong className="text-accent">{user?.weeklyGoal || 5}x</strong>
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

      {/* SECTION 1: ESCALA SEMANAL DE TREINOS NO PERFIL */}
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

      {/* SECTION 2: SISTEMA DE MEDIDAS CORPORAIS & IMC */}
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
          <Button 
            variant="secondary" 
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

        {/* Grid of Measurements */}
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

        {/* Evolution comparison if previous measurement exists */}
        {previousMeasurement && (
          <div className="measurements-evolution-banner" style={{
            marginTop: 18,
            padding: '14px 16px',
            background: 'var(--bg-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)'
          }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 10 }}>
              📈 Comparativo de evolução (em relação a {previousMeasurement.date ? formatDate(previousMeasurement.date) : 'medição anterior'}):
            </span>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {[
                { label: 'Braço E.', curr: latestMeasurement.leftArm, prev: previousMeasurement.leftArm, unit: 'cm' },
                { label: 'Braço D.', curr: latestMeasurement.rightArm, prev: previousMeasurement.rightArm, unit: 'cm' },
                { label: 'Peitoral', curr: latestMeasurement.chest, prev: previousMeasurement.chest, unit: 'cm' },
                { label: 'Cintura', curr: latestMeasurement.waist, prev: previousMeasurement.waist, unit: 'cm' },
                { label: 'Coxa E.', curr: latestMeasurement.leftThigh, prev: previousMeasurement.leftThigh, unit: 'cm' },
                { label: 'Coxa D.', curr: latestMeasurement.rightThigh, prev: previousMeasurement.rightThigh, unit: 'cm' },
                { label: 'Panturrilha', curr: latestMeasurement.calves, prev: previousMeasurement.calves, unit: 'cm' },
                { label: 'Peso', curr: latestMeasurement.weight, prev: previousMeasurement.weight, unit: 'kg' },
              ].filter(item => Number(item.curr) > 0 && Number(item.prev) > 0).map(item => {
                const diff = (Number(item.curr) - Number(item.prev)).toFixed(1);
                const isPositive = Number(diff) > 0;
                const isZero = Number(diff) === 0;
                return (
                  <div key={item.label} style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg-card)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{item.label}:</span>
                    <strong>{item.prev} → {item.curr}{item.unit}</strong>
                    <span style={{ 
                      color: isZero ? 'var(--text-tertiary)' : isPositive ? '#22c55e' : '#ef4444',
                      fontWeight: 700 
                    }}>
                      ({isPositive ? `+${diff}` : diff}{item.unit})
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* History timeline list */}
        {user?.measurementsHistory && user.measurementsHistory.length > 0 && (
          <div className="measurements-timeline" style={{ marginTop: 18 }}>
            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
              📋 Histórico de Medições ({user.measurementsHistory.length}):
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {user.measurementsHistory.slice(0, 5).map((m, idx) => (
                <div key={m.id || idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8125rem',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                    📅 {m.date ? formatDate(m.date) : 'Sem data'}
                  </span>
                  <div style={{ display: 'flex', gap: 12, color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
                    {m.weight > 0 && <span>Peso: <strong>{m.weight}kg</strong></span>}
                    {m.leftArm > 0 && <span>Braço E.: <strong>{m.leftArm}cm</strong></span>}
                    {m.rightArm > 0 && <span>Braço D.: <strong>{m.rightArm}cm</strong></span>}
                    {m.chest > 0 && <span>Peito: <strong>{m.chest}cm</strong></span>}
                    {m.waist > 0 && <span>Cintura: <strong>{m.waist}cm</strong></span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* SECTION 3: ESTATÍSTICAS E GRÁFICO FUNCIONAL E CLARO */}
      <div className="profile-analytics-grid">
        <Card className="profile-chart-card" padding="lg">
          <div className="chart-card-header">
            <div>
              <h3 className="profile-section-title">
                <TrendingUp size={18} className="text-accent" /> Progresso & Estatísticas
              </h3>
              <p className="profile-section-subtitle">Acompanhe sua evolução ao longo do tempo</p>
            </div>

            {/* Timeframe selector: Dias, Semanas, Meses, Anos */}
            <div className="chart-timeframe-selector">
              <button 
                type="button" 
                className={`timeframe-btn ${timeframe === 'days' ? 'active' : ''}`}
                onClick={() => setTimeframe('days')}
              >
                7 Dias
              </button>
              <button 
                type="button" 
                className={`timeframe-btn ${timeframe === 'weeks' ? 'active' : ''}`}
                onClick={() => setTimeframe('weeks')}
              >
                4 Semanas
              </button>
              <button 
                type="button" 
                className={`timeframe-btn ${timeframe === 'months' ? 'active' : ''}`}
                onClick={() => setTimeframe('months')}
              >
                Meses
              </button>
              <button 
                type="button" 
                className={`timeframe-btn ${timeframe === 'years' ? 'active' : ''}`}
                onClick={() => setTimeframe('years')}
              >
                Anos
              </button>
            </div>
          </div>

          {/* Metric Selector Tabs */}
          <div className="chart-metric-selector-row">
            <button 
              type="button" 
              className={`c-metric-btn ${activeMetric === 'volume' ? 'active' : ''}`}
              onClick={() => setActiveMetric('volume')}
            >
              <Weight size={15} /> Volume Total (kg)
            </button>
            <button 
              type="button" 
              className={`c-metric-btn ${activeMetric === 'prs' ? 'active' : ''}`}
              onClick={() => setActiveMetric('prs')}
            >
              <Sparkles size={15} /> Recordes / PRs
            </button>
            <button 
              type="button" 
              className={`c-metric-btn ${activeMetric === 'workouts' ? 'active' : ''}`}
              onClick={() => setActiveMetric('workouts')}
            >
              <Activity size={15} /> Frequência
            </button>
          </div>

          {/* Summary Evolution Banner */}
          <div className="chart-evolution-summary">
            {(() => {
              const totalVolume = checkins.reduce((sum, c) => sum + (c.totalVolumeKg || 0), 0);
              const totalWorkouts = checkins.filter(c => c.type !== 'cardio').length;
              const totalPrs = checkins.reduce((sum, c) => sum + (c.totalVolumeKg > 2000 ? 1 : 0), 0);

              return (
                <>
                  <div className="evol-main-stat">
                    <span className="evol-number">
                      {activeMetric === 'volume' && (totalVolume > 0 ? `${totalVolume.toLocaleString('pt-BR')} kg` : '0 kg')}
                      {activeMetric === 'prs' && `${totalPrs} PRs`}
                      {activeMetric === 'workouts' && `${totalWorkouts} Treinos`}
                    </span>
                    <span className="evol-sub">no período selecionado</span>
                  </div>
                  <div className="evol-growth-badge">
                    {totalWorkouts > 0 ? (
                      <>
                        <span className="growth-tag">📈 {totalWorkouts} {totalWorkouts === 1 ? 'treino registrado' : 'treinos registrados'}</span>
                        <span className="growth-hint">Acompanhando sua evolução real</span>
                      </>
                    ) : (
                      <>
                        <span className="growth-tag" style={{ color: 'var(--text-secondary)' }}>🌱 Sem treinos registrados</span>
                        <span className="growth-hint">Conclua seu primeiro treino para acompanhar aqui!</span>
                      </>
                    )}
                  </div>
                </>
              );
            })()}
          </div>

          {/* Intuitive and Easy to Understand Bar Chart with Numbers Printed on Top */}
          <div className="chart-functional-bars-wrap">
            {chartData.map((d, idx) => {
              const heightPct = d.val > 0 ? Math.max(16, (d.val / maxVal) * 100) : 6;
              const isLast = idx === chartData.length - 1;

              return (
                <div key={idx} className="chart-functional-col">
                  {/* Exact Value printed right above the bar */}
                  <span className={`bar-value-top ${d.val > 0 ? 'has-val' : 'is-zero'}`}>
                    {d.display}
                  </span>

                  <div className="bar-track-functional">
                    <div 
                      className={`bar-fill-functional ${d.val > 0 ? 'filled' : 'empty'} ${isLast ? 'is-current' : ''}`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>

                  <span className="bar-label-bottom">{d.label}</span>
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
      </div>

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

      {/* Workout History Log Feed (Inspired by Hevy screenshot 4) */}
      <div className="profile-history-section">
        <h2 className="history-section-title">Histórico de Treinos</h2>

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
                      <span className="history-username">{user?.username || 'joaosilva'}</span>
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
                    <strong className="h-metric-val">{item.totalReps || 140}</strong>
                  </div>
                </div>

                {/* Photo if present */}
                {item.photoUrl && (
                  <div className="history-photo-preview">
                    <img src={item.photoUrl} alt="Comprovante" />
                  </div>
                )}

                {/* Exercises overview */}
                {routineRef?.exercises && (
                  <div className="history-exercises-breakdown">
                    {routineRef.exercises.map((ex, exIdx) => (
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
