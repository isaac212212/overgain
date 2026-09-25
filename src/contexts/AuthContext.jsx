import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { DEFAULT_WEEKLY_SCHEDULE } from '../utils/initialData';
import { 
  supabase, 
  isCloudEnabled, 
  syncFullAccountToCloud, 
  syncProfileToCloud, 
  syncMeasurementsToCloud, 
  fetchCloudMeasurements, 
  fetchCloudAccountByEmail, 
  fetchCloudProfile,
  isUsernameOrNameTaken
} from '../lib/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  // All registered accounts map: { [userId]: userObject }
  const [accounts, setAccounts] = useState(() => storage.get('accounts', {}));
  
  // Current active user ID
  const [currentUserId, setCurrentUserId] = useState(() => storage.get('current_user_id', null));
  
  // Active user object
  const [user, setUser] = useState(() => {
    const accs = storage.get('accounts', {});
    const activeId = storage.get('current_user_id', null);
    if (activeId && accs[activeId]) {
      return accs[activeId];
    }
    return null;
  });

  // Pending user (during onboarding / registration)
  const [pendingUser, setPendingUser] = useState(() => storage.get('pending_user', null));

  // Loading state with 2.5-second safety timeout for mobile / APK WebViews
  const [isLoading, setIsLoading] = useState(true);

  // Sync user state with accounts & currentUserId
  useEffect(() => {
    if (currentUserId && accounts[currentUserId]) {
      setUser(accounts[currentUserId]);
      storage.set('current_user_id', currentUserId);
    } else if (!currentUserId) {
      setUser(null);
      storage.remove('current_user_id');
    }
    storage.set('accounts', accounts);
  }, [currentUserId, accounts]);

  // Persist pending user if any
  useEffect(() => {
    if (pendingUser) {
      storage.set('pending_user', pendingUser);
    } else {
      storage.remove('pending_user');
    }
  }, [pendingUser]);

  // Supabase Auth State Change Listener & Session Verification
  useEffect(() => {
    let timeoutId = null;
    let isCancelled = false;

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

            // Fetch profile and measurements from cloud
            const [cloudProf, cloudMeasurements] = await Promise.all([
              fetchCloudProfile(supaUserId),
              fetchCloudMeasurements(supaUserId)
            ]);

            setUser(prev => {
              const base = prev || accounts[supaUserId] || {};
              const updated = {
                ...base,
                id: supaUserId,
                name: cloudProf?.name || supaUser.user_metadata?.name || base.name || supaUser.email.split('@')[0],
                username: cloudProf?.username || supaUser.user_metadata?.username || base.username || supaUser.email.split('@')[0],
                email: supaUser.email,
                avatar: cloudProf?.avatar_url || base.avatar || null,
                weeklyGoal: cloudProf?.weekly_goal || supaUser.user_metadata?.weekly_goal || base.weeklyGoal || 4,
                gender: cloudProf?.gender || supaUser.user_metadata?.gender || base.gender || 'Masculino',
                onboarded: true,
                measurementsHistory: cloudMeasurements || base.measurementsHistory || [],
                weeklySchedule: base.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
                privacy: base.privacy || {
                  publicMeasurements: false,
                  publicRoutines: true,
                  publicWeights: false,
                  publicPRs: false,
                  publicRoutineWeights: false
                }
              };
              setAccounts(accs => ({ ...accs, [supaUserId]: updated }));
              setCurrentUserId(supaUserId);
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn('Supabase session verification catch:', err);
      } finally {
        if (!isCancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    };

    initAuthSession();

    // Listen for auth events (e.g. login/logout in other tabs)
    let authSub = null;
    try {
      if (isCloudEnabled() && supabase?.auth?.onAuthStateChange) {
        const { data } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === 'SIGNED_OUT') {
            setCurrentUserId(null);
            setUser(null);
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

  // Login with existing or new Google Account
  const loginWithGoogle = async (googleEmail) => {
    const emailNorm = (googleEmail || 'usuario@gmail.com').trim().toLowerCase();
    
    let existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );

    if (!existing) {
      try {
        const cloudAcc = await fetchCloudAccountByEmail(emailNorm);
        if (cloudAcc && cloudAcc.id) {
          existing = cloudAcc;
          setAccounts(prev => ({ ...prev, [cloudAcc.id]: cloudAcc }));
        }
      } catch (e) {
        console.warn('Cloud account fetch error:', e);
      }
    }

    if (existing && existing.onboarded) {
      setCurrentUserId(existing.id);
      setUser(existing);
      setPendingUser(null);
      syncFullAccountToCloud(existing);
      return { isNew: false, user: existing };
    }

    const newPending = {
      id: existing?.id || 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
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

  // Login with Email & Password (direct Supabase Auth integration + local fallback)
  const loginWithEmail = async (email, password) => {
    const emailNorm = email.trim().toLowerCase();

    try {
      if (isCloudEnabled() && supabase?.auth?.signInWithPassword) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: emailNorm,
          password: password
        });

        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
            // Check local fallback
            const localAcc = Object.values(accounts).find(
              acc => acc.email?.toLowerCase() === emailNorm && (acc.password === password || acc.pin === password)
            );
            if (localAcc) {
              setCurrentUserId(localAcc.id);
              setUser(localAcc);
              setPendingUser(null);
              return { success: true, user: localAcc };
            }

            return {
              success: false,
              error: 'E-mail ou senha incorretos. Verifique e tente novamente.'
            };
          }
          if (msg.includes('email not confirmed')) {
            return {
              success: false,
              error: 'E-mail ainda não confirmado. Verifique sua caixa de entrada.'
            };
          }
          if (msg.includes('rate limit') || msg.includes('security purposes') || error.status === 429) {
            return {
              success: false,
              error: 'Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.'
            };
          }
          console.warn('Supabase signIn warning:', error.message);
        } else if (data?.user) {
          const cloudUser = data.user;
          const cloudUserId = cloudUser.id;

          const [cloudProf, cloudMeasurements] = await Promise.all([
            fetchCloudProfile(cloudUserId),
            fetchCloudMeasurements(cloudUserId)
          ]);

          const localExisting = accounts[cloudUserId] || Object.values(accounts).find(a => a.email?.toLowerCase() === emailNorm);

          const loggedUser = {
            id: cloudUserId,
            name: cloudProf?.name || cloudUser.user_metadata?.name || localExisting?.name || emailNorm.split('@')[0],
            username: cloudProf?.username || cloudUser.user_metadata?.username || localExisting?.username || emailNorm.split('@')[0],
            email: emailNorm,
            avatar: cloudProf?.avatar_url || localExisting?.avatar || null,
            gender: cloudProf?.gender || cloudUser.user_metadata?.gender || localExisting?.gender || 'Masculino',
            weeklyGoal: cloudProf?.weekly_goal || cloudUser.user_metadata?.weekly_goal || localExisting?.weeklyGoal || 4,
            weeklySchedule: localExisting?.weeklySchedule || DEFAULT_WEEKLY_SCHEDULE,
            privacy: localExisting?.privacy || {
              publicMeasurements: false,
              publicRoutines: true,
              publicWeights: false,
              publicPRs: false,
              publicRoutineWeights: false
            },
            measurementsHistory: cloudMeasurements || localExisting?.measurementsHistory || [],
            onboarded: true,
            updatedAt: new Date().toISOString()
          };

          setAccounts(prev => {
            const copy = { ...prev, [loggedUser.id]: loggedUser };
            storage.set('accounts', copy);
            return copy;
          });

          setCurrentUserId(loggedUser.id);
          setUser(loggedUser);
          setPendingUser(null);
          storage.set('current_user_id', loggedUser.id);

          return { success: true, user: loggedUser };
        }
      }
    } catch (err) {
      console.warn('Supabase signIn exception, trying local fallback:', err);
    }

    // Local cached accounts fallback
    const existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );

    if (!existing) {
      return {
        success: false,
        error: 'E-mail ou senha incorretos. Verifique e tente novamente.'
      };
    }

    const validPassword = existing.password ? (existing.password === password) : (existing.pin === password);
    if (!validPassword) {
      return {
        success: false,
        error: 'E-mail ou senha incorretos. Verifique e tente novamente.'
      };
    }

    setCurrentUserId(existing.id);
    setUser(existing);
    setPendingUser(null);
    return { success: true, user: existing };
  };

  // Register with Email, Password, Name, Gender, Weekly Goal (direct Supabase Auth signUp)
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

    // 2. Also check in locally cached accounts
    const localTaken = Object.values(accounts).find(
      acc => (acc.name && acc.name.trim().toLowerCase() === cleanName.toLowerCase()) ||
             (acc.username && acc.username.trim().toLowerCase() === cleanUsername.toLowerCase())
    );
    if (localTaken) {
      return {
        success: false,
        error: 'Este nome de perfil já está em uso por outro atleta. Escolha outro.'
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
          return {
            success: false,
            error: error.message || 'Erro ao realizar cadastro.'
          };
        }

        // Check if user already exists (Supabase security returns empty identities)
        if (data?.user && data.user.identities && data.user.identities.length === 0) {
          return {
            success: false,
            error: 'Este e-mail já está cadastrado. Faça login na sua conta.'
          };
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

        setAccounts(prev => {
          const updated = { ...prev, [newUser.id]: newUser };
          storage.set('accounts', updated);
          return updated;
        });

        setCurrentUserId(newUser.id);
        setUser(newUser);
        setPendingUser(null);
        storage.set('current_user_id', newUser.id);

        // Sync profile to cloud tables
        syncFullAccountToCloud(newUser);

        return { success: true, user: newUser };
      }
    } catch (err) {
      console.warn('Supabase signUp exception, using local fallback:', err);
    }

    // Local fallback if Supabase is offline
    const existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );
    if (existing) {
      return {
        success: false,
        error: 'Este e-mail já está cadastrado. Faça login na sua conta.'
      };
    }

    const newUser = {
      id: 'usr_' + Date.now().toString(36),
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

    setAccounts(prev => {
      const updated = { ...prev, [newUser.id]: newUser };
      storage.set('accounts', updated);
      return updated;
    });

    setCurrentUserId(newUser.id);
    setUser(newUser);
    setPendingUser(null);
    storage.set('current_user_id', newUser.id);

    return { success: true, user: newUser };
  };

  // Complete onboarding (Name, Photo, Gender, Password)
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

    setAccounts(prev => {
      const updated = { ...prev, [finalUser.id]: finalUser };
      storage.set('accounts', updated);
      return updated;
    });

    setCurrentUserId(finalUser.id);
    setUser(finalUser);
    setPendingUser(null);
    storage.set('current_user_id', finalUser.id);

    syncFullAccountToCloud(finalUser);

    return { success: true, user: finalUser };
  };

  // Update profile
  const updateProfile = async (profileData) => {
    if (!user) return { success: false, error: 'Usuário não autenticado.' };

    const targetName = profileData.name !== undefined ? profileData.name.trim() : user.name;
    const targetUsername = profileData.username !== undefined ? profileData.username.trim() : user.username;

    // Check if name or username changed and is taken
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

      // Check locally cached accounts
      const localTaken = Object.values(accounts).find(
        acc => String(acc.id) !== String(user.id) && (
          (acc.name && acc.name.trim().toLowerCase() === targetName.toLowerCase()) ||
          (acc.username && acc.username.trim().toLowerCase() === targetUsername.toLowerCase())
        )
      );
      if (localTaken) {
        return {
          success: false,
          error: 'Este nome de perfil já está em uso por outro atleta. Escolha outro.'
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
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });

    syncFullAccountToCloud(updated);
    return { success: true, user: updated };
  };

  // Add measurement
  const addMeasurement = (measurement) => {
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
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });

    syncMeasurementsToCloud(user.id, updatedHistory);
    syncFullAccountToCloud(updated);
  };

  // Update PIN
  const updatePin = (newPin) => {
    if (!user) return;
    const updated = { ...user, pin: newPin || null, updatedAt: new Date().toISOString() };
    setUser(updated);
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });
    syncFullAccountToCloud(updated);
  };

  // Update password
  const updatePassword = async (newPassword) => {
    if (!user) return;
    try {
      if (isCloudEnabled() && supabase?.auth?.updateUser) {
        await supabase.auth.updateUser({ password: newPassword });
      }
    } catch (e) {
      console.warn('Supabase password update exception:', e);
    }
    const updated = { ...user, password: newPassword, updatedAt: new Date().toISOString() };
    setUser(updated);
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });
    syncFullAccountToCloud(updated);
  };

  // Update Privacy
  const updatePrivacy = (privacyUpdates) => {
    if (!user) return;
    const updated = {
      ...user,
      privacy: { ...user.privacy, ...privacyUpdates }
    };
    setUser(updated);
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });
    syncFullAccountToCloud(updated);
  };

  // Update weekly goal
  const updateWeeklyGoal = (goal) => {
    if (!user) return;
    const updated = { ...user, weeklyGoal: Number(goal) || 4 };
    setUser(updated);
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });
    syncFullAccountToCloud(updated);
  };

  // Switch account
  const switchAccount = (userId) => {
    if (accounts[userId]) {
      setCurrentUserId(userId);
      setUser(accounts[userId]);
      setPendingUser(null);
    }
  };

  // Logout - completely invalidate local user state and cached groups/messages
  const logout = async () => {
    try {
      if (isCloudEnabled() && supabase?.auth?.signOut) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase signOut exception:', e);
    }
    setCurrentUserId(null);
    setUser(null);
    setPendingUser(null);
    storage.remove('current_user_id');
    storage.remove('pending_user');
    storage.remove('groups_db');
    storage.remove('messages_db');
    storage.remove('absences_db');
    storage.remove('groups');
    storage.remove('messages');
  };

  // Get all registered accounts list
  const getAllAccounts = () => {
    return Object.values(accounts);
  };

  return (
    <AuthContext.Provider value={{
      user,
      pendingUser,
      accounts,
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
      switchAccount,
      getAllAccounts,
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
