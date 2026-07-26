-- 1. Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY, -- Will correspond to auth.users if auth is used, or a generated UUID for simulated auth
    full_name TEXT,
    avatar_url TEXT,
    target_role TEXT DEFAULT 'Software Engineer',
    username TEXT UNIQUE,
    password TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Migration helpers if database already exists:
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password TEXT;

-- 2. Create user_topic_scores table
CREATE TABLE IF NOT EXISTS public.user_topic_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    topic TEXT NOT NULL,
    current_level INT DEFAULT 1 CHECK (current_level >= 1 AND current_level <= 10),
    total_questions_answered INT DEFAULT 0,
    average_score NUMERIC(5,2) DEFAULT 0.00,
    highest_score INT DEFAULT 0,
    last_practiced_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_domain_topic UNIQUE (user_id, domain, topic)
);

-- 3. Create sessions table
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    topic_or_role TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('STUDY', 'MOCK_INTERVIEW')),
    total_questions INT DEFAULT 0,
    overall_session_score NUMERIC(5,2) DEFAULT 0.00,
    status TEXT DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 4. Create evaluations table
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic TEXT NOT NULL,
    question_text TEXT NOT NULL,
    expected_concepts JSONB,
    user_answer_text TEXT NOT NULL,
    is_voice_input BOOLEAN DEFAULT FALSE,
    score INT CHECK (score >= 0 AND score <= 100),
    strengths JSONB,
    gaps JSONB,
    difficulty_level INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create study_resources table
CREATE TABLE IF NOT EXISTS public.study_resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    resource_url TEXT NOT NULL,
    topic TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_title_url UNIQUE (title, resource_url)
);

-- Insert some default study resources for tech topics
INSERT INTO public.study_resources (title, resource_url, topic, description) VALUES
('GeeksforGeeks - Data Structures & Algorithms', 'https://www.geeksforgeeks.org/data-structures/', 'Data Structures & Algorithms', 'Comprehensive tutorials and practice problems for DSA.'),
('LeetCode - Coding Prep', 'https://leetcode.com/', 'Data Structures & Algorithms', 'Platform to practice coding interview questions.'),
('System Design Primer', 'https://github.com/donnemartin/system-design-primer', 'System Design', 'An open-source guide to learning how to design large-scale systems.'),
('Docker Documentation', 'https://docs.docker.com/', 'Docker & Kubernetes', 'Official documentation for containerizing applications with Docker.'),
('Kubernetes Basics', 'https://kubernetes.io/docs/tutorials/kubernetes-basics/', 'Docker & Kubernetes', 'Official Kubernetes tutorial and concepts.'),
('PostgreSQL Tutorial', 'https://www.postgresqltutorial.com/', 'Database Design', 'Learn database schemas, indexing, and SQL queries with Postgres.'),
('Spring Boot Guides', 'https://spring.io/guides', 'Java & Spring Boot', 'Official guides for building Java microservices and Spring Boot APIs.'),
('Scikit-Learn Tutorials', 'https://scikit-learn.org/stable/tutorial/index.html', 'Machine Learning', 'Introduction to Machine Learning algorithms with Python.'),
('Hugging Face Course', 'https://huggingface.co/course', 'LLM & RAG Architecture', 'Deep dive into LLMs, transformers, and building AI applications.'),
('GATE CS Mock Tests', 'https://gate.iitkgp.ac.in/', 'GATE CS/IT Prep', 'Official GATE resources and previous year papers.')
ON CONFLICT (title, resource_url) DO NOTHING;

-- Disable RLS to allow client-side access without standard Supabase Auth
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_topic_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_resources DISABLE ROW LEVEL SECURITY;

-- Grant access to anonymous and authenticated users for direct client-side query access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE public.profiles TO anon, authenticated;
GRANT ALL ON TABLE public.user_topic_scores TO anon, authenticated;
GRANT ALL ON TABLE public.sessions TO anon, authenticated;
GRANT ALL ON TABLE public.evaluations TO anon, authenticated;
GRANT ALL ON TABLE public.study_resources TO anon, authenticated;

-- =========================================================================
-- MIGRATION: SUPPORT FOR AI INTERVIEW MODE
-- Run these statements in your Supabase SQL editor if database is already setup.
-- =========================================================================

ALTER TABLE public.sessions DROP CONSTRAINT IF EXISTS sessions_mode_check;
ALTER TABLE public.sessions ADD CONSTRAINT sessions_mode_check CHECK (mode IN ('STUDY', 'MOCK_INTERVIEW', 'AI_INTERVIEW'));

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS company_type TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS years_of_experience INT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS hiring_verdict TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS executive_summary TEXT;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS overall_strengths JSONB;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS overall_gaps JSONB;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS proctoring_warnings_count INT DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS proctoring_log JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS extracted_entities JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.evaluations ADD COLUMN IF NOT EXISTS proctoring_flags JSONB DEFAULT '[]'::jsonb;

