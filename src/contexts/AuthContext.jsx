import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEFAULT_WEEKLY_SCHEDULE } from '../utils/initialData';
import { 
  supabase, 
  isCloudEnabled, 
  syncFullAccountToCloud, 
  syncMeasurementsToCloud, 
  fetchCloudMeasurements, 
  fetchCloudAccountByEmail, 
  fetchCloudAccount,
  isUsernameOrNameTaken
} from '../lib/supabase';
import { showToast } from './ToastContext';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Current active user
  const [user, setUser] = useState(null);
  const [pendingUser, setPendingUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Supabase Auth State Change Listener & Cloud Session Verification
  useEffect(() => {
    let timeoutId = null;
    let isCancelled = false;

    // Safety timeout in case network is very slow
    timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setIsLoading(false);
      }
    }, 2500);

    const initAuthSession = async () => {
      try {
        if (isCloudEnabled() && supabase?.auth?.getSession) {
          const { data, error } = await supabase.auth.getSession();
          if (!isCancelled && !error && data?.session?.user) {
            const supaUser = data.session.user;
            const supaUserId = supaUser.id;

            // Fetch full account profile & measurements directly from Supabase
            const [cloudAcc, cloudMeasurements] = await Promise.all([
              fetchCloudAccount(supaUserId),
              fetchCloudMeasurements(supaUserId)
            ]);

            const emailNorm = supaUser.email?.toLowerCase() || '';
            const fallbackAcc = (!cloudAcc && emailNorm) ? await fetchCloudAccountByEmail(emailNorm) : null;
            const activeAcc = cloudAcc || fallbackAcc || {};

            const loggedUser = {
              id: supaUserId,
              name: activeAcc.name || supaUser.user_metadata?.name || emailNorm.split('@')[0] || 'Atleta',
              username: activeAcc.username || supaUser.user_metadata?.username || emailNorm.split('@')[0] || 'atleta',
              email: emailNorm,
              avatar: activeAcc.avatar || supaUser.user_metadata?.avatar_url || null,
              gender: activeAcc.gender || supaUser.user_metadata?.gender || 'Masculino',
              weeklyGoal: activeAcc.weeklyGoal || Number(supaUser.user_metadata?.weekly_goal) || 4,
              weeklySchedule: activeAcc.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
              onboarded: activeAcc.onboarded !== undefined ? activeAcc.onboarded : true,
              measurementsHistory: (cloudMeasurements && cloudMeasurements.length > 0) ? cloudMeasurements : (activeAcc.measurementsHistory || []),
              privacy: activeAcc.privacy || {
                publicMeasurements: false,
                publicRoutines: true,
                publicWeights: false,
                publicPRs: false,
                publicRoutineWeights: false
              },
              updatedAt: new Date().toISOString()
            };

            setUser(loggedUser);
          }
        }
      } catch (err) {
        console.error('Erro na verificação de sessão do Supabase:', err);
      } finally {
        if (!isCancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    };

    initAuthSession();

    // Listen for auth state changes
    let authSub = null;
    try {
      if (isCloudEnabled() && supabase?.auth?.onAuthStateChange) {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_OUT') {
            setUser(null);
          } else if (event === 'SIGNED_IN' && session?.user) {
            const uid = session.user.id;
            const [cloudAcc, cloudMeasurements] = await Promise.all([
              fetchCloudAccount(uid),
              fetchCloudMeasurements(uid)
            ]);
            if (cloudAcc) {
              setUser({
                ...cloudAcc,
                measurementsHistory: cloudMeasurements || cloudAcc.measurementsHistory || []
              });
            }
          }
        });
        authSub = data?.subscription;
      }
    } catch (e) {
      console.warn('Auth state change subscription error:', e);
    }

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (authSub?.unsubscribe) authSub.unsubscribe();
    };
  }, []);

  // Login with Google (Direct Cloud Integration)
  const loginWithGoogle = async (googleEmail) => {
    const emailNorm = (googleEmail || 'usuario@gmail.com').trim().toLowerCase();
    
    try {
      const cloudAcc = await fetchCloudAccountByEmail(emailNorm);
      if (cloudAcc && cloudAcc.onboarded) {
        const cloudMeasurements = await fetchCloudMeasurements(cloudAcc.id);
        const fullUser = {
          ...cloudAcc,
          measurementsHistory: cloudMeasurements || cloudAcc.measurementsHistory || []
        };
        setUser(fullUser);
        setPendingUser(null);
        await syncFullAccountToCloud(fullUser);
        return { isNew: false, user: fullUser };
      }
    } catch (e) {
      console.error('Erro ao buscar conta Google no Supabase:', e);
    }

    const newPending = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: emailNorm.split('@')[0],
      email: emailNorm,
      avatar: null,
      gender: 'Masculino',
      provider: 'google',
      pin: null,
      weeklyGoal: 4,
      onboarded: false,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      privacy: {
        publicMeasurements: false,
        publicRoutines: true,
        publicWeights: false,
        publicPRs: false,
        publicRoutineWeights: false
      },
      measurementsHistory: [],
      createdAt: new Date().toISOString()
    };

    setPendingUser(newPending);
    return { isNew: true, pendingUser: newPending };
  };

  // Login with Email & Password (direct Supabase Auth + Cloud Account Lookup)
  const loginWithEmail = async (email, password) => {
    const emailNorm = email.trim().toLowerCase();

    try {
      if (isCloudEnabled() && supabase?.auth?.signInWithPassword) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailNorm,
          password: password
        });

        if (!error && data?.user) {
          const cloudUserId = data.user.id;
          const [cloudAcc, cloudMeasurements] = await Promise.all([
            fetchCloudAccount(cloudUserId),
            fetchCloudMeasurements(cloudUserId)
          ]);

          const loggedUser = {
            id: cloudUserId,
            name: cloudAcc?.name || data.user.user_metadata?.name || emailNorm.split('@')[0],
            username: cloudAcc?.username || data.user.user_metadata?.username || emailNorm.split('@')[0],
            email: emailNorm,
            avatar: cloudAcc?.avatar || data.user.user_metadata?.avatar_url || null,
            gender: cloudAcc?.gender || data.user.user_metadata?.gender || 'Masculino',
            weeklyGoal: cloudAcc?.weeklyGoal || Number(data.user.user_metadata?.weekly_goal) || 4,
            weeklySchedule: cloudAcc?.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
            privacy: cloudAcc?.privacy || {
              publicMeasurements: false,
              publicRoutines: true,
              publicWeights: false,
              publicPRs: false,
              publicRoutineWeights: false
            },
            measurementsHistory: cloudMeasurements || cloudAcc?.measurementsHistory || [],
            onboarded: true,
            updatedAt: new Date().toISOString()
          };

          setUser(loggedUser);
          setPendingUser(null);
          await syncFullAccountToCloud(loggedUser);

          return { success: true, user: loggedUser };
        }
      }
    } catch (err) {
      console.error('Supabase signIn error, checking cloud registry:', err);
    }

    // Direct Cloud user_data Registry lookup fallback
    try {
      const cloudAcc = await fetchCloudAccountByEmail(emailNorm);
      if (cloudAcc) {
        const validPassword = cloudAcc.password ? (cloudAcc.password === password) : (cloudAcc.pin === password);
        if (validPassword) {
          const cloudMeasurements = await fetchCloudMeasurements(cloudAcc.id);
          const fullUser = {
            ...cloudAcc,
            measurementsHistory: cloudMeasurements || cloudAcc.measurementsHistory || []
          };
          setUser(fullUser);
          setPendingUser(null);
          return { success: true, user: fullUser };
        }
      }
    } catch (e) {
      console.error('Cloud account fallback lookup failed:', e);
    }

    return {
      success: false,
      error: 'E-mail ou senha incorretos. Verifique e tente novamente.'
    };
  };

  // Register with Email & Password (direct Supabase Auth signUp + Cloud user_data sync)
  const registerWithEmail = async (email, password, name, gender = 'Masculino', weeklyGoal = 4) => {
    const emailNorm = email.trim().toLowerCase();
    const cleanName = (name || emailNorm.split('@')[0]).trim();
    const cleanUsername = cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);

    // 1. Check if Name or Username is already taken in Supabase
    const takenCheck = await isUsernameOrNameTaken(cleanName, cleanUsername);
    if (takenCheck.isTaken) {
      return {
        success: false,
        error: takenCheck.message || 'Este nome de perfil já está em uso por outro atleta. Escolha outro.'
      };
    }

    try {
      if (isCloudEnabled() && supabase?.auth?.signUp) {
        const { data, error } = await supabase.auth.signUp({
          email: emailNorm,
          password: password,
          options: {
            data: {
              name: cleanName,
              username: cleanUsername,
              gender: gender || 'Masculino',
              weekly_goal: Number(weeklyGoal) || 4
            }
          }
        });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('already registered') || msg.includes('already exists')) {
            return {
              success: false,
              error: 'Este e-mail já está cadastrado. Faça login na sua conta.'
            };
          }
          if (msg.includes('at least 6 characters') || msg.includes('password')) {
            return {
              success: false,
              error: 'A senha deve ter no mínimo 6 caracteres.'
            };
          }
          if (msg.includes('rate limit') || msg.includes('security purposes') || error.status === 429) {
            return {
              success: false,
              error: 'Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.'
            };
          }
        }

        const userId = data?.user?.id || 'usr_' + Date.now().toString(36);
        const newUser = {
          id: userId,
          name: cleanName,
          username: cleanUsername,
          email: emailNorm,
          password: password,
          avatar: null,
          gender: gender || 'Masculino',
          weeklyGoal: Number(weeklyGoal) || 4,
          onboarded: true,
          weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
          privacy: {
            publicMeasurements: false,
            publicRoutines: true,
            publicWeights: false,
            publicPRs: false,
            publicRoutineWeights: false
          },
          measurementsHistory: [],
          createdAt: new Date().toISOString()
        };

        setUser(newUser);
        setPendingUser(null);

        // Sync full account directly to Supabase cloud
        await syncFullAccountToCloud(newUser);

        return { success: true, user: newUser };
      }
    } catch (err) {
      console.error('Supabase signUp exception:', err);
    }

    // Direct cloud creation fallback
    const userId = 'usr_' + Date.now().toString(36);
    const newUser = {
      id: userId,
      name: cleanName,
      username: cleanUsername,
      email: emailNorm,
      password: password,
      avatar: null,
      gender: gender || 'Masculino',
      weeklyGoal: Number(weeklyGoal) || 4,
      onboarded: true,
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      privacy: {
        publicMeasurements: false,
        publicRoutines: true,
        publicWeights: false,
        publicPRs: false,
        publicRoutineWeights: false
      },
      measurementsHistory: [],
      createdAt: new Date().toISOString()
    };

    setUser(newUser);
    setPendingUser(null);
    await syncFullAccountToCloud(newUser);

    return { success: true, user: newUser };
  };

  // Complete onboarding
  const completeOnboarding = async (profileData) => {
    const base = pendingUser || user || {};
    const targetName = (profileData.name || base.name || 'Atleta').trim();
    const targetUsername = profileData.username || (profileData.name || 'atleta').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20);

    const takenCheck = await isUsernameOrNameTaken(targetName, targetUsername, base.id);
    if (takenCheck.isTaken) {
      return {
        success: false,
        error: takenCheck.message || 'Este nome de perfil já está em uso por outro atleta. Escolha outro.'
      };
    }

    const finalUser = {
      ...base,
      name: targetName,
      username: targetUsername,
      avatar: profileData.avatar || base.avatar || null,
      gender: profileData.gender || base.gender || 'Masculino',
      weeklyGoal: Number(profileData.weeklyGoal || base.weeklyGoal) || 4,
      password: profileData.password || base.password,
      onboarded: true,
      updatedAt: new Date().toISOString()
    };

    setUser(finalUser);
    setPendingUser(null);

    await syncFullAccountToCloud(finalUser);

    return { success: true, user: finalUser };
  };

  // Update profile
  const updateProfile = async (profileData) => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };

    const targetName = profileData.name !== undefined ? profileData.name.trim() : user.name;
    const targetUsername = profileData.username !== undefined ? profileData.username.trim() : user.username;

    const nameChanged = targetName && targetName.toLowerCase() !== (user.name || '').toLowerCase();
    const userChanged = targetUsername && targetUsername.toLowerCase() !== (user.username || '').toLowerCase();

    if (nameChanged || userChanged) {
      const takenCheck = await isUsernameOrNameTaken(targetName, targetUsername, user.id);
      if (takenCheck.isTaken) {
        return {
          success: false,
          error: takenCheck.message || 'Este nome de perfil já está em uso por outro atleta. Escolha outro.'
        };
      }
    }

    const updated = { 
      ...user, 
      ...profileData, 
      name: targetName, 
      username: targetUsername, 
      updatedAt: new Date().toISOString() 
    };

    setUser(updated);
    await syncFullAccountToCloud(updated);
    return { success: true, user: updated };
  };

  // Add measurement (DIRECT SUPABASE PERSISTENCE)
  const addMeasurement = async (measurement) => {
    if (!user) return;
    const newEntry = {
      id: 'm_' + Date.now().toString(36),
      date: measurement.date || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      ...measurement
    };
    const updatedHistory = [newEntry, ...(user.measurementsHistory || [])];
    const updated = {
      ...user,
      measurementsHistory: updatedHistory
    };
    setUser(updated);

    await syncMeasurementsToCloud(user.id, updatedHistory);
    await syncFullAccountToCloud(updated);
  };

  // Update PIN
  const updatePin = async (newPin) => {
    if (!user) return;
    const updated = { ...user, pin: newPin || null, updatedAt: new Date().toISOString() };
    setUser(updated);
    await syncFullAccountToCloud(updated);
  };

  // Update password
  const updatePassword = async (newPassword) => {
    if (!user) return;
    try {
      if (isCloudEnabled() && supabase?.auth?.updateUser) {
        await supabase.auth.updateUser({ password: newPassword });
      }
    } catch (e) {
      console.error('Supabase password update exception:', e);
    }
    const updated = { ...user, password: newPassword, updatedAt: new Date().toISOString() };
    setUser(updated);
    await syncFullAccountToCloud(updated);
  };

  // Update Privacy
  const updatePrivacy = async (privacyUpdates) => {
    if (!user) return;
    const updated = {
      ...user,
      privacy: { ...user.privacy, ...privacyUpdates }
    };
    setUser(updated);
    await syncFullAccountToCloud(updated);
  };

  // Update weekly goal
  const updateWeeklyGoal = async (goal) => {
    if (!user) return;
    const updated = { ...user, weeklyGoal: Number(goal) || 4 };
    setUser(updated);
    await syncFullAccountToCloud(updated);
  };

  // Logout
  const logout = async () => {
    try {
      if (isCloudEnabled() && supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.error('Supabase signOut exception:', e);
    }
    setUser(null);
    setPendingUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      pendingUser,
      isAuthenticated: Boolean(user && user.onboarded),
      isOnboarded: Boolean(user && user.onboarded),
      isLoading,
      loginWithGoogle,
      loginWithEmail,
      registerWithEmail,
      completeOnboarding,
      updateProfile,
      addMeasurement,
      updatePin,
      updatePassword,
      updatePrivacy,
      updateWeeklyGoal,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
