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

// Cloud Sync Helpers
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

export const syncCheckinToCloud = async (checkinData) => {
  if (!supabase || !checkinData) return null;
  try {
    const { data, error } = await supabase
      .from('checkins')
      .upsert({
        id: checkinData.id,
        user_id: checkinData.userId,
        type: checkinData.type,
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

export const syncGroupToCloud = async (groupData) => {
  if (!supabase || !groupData?.id) return null;
  try {
    const { data, error } = await supabase
      .from('groups')
      .upsert({
        id: groupData.id,
        name: groupData.name,
        description: groupData.description,
        invite_code: groupData.inviteCode,
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
