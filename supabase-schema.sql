-- =========================================================================
-- COMPLETE SELF-HEALING SUPABASE DATABASE INITIALIZATION & MIGRATION SCRIPT
-- =========================================================================
-- This script safely cleans, structures, and configures all necessary tables,
-- relations, indexes, functions, triggers, and Row Level Security (RLS) policies.
-- Run this entire script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- to fix structural and RLS permission issues.

-- Enable standard uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------------------
-- 1. PROFILES TABLE (Syncs with Supabase auth.users)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'free',
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure profiles is enabled for Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 2. USER PERMISSIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  allowed_languages TEXT[] DEFAULT '{"en", "ar", "ku_sorani", "ku_badini"}',
  allowed_grades INT[] DEFAULT '{12}',
  subject_access JSONB DEFAULT '{}',
  is_premium BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure user_permissions is enabled for Row Level Security
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 3. SUBJECTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INT NOT NULL,
  branch TEXT CHECK (branch IN ('scientific', 'literary', null)),
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 4. CHAPTERS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 5. SUBCHAPTERS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.subchapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subchapters ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 6. QUESTIONS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer_index INT NOT NULL,
  explanation TEXT,
  language TEXT,
  grade INT,
  branch TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE CASCADE,
  subchapter_id UUID REFERENCES public.subchapters(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 7. QUIZ ATTEMPTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES public.chapters(id) ON DELETE SET NULL,
  subchapter_id UUID REFERENCES public.subchapters(id) ON DELETE SET NULL,
  grade INT NOT NULL,
  branch TEXT,
  language TEXT NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 8. STUDY GUIDES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  source_text TEXT,
  subchapter_id UUID REFERENCES public.subchapters(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  animation_html TEXT,
  page_images JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.study_guides ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 9. STUDY GUIDE IMAGES TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.study_guide_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES public.study_guides(id) ON DELETE CASCADE,
  base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.study_guide_images ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 10. USER ACHIEVEMENTS TABLE
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;


-- =========================================================================
-- ADMINISTRATIVE & PERMISSION FUNCTIONS (Recursion-Resistant)
-- =========================================================================

-- Create a security-definer helper function to break policy evaluation cycles
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  -- Using a custom set search_path or specific public prefixes ensures safe queries
  SELECT is_admin INTO _is_admin FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- =========================================================================
-- DEFINING ROBUST ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Safely clear outdated/erroneous policies to prevent overlapping rules
DO $$ 
BEGIN
    -- profiles
    DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
    DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
    
    -- user_permissions
    DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_permissions;
    DROP POLICY IF EXISTS "Users can update their own permissions" ON public.user_permissions;
    DROP POLICY IF EXISTS "Admins can manage user_permissions" ON public.user_permissions;
    
    -- subjects
    DROP POLICY IF EXISTS "Public subjects are readable by everyone" ON public.subjects;
    DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
    
    -- chapters
    DROP POLICY IF EXISTS "Public chapters are readable by everyone" ON public.chapters;
    DROP POLICY IF EXISTS "Admins can manage chapters" ON public.chapters;
    
    -- subchapters
    DROP POLICY IF EXISTS "Public subchapters are readable by everyone" ON public.subchapters;
    DROP POLICY IF EXISTS "Admins can manage subchapters" ON public.subchapters;
    
    -- questions
    DROP POLICY IF EXISTS "Public questions are readable by everyone" ON public.questions;
    DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
    
    -- quiz_attempts
    DROP POLICY IF EXISTS "Users can view their own quiz attempts" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can insert their own quiz attempts" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Users can update their own quiz attempts" ON public.quiz_attempts;
    DROP POLICY IF EXISTS "Admins can manage quiz_attempts" ON public.quiz_attempts;
    
    -- study_guides
    DROP POLICY IF EXISTS "Public study guides are readable by everyone" ON public.study_guides;
    DROP POLICY IF EXISTS "Admins can manage study_guides" ON public.study_guides;
    
    -- study_guide_images
    DROP POLICY IF EXISTS "Public study guide images are readable by everyone" ON public.study_guide_images;
    DROP POLICY IF EXISTS "Admins can manage study_guide_images" ON public.study_guide_images;
    
    -- user_achievements
    DROP POLICY IF EXISTS "Users can view their own achievements" ON public.user_achievements;
    DROP POLICY IF EXISTS "Users can insert their own achievements" ON public.user_achievements;
    DROP POLICY IF EXISTS "Admins can manage user_achievements" ON public.user_achievements;
END $$;

-- --- Create Clean Policies ---

-- 1. Profiles
CREATE POLICY "Users can view their own profile" ON public.profiles 
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Admins can manage profiles" ON public.profiles 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. User Permissions
CREATE POLICY "Users can view their own permissions" ON public.user_permissions 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage user_permissions" ON public.user_permissions 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Subjects
CREATE POLICY "Public subjects are readable by everyone" ON public.subjects 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage subjects" ON public.subjects 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. Chapters
CREATE POLICY "Public chapters are readable by everyone" ON public.chapters 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage chapters" ON public.chapters 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 5. Subchapters
CREATE POLICY "Public subchapters are readable by everyone" ON public.subchapters 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage subchapters" ON public.subchapters 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 6. Questions
CREATE POLICY "Public questions are readable by everyone" ON public.questions 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage questions" ON public.questions 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 7. Quiz Attempts
CREATE POLICY "Users can view their own quiz attempts" ON public.quiz_attempts 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quiz attempts" ON public.quiz_attempts 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own quiz attempts" ON public.quiz_attempts 
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage quiz_attempts" ON public.quiz_attempts 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 8. Study Guides
CREATE POLICY "Public study guides are readable by everyone" ON public.study_guides 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage study_guides" ON public.study_guides 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 9. Study Guide Images
CREATE POLICY "Public study guide images are readable by everyone" ON public.study_guide_images 
  FOR SELECT USING (true);
CREATE POLICY "Admins can manage study_guide_images" ON public.study_guide_images 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 10. User Achievements
CREATE POLICY "Users can view their own achievements" ON public.user_achievements 
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own achievements" ON public.user_achievements 
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can manage user_achievements" ON public.user_achievements 
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());


-- =========================================================================
-- DATABASE PERFORMANCE INDEXES (Avoid Performance Latency)
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_chapters_subject ON public.chapters(subject_id);
CREATE INDEX IF NOT EXISTS idx_subchapters_chapter ON public.subchapters(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON public.questions(subject_id);
CREATE INDEX IF NOT EXISTS idx_questions_chapter ON public.questions(chapter_id);
CREATE INDEX IF NOT EXISTS idx_questions_subchapter ON public.questions(subchapter_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON public.quiz_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_study_guides_subchapter ON public.study_guides(subchapter_id);
CREATE INDEX IF NOT EXISTS idx_study_guide_images_guide ON public.study_guide_images(guide_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);


-- =========================================================================
-- REAL-TIME AUTOMATION: PROFILE AND PERMISSION GENERATION ON AUTH SIGNUP
-- =========================================================================

-- Clean up legacy triggers or trigger functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  -- Determine initial admin status
  _is_admin := COALESCE(
    new.email = 'rojkarcom@gmail.com' OR new.email = 'wlat.ibrahim@gmail.com', 
    FALSE
  );

  -- 1. Insert Profile
  INSERT INTO public.profiles (id, email, plan, is_admin)
  VALUES (
    new.id, 
    new.email, 
    CASE WHEN _is_admin THEN 'premium' ELSE 'free' END, 
    _is_admin
  )
  ON CONFLICT (id) DO UPDATE 
  SET email = EXCLUDED.email;

  -- 2. Insert User Permissions
  INSERT INTO public.user_permissions (user_id, allowed_languages, allowed_grades, subject_access, is_premium)
  VALUES (
    new.id, 
    ARRAY['en', 'ar', 'ku_sorani', 'ku_badini'], 
    ARRAY[12], 
    '{}'::jsonb, 
    _is_admin
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-assign triggering rule to authentication flow
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =========================================================================
-- AUTOMATIC SEED / SELF-HEALING UPDATE FOR KNOWN ACCOUNTS
-- =========================================================================

-- Backfill profile is_admin for specified emails
UPDATE public.profiles 
SET is_admin = TRUE, 
    plan = 'premium' 
WHERE email IN ('rojkarcom@gmail.com', 'wlat.ibrahim@gmail.com');

-- Re-activate dynamic user_permissions of is_admin accounts
INSERT INTO public.user_permissions (user_id, allowed_languages, allowed_grades, subject_access, is_premium)
SELECT id, ARRAY['en', 'ar', 'ku_sorani', 'ku_badini'], ARRAY[12], '{}'::jsonb, TRUE
FROM public.profiles 
WHERE is_admin = TRUE
ON CONFLICT (user_id) DO UPDATE 
SET is_premium = TRUE, 
    allowed_languages = ARRAY['en', 'ar', 'ku_sorani', 'ku_badini'], 
    allowed_grades = ARRAY[12];
