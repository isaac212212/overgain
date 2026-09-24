import { createClient } from '@supabase/supabase-js';

// Safe Fallback Auth & Client for Mobile WebViews / APK when Supabase keys are not yet configured
const fallbackAuth = {
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Nuvem não configurada') }),
  signUp: async () => ({ data: { user: null, session: null }, error: new Error('Nuvem não configurada') }),
  signOut: async () => ({ error: null }),
  getUser: async () => ({ data: { user: null }, error: null })
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
    upsert: async () => ({ data: null, error: null })
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

// Get Supabase URL and Anon Key from environment, local storage, or fixed fallbacks
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

  // Also support window / global overrides if injected by Capacitor / Android WebView
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
    console.warn('Failed to initialize Supabase client:', err);
    realClient = null;
  }
}

// Guaranteed to NEVER be null or have auth undefined
export const supabase = realClient || fallbackSupabase;

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

export const isCloudEnabled = () => Boolean(realClient);

// ---- CLOUD SYNC: PROFILE ----
export const syncProfileToCloud = async (userProfile) => {
  if (!supabase || !userProfile?.id) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userProfile.id,
        name: userProfile.name,
        username: userProfile.username,
        avatar_url: userProfile.avatar,
        weekly_goal: userProfile.weeklyGoal,
        updated_at: new Date().toISOString()
      });
    if (error) console.warn('Supabase profile sync error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase profile sync exception:', err);
    return null;
  }
};

export const fetchCloudProfile = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) {
      console.warn('Supabase fetch profile error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('Supabase fetch profile exception:', err);
    return null;
  }
};

// ---- CLOUD SYNC: CHECKINS ----
export const syncCheckinToCloud = async (checkinData) => {
  if (!supabase || !checkinData) return null;
  try {
    const { data, error } = await supabase
      .from('checkins')
      .upsert({
        id: checkinData.id,
        user_id: checkinData.userId,
        type: checkinData.type || 'workout',
        routine_name: checkinData.routineName,
        title: checkinData.title,
        date: checkinData.date,
        duration_minutes: checkinData.durationMinutes,
        total_volume_kg: checkinData.totalVolumeKg,
        photo_url: checkinData.photoUrl,
        notes: checkinData.notes,
        payload: JSON.stringify(checkinData)
      });
    if (error) console.warn('Supabase checkin sync error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase checkin sync exception:', err);
    return null;
  }
};

export const fetchCloudCheckins = async (userId) => {
  if (!supabase || !userId) return [];
  try {
    const { data, error } = await supabase
      .from('checkins')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false });
    if (error) {
      console.warn('Supabase fetch checkins error:', error.message);
      return [];
    }
    return data.map(item => item.payload ? JSON.parse(item.payload) : {
      id: item.id,
      userId: item.user_id,
      type: item.type,
      routineName: item.routine_name,
      title: item.title,
      date: item.date,
      durationMinutes: item.duration_minutes,
      totalVolumeKg: item.total_volume_kg,
      photoUrl: item.photo_url,
      notes: item.notes
    });
  } catch (err) {
    console.warn('Supabase fetch checkins exception:', err);
    return [];
  }
};

// ---- CLOUD SYNC: ROUTINES ----
export const syncRoutinesToCloud = async (userId, routines) => {
  if (!supabase || !userId || !routines) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        data_key: 'routines',
        payload: JSON.stringify(routines),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,data_key' });
    if (error) console.warn('Supabase routines sync error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase routines sync exception:', err);
    return null;
  }
};

export const fetchCloudRoutines = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('payload')
      .eq('user_id', userId)
      .eq('data_key', 'routines')
      .maybeSingle();
    if (error || !data) return null;
    return JSON.parse(data.payload);
  } catch (err) {
    console.warn('Supabase fetch routines exception:', err);
    return null;
  }
};

// ---- CLOUD SYNC: CARDIO ROUTINES ----
export const syncCardioRoutinesToCloud = async (userId, cardioRoutines) => {
  if (!supabase || !userId || !cardioRoutines) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        data_key: 'cardio_routines',
        payload: JSON.stringify(cardioRoutines),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,data_key' });
    if (error) console.warn('Supabase cardio routines sync error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase cardio routines sync exception:', err);
    return null;
  }
};

export const fetchCloudCardioRoutines = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('payload')
      .eq('user_id', userId)
      .eq('data_key', 'cardio_routines')
      .maybeSingle();
    if (error || !data) return null;
    return JSON.parse(data.payload);
  } catch (err) {
    console.warn('Supabase fetch cardio routines exception:', err);
    return null;
  }
};

// ---- CLOUD SYNC: WEEKLY SCHEDULE ----
export const syncScheduleToCloud = async (userId, schedule) => {
  if (!supabase || !userId || !schedule) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .upsert({
        user_id: userId,
        data_key: 'schedule',
        payload: JSON.stringify(schedule),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id,data_key' });
    if (error) console.warn('Supabase schedule sync error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase schedule sync exception:', err);
    return null;
  }
};

export const fetchCloudSchedule = async (userId) => {
  if (!supabase || !userId) return null;
  try {
    const { data, error } = await supabase
      .from('user_data')
      .select('payload')
      .eq('user_id', userId)
      .eq('data_key', 'schedule')
      .maybeSingle();
    if (error || !data) return null;
    return JSON.parse(data.payload);
  } catch (err) {
    console.warn('Supabase fetch schedule exception:', err);
    return null;
  }
};

// ---- CLOUD SYNC: GROUPS ----
export const syncGroupToCloud = async (groupData) => {
  if (!supabase || !groupData?.id) return null;
  try {
    const { data, error } = await supabase
      .from('groups')
      .upsert({
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        invite_code: (groupData.inviteCode || '').toUpperCase(),
        photo_url: groupData.photoUrl,
        pin: groupData.pin,
        created_by: groupData.createdBy,
        created_at: groupData.createdAt,
        payload: JSON.stringify(groupData)
      });
    if (error) console.warn('Supabase group sync error:', error.message);
    return data;
  } catch (err) {
    console.warn('Supabase group sync exception:', err);
    return null;
  }
};

export const fetchCloudGroups = async () => {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('groups')
      .select('*');
    if (error) {
      console.warn('Supabase fetch groups error:', error.message);
      return [];
    }
    return data.map(item => item.payload ? JSON.parse(item.payload) : {
      id: item.id,
      name: item.name,
      description: item.description,
      inviteCode: item.invite_code,
      photoUrl: item.photo_url,
      pin: item.pin,
      createdBy: item.created_by,
      createdAt: item.created_at,
      members: [],
      feed: []
    });
  } catch (err) {
    console.warn('Supabase fetch groups exception:', err);
    return [];
  }
};
