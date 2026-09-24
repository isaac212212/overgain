import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Camera, ChevronRight, Check, Upload, User, Sparkles, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import './OnboardingPage.css';

const WEEKLY_GOALS = [1, 2, 3, 4, 5, 6, 7];

const GENDER_OPTIONS = [
  { id: 'Masculino', label: 'Masculino', icon: '♂' },
  { id: 'Feminino', label: 'Feminino', icon: '♀' },
  { id: 'Outro', label: 'Outro', icon: '⚧' },
  { id: 'Prefiro não informar', label: 'Prefiro não informar', icon: '👤' }
];

export default function OnboardingPage() {
  const { pendingUser, completeOnboarding } = useAuth();
  const navigate = useNavigate();
  const fileRef = useRef();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState(pendingUser?.name || '');
  const [avatar, setAvatar] = useState(pendingUser?.avatar || null);
  const [gender, setGender] = useState(pendingUser?.gender || 'Masculino');
  const [weeklyGoal, setWeeklyGoal] = useState(pendingUser?.weeklyGoal || 4);
  const [pin, setPin] = useState(() => sessionStorage.getItem('pending_pin') || '');
  const [pinConfirm, setPinConfirm] = useState('');

  const handleAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setAvatar(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleComplete = () => {
    completeOnboarding({
      name: username.trim() || 'Atleta Heavy Duty',
      avatar,
      gender,
      weeklyGoal,
      pin: pin || null
    });
    sessionStorage.removeItem('pending_pin');
    navigate('/dashboard');
  };

  const canNext = () => {
    if (step === 1) return username.trim().length >= 2;
    if (step === 3) return Boolean(gender);
    if (step === 5) {
      if (!pin || pin.length < 4) return false;
      if (pin !== pinConfirm) return false;
      return true;
    }
    return true;
  };

  const totalSteps = 5;

  return (
    <div className="onboarding-page">
      <div className="onboarding-container animate-fade-in-up">
        {/* Progress */}
        <div className="onboarding-progress">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`onboarding-progress-dot ${s <= step ? 'active' : ''} ${s < step ? 'completed' : ''}`}>
              {s < step ? <Check size={12} /> : s}
            </div>
          ))}
          <div className="onboarding-progress-bar">
            <div className="onboarding-progress-fill" style={{ width: `${((step - 1) / (totalSteps - 1)) * 100}%` }} />
          </div>
        </div>

        {/* Step 1: Username / Full name */}
        {step === 1 && (
          <div className="onboarding-step animate-fade-in-up" key="step1">
            <h2>Como devemos te chamar?</h2>
            <p className="onboarding-desc">Digite seu nome completo ou apelido de treino para seu perfil.</p>
            <input
              type="text"
              className="onboarding-input"
              placeholder="Ex: João Silva"
              value={username}
              onChange={e => setUsername(e.target.value)}
              autoFocus
              maxLength={30}
            />
            <span className="onboarding-hint">{username.length}/30 caracteres</span>
          </div>
        )}

        {/* Step 2: Avatar Photo */}
        {step === 2 && (
          <div className="onboarding-step animate-fade-in-up" key="step2">
            <h2>Foto de Perfil</h2>
            <p className="onboarding-desc">Adicione uma foto para seus amigos e grupos te reconhecerem.</p>
            
            <div className="onboarding-avatar-upload" onClick={() => fileRef.current?.click()}>
              {avatar ? (
                <Avatar src={avatar} name={username || 'Atleta'} size="xl" />
              ) : (
                <div className="onboarding-avatar-placeholder">
                  <Camera size={32} />
                  <span>Escolher foto</span>
                </div>
              )}
              <div className="onboarding-avatar-badge">
                <Upload size={14} />
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              style={{ display: 'none' }}
            />
            <span className="onboarding-hint">Clique para selecionar uma imagem do seu dispositivo</span>
          </div>
        )}

        {/* Step 3: Gender Selection */}
        {step === 3 && (
          <div className="onboarding-step animate-fade-in-up" key="step3">
            <h2>Qual é o seu gênero?</h2>
            <p className="onboarding-desc">Isso nos ajuda a calibrar suas métricas, IMC e estimativas de treino.</p>
            
            <div className="onboarding-gender-grid">
              {GENDER_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  className={`gender-select-btn ${gender === opt.id ? 'active' : ''}`}
                  onClick={() => setGender(opt.id)}
                >
                  <span className="gender-icon">{opt.icon}</span>
                  <span className="gender-label">{opt.label}</span>
                  {gender === opt.id && <Check size={16} className="gender-check" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Weekly Goal */}
        {step === 4 && (
          <div className="onboarding-step animate-fade-in-up" key="step4">
            <h2>Meta Semanal</h2>
            <p className="onboarding-desc">Quantos dias por semana pretende treinar?</p>
            
            <div className="onboarding-goals">
              {WEEKLY_GOALS.map(goal => (
                <button
                  key={goal}
                  className={`onboarding-goal-btn ${weeklyGoal === goal ? 'active' : ''}`}
                  onClick={() => setWeeklyGoal(goal)}
                >
                  <span className="onboarding-goal-num">{goal}x</span>
                  <span className="onboarding-goal-label">por semana</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 5: PIN Creation */}
        {step === 5 && (
          <div className="onboarding-step animate-fade-in-up" key="step5">
            <h2><KeyRound size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />Crie seu PIN de acesso</h2>
            <p className="onboarding-desc">Defina um PIN numérico de no mínimo 4 dígitos para proteger seu perfil.</p>
            
            <input
              type="password"
              className="onboarding-input"
              placeholder="Digite seu PIN (mín. 4 dígitos)"
              value={pin}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPin(val);
              }}
              inputMode="numeric"
              maxLength={8}
              autoFocus
            />
            <input
              type="password"
              className="onboarding-input"
              placeholder="Confirme seu PIN"
              value={pinConfirm}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setPinConfirm(val);
              }}
              inputMode="numeric"
              maxLength={8}
              style={{ marginTop: 12 }}
            />
            {pin.length >= 4 && pinConfirm.length >= 4 && pin !== pinConfirm && (
              <span className="onboarding-hint" style={{ color: '#ef4444' }}>Os PINs não coincidem</span>
            )}
            {pin.length > 0 && pin.length < 4 && (
              <span className="onboarding-hint" style={{ color: '#f59e0b' }}>Mínimo 4 dígitos</span>
            )}
            {pin.length >= 4 && pin === pinConfirm && (
              <span className="onboarding-hint" style={{ color: '#22c55e' }}>✓ PIN confirmado!</span>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="onboarding-actions">
          {step > 1 && (
            <Button variant="ghost" onClick={() => setStep(s => s - 1)}>
              Voltar
            </Button>
          )}
          <div style={{ flex: 1 }} />
          {step < totalSteps ? (
            <Button
              variant="primary"
              iconRight={ChevronRight}
              onClick={() => setStep(s => s + 1)}
              disabled={!canNext()}
            >
              Próximo
            </Button>
          ) : (
            <Button variant="success" size="lg" onClick={handleComplete} icon={Check}>
              Criar meu perfil e Começar!
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
