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
  fetchCloudProfile 
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

  // Session verification and cloud sync on startup
  useEffect(() => {
    let timeoutId = null;
    let isCancelled = false;

    timeoutId = setTimeout(() => {
      if (!isCancelled) {
        setIsLoading(false);
      }
    }, 2500);

    const verifySessionAndSync = async () => {
      try {
        if (currentUserId) {
          // Fetch cloud measurements in background to merge
          const cloudMeasurements = await fetchCloudMeasurements(currentUserId);
          if (!isCancelled && Array.isArray(cloudMeasurements) && cloudMeasurements.length > 0) {
            setUser(prev => {
              if (!prev) return prev;
              const localHistory = prev.measurementsHistory || [];
              const map = new Map();
              cloudMeasurements.forEach(m => map.set(m.id || m.date, m));
              localHistory.forEach(m => {
                const key = m.id || m.date;
                if (!map.has(key)) map.set(key, m);
              });
              const merged = Array.from(map.values()).sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
              const updated = { ...prev, measurementsHistory: merged };
              setAccounts(accs => ({ ...accs, [prev.id]: updated }));
              return updated;
            });
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

    verifySessionAndSync();

    return () => {
      isCancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentUserId]);

  // Login with existing or new Google Account
  const loginWithGoogle = async (googleEmail) => {
    const emailNorm = (googleEmail || 'usuario@gmail.com').trim().toLowerCase();
    
    // Check local accounts first
    let existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );

    // If not local, check Supabase cloud for cross-device login
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

  // Login with Email & Password (with cloud fallback for PC <-> Mobile sync)
  const loginWithEmail = async (email, password) => {
    const emailNorm = email.trim().toLowerCase();
    let existing = Object.values(accounts).find(
      acc => acc.email?.toLowerCase() === emailNorm
    );

    // If account not found in local storage, check Supabase cloud (cross-device login)
    if (!existing) {
      try {
        const cloudAcc = await fetchCloudAccountByEmail(emailNorm);
        if (cloudAcc && cloudAcc.id) {
          existing = cloudAcc;
          setAccounts(prev => ({ ...prev, [cloudAcc.id]: cloudAcc }));
        }
      } catch (err) {
        console.warn('Cross device cloud check error:', err);
      }
    }

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

    // Sync full profile and measurements with cloud in background
    syncFullAccountToCloud(existing);

    return { success: true, user: existing };
  };

  // Register with Email, Password, Name, Gender, Weekly Goal
  const registerWithEmail = async (email, password, name, gender = 'Masculino', weeklyGoal = 4) => {
    const emailNorm = email.trim().toLowerCase();
    let existing = Object.values(accounts).find(
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

    // Save account locally
    setAccounts(prev => {
      const updated = { ...prev, [newUser.id]: newUser };
      storage.set('accounts', updated);
      return updated;
    });

    setCurrentUserId(newUser.id);
    setUser(newUser);
    setPendingUser(null);
    storage.set('current_user_id', newUser.id);

    // Immediately sync to Supabase Cloud
    syncFullAccountToCloud(newUser);

    return { success: true, user: newUser };
  };

  // Complete onboarding (Name, Photo, Gender, Password)
  const completeOnboarding = (profileData) => {
    const base = pendingUser || user || {};
    const finalUser = {
      ...base,
      name: (profileData.name || base.name || 'Atleta').trim(),
      username: profileData.username || (profileData.name || 'atleta').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 20),
      avatar: profileData.avatar || base.avatar || null,
      gender: profileData.gender || base.gender || 'Masculino',
      weeklyGoal: Number(profileData.weeklyGoal || base.weeklyGoal) || 4,
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

    // Sync to Cloud
    syncFullAccountToCloud(finalUser);

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

    // Cloud sync
    syncFullAccountToCloud(updated);
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

    // Sync measurements to cloud
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
  const updatePassword = (newPassword) => {
    if (!user) return;
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
