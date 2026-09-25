-- ==============================================================================
-- OVERGAIN - SUPABASE DATABASE SCHEMA WITH AUTOMATIC USER PROFILES & RLS
-- Execute este script completo no SQL Editor do seu projeto Supabase.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- SCRIPT DE RESET / LIMPEZA DE DADOS DE TESTE (OPCIONAL)
-- Descomente as linhas abaixo caso queira limpar os dados antigos de teste:
-- ==============================================================================
-- TRUNCATE TABLE public.group_feed, public.groups, public.checkins, public.user_data, public.profiles CASCADE;
-- DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%teste%';

-- 2. TABELA DE PERFIS DE USUÁRIO (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT,
  avatar_url TEXT,
  weekly_goal INTEGER DEFAULT 4,
  streak INTEGER DEFAULT 0,
  gender TEXT DEFAULT 'Masculino',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis públicos são visíveis por todos" ON public.profiles;
CREATE POLICY "Perfis públicos são visíveis por todos"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários podem gerenciar seus próprios perfis"
  ON public.profiles FOR ALL
  USING (true);

-- 3. TABELA DE DADOS DO USUÁRIO (ROUTINES, CARDIO ROUTINES, SCHEDULE, MEASUREMENTS, ACCOUNT DATA)
CREATE TABLE IF NOT EXISTS public.user_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  data_key TEXT NOT NULL, -- 'routines', 'cardio_routines', 'schedule', 'measurements', 'account_data'
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, data_key)
);

-- RLS: user_data
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários gerenciam apenas seus dados" ON public.user_data;
CREATE POLICY "Usuários gerenciam apenas seus dados"
  ON public.user_data FOR ALL
  USING (true);

-- 4. TABELA DE BATE-PONTOS E CHECK-INS (TREINOS E CARDIOS)
CREATE TABLE IF NOT EXISTS public.checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT DEFAULT 'workout', -- 'workout' ou 'cardio'
  routine_name TEXT,
  title TEXT,
  date TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  total_volume_kg NUMERIC DEFAULT 0,
  photo_url TEXT,
  notes TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: checkins
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Checkins visíveis por todos os membros" ON public.checkins;
CREATE POLICY "Checkins visíveis por todos os membros"
  ON public.checkins FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuários gerenciam seus próprios checkins" ON public.checkins;
CREATE POLICY "Usuários gerenciam seus próprios checkins"
  ON public.checkins FOR ALL
  USING (true);

-- 5. TABELA DE GRUPOS
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT NOT NULL,
  photo_url TEXT,
  pin TEXT,
  category TEXT DEFAULT 'Geral',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

-- RLS: groups
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Grupos visíveis para busca e membros" ON public.groups;
CREATE POLICY "Grupos visíveis para busca e membros"
  ON public.groups FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Membros e criadores gerenciam grupos" ON public.groups;
CREATE POLICY "Membros e criadores gerenciam grupos"
  ON public.groups FOR ALL
  USING (true);

-- 6. TABELA DE FEED DE GRUPOS
CREATE TABLE IF NOT EXISTS public.group_feed (
  id TEXT PRIMARY KEY,
  group_id TEXT NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  user_avatar TEXT,
  routine_name TEXT,
  duration_minutes INTEGER,
  total_volume_kg NUMERIC,
  photo_url TEXT,
  notes TEXT,
  likes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB
);

ALTER TABLE public.group_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Membros visualizam o feed" ON public.group_feed;
CREATE POLICY "Membros visualizam o feed"
  ON public.group_feed FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuários postam no feed" ON public.group_feed;
CREATE POLICY "Usuários postam no feed"
  ON public.group_feed FOR ALL
  USING (true);

-- 7. TRIGGER AUTOMÁTICO PARA CRIAÇÃO DE PERFIL VIA AUTH.USERS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, username, avatar_url, weekly_goal)
  VALUES (
    NEW.id::text,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'username', LOWER(REGEXP_REPLACE(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9_]', '_', 'g'))),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NULL),
    COALESCE((NEW.raw_user_meta_data->>'weekly_goal')::integer, 4)
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    updated_at = NOW();

  INSERT INTO public.user_data (user_id, data_key, payload)
  VALUES (
    NEW.id::text,
    'schedule',
    '{"0":{"type":"rest","label":"Descanso"},"1":{"type":"workout","label":"Treino A"},"2":{"type":"workout","label":"Treino B"},"3":{"type":"rest","label":"Descanso"},"4":{"type":"workout","label":"Treino C"},"5":{"type":"workout","label":"Treino D"},"6":{"type":"rest","label":"Descanso"}}'::jsonb
  )
  ON CONFLICT (user_id, data_key) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 8. ÍNDICES PARA VELOCIDADE INSTANTÂNEA
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.checkins(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_feed_group_id ON public.group_feed(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_lookup ON public.user_data(user_id, data_key);
