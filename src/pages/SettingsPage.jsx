import { useState, useRef } from 'react';
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
  Smartphone
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
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
  const [name, setName] = useState(user?.name || 'Isaac Franco');
  const [username, setUsername] = useState(user?.username || 'isaac223344');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const [weeklyGoal, setWeeklyGoal] = useState(user?.weeklyGoal || 4);
  const [password, setPassword] = useState(user?.password || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

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
    updateProfile({
      name: name.trim(),
      username: username.trim(),
      avatar,
      weeklyGoal: Number(weeklyGoal)
    });
    if (password && password.length >= 6) {
      updatePassword(password);
    }
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Reset to default demo data
  const handleResetData = () => {
    if (confirm('Deseja restaurar os dados de demonstração iniciais? Isso substituirá suas alterações.')) {
      storage.set('user', INITIAL_USER);
      storage.set('routines', INITIAL_ROUTINES);
      storage.set('checkins', INITIAL_CHECKINS);
      storage.set('groups', INITIAL_GROUPS);
      storage.set('messages', INITIAL_MESSAGES);
      window.location.reload();
    }
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
                label="Senha de Acesso à Conta"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Digite para alterar sua senha"
                helperText="Mínimo 6 caracteres. Usada para entrar no Overgain."
              />
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
              <strong>Restaurar Dados Padrão de Demonstração</strong>
              <p className="text-muted text-sm">Recarrega as rotinas Push, Pull, Legs e os treinos de teste.</p>
            </div>
            <Button variant="secondary" icon={RotateCcw} onClick={handleResetData}>
              Restaurar Dados
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
    </div>
  );
}
