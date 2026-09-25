import { createClient } from '@supabase/supabase-js';
import { showToast } from '../contexts/ToastContext';

// Safe Fallback Auth & Client for Mobile WebViews / APK when Supabase keys are not configured
const fallbackAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Nuvem não configurada') }),
  signUp: async () => ({ data: { user: null, session: null }, error: new Error('Nuvem não configurada') }),
  signOut: async () => ({ error: null }),
  getUser: async () => ({ data: { user: null }, error: null }),
  resetPasswordForEmail: async () => ({ data: {}, error: null }),
  updateUser: async () => ({ data: { user: null }, error: null })
};

const fallbackSupabase = {
  auth: fallbackAuth,
  from: () => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        order: () => Promise.resolve({ data: [], error: null }),
        then: (resolve) => resolve({ data: [], error: null })
      }),
      order: () => Promise.resolve({ data: [], error: null }),
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve) => resolve({ data: [], error: null })
    }),
    upsert: async () => ({ data: null, error: null }),
    delete: () => ({
      eq: async () => ({ data: null, error: null })
    })
  })
};

// Fixed default Supabase credentials
const DEFAULT_SUPABASE_URL = 'https://xhgavvprcjfomnpatjqd.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhoZ2F2dnByY2pmb21ucGF0anFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAyNjM1MjIsImV4cCI6MjEwNTgzOTUyMn0.LWACoO0SloKqQ-VBbbDeomi_L67G1LjaywZMKle73As';

const cleanSupabaseUrl = (rawUrl) => {
  if (!rawUrl) return '';
  let url = rawUrl.trim();
  return url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '');
};

const getSupabaseConfig = () => {
  let envUrl = '';
  let envKey = '';

  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      envUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.REACT_APP_SUPABASE_URL || '';
      envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.REACT_APP_SUPABASE_ANON_KEY || '';
    }
  } catch (e) {
    console.warn('Could not read import.meta.env:', e);
  }

  if (!envUrl && typeof window !== 'undefined' && window.__ENV__) {
    envUrl = window.__ENV__.VITE_SUPABASE_URL || '';
    envKey = window.__ENV__.VITE_SUPABASE_ANON_KEY || '';
  }

  let storedUrl = '';
  let storedKey = '';
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      storedUrl = window.localStorage.getItem('og_supabase_url') || '';
      storedKey = window.localStorage.getItem('og_supabase_anon_key') || '';
    }
  } catch {
    // Ignore storage restrictions
  }

  const rawUrl = storedUrl || envUrl || DEFAULT_SUPABASE_URL;
  const url = cleanSupabaseUrl(rawUrl);
  const key = (storedKey || envKey || DEFAULT_SUPABASE_ANON_KEY).trim();
  const isValidUrl = url.startsWith('http://') || url.startsWith('https://');

  return { url, key, isConfigured: Boolean(isValidUrl && key) };
};

const config = getSupabaseConfig();

let realClient = null;
if (config.isConfigured) {
  try {
    realClient = createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    realClient = null;
  }
}

export const supabase = realClient || fallbackSupabase;

export const isCloudEnabled = () => Boolean(realClient);

export const setSupabaseCredentials = (url, key) => {
  try {
    if (url && key) {
      localStorage.setItem('og_supabase_url', url.trim());
      localStorage.setItem('og_supabase_anon_key', key.trim());
    } else {
      localStorage.removeItem('og_supabase_url');
      localStorage.removeItem('og_supabase_anon_key');
    }
  } catch (e) {
    console.warn('Could not save Supabase credentials:', e);
  }
  window.location.reload();
};

// Helper to safely parse jsonb payload or data
const parseJsonData = (val, defaultValue = null) => {
  if (val === undefined || val === null) return defaultValue;
  if (typeof val === 'string') {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
};

// ============================================================================
// 1. ROUTINES (TREINOS / ROTINAS)
// ============================================================================
export const syncRoutinesToCloud = async (userId, routines) => {
  if (!supabase || !userId) return null;
  try {
    const key = `routines_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key,
        data: routines || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar rotinas no Supabase:', error.message || error);
      showToast('Erro ao salvar rotinas na nuvem. Verifique sua conexão.', 'error');
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar rotinas no Supabase:', err);
    showToast('Erro de conexão ao salvar rotinas.', 'error');
    return null;
  }
};

export const fetchCloudRoutines = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const key = `routines_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar rotinas no Supabase:', error.message || error);
      return null;
    }
    if (!data || data.data === undefined) return null;
    return parseJsonData(data.data, []);
  } catch (err) {
    console.error('Exceção ao buscar rotinas no Supabase:', err);
    return null;
  }
};

// ============================================================================
// 2. CARDIO ROUTINES
// ============================================================================
export const syncCardioRoutinesToCloud = async (userId, cardioRoutines) => {
  if (!supabase || !userId) return null;
  try {
    const key = `cardio_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key,
        data: cardioRoutines || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar rotinas de cardio no Supabase:', error.message || error);
      showToast('Erro ao salvar cardios na nuvem.', 'error');
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar cardios no Supabase:', err);
    return null;
  }
};

export const fetchCloudCardioRoutines = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const key = `cardio_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar rotinas de cardio no Supabase:', error.message || error);
      return null;
    }
    if (!data || data.data === undefined) return null;
    return parseJsonData(data.data, []);
  } catch (err) {
    console.error('Exceção ao buscar cardios no Supabase:', err);
    return null;
  }
};

// ============================================================================
// 3. WEEKLY SCHEDULE (CRONOGRAMA SEMANAL)
// ============================================================================
export const syncScheduleToCloud = async (userId, schedule) => {
  if (!supabase || !userId) return null;
  try {
    const key = `schedule_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key,
        data: schedule || {},
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar cronograma no Supabase:', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar cronograma no Supabase:', err);
    return null;
  }
};

export const fetchCloudSchedule = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const key = `schedule_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar cronograma no Supabase:', error.message || error);
      return null;
    }
    if (!data || data.data === undefined) return null;
    return parseJsonData(data.data, null);
  } catch (err) {
    console.error('Exceção ao buscar cronograma no Supabase:', err);
    return null;
  }
};

// ============================================================================
// 4. CHECK-INS / HISTÓRICO DE TREINOS E CARDIOS
// ============================================================================
export const syncCheckinsToCloud = async (userId, checkins) => {
  if (!supabase || !userId) return null;
  try {
    const key = `checkins_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key,
        data: checkins || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar check-ins no Supabase:', error.message || error);
      showToast('Erro ao salvar check-in na nuvem.', 'error');
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar check-ins no Supabase:', err);
    return null;
  }
};

export const syncCheckinToCloud = async (checkinData) => {
  if (!supabase || !checkinData || !checkinData.userId) return null;
  try {
    // 1. Fetch current checkins list
    const current = await fetchCloudCheckins(checkinData.userId);
    const exists = current.some(c => c.id === checkinData.id);
    const updated = exists
      ? current.map(c => c.id === checkinData.id ? checkinData : c)
      : [checkinData, ...current];

    return await syncCheckinsToCloud(checkinData.userId, updated);
  } catch (err) {
    console.error('Exceção ao salvar checkin individual no Supabase:', err);
    return null;
  }
};

export const fetchCloudCheckins = async (userId) => {
  if (!supabase || !userId) return [];
  try {
    const key = `checkins_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar checkins no Supabase:', error.message || error);
      return [];
    }
    if (!data || data.data === undefined) return [];
    return parseJsonData(data.data, []);
  } catch (err) {
    console.error('Exceção ao buscar checkins no Supabase:', err);
    return [];
  }
};

// ============================================================================
// 5. MEASUREMENTS (MEDIDAS CORPORAIS)
// ============================================================================
export const syncMeasurementsToCloud = async (userId, measurements) => {
  if (!supabase || !userId) return null;
  try {
    const key = `measurements_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key,
        data: measurements || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar medidas no Supabase:', error.message || error);
      showToast('Erro ao salvar medidas na nuvem.', 'error');
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar medidas no Supabase:', err);
    return null;
  }
};

export const fetchCloudMeasurements = async (userId) => {
  if (!supabase || !userId) return [];
  try {
    const key = `measurements_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar medidas no Supabase:', error.message || error);
      return [];
    }
    if (!data || data.data === undefined) return [];
    return parseJsonData(data.data, []);
  } catch (err) {
    console.error('Exceção ao buscar medidas no Supabase:', err);
    return [];
  }
};

// ============================================================================
// 6. GROUPS & FEED (GRUPOS E COMUNIDADES)
// ============================================================================
export const syncGroupsToCloud = async (groupsList) => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key: 'groups_all',
        data: groupsList || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar grupos no Supabase:', error.message || error);
      showToast('Erro ao atualizar dados do grupo na nuvem.', 'error');
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar grupos no Supabase:', err);
    return null;
  }
};

export const syncGroupToCloud = async (groupData) => {
  if (!supabase || !groupData?.id) return null;
  try {
    const all = await fetchCloudGroups();
    const index = all.findIndex(g => g.id === groupData.id);
    let updated;
    if (index >= 0) {
      updated = all.map(g => g.id === groupData.id ? groupData : g);
    } else {
      updated = [groupData, ...all];
    }
    return await syncGroupsToCloud(updated);
  } catch (err) {
    console.error('Exceção ao sincronizar grupo individual no Supabase:', err);
    return null;
  }
};

export const fetchCloudGroups = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', 'groups_all')
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar grupos no Supabase:', error.message || error);
      return [];
    }
    if (!data || data.data === undefined) return [];
    return parseJsonData(data.data, []);
  } catch (err) {
    console.error('Exceção ao buscar grupos no Supabase:', err);
    return [];
  }
};

export const deleteCloudGroup = async (groupId) => {
  if (!supabase || !groupId) return null;
  try {
    const all = await fetchCloudGroups();
    const filtered = all.filter(g => g.id !== groupId);
    return await syncGroupsToCloud(filtered);
  } catch (err) {
    console.error('Exceção ao deletar grupo no Supabase:', err);
    return null;
  }
};

// ============================================================================
// 7. GROUP CHAT MESSAGES
// ============================================================================
export const syncMessagesToCloud = async (groupId, messages) => {
  if (!supabase || !groupId) return null;
  try {
    const key = `messages_${groupId}`;
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key,
        data: messages || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar mensagens no Supabase:', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar mensagens no Supabase:', err);
    return null;
  }
};

export const fetchCloudMessages = async (groupId) => {
  if (!supabase || !groupId) return [];
  try {
    const key = `messages_${groupId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar mensagens no Supabase:', error.message || error);
      return [];
    }
    if (!data || data.data === undefined) return [];
    return parseJsonData(data.data, []);
  } catch (err) {
    console.error('Exceção ao buscar mensagens no Supabase:', err);
    return [];
  }
};

// ============================================================================
// 8. JUSTIFIED ABSENCES (FALTAS JUSTIFICADAS)
// ============================================================================
export const syncAbsencesToCloud = async (userId, absences) => {
  if (!supabase || !userId) return null;
  try {
    const key = `absences_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        key,
        data: absences || [],
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })
      .select();

    if (error) {
      console.error('Erro ao sincronizar faltas justificadas no Supabase:', error.message || error);
      return null;
    }
    return data;
  } catch (err) {
    console.error('Exceção ao sincronizar faltas justificadas no Supabase:', err);
    return null;
  }
};

export const fetchCloudAbsences = async (userId) => {
  if (!supabase || !userId) return [];
  try {
    const key = `absences_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar faltas justificadas no Supabase:', error.message || error);
      return [];
    }
    if (!data || data.data === undefined) return [];
    return parseJsonData(data.data, []);
  } catch (err) {
    console.error('Exceção ao buscar faltas justificadas no Supabase:', err);
    return [];
  }
};

// ============================================================================
// 9. FULL ACCOUNT & AUTHENTICATION REGISTRY (CROSS-DEVICE LOGIN)
// ============================================================================
export const syncFullAccountToCloud = async (user) => {
  if (!supabase || !user?.id) return null;
  try {
    const cleanUser = {
      id: user.id,
      name: user.name,
      username: user.username,
      email: (user.email || '').toLowerCase().trim(),
      password: user.password,
      pin: user.pin,
      gender: user.gender,
      avatar: user.avatar,
      weeklyGoal: user.weeklyGoal,
      weeklySchedule: user.weeklySchedule,
      privacy: user.privacy,
      measurementsHistory: user.measurementsHistory || [],
      onboarded: user.onboarded !== undefined ? user.onboarded : true,
      updatedAt: new Date().toISOString()
    };

    // 1. Sync by user ID
    const keyId = `account_${user.id}`;
    await supabase
      .from('user_data')
      .upsert({
        key: keyId,
        data: cleanUser,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });

    // 2. Sync by Email for cross-device lookup
    if (cleanUser.email) {
      const keyEmail = `account_email_${cleanUser.email}`;
      await supabase
        .from('user_data')
        .upsert({
          key: keyEmail,
          data: cleanUser,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });
    }

    return cleanUser;
  } catch (err) {
    console.error('Exceção ao sincronizar conta completa no Supabase:', err);
    return null;
  }
};

export const fetchCloudAccount = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const key = `account_${userId}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) return null;
    return parseJsonData(data.data, null);
  } catch (err) {
    console.error('Exceção ao buscar conta por ID no Supabase:', err);
    return null;
  }
};

export const fetchCloudAccountByEmail = async (email) => {
  if (!supabase || !email) return null;
  const emailNorm = email.trim().toLowerCase();
  try {
    const keyEmail = `account_email_${emailNorm}`;
    const { data, error } = await supabase
      .from('user_data')
      .select('data')
      .eq('key', keyEmail)
      .maybeSingle();

    if (!error && data?.data) {
      return parseJsonData(data.data, null);
    }

    // Fallback: search all account keys
    const { data: allAccounts, error: searchError } = await supabase
      .from('user_data')
      .select('data')
      .like('key', 'account_%');

    if (!searchError && Array.isArray(allAccounts)) {
      for (const item of allAccounts) {
        const parsed = parseJsonData(item.data);
        if (parsed?.email?.toLowerCase() === emailNorm) {
          return parsed;
        }
      }
    }

    return null;
  } catch (err) {
    console.error('Exceção ao buscar conta por e-mail no Supabase:', err);
    return null;
  }
};

export const syncProfileToCloud = async (userProfile) => {
  return await syncFullAccountToCloud(userProfile);
};

export const fetchCloudProfile = async (userId) => {
  return await fetchCloudAccount(userId);
};

// ============================================================================
// 10. VALIDATION: USERNAME OR NAME UNIQUENESS
// ============================================================================
export const isUsernameOrNameTaken = async (name, username, excludeUserId = null) => {
  if (!supabase) return { isTaken: false };
  try {
    const cleanName = (name || '').trim().toLowerCase();
    const cleanUser = (username || '').trim().toLowerCase();

    const { data: accountsData, error } = await supabase
      .from('user_data')
      .select('data')
      .like('key', 'account_email_%');

    if (!error && Array.isArray(accountsData)) {
      for (const item of accountsData) {
        const acc = parseJsonData(item.data);
        if (!acc) continue;
        if (excludeUserId && String(acc.id) === String(excludeUserId)) continue;
        if (acc.name && acc.name.trim().toLowerCase() === cleanName) {
          return { isTaken: true, field: 'name', message: 'Este nome de perfil já está em uso por outro atleta. Escolha outro.' };
        }
        if (acc.username && acc.username.trim().toLowerCase() === cleanUser) {
          return { isTaken: true, field: 'username', message: 'Este nome de usuário (@' + acc.username + ') já está em uso. Escolha outro.' };
        }
      }
    }

    return { isTaken: false };
  } catch (err) {
    console.error('Exceção ao verificar nome/usuário duplicado:', err);
    return { isTaken: false };
  }
};
