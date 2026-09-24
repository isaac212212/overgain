import { createClient } from '@supabase/supabase-js';

// Get Supabase URL and Anon Key from environment or local storage override
const getSupabaseConfig = () => {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = localStorage.getItem('og_supabase_url') || '';
  const storedKey = localStorage.getItem('og_supabase_anon_key') || '';

  const url = storedUrl || envUrl;
  const key = storedKey || envKey;

  return { url, key, isConfigured: Boolean(url && key) };
};

const config = getSupabaseConfig();

export const supabase = config.isConfigured
  ? createClient(config.url, config.key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    })
  : null;

export const setSupabaseCredentials = (url, key) => {
  if (url && key) {
    localStorage.setItem('og_supabase_url', url.trim());
    localStorage.setItem('og_supabase_anon_key', key.trim());
  } else {
    localStorage.removeItem('og_supabase_url');
    localStorage.removeItem('og_supabase_anon_key');
  }
  window.location.reload();
};

export const isCloudEnabled = () => Boolean(supabase);

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
