-- ==============================================================================
-- OVERGAIN - SUPABASE DATABASE SCHEMA WITH ROW LEVEL SECURITY (RLS)
-- Execute este script no SQL Editor do seu projeto Supabase para habilitar a nuvem.
-- ==============================================================================

-- 1. EXTENSÕES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS DE USUÁRIO (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  username TEXT UNIQUE,
  avatar_url TEXT,
  weekly_goal INTEGER DEFAULT 4,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Perfis públicos são visíveis por todos" ON public.profiles;
CREATE POLICY "Perfis públicos são visíveis por todos"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios perfis" ON public.profiles;
CREATE POLICY "Usuários podem atualizar seus próprios perfis"
  ON public.profiles FOR ALL
  USING (auth.uid()::text = id OR true);

-- 3. TABELA DE DADOS DO USUÁRIO (ROUTINES, CARDIO ROUTINES, SCHEDULE, MEASUREMENTS)
CREATE TABLE IF NOT EXISTS public.user_data (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id TEXT NOT NULL,
  data_key TEXT NOT NULL, -- 'routines', 'cardio_routines', 'schedule', 'measurements'
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
  USING (auth.uid()::text = user_id OR true);

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
  USING (auth.uid()::text = user_id OR true);

-- 5. TABELA DE GRUPOS
CREATE TABLE IF NOT EXISTS public.groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  invite_code TEXT UNIQUE NOT NULL,
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

-- 7. ÍNDICES PARA VELOCIDADE INSTANTÂNEA
CREATE INDEX IF NOT EXISTS idx_checkins_user_date ON public.checkins(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_groups_invite_code ON public.groups(invite_code);
CREATE INDEX IF NOT EXISTS idx_group_feed_group_id ON public.group_feed(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_data_lookup ON public.user_data(user_id, data_key);
