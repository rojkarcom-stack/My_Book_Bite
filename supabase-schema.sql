-- Supabase Schema for Quiz App Migration

-- 1. Profiles (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Permissions
CREATE TABLE IF NOT EXISTS user_permissions (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  allowed_languages TEXT[] DEFAULT '{}',
  allowed_grades INT[] DEFAULT '{}',
  subject_access JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  grade INT NOT NULL,
  branch TEXT CHECK (branch IN ('scientific', 'literary', null)),
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Chapters
CREATE TABLE IF NOT EXISTS chapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Subchapters
CREATE TABLE IF NOT EXISTS subchapters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Questions
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  options TEXT[] NOT NULL,
  correct_answer_index INT NOT NULL,
  explanation TEXT,
  language TEXT, -- Changed to nullable for easier moves/upserts
  grade INT,    -- Changed to nullable
  branch TEXT,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  subchapter_id UUID REFERENCES subchapters(id) ON DELETE CASCADE,
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add is_admin to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- 1. Create a helper function to check admin status (breaks recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
DECLARE
  _is_admin BOOLEAN;
BEGIN
  SELECT is_admin INTO _is_admin FROM public.profiles WHERE id = auth.uid();
  RETURN COALESCE(_is_admin, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Update admin status for the primary user
UPDATE public.profiles SET is_admin = TRUE WHERE email = 'rojkarcom@gmail.com';
UPDATE public.profiles SET is_admin = TRUE WHERE id IN (SELECT id FROM auth.users WHERE email = 'rojkarcom@gmail.com');

-- 3. Safe Policy Updates (Drops old ones first)
DO $$ 
BEGIN
    -- profiles
    DROP POLICY IF EXISTS "Admins can manage profiles" ON public.profiles;
    CREATE POLICY "Admins can manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- user_permissions
    DROP POLICY IF EXISTS "Admins can manage user_permissions" ON public.user_permissions;
    CREATE POLICY "Admins can manage user_permissions" ON public.user_permissions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- subjects
    DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
    CREATE POLICY "Admins can manage subjects" ON public.subjects FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- chapters
    DROP POLICY IF EXISTS "Admins can manage chapters" ON public.chapters;
    CREATE POLICY "Admins can manage chapters" ON public.chapters FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- subchapters
    DROP POLICY IF EXISTS "Admins can manage subchapters" ON public.subchapters;
    CREATE POLICY "Admins can manage subchapters" ON public.subchapters FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- questions
    DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
    CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- quiz_attempts
    DROP POLICY IF EXISTS "Admins can manage quiz_attempts" ON public.quiz_attempts;
    CREATE POLICY "Admins can manage quiz_attempts" ON public.quiz_attempts FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- study_guides
    DROP POLICY IF EXISTS "Admins can manage study_guides" ON public.study_guides;
    CREATE POLICY "Admins can manage study_guides" ON public.study_guides FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- study_guide_images
    DROP POLICY IF EXISTS "Admins can manage study_guide_images" ON public.study_guide_images;
    CREATE POLICY "Admins can manage study_guide_images" ON public.study_guide_images FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
    
    -- user_achievements
    DROP POLICY IF EXISTS "Admins can manage user_achievements" ON public.user_achievements;
    CREATE POLICY "Admins can manage user_achievements" ON public.user_achievements FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
END $$;

-- 7. Quiz Attempts
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  chapter_id UUID REFERENCES chapters(id) ON DELETE SET NULL,
  subchapter_id UUID REFERENCES subchapters(id) ON DELETE SET NULL,
  grade INT NOT NULL,
  branch TEXT,
  language TEXT NOT NULL,
  score INT NOT NULL,
  total_questions INT NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Study Guides
CREATE TABLE IF NOT EXISTS study_guides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT,
  source_text TEXT,
  subchapter_id UUID REFERENCES subchapters(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  animation_html TEXT,
  page_images JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Study Guide Images
CREATE TABLE IF NOT EXISTS study_guide_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id UUID REFERENCES study_guides(id) ON DELETE CASCADE,
  base64 TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. User Achievements
CREATE TABLE IF NOT EXISTS user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Basic Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE subchapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_guide_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public subjects are readable by everyone" ON subjects FOR SELECT USING (true);
CREATE POLICY "Public chapters are readable by everyone" ON chapters FOR SELECT USING (true);
CREATE POLICY "Public subchapters are readable by everyone" ON subchapters FOR SELECT USING (true);
CREATE POLICY "Public questions are readable by everyone" ON questions FOR SELECT USING (true);
CREATE POLICY "Public study guides are readable by everyone" ON study_guides FOR SELECT USING (true);

CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can view their own permissions" ON user_permissions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can view their own quiz attempts" ON quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own quiz attempts" ON quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view their own achievements" ON user_achievements FOR SELECT USING (auth.uid() = user_id);

-- Trigger for profile creation on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  
  INSERT INTO public.user_permissions (user_id, allowed_languages, allowed_grades)
  VALUES (new.id, ARRAY['ar'], ARRAY[12]); -- Default permissions
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
