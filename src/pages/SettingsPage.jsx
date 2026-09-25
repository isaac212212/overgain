import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { 
  User, 
  Camera, 
  Moon, 
  Sun, 
  Target, 
  LogOut, 
  RotateCcw, 
  Save, 
  Check, 
  ShieldCheck,
  Smartphone,
  AlertTriangle
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Avatar from '../components/ui/Avatar';
import { INITIAL_USER, INITIAL_ROUTINES, INITIAL_CHECKINS, INITIAL_GROUPS, INITIAL_MESSAGES } from '../utils/initialData';
import { storage } from '../utils/storage';
import './SettingsPage.css';

const WEEKLY_GOALS = [1, 2, 3, 4, 5, 6, 7];

export default function SettingsPage() {
  const { user, updateProfile, updatePassword, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Form State
  const [name, setName] = useState(user?.name || 'João Silva');
  const [username, setUsername] = useState(user?.username || 'joaosilva');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyGoal || 4);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Reset Data Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPasswordInput, setResetPasswordInput] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetStep, setResetStep] = useState(1); // 1 = confirmation, 2 = password entry

  const fileInputRef = useRef(null);

  // Avatar Upload
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAvatar(ev.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save Settings
  const handleSaveSettings = (e) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) {
        setPasswordError('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordError('A confirmação de senha não coincide com a nova senha.');
        return;
      }
    }

    updateProfile({
      name: name.trim(),
      username: username.trim(),
      avatar,
      weeklyGoal: Number(weeklyGoal)
    });

    if (newPassword && newPassword === confirmPassword) {
      updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Open reset data modal
  const handleOpenResetModal = () => {
    setResetStep(1);
    setResetPasswordInput('');
    setResetError('');
    setIsResetModalOpen(true);
  };

  // Confirm reset with password
  const handleConfirmReset = () => {
    if (!resetPasswordInput.trim()) {
      setResetError('Digite sua senha para confirmar o reset.');
      return;
    }

    // Verify password matches the user's stored password (or PIN for legacy)
    const storedPassword = user?.password || user?.pin;
    if (resetPasswordInput !== storedPassword) {
      setResetError('Senha incorreta! O reset foi cancelado. Verifique sua senha e tente novamente.');
      return;
    }

    // Password correct - proceed with data reset
    if (user?.id) {
      storage.remove(`routines_${user.id}`);
      storage.remove(`cardioRoutines_${user.id}`);
      storage.remove(`checkins_${user.id}`);
      storage.remove(`schedule_${user.id}`);
      storage.remove(`activeWorkout_${user.id}`);
    }
    storage.set('user', INITIAL_USER);
    storage.set('routines', INITIAL_ROUTINES);
    storage.set('checkins', INITIAL_CHECKINS);
    storage.set('groups', INITIAL_GROUPS);
    storage.set('messages', INITIAL_MESSAGES);
    setIsResetModalOpen(false);
    window.location.reload();
  };

  // Logout
  const handleLogout = () => {
    if (confirm('Deseja realmente sair da conta?')) {
      logout();
      navigate('/login');
    }
  };

  return (
    <div className="settings-page animate-fade-in">
      <div className="settings-header">
        <h1 className="settings-title">Configurações</h1>
        <p className="settings-subtitle">
          Gerencie seu perfil, meta semanal de treino, preferências de tema e conta.
        </p>
      </div>

      <form className="settings-form" onSubmit={handleSaveSettings}>
        {/* Profile Settings Card */}
        <Card className="settings-card" padding="lg">
          <h2 className="settings-card-title">Perfil do Usuário</h2>

          <div className="profile-edit-row">
            <div className="avatar-edit-box">
              <Avatar src={avatar} name={name} size="xl" />
              <button 
                type="button" 
                className="change-avatar-btn"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera size={14} /> Trocar Foto
              </button>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleAvatarChange} 
                style={{ display: 'none' }} 
              />
            </div>

            <div className="profile-inputs-col">
              <Input
                label="Nome de Exibição"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />

              <Input
                label="Nome de Usuário (@)"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
              />

              <Input
                label="Nova Senha da Conta (Opcional)"
                type="password"
                value={newPassword}
                onChange={e => { setNewPassword(e.target.value); setPasswordError(''); }}
                placeholder="Deixe em branco para manter a atual"
                helperText="Mínimo 6 caracteres."
              />

              {newPassword && (
                <Input
                  label="Confirmar Nova Senha"
                  type="password"
                  value={confirmPassword}
                  onChange={e => { setConfirmPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Digite novamente a nova senha"
                  required
                />
              )}

              {passwordError && (
                <div style={{ color: 'var(--error)', fontSize: '0.8125rem', fontWeight: 600, marginTop: 4 }}>
                  ⚠️ {passwordError}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Weekly Goal Card */}
        <Card className="settings-card" padding="lg">
          <div className="settings-card-header-icon">
            <Target size={20} className="text-accent" />
            <div>
              <h2 className="settings-card-title">Meta de Frequência Semanal</h2>
              <p className="settings-card-desc">
                Quantos treinos por semana você deseja alcançar para completar seu anel de frequência.
              </p>
            </div>
          </div>

          <div className="settings-goals-selector">
            {WEEKLY_GOALS.map(goal => (
              <button
                key={goal}
                type="button"
                className={`settings-goal-btn ${weeklyGoal === goal ? 'active' : ''}`}
                onClick={() => setWeeklyGoal(goal)}
              >
                <span className="goal-num">{goal}x</span>
                <span className="goal-txt">por semana</span>
              </button>
            ))}
          </div>
        </Card>

        {/* Theme Settings Card (Dark Default vs Light Mode) */}
        <Card className="settings-card" padding="lg">
          <div className="settings-card-header-icon">
            {theme === 'dark' ? <Moon size={20} className="text-accent" /> : <Sun size={20} className="text-accent" />}
            <div>
              <h2 className="settings-card-title">Aparência & Tema</h2>
              <p className="settings-card-desc">
                Tema Dark monocromático padrão inspirado no Hevy, com opção Light Mode.
              </p>
            </div>
          </div>

          <div className="theme-toggle-row">
            <div className="theme-option-box">
              <span className="theme-current-label">
                Tema Atual: <strong>{theme === 'dark' ? 'Modo Escuro (Dark)' : 'Modo Claro (Light)'}</strong>
              </span>
            </div>

            <button 
              type="button"
              className="theme-switch-btn"
              onClick={toggleTheme}
            >
              {theme === 'dark' ? (
                <>
                  <Sun size={16} /> Mudar para Modo Claro
                </>
              ) : (
                <>
                  <Moon size={16} /> Mudar para Modo Escuro
                </>
              )}
            </button>
          </div>
        </Card>



        {/* Save button floating/fixed */}
        <div className="settings-actions-footer">
          {savedSuccess && (
            <span className="save-success-tag animate-scale-in">
              <Check size={16} /> Alterações salvas com sucesso!
            </span>
          )}
          <Button type="submit" variant="primary" size="lg" icon={Save}>
            Salvar Alterações
          </Button>
        </div>
      </form>

      {/* Account & Data Management */}
      <Card className="settings-card danger-zone-card" padding="lg">
        <h2 className="settings-card-title text-muted">Gerenciamento de Dados & Conta</h2>

        <div className="danger-zone-actions">
          <div className="danger-action-row">
            <div>
              <strong>Zerar Dados do Usuário</strong>
              <p className="text-muted text-sm">Limpa todas as rotinas, cardios e históricos para começar do zero.</p>
            </div>
            <Button variant="secondary" icon={RotateCcw} onClick={handleOpenResetModal}>
              Zerar Dados
            </Button>
          </div>

          <div className="danger-action-row">
            <div>
              <strong>Encerrar Sessão</strong>
              <p className="text-muted text-sm">Fazer logout desta conta e voltar para a tela de login.</p>
            </div>
            <Button variant="danger" icon={LogOut} onClick={handleLogout}>
              Sair da Conta
            </Button>
          </div>
        </div>
      </Card>

      {/* MODAL: CONFIRMAR RESET DE DADOS COM SENHA */}
      {isResetModalOpen && (
        <Modal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          title="Resetar Dados da Conta"
          size="sm"
        >
          <div className="reset-modal-body">
            {resetStep === 1 && (
              <>
                <div className="reset-warning-banner">
                  <AlertTriangle size={32} className="reset-warning-icon" />
                  <h3 className="reset-warning-title">TEM CERTEZA QUE QUER RESETAR DADOS?</h3>
                  <p className="reset-warning-text">
                    Esta ação irá <strong>apagar permanentemente</strong> todo o seu histórico de treinos, 
                    rotinas salvas, cardios, frequência e progresso. 
                    Essa ação <strong>NÃO pode ser desfeita!</strong>
                  </p>
                </div>

                <div className="reset-modal-actions">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => setIsResetModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={() => setResetStep(2)}
                    style={{ fontWeight: 800, fontSize: '0.9375rem' }}
                  >
                    Sim, Quero Resetar
                  </Button>
                </div>
              </>
            )}

            {resetStep === 2 && (
              <>
                <div className="reset-password-section">
                  <div className="reset-lock-icon-wrap">
                    <ShieldCheck size={28} />
                  </div>
                  <h3 className="reset-password-title">Confirmação de Segurança</h3>
                  <p className="reset-password-text">
                    Para proteger sua conta, digite sua <strong>senha atual</strong> para autorizar o reset dos dados.
                  </p>

                  <Input
                    label="Senha Atual"
                    type="password"
                    value={resetPasswordInput}
                    onChange={e => { setResetPasswordInput(e.target.value); setResetError(''); }}
                    placeholder="Digite sua senha da conta"
                    autoFocus
                    required
                  />

                  {resetError && (
                    <div className="reset-error-banner">
                      <AlertTriangle size={14} />
                      <span>{resetError}</span>
                    </div>
                  )}
                </div>

                <div className="reset-modal-actions">
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => { setResetStep(1); setResetError(''); setResetPasswordInput(''); }}
                  >
                    Voltar
                  </Button>
                  <Button 
                    type="button" 
                    variant="danger" 
                    onClick={handleConfirmReset}
                    disabled={!resetPasswordInput.trim()}
                    icon={RotateCcw}
                    style={{ fontWeight: 800 }}
                  >
                    Confirmar Reset
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
