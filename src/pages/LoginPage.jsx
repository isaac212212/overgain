import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, User, Target, Check, Sparkles, Download } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import './LoginPage.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Masculino');
  const [weeklyGoal, setWeeklyGoal] = useState(4);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();

  // Handle Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    await new Promise(r => setTimeout(r, 350));

    if (isLogin) {
      const res = loginWithEmail(email, password);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMsg(res.error || 'Credenciais inválidas. Verifique e tente novamente.');
      }
    } else {
      // Validate Registration
      if (!name.trim()) {
        setErrorMsg('Por favor, informe seu nome ou apelido.');
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        setErrorMsg('A senha deve conter no mínimo 6 caracteres.');
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('As senhas digitadas não coincidem.');
        setLoading(false);
        return;
      }

      const res = registerWithEmail(email, password, name, gender, weeklyGoal);
      if (res.success) {
        navigate('/dashboard');
      } else {
        setErrorMsg(res.error || 'Erro ao criar conta. Tente novamente.');
      }
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-container animate-fade-in-up">
        {/* Brand Logo & Header */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <img src="/overgain-logo.jpg" alt="Overgain" className="login-logo-img" />
          </div>
          <h1 className="login-logo-text">OVERGAIN</h1>
          <p className="login-subtitle">Acompanhe seus treinos, registre frequência e evolua.</p>
        </div>

        {/* Tab Switcher (Entrar / Cadastre-se) */}
        <div className="login-tabs">
          <button
            type="button"
            className={`login-tab-btn ${isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(true); setErrorMsg(''); }}
          >
            Entrar
          </button>
          <button
            type="button"
            className={`login-tab-btn ${!isLogin ? 'active' : ''}`}
            onClick={() => { setIsLogin(false); setErrorMsg(''); }}
          >
            Cadastre-se
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="login-error-banner animate-fade-in">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form className="login-form" onSubmit={handleSubmit}>
          {!isLogin && (
            <Input
              label="Nome Completo / Apelido"
              placeholder="Ex: João Silva"
              icon={User}
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          )}

          <Input
            label="E-mail"
            type="email"
            placeholder="seu@email.com"
            icon={Mail}
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <div className="login-password-wrapper">
            <Input
              label="Senha"
              type={showPassword ? 'text' : 'password'}
              placeholder="Digite sua senha"
              icon={Lock}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {!isLogin && (
            <>
              <div className="login-password-wrapper">
                <Input
                  label="Confirmar Senha"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Repita sua senha"
                  icon={Lock}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Gender selector */}
              <div className="form-group-custom">
                <label className="input-label-custom">Gênero</label>
                <div className="gender-selector-pills">
                  {['Masculino', 'Feminino', 'Outro'].map(g => (
                    <button
                      key={g}
                      type="button"
                      className={`gender-pill ${gender === g ? 'active' : ''}`}
                      onClick={() => setGender(g)}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Weekly Goal */}
              <div className="form-group-custom">
                <label className="input-label-custom">Meta Semanal Desejada ({weeklyGoal}x por semana)</label>
                <div className="weekly-goal-selector-pills">
                  {[1, 2, 3, 4, 5, 6, 7].map(num => (
                    <button
                      key={num}
                      type="button"
                      className={`goal-pill ${weeklyGoal === num ? 'active' : ''}`}
                      onClick={() => setWeeklyGoal(num)}
                    >
                      {num}x
                    </button>
                  ))}
                </div>
                <small className="goal-hint">Quantos dias na semana você pretende treinar.</small>
              </div>
            </>
          )}

          <Button type="submit" variant="primary" size="lg" fullWidth loading={loading}>
            {isLogin ? 'Entrar na Conta' : 'Criar Conta & Começar'}
          </Button>
        </form>

        {/* Toggle Bottom Link */}
        <p className="login-toggle">
          {isLogin ? 'Novo no Overgain? ' : 'Já possui uma conta? '}
          <button
            type="button"
            className="login-toggle-btn"
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(''); }}
          >
            {isLogin ? 'Cadastre-se' : 'Entrar'}
          </button>
        </p>

        {/* APK Download Button */}
        <div className="login-apk-section">
          <div className="login-divider">
            <span>ou</span>
          </div>
          <a
            href="/Overgain.apk"
            download="Overgain.apk"
            className="login-apk-btn"
          >
            <Download size={16} />
            <span>Baixar App Android (.apk)</span>
          </a>
        </div>
      </div>
    </div>
  );
}
