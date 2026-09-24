import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { storage } from '../utils/storage';
import { DEFAULT_WEEKLY_SCHEDULE } from '../utils/initialData';
import { supabase, isCloudEnabled } from '../lib/supabase';

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

  // Loading state with 3-second safety timeout for mobile / APK WebViews
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

  // Session verification with 3s max timeout (prevents stuck black screens in APK)
  useEffect(() => {
    let timeoutId = null;
    let isCancelled = false;

    timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setIsLoading(false);
      }
    }, 3000);

    const verifySession = async () => {
      try {
        if (isCloudEnabled() && supabase?.auth?.getSession) {
          const { data, error } = await supabase.auth.getSession();
          if (!isCancelled && !error && data?.session?.user) {
            const cloudUser = data.session.user;
            const existing = Object.values(accounts).find(a => a.email === cloudUser.email);
            if (existing) {
              setCurrentUserId(existing.id);
              setUser(existing);
            }
          }
        }
      } catch (err) {
        console.warn('Session verification catch:', err);
      } finally {
        if (!isCancelled) {
          clearTimeout(timeoutId);
          setIsLoading(false);
        }
      }
    };

    verifySession();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  // Login with existing or new Google Account
  const loginWithGoogle = (googleEmail) => {
    const emailNorm = (googleEmail || 'usuario@gmail.com').trim().toLowerCase();
    
    // Check if this google account already exists in accounts registry
    const existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );

    if (existing && existing.onboarded) {
      // Existing returning account -> Log in directly
      setCurrentUserId(existing.id);
      setUser(existing);
      setPendingUser(null);
      return { isNew: false, user: existing };
    }

    // New Google Account -> Create pending user and go to onboarding for Name, Photo, Gender
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

  // Login with Email & Password
  const loginWithEmail = (email, password) => {
    const emailNorm = email.trim().toLowerCase();
    const existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );

    if (!existing) {
      return { 
        success: false, 
        error: 'Nenhuma conta encontrada com este e-mail. Por favor, cadastre-se primeiro!' 
      };
    }

    // Verify Password (or PIN if legacy account)
    const validPassword = existing.password ? (existing.password === password) : (existing.pin === password);
    if (!validPassword) {
      return {
        success: false,
        error: 'Senha incorreta. Verifique e tente novamente.'
      };
    }

    setCurrentUserId(existing.id);
    setUser(existing);
    setPendingUser(null);
    return { success: true, user: existing };
  };

  // Register with Email, Password, Name, Gender, Weekly Goal
  const registerWithEmail = (email, password, name, gender = 'Masculino', weeklyGoal = 4) => {
    const emailNorm = email.trim().toLowerCase();
    const existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );

    if (existing) {
      return {
        success: false,
        error: 'Já existe uma conta cadastrada com este e-mail. Faça login.'
      };
    }

    const cleanName = (name || emailNorm.split('@')[0]).trim();
    const newUser = {
      id: 'usr_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4),
      name: cleanName,
      username: cleanName.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20),
      email: emailNorm,
      password: password,
      avatar: null,
      gender: gender || 'Prefiro não informar',
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

    // Save account in accounts map
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

  // Update Password
  const updatePassword = (newPassword) => {
    if (!user) return;
    const updated = { ...user, password: newPassword, updatedAt: new Date().toISOString() };
    setUser(updated);
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });
  };

  // Complete Onboarding (fallback if needed)
  const completeOnboarding = (profileData) => {
    const base = pendingUser || user || {
      id: 'usr_' + Date.now().toString(36),
      email: 'usuario@overgain.com',
      password: 'password123',
      weeklySchedule: DEFAULT_WEEKLY_SCHEDULE,
      privacy: { publicMeasurements: false, publicRoutines: true, publicWeights: false, publicPRs: false, publicRoutineWeights: false },
      measurementsHistory: [],
      createdAt: new Date().toISOString()
    };

    const finalUser = {
      ...base,
      name: profileData.name || base.name || 'Atleta Overgain',
      username: (profileData.name || base.name || 'atleta').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20),
      avatar: profileData.avatar || null,
      gender: profileData.gender || 'Prefiro não informar',
      weeklyGoal: Number(profileData.weeklyGoal) || 4,
      password: profileData.password || base.password,
      onboarded: true,
      updatedAt: new Date().toISOString()
    };

    // Save account in accounts map
    setAccounts(prev => {
      const updated = { ...prev, [finalUser.id]: finalUser };
      storage.set('accounts', updated);
      return updated;
    });

    setCurrentUserId(finalUser.id);
    setUser(finalUser);
    setPendingUser(null);
    storage.set('current_user_id', finalUser.id);

    return finalUser;
  };

  // Update profile
  const updateProfile = (profileData) => {
    if (!user) return;
    const updated = { ...user, ...profileData, updatedAt: new Date().toISOString() };
    setUser(updated);
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });
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
    const updated = {
      ...user,
      measurementsHistory: [newEntry, ...(user.measurementsHistory || [])]
    };
    setUser(updated);
    setAccounts(prev => {
      const copy = { ...prev, [updated.id]: updated };
      storage.set('accounts', copy);
      return copy;
    });
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
  };

  // Switch account
  const switchAccount = (userId) => {
    if (accounts[userId]) {
      setCurrentUserId(userId);
      setUser(accounts[userId]);
      setPendingUser(null);
    }
  };

  // Logout
  const logout = () => {
    setCurrentUserId(null);
    setUser(null);
    setPendingUser(null);
    storage.remove('current_user_id');
    storage.remove('pending_user');
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
