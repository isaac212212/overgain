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
  Cloud,
  CloudLightning,
  CheckCircle2
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import { INITIAL_USER, INITIAL_ROUTINES, INITIAL_CHECKINS, INITIAL_GROUPS, INITIAL_MESSAGES } from '../utils/initialData';
import { storage } from '../utils/storage';
import { isCloudEnabled, setSupabaseCredentials } from '../lib/supabase';
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

  // Cloud credentials form state
  const [sbUrl, setSbUrl] = useState(() => localStorage.getItem('og_supabase_url') || import.meta.env.VITE_SUPABASE_URL || '');
  const [sbKey, setSbKey] = useState(() => localStorage.getItem('og_supabase_anon_key') || import.meta.env.VITE_SUPABASE_ANON_KEY || '');
  const [cloudMsg, setCloudMsg] = useState('');

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

        {/* Cloud DB & Sync Card (Supabase) */}
        <Card className="settings-card" padding="lg">
          <div className="settings-card-header-icon">
            <Cloud size={20} className="text-accent" />
            <div>
              <h2 className="settings-card-title">Banco de Dados em Nuvem & Sincronização</h2>
              <p className="settings-card-desc">
                Conecte seu projeto ao Supabase para sincronizar automaticamente seu perfil, histórico de treinos, medidas e grupos entre PC e Celular (APK).
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              background: isCloudEnabled() ? 'rgba(34, 197, 94, 0.12)' : 'rgba(234, 179, 8, 0.12)',
              border: `1px solid ${isCloudEnabled() ? 'rgba(34, 197, 94, 0.35)' : 'rgba(234, 179, 8, 0.35)'}`,
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              color: isCloudEnabled() ? '#22c55e' : '#eab308',
              fontWeight: 600
            }}>
              {isCloudEnabled() ? (
                <>
                  <CheckCircle2 size={18} />
                  <span>Sincronização em Nuvem Ativa e Conectada com Sucesso!</span>
                </>
              ) : (
                <>
                  <CloudLightning size={18} />
                  <span>Modo Local / Offline Ativo (Insira suas credenciais Supabase abaixo para ativar a nuvem)</span>
                </>
              )}
            </div>

            <Input
              label="Supabase URL (VITE_SUPABASE_URL)"
              value={sbUrl}
              onChange={e => setSbUrl(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
            />

            <Input
              label="Supabase Anon Key (VITE_SUPABASE_ANON_KEY)"
              type="password"
              value={sbKey}
              onChange={e => setSbKey(e.target.value)}
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            />

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSupabaseCredentials(sbUrl, sbKey);
                  setCloudMsg('Credenciais salvas! Reiniciando conexões...');
                }}
              >
                Salvar Credenciais da Nuvem
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSbUrl('');
                  setSbKey('');
                  setSupabaseCredentials('', '');
                }}
              >
                Desconectar Nuvem
              </Button>

              {cloudMsg && <span style={{ fontSize: '0.75rem', color: '#22c55e', fontWeight: 600 }}>{cloudMsg}</span>}
            </div>
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
