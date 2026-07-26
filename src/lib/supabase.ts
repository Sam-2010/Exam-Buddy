import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder-url-for-build.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key-for-build';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    'Supabase environment variables are missing! Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export type DatabaseProfile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  target_role: string;
  username?: string | null;
  password?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type DatabaseTopicScore = {
  id?: string;
  user_id: string;
  domain: string;
  topic: string;
  current_level: number;
  total_questions_answered: number;
  average_score: number;
  highest_score: number;
  last_practiced_at?: string;
};

export type DatabaseSession = {
  id?: string;
  user_id: string;
  domain: string;
  topic_or_role: string;
  mode: 'STUDY' | 'MOCK_INTERVIEW' | 'AI_INTERVIEW';
  total_questions: number;
  overall_session_score: number;
  status: 'IN_PROGRESS' | 'COMPLETED';
  created_at?: string;
  completed_at?: string | null;
  company_type?: string;
  years_of_experience?: number;
  hiring_verdict?: string;
  executive_summary?: string;
  overall_strengths?: string[];
  overall_gaps?: string[];
  proctoring_warnings_count?: number;
  proctoring_log?: { timestamp: string; type: string; details?: string }[];
};

export type DatabaseEvaluation = {
  id?: string;
  session_id: string;
  user_id: string;
  topic: string;
  question_text: string;
  expected_concepts: string[] | null;
  user_answer_text: string;
  is_voice_input: boolean;
  score: number;
  strengths: string[] | null;
  gaps: string[] | null;
  difficulty_level: number;
  created_at?: string;
  extracted_entities?: {
    technologies?: string[];
    frameworks?: string[];
    architecturalChoices?: string[];
    projectDetails?: string[];
  } | null;
  proctoring_flags?: { type: string; details?: string }[] | null;
};

export type DatabaseStudyResource = {
  id?: string;
  title: string;
  resource_url: string;
  topic: string;
  description: string | null;
  created_at?: string;
};
