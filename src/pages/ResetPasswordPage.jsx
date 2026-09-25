import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowLeft, KeyRound } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase, syncFullAccountToCloud, fetchCloudAccountByEmail } from '../lib/supabase';
import './ResetPasswordPage.css';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [checkingSession, setCheckingSession] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;

    // Check for Supabase session or listen to recovery event
    const checkRecoverySession = async () => {
      try {
        if (supabase?.auth?.getSession) {
          const { data, error } = await supabase.auth.getSession();
          if (data?.session?.user && isMounted) {
            setUserEmail(data.session.user.email || '');
          }
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      } finally {
        if (isMounted) setCheckingSession(false);
      }
    };

    let subscription = null;
    if (supabase?.auth?.onAuthStateChange) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user && isMounted) {
          setUserEmail(session.user.email || '');
          if (event === 'PASSWORD_RECOVERY') {
            setError('');
          }
        }
      });
      subscription = data?.subscription;
    }

    checkRecoverySession();

    return () => {
      isMounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);

    try {
      let cloudSuccess = false;
      if (supabase?.auth?.updateUser) {
        const { data, error: updateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (updateError) {
          console.warn('Supabase updateUser error:', updateError.message);
          // If error is not fatal, we still check local
        } else {
          cloudSuccess = true;
          if (data?.user?.email) {
            setUserEmail(data.user.email);
          }
        }
      }

      // Also update account in Supabase cloud
      if (userEmail) {
        const cloudAcc = await fetchCloudAccountByEmail(userEmail);
        if (cloudAcc) {
          await syncFullAccountToCloud({
            ...cloudAcc,
            password: newPassword,
            updatedAt: new Date().toISOString()
          });
        }
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err?.message || 'Falha ao atualizar a senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container animate-fade-in-up">
        {/* Brand Header */}
        <div className="reset-password-logo">
          <div className="reset-logo-icon">
            <KeyRound size={32} className="text-accent" />
          </div>
          <h1 className="reset-password-title">Redefinir Senha</h1>
          <p className="reset-password-subtitle">
            {userEmail 
              ? `Defina uma nova senha para a conta: ${userEmail}`
              : 'Digite sua nova senha para acessar sua conta no Overgain.'}
          </p>
        </div>

        {/* Feedback Banners */}
        {error && (
          <div className="reset-banner error animate-fade-in">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="reset-banner success animate-scale-in">
            <CheckCircle2 size={20} />
            <div>
              <strong>Senha alterada com sucesso!</strong>
              <p style={{ margin: 0, fontSize: '0.8125rem' }}>Redirecionando para o login em instantes...</p>
            </div>
          </div>
        )}

        {/* Password Form */}
        {!success ? (
          <form className="reset-password-form" onSubmit={handleSubmit}>
            <div className="login-password-wrapper">
              <Input
                label="Nova Senha"
                type={showPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                icon={Lock}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                autoFocus
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

            <div className="login-password-wrapper">
              <Input
                label="Confirmar Nova Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Repita a nova senha"
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

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              loading={loading}
              disabled={loading || !newPassword || !confirmPassword}
            >
              Salvar Nova Senha
            </Button>
          </form>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="lg"
            fullWidth
            onClick={() => navigate('/login')}
          >
            Ir para o Login Agora
          </Button>
        )}

        {/* Back to Login Link */}
        <div className="reset-back-wrapper">
          <Link to="/login" className="reset-back-link">
            <ArrowLeft size={16} /> Voltar para o Login
          </Link>
        </div>
      </div>
    </div>
  );
}
