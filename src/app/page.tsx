'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Brain, Mic, MicOff, Send, Sparkles, Trophy, TrendingUp, 
  Play, BookOpen, Award, ArrowRight, Compass, Activity, 
  ChevronRight, LogOut, CheckCircle, AlertTriangle, Volume2, VolumeX,
  Timer, Clock, RefreshCw, BarChart2
} from 'lucide-react';
import { EXAMS_HIERARCHY, ExamCategory, ExamDiscipline, ExamSubject, getExamCategoriesForRole } from '@/lib/exams-data';
import SkillRadarChart from '@/app/components/SkillRadarChart';
import { VoiceCoach } from '@/lib/tts-utils';

interface TopicScore {
  domain: string;
  topic: string;
  current_level: number;
  total_questions_answered: number;
  average_score: number;
  highest_score: number;
  last_practiced_at?: string;
}

interface StudyResource {
  id?: string;
  title: string;
  resource_url: string;
  topic: string;
  description?: string;
}

interface EvaluationResult {
  score: number;
  expectedConcepts: string[];
  strengths: string[];
  gaps: string[];
  detailedFeedback: string;
}

export default function Home() {
  // App-level State
  const [profile, setProfile] = useState<{ id: string; full_name: string; target_role: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'session' | 'progress'>('dashboard');
  const [dbConfigured] = useState(() => {
    if (typeof window === 'undefined') return true;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-supabase")) {
      return false;
    }
    return true;
  });
  const [topicScores, setTopicScores] = useState<TopicScore[]>([]);
  const [globalStats, setGlobalStats] = useState({ totalQuestions: 0, avgScore: 0 });

  const router = useRouter();
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Exam & Syllabus Cascade Selection State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(EXAMS_HIERARCHY[0].id);
  const [selectedDisciplineId, setSelectedDisciplineId] = useState<string>(EXAMS_HIERARCHY[0].disciplines[0].id);
  const [selectedSubjectName, setSelectedSubjectName] = useState<string>(EXAMS_HIERARCHY[0].disciplines[0].subjects[0].name);
  const [selectedChapterName, setSelectedChapterName] = useState<string>(EXAMS_HIERARCHY[0].disciplines[0].subjects[0].chapters[0]);

  const [customTopic, setCustomTopic] = useState('');
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [sessionMode, setSessionMode] = useState<'STUDY' | 'MOCK_INTERVIEW'>('STUDY');

  // Option 1: AI Voice Coach State
  const [autoVoiceCoach, setAutoVoiceCoach] = useState<boolean>(true);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);

  // Option 4: Real-time Timer & Time Tracking State
  const [timerLimitSeconds, setTimerLimitSeconds] = useState<number>(120); // Default 2 minutes
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState<number>(0);
  const [isTimerActive, setIsTimerActive] = useState<boolean>(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Active Session State
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [questionQueue, setQuestionQueue] = useState<string[]>([]);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [isPrefetching, setIsPrefetching] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [currentLevel, setCurrentLevel] = useState(1);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [levelChangeBadge, setLevelChangeBadge] = useState<{ text: string; type: 'up' | 'down' | 'none' } | null>(null);
  const [sessionQuestionsCount, setSessionQuestionsCount] = useState(0);
  const [sessionScoresSum, setSessionScoresSum] = useState(0);
  
  // Suggested Resources state
  const [suggestedResources, setSuggestedResources] = useState<StudyResource[]>([]);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionActiveRef = useRef<boolean>(false);

  // Exam categories filtered by the logged-in user's target role
  const filteredCategories = profile ? getExamCategoriesForRole(profile.target_role) : EXAMS_HIERARCHY;

  // Current cascade helpers
  const currentCategory = filteredCategories.find(c => c.id === selectedCategoryId) || filteredCategories[0] || EXAMS_HIERARCHY[0];
  const currentDiscipline = currentCategory.disciplines.find(d => d.id === selectedDisciplineId) || currentCategory.disciplines[0];
  const currentSubject = currentDiscipline.subjects.find(s => s.name === selectedSubjectName) || currentDiscipline.subjects[0];

  // Sync cascade when profile target_role loads or changes
  useEffect(() => {
    if (!profile) return;
    const cats = getExamCategoriesForRole(profile.target_role);
    if (cats.length > 0) {
      const firstCat = cats[0];
      setSelectedCategoryId(firstCat.id);
      const firstDisc = firstCat.disciplines[0];
      if (firstDisc) {
        setSelectedDisciplineId(firstDisc.id);
        const firstSubj = firstDisc.subjects[0];
        if (firstSubj) {
          setSelectedSubjectName(firstSubj.name);
          if (firstSubj.chapters[0]) setSelectedChapterName(firstSubj.chapters[0]);
        }
      }
    }
  }, [profile?.target_role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync lower dropdown options when category changes
  useEffect(() => {
    const disc = currentCategory?.disciplines[0];
    if (disc) {
      setSelectedDisciplineId(disc.id);
      const subj = disc.subjects[0];
      if (subj) {
        setSelectedSubjectName(subj.name);
        if (subj.chapters[0]) setSelectedChapterName(subj.chapters[0]);
      }
    }
  }, [selectedCategoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const subj = currentDiscipline.subjects[0];
    if (subj) {
      setSelectedSubjectName(subj.name);
      if (subj.chapters[0]) {
        setSelectedChapterName(subj.chapters[0]);
      }
    }
  }, [selectedDisciplineId]);

  useEffect(() => {
    if (currentSubject && currentSubject.chapters[0]) {
      setSelectedChapterName(currentSubject.chapters[0]);
    }
  }, [selectedSubjectName]);

  // Speech Recognition Initialization
  useEffect(() => {
    const savedProfile = localStorage.getItem('exam_buddy_profile');
    if (!savedProfile) {
      router.push('/login');
      return;
    }

    setProfile(JSON.parse(savedProfile));
    setIsCheckingAuth(false);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
      rec.maxAlternatives = 1;

      rec.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            setUserAnswer(prev => prev + (prev ? ' ' : '') + transcript);
          } else {
            interimText += transcript;
          }
        }
        setInterimTranscript(interimText);
      };

      rec.onerror = (e: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
        // 'aborted' fires when we call .stop() manually — that is expected, not an error
        if (e.error === 'aborted' || e.error === 'no-speech') return;
        console.error('Speech recognition error:', e.error);
        recognitionActiveRef.current = false;
        setIsRecording(false);
      };

      rec.onend = () => {
        // Only treat as stopped if we didn't trigger it ourselves
        if (!recognitionActiveRef.current) return;
        recognitionActiveRef.current = false;
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [router]);

  // Load user performance profile and scores
  useEffect(() => {
    if (profile && dbConfigured) {
      loadUserScores();
    }
  }, [profile, dbConfigured]);

  // Timer logic for active question
  useEffect(() => {
    if (activeTab === 'session' && questionQueue[activeQuestionIndex] && !evaluationResult && !isEvaluating) {
      setIsTimerActive(true);
      setTimeSpentSeconds(0);
      if (timerLimitSeconds > 0) {
        setTimeLeft(timerLimitSeconds);
      }

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

      timerIntervalRef.current = setInterval(() => {
        setTimeSpentSeconds(prev => prev + 1);
        if (timerLimitSeconds > 0) {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timerIntervalRef.current as NodeJS.Timeout);
              setIsTimerActive(false);
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setIsTimerActive(false);
    }

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [activeTab, activeQuestionIndex, questionQueue, evaluationResult, isEvaluating, timerLimitSeconds]);

  // Handle Voice Coach Auto-speak on new question
  useEffect(() => {
    if (activeTab === 'session' && autoVoiceCoach && questionQueue[activeQuestionIndex] && !evaluationResult && !isEvaluating) {
      handleSpeakQuestion();
    }
  }, [activeQuestionIndex, questionQueue, activeTab, autoVoiceCoach]);

  const loadUserScores = async () => {
    if (!profile) return;
    try {
      const { data, error } = await supabase
        .from('user_topic_scores')
        .select('*')
        .eq('user_id', profile.id);

      if (error) throw error;
      if (data) {
        setTopicScores(data);
        const totalQ = data.reduce((acc, curr) => acc + (curr.total_questions_answered || 0), 0);
        const avgS = data.length > 0
          ? data.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / data.length
          : 0;
        setGlobalStats({ totalQuestions: totalQ, avgScore: Math.round(avgS) });
      }
    } catch (err) {
      console.error('Error fetching scores:', err);
    }
  };

  const handleToggleRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isRecording) {
      // Signal that we are intentionally stopping (suppresses onend error state)
      recognitionActiveRef.current = false;
      recognition.stop();
      setIsRecording(false);
    } else {
      setUserAnswer('');
      setInterimTranscript('');
      recognitionActiveRef.current = true;
      setIsRecording(true);
      try {
        recognition.start();
      } catch (e) {
        // Already started in some browsers — safe to ignore
        console.warn('Recognition start error (may already be running):', e);
      }
    }
  };

  // Start Session handler
  const handleStartSession = async () => {
    if (!profile) return;

    VoiceCoach.stop();

    const topicName = isCustomTopic ? customTopic.trim() : `${selectedSubjectName}: ${selectedChapterName}`;
    if (!topicName) {
      alert("Please specify a topic or chapter");
      return;
    }

    const existingScore = topicScores.find(item => item.topic.toLowerCase() === topicName.toLowerCase());
    const startingLevel = existingScore ? existingScore.current_level : 1;

    setCurrentLevel(startingLevel);
    setQuestionQueue([]);
    setActiveQuestionIndex(0);
    setUserAnswer('');
    setEvaluationResult(null);
    setLevelChangeBadge(null);
    setActiveTab('session');
    setSessionQuestionsCount(0);
    setSessionScoresSum(0);

    fetchSuggestedResources(selectedSubjectName);

    let sessId = null;
    if (dbConfigured) {
      try {
        const { data: sessData, error: sessErr } = await supabase
          .from('sessions')
          .insert({
            user_id: profile.id,
            domain: currentDiscipline.name,
            topic_or_role: topicName,
            mode: sessionMode,
            status: 'IN_PROGRESS'
          })
          .select()
          .single();

        if (sessErr) throw sessErr;
        sessId = sessData.id;
        setCurrentSessionId(sessId);
      } catch (err) {
        console.error('Error creating session:', err);
      }
    }

    loadInitialQuestions(topicName, startingLevel);
  };

  const fetchSuggestedResources = async (subject: string) => {
    if (dbConfigured) {
      try {
        const { data, error } = await supabase
          .from('study_resources')
          .select('*')
          .ilike('topic', `%${subject}%`)
          .limit(4);
        if (error) throw error;
        setSuggestedResources(data || []);
      } catch (err) {
        console.error("Resource fetch failed:", err);
      }
    }
  };

  const fetchQuestions = async (topic: string, level: number, count: number): Promise<string[]> => {
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: currentDiscipline.name,
          topic: topic,
          mode: sessionMode,
          currentLevel: level,
          targetRole: currentDiscipline.name,
          count: count
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          return data.questions;
        }
      }
      throw new Error("Invalid response");
    } catch (err) {
      console.error("Error fetching questions:", err);
      const placeholders = [];
      for (let i = 0; i < count; i++) {
        placeholders.push(`Explain the core principles of ${topic} (Level ${level}, Part ${i + 1}). What are key real-world edge cases?`);
      }
      return placeholders;
    }
  };

  const loadInitialQuestions = async (topic: string, level: number) => {
    const questions = await fetchQuestions(topic, level, 2);
    setQuestionQueue(questions);
  };

  const handleSpeakQuestion = () => {
    const currentQ = questionQueue[activeQuestionIndex];
    if (currentQ) {
      setIsSpeaking(true);
      VoiceCoach.speak(currentQ, () => setIsSpeaking(false), () => setIsSpeaking(false));
    }
  };

  const handleSpeakFeedback = () => {
    if (evaluationResult?.detailedFeedback) {
      setIsSpeaking(true);
      VoiceCoach.speak(evaluationResult.detailedFeedback, () => setIsSpeaking(false), () => setIsSpeaking(false));
    }
  };

  const handleStopSpeaking = () => {
    VoiceCoach.stop();
    setIsSpeaking(false);
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert("Please provide an answer (typed or voice recorded) before submitting.");
      return;
    }

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    setIsTimerActive(false);

    VoiceCoach.stop();
    setIsSpeaking(false);
    setIsEvaluating(true);

    const currentQuestion = questionQueue[activeQuestionIndex];
    const topicName = isCustomTopic ? customTopic.trim() : `${selectedSubjectName}: ${selectedChapterName}`;

    try {
      const response = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: topicName,
          question: currentQuestion,
          userAnswer: userAnswer,
          currentLevel: currentLevel,
          mode: sessionMode
        })
      });

      if (!response.ok) throw new Error("Evaluation request failed");

      const result: EvaluationResult = await response.json();
      setEvaluationResult(result);
      setIsEvaluating(false);

      // Speak feedback automatically if autoVoiceCoach enabled
      if (autoVoiceCoach && result.detailedFeedback) {
        setIsSpeaking(true);
        VoiceCoach.speak(result.detailedFeedback, () => setIsSpeaking(false), () => setIsSpeaking(false));
      }

      setSessionQuestionsCount(prev => prev + 1);
      setSessionScoresSum(prev => prev + result.score);

      // Adaptive difficulty logic
      let newLevel = currentLevel;
      let badge: { text: string; type: 'up' | 'down' | 'none' } = { text: 'Level Retained', type: 'none' };

      if (result.score >= 80) {
        if (currentLevel < 10) {
          newLevel = currentLevel + 1;
          badge = { text: `Level Up! Promoted to Level ${newLevel}`, type: 'up' };
        } else {
          badge = { text: 'Max Level Mastered! (Level 10)', type: 'up' };
        }
      } else if (result.score < 50) {
        if (currentLevel > 1) {
          newLevel = currentLevel - 1;
          badge = { text: `Level Adjusted to ${newLevel} to solidify fundamentals`, type: 'down' };
        } else {
          badge = { text: 'Retaining Level 1 (Focus on basics)', type: 'none' };
        }
      }

      setCurrentLevel(newLevel);
      setLevelChangeBadge(badge);

      if (dbConfigured && profile) {
        saveEvaluationToDb(topicName, currentQuestion, userAnswer, result, newLevel);
      }

      // Prefetch next question
      prefetchNextQuestion(topicName, newLevel);

    } catch (err) {
      console.error("Evaluation error:", err);
      setIsEvaluating(false);
      alert("Error evaluating response. Please try again.");
    }
  };

  const prefetchNextQuestion = async (topic: string, level: number) => {
    setIsPrefetching(true);
    const newQuestions = await fetchQuestions(topic, level, 1);
    setQuestionQueue(prev => [...prev, ...newQuestions]);
    setIsPrefetching(false);
  };

  const saveEvaluationToDb = async (topic: string, question: string, answer: string, evalRes: EvaluationResult, nextLevel: number) => {
    if (!profile) return;
    try {
      await supabase.from('evaluations').insert({
        session_id: currentSessionId,
        user_id: profile.id,
        topic: topic,
        question_text: question,
        expected_concepts: evalRes.expectedConcepts,
        user_answer_text: answer,
        is_voice_input: isRecording,
        score: evalRes.score,
        strengths: evalRes.strengths,
        gaps: evalRes.gaps,
        difficulty_level: currentLevel
      });

      const existingTopicData = topicScores.find(t => t.topic.toLowerCase() === topic.toLowerCase());
      const totalAns = (existingTopicData?.total_questions_answered || 0) + 1;
      const prevAvg = existingTopicData?.average_score || 0;
      const newAvg = parseFloat((((prevAvg * (totalAns - 1)) + evalRes.score) / totalAns).toFixed(2));
      const highestS = Math.max(existingTopicData?.highest_score || 0, evalRes.score);

      await supabase.from('user_topic_scores').upsert({
        user_id: profile.id,
        domain: currentDiscipline.name,
        topic: topic,
        current_level: nextLevel,
        total_questions_answered: totalAns,
        average_score: newAvg,
        highest_score: highestS,
        last_practiced_at: new Date().toISOString()
      }, { onConflict: 'user_id,domain,topic' });

      loadUserScores();
    } catch (err) {
      console.error('Error updating DB scores:', err);
    }
  };

  const handleNextQuestion = () => {
    VoiceCoach.stop();
    setIsSpeaking(false);
    setUserAnswer('');
    setEvaluationResult(null);
    setLevelChangeBadge(null);
    setActiveQuestionIndex(prev => prev + 1);
  };

  const handleFinishSession = async () => {
    VoiceCoach.stop();
    setIsSpeaking(false);

    if (currentSessionId && dbConfigured) {
      try {
        const finalAvg = sessionQuestionsCount > 0 ? (sessionScoresSum / sessionQuestionsCount) : 0;
        await supabase
          .from('sessions')
          .update({
            total_questions: sessionQuestionsCount,
            overall_session_score: parseFloat(finalAvg.toFixed(2)),
            status: 'COMPLETED',
            completed_at: new Date().toISOString()
          })
          .eq('id', currentSessionId);
      } catch (err) {
        console.error('Error updating session:', err);
      }
    }
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    VoiceCoach.stop();
    localStorage.removeItem('exam_buddy_profile');
    router.push('/login');
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  if (isCheckingAuth) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'var(--background)', color: 'var(--foreground)' }}>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', border: '3px solid rgba(99, 102, 241, 0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'rotate 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-muted)' }}>Loading Exam Buddy...</p>
        </div>
      </div>
    );
  }

  // Calculate timer stroke dash offset for SVG circle timer
  const timerRadius = 18;
  const timerCircumference = 2 * Math.PI * timerRadius;
  const timerStrokeDashoffset = timerLimitSeconds > 0
    ? timerCircumference - (timeLeft / timerLimitSeconds) * timerCircumference
    : 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--background)', color: 'var(--foreground)', display: 'flex', flexDirection: 'column' }}>
      
      {/* HEADER / NAVIGATION BAR */}
      <header style={{
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        background: 'rgba(7, 8, 14, 0.8)',
        backdropFilter: 'blur(16px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '0.85rem 2rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
            <div style={{
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              padding: '0.5rem',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 0 15px rgba(99, 102, 241, 0.4)'
            }}>
              <Brain size={22} color="white" />
            </div>
            <div>
              <span style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em' }}>
                Exam<span style={{ color: 'var(--primary)' }}>Buddy</span>
              </span>
              <span style={{ fontSize: '0.65rem', display: 'block', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Adaptive AI Exam & Interview Coach
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* Auto Voice Coach Toggle */}
            <button
              onClick={() => {
                if (autoVoiceCoach) VoiceCoach.stop();
                setAutoVoiceCoach(!autoVoiceCoach);
              }}
              style={{
                background: autoVoiceCoach ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${autoVoiceCoach ? 'var(--primary)' : 'rgba(255, 255, 255, 0.1)'}`,
                color: autoVoiceCoach ? '#818cf8' : 'var(--text-muted)',
                padding: '0.4rem 0.85rem',
                fontSize: '0.8rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
              title="Toggle automatic speech synthesis reading out questions and evaluation feedback"
            >
              {autoVoiceCoach ? <Volume2 size={16} color="var(--primary)" /> : <VolumeX size={16} />}
              <span>Voice Coach: {autoVoiceCoach ? 'ON' : 'OFF'}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.06)', padding: '0.4rem 0.85rem', borderRadius: '20px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(to right, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>
                {profile?.full_name?.charAt(0) || 'U'}
              </div>
              <div style={{ fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 600 }}>{profile?.full_name}</span>
              </div>
            </div>

            <button 
              className="button-secondary" 
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
              onClick={handleLogout}
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>

        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ flex: 1, maxWidth: '1400px', width: '100%', margin: '0 auto', padding: '2rem' }}>
        
        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* HERO WELCOME BANNER */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(139, 92, 246, 0.05))',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '20px',
              padding: '2.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{ maxWidth: '650px', zIndex: 1 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '0.3rem 0.85rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--primary)', marginBottom: '1rem' }}>
                  <Sparkles size={14} /> Multi-Stage Exam & Interview Preparation
                </div>
                <h1 style={{ fontSize: '2.2rem', fontWeight: 800, lineHeight: '1.2', marginBottom: '0.75rem', letterSpacing: '-0.03em' }}>
                  Master Your <span className="gradient-text">Exams & Technical Interviews</span>
                </h1>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
                  AI-driven question generation, voice coach evaluations, timed battle modes, and level 1–10 adaptive difficulty tracking across JEE, MHT CET, GATE, CAT, and Tech Software roles.
                </p>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button onClick={() => {
                    const el = document.getElementById('coach-configurator');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}>
                    Start Practice Session <Play size={16} />
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                <div className="card" style={{ padding: '1.25rem 1.5rem', minWidth: '150px', textAlign: 'center' }}>
                  <Trophy size={28} color="var(--primary)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{globalStats.totalQuestions}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Questions Solved</div>
                </div>
                <div className="card" style={{ padding: '1.25rem 1.5rem', minWidth: '150px', textAlign: 'center' }}>
                  <Award size={28} color="var(--secondary)" style={{ marginBottom: '0.5rem' }} />
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getScoreColor(globalStats.avgScore) }}>{globalStats.avgScore}%</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Average Mastery</div>
                </div>
              </div>
            </div>

            {/* PERFORMANCE SUMMARY & SKILL RADAR CHART */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '2rem' }} className="grid-dashboard">
              
              {/* Session Configurator card */}
              <div className="card" id="coach-configurator">
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Compass size={18} color="var(--secondary)" /> Configure Exam Coach
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Category & Exam/Discipline Dropdowns */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Exam Category / Stage</label>
                      <select value={selectedCategoryId} onChange={e => setSelectedCategoryId(e.target.value)}>
                        {filteredCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Specific Exam / Discipline</label>
                      <select value={selectedDisciplineId} onChange={e => setSelectedDisciplineId(e.target.value)}>
                        {currentCategory.disciplines.map(disc => (
                          <option key={disc.id} value={disc.id}>{disc.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Subject & Syllabus Chapter Cascading Selectors */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Subject</label>
                      <select value={selectedSubjectName} onChange={e => setSelectedSubjectName(e.target.value)}>
                        {currentDiscipline.subjects.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Syllabus Chapter</label>
                        <span 
                          style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }} 
                          onClick={() => setIsCustomTopic(!isCustomTopic)}
                        >
                          {isCustomTopic ? "Select Syllabus" : "Enter Custom"}
                        </span>
                      </div>

                      {isCustomTopic ? (
                        <input 
                          type="text" 
                          placeholder="e.g. Distributed Caching & Redis" 
                          value={customTopic}
                          onChange={e => setCustomTopic(e.target.value)}
                        />
                      ) : (
                        <select value={selectedChapterName} onChange={e => setSelectedChapterName(e.target.value)}>
                          {currentSubject?.chapters.map(ch => (
                            <option key={ch} value={ch}>{ch}</option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Practice Mode & Option 4 Timer Settings */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Practice Mode</label>
                      <select value={sessionMode} onChange={e => setSessionMode(e.target.value as 'STUDY' | 'MOCK_INTERVIEW')}>
                        <option value="STUDY">Study Mode (Conceptual)</option>
                        <option value="MOCK_INTERVIEW">Mock Interview (Strict)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Timer size={14} color="var(--primary)" /> Option 4: Timer & Pressure
                      </label>
                      <select value={timerLimitSeconds} onChange={e => setTimerLimitSeconds(Number(e.target.value))}>
                        <option value={0}>Untimed / Relaxed</option>
                        <option value={60}>60 Seconds (Sprint)</option>
                        <option value={120}>120 Seconds (Standard 2m)</option>
                        <option value={180}>180 Seconds (Extended 3m)</option>
                      </select>
                    </div>
                  </div>

                  {/* Launch button */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                    <button style={{ width: '100%', padding: '0.85rem' }} onClick={handleStartSession}>
                      Launch AI Exam Coach <Play size={16} />
                    </button>
                  </div>

                </div>
              </div>

              {/* Option 5: Skill Radar Chart Widget */}
              <SkillRadarChart scores={topicScores} />

            </div>

            {/* ACTIVE SUBJECT SCORES MATRIX */}
            <div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 600 }}>Active Subject Mastery Scores</h3>
              
              {topicScores.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                  <BookOpen size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>No practice history found. Configure an exam subject above to launch your first AI coach session!</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
                  {topicScores.map((score, i) => (
                    <div className="card" key={i} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                          <span className="badge badge-primary" style={{ fontSize: '0.65rem' }}>{score.domain}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Level {score.current_level || 1}/10
                          </span>
                        </div>
                        
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '0.75rem' }}>{score.topic}</h4>
                        
                        <div style={{ background: 'rgba(255, 255, 255, 0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden', marginBottom: '1.25rem' }}>
                          <div style={{ 
                            width: `${(score.current_level || 1) * 10}%`, 
                            height: '100%', 
                            background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                            borderRadius: '3px'
                          }}></div>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.75rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', textAlign: 'center', fontSize: '0.8rem' }}>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.15rem' }}>Attempts</div>
                          <div style={{ fontWeight: 600 }}>{score.total_questions_answered}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.15rem' }}>Avg Score</div>
                          <div style={{ fontWeight: 600, color: getScoreColor(score.average_score) }}>{score.average_score}%</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '0.15rem' }}>Highest</div>
                          <div style={{ fontWeight: 600, color: getScoreColor(score.highest_score) }}>{score.highest_score}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ACTIVE COACHING SESSION TAB */}
        {activeTab === 'session' && (
          <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '2rem' }} className="grid-session">
            
            {/* Left Panel: Session Metadata & Option 4 Timer Widget */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>{sessionMode}</span>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                    {isCustomTopic ? customTopic : `${selectedSubjectName}: ${selectedChapterName}`}
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{currentDiscipline.name}</div>
                </div>

                {/* Option 4: Real-time Timer & Time Tracking Display */}
                {timerLimitSeconds > 0 && !evaluationResult && !isEvaluating && (
                  <div style={{
                    background: timeLeft <= 15 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.08)',
                    border: `1px solid ${timeLeft <= 15 ? 'var(--danger)' : 'rgba(99, 102, 241, 0.25)'}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* SVG Circle Timer Ring */}
                      <svg width="44" height="44" viewBox="0 0 44 44">
                        <circle
                          cx="22" cy="22" r={timerRadius}
                          fill="none" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="3.5"
                        />
                        <circle
                          cx="22" cy="22" r={timerRadius}
                          fill="none"
                          stroke={timeLeft <= 15 ? 'var(--danger)' : 'var(--primary)'}
                          strokeWidth="3.5"
                          strokeDasharray={timerCircumference}
                          strokeDashoffset={timerStrokeDashoffset}
                          strokeLinecap="round"
                          transform="rotate(-90 22 22)"
                          style={{ transition: 'stroke-dashoffset 1s linear' }}
                        />
                      </svg>
                      <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Time Remaining
                        </div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: timeLeft <= 15 ? 'var(--danger)' : 'var(--foreground)' }}>
                          {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Spent: {timeSpentSeconds}s
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Adaptive Level</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>Level {currentLevel}/10</span>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.05)', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${currentLevel * 10}%`, 
                      height: '100%', 
                      background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                      transition: 'width 0.4s ease'
                    }}></div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    <span>Basics</span>
                    <span>Intermediate</span>
                    <span>Advanced</span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255,255,255,0.02)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Session Progress:</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{sessionQuestionsCount} Questions Answered</div>
                  {sessionQuestionsCount > 0 && (
                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                      Session Average: <span style={{ color: getScoreColor(sessionScoresSum / sessionQuestionsCount) }}>
                        {parseFloat((sessionScoresSum / sessionQuestionsCount).toFixed(1))}%
                      </span>
                    </div>
                  )}
                </div>

                <button className="button-secondary" style={{ width: '100%', marginTop: '0.5rem' }} onClick={handleFinishSession}>
                  Finish & Exit Session
                </button>
              </div>

              {/* Suggested Resources Box */}
              {suggestedResources.length > 0 && (
                <div className="card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <BookOpen size={16} color="var(--primary)" /> Predefined Resources
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {suggestedResources.map((res, idx) => (
                      <a 
                        key={idx} 
                        href={res.resource_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(255,255,255,0.05)',
                          padding: '0.5rem 0.75rem',
                          borderRadius: '8px',
                          fontSize: '0.8rem',
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px', fontWeight: 500 }}>
                          {res.title}
                        </span>
                        <ChevronRight size={14} style={{ flexShrink: 0 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel: Working Space & Question Card */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              
              {/* Question card */}
              <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    AI Coach Prompt (Question {activeQuestionIndex + 1})
                  </span>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {/* Option 1: AI Voice Coach Audio Button */}
                    <button
                      onClick={isSpeaking ? handleStopSpeaking : handleSpeakQuestion}
                      style={{
                        background: isSpeaking ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                        border: `1px solid ${isSpeaking ? 'var(--danger)' : 'rgba(99, 102, 241, 0.3)'}`,
                        color: isSpeaking ? 'var(--danger)' : '#818cf8',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.75rem',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        cursor: 'pointer'
                      }}
                    >
                      {isSpeaking ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      {isSpeaking ? 'Stop Audio' : '🔊 Listen Question'}
                    </button>

                    {isPrefetching && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'rotate 1s linear infinite' }}></div>
                        Preloading...
                      </span>
                    )}
                  </div>
                </div>
                
                <div style={{ 
                  fontSize: '1.15rem', 
                  fontWeight: 500, 
                  lineHeight: '1.6', 
                  color: 'var(--text-bright)',
                  minHeight: '60px'
                }}>
                  {questionQueue[activeQuestionIndex] || (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                      <div style={{ width: '16px', height: '16px', border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'rotate 0.8s linear infinite' }}></div>
                      Generating your tailored question...
                    </div>
                  )}
                </div>
              </div>

              {/* Answer input area */}
              {!evaluationResult && !isEvaluating && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Your Response</span>
                    
                    <button 
                      className={isRecording ? 'button' : 'button-secondary'} 
                      style={{ 
                        padding: '0.4rem 0.85rem', 
                        fontSize: '0.8rem',
                        background: isRecording ? 'var(--danger)' : '',
                        borderColor: isRecording ? 'var(--danger)' : ''
                      }}
                      onClick={handleToggleRecording}
                    >
                      {isRecording ? <MicOff size={14} /> : <Mic size={14} />} 
                      {isRecording ? 'Stop Recording' : 'Answer with Spoken Voice'}
                    </button>
                  </div>

                  {/* Microphone waveform animation when active */}
                  {isRecording && (
                    <div style={{ 
                      background: 'rgba(244, 63, 94, 0.05)', 
                      border: '1px dashed var(--danger)', 
                      borderRadius: '12px', 
                      padding: '1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem'
                    }}>
                      <div style={{ display: 'flex', gap: '4px', height: '30px', alignItems: 'center' }}>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map(bar => (
                          <div key={bar} style={{ 
                            width: '3px', 
                            height: '100%', 
                            background: 'var(--danger)', 
                            borderRadius: '2px',
                            animation: `wave 0.8s ease-in-out infinite`,
                            animationDelay: `${bar * 0.05}s`
                          }}></div>
                        ))}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 500 }}>
                        Listening... speak clearly.
                      </div>
                      {interimTranscript && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontStyle: 'italic', textAlign: 'center', maxWidth: '80%' }}>
                          &ldquo;{interimTranscript}&rdquo;
                        </div>
                      )}
                    </div>
                  )}

                  <textarea
                    placeholder="Type your explanation here. Be detailed to score well. You can explain your reasoning, structure, or write code..."
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    rows={6}
                    style={{ resize: 'vertical', lineHeight: '1.5' }}
                    disabled={isRecording}
                  />

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Time elapsed: {timeSpentSeconds} seconds
                    </div>
                    <button style={{ padding: '0.85rem 2rem' }} onClick={handleSubmitAnswer}>
                      Submit Response <Send size={16} />
                    </button>
                  </div>
                </div>
              )}

              {/* Evaluation loading state */}
              {isEvaluating && (
                <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    border: '4px solid rgba(99, 102, 241, 0.1)',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'rotate 1s linear infinite'
                  }}></div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', fontWeight: 600 }}>Evaluating Answer</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>
                      Gemini is grading your response against accuracy, completeness, and communication rubrics...
                    </p>
                  </div>
                </div>
              )}

              {/* Assessment Result Panel */}
              {evaluationResult && (
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', animation: 'fadeIn 0.5s ease-out' }}>
                  
                  {/* Score Summary and Badge updates */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.25rem' }}>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                      <div style={{
                        position: 'relative',
                        width: '76px',
                        height: '76px',
                        borderRadius: '50%',
                        border: `5px solid rgba(255,255,255,0.04)`,
                        borderTopColor: getScoreColor(evaluationResult.score),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1.3rem',
                        color: getScoreColor(evaluationResult.score)
                      }}>
                        {evaluationResult.score}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Evaluation Score</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                          {evaluationResult.score >= 80 ? 'Excellent Answer!' : evaluationResult.score >= 50 ? 'Solid Attempt' : 'Needs Focus'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      {/* Listen Feedback Button */}
                      <button
                        onClick={isSpeaking ? handleStopSpeaking : handleSpeakFeedback}
                        style={{
                          background: isSpeaking ? 'rgba(244, 63, 94, 0.15)' : 'rgba(99, 102, 241, 0.1)',
                          border: `1px solid ${isSpeaking ? 'var(--danger)' : 'rgba(99, 102, 241, 0.3)'}`,
                          color: isSpeaking ? 'var(--danger)' : '#818cf8',
                          padding: '0.5rem 1rem',
                          fontSize: '0.8rem',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          cursor: 'pointer'
                        }}
                      >
                        {isSpeaking ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        {isSpeaking ? 'Stop Feedback' : '🔊 Listen Feedback'}
                      </button>

                      {levelChangeBadge && (
                        <div className={`badge ${
                          levelChangeBadge.type === 'up' ? 'badge-success' : levelChangeBadge.type === 'down' ? 'badge-danger' : 'badge-warning'
                        }`} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                          {levelChangeBadge.text}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* strengths, gaps, expected concepts */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '12px', padding: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CheckCircle size={14} /> Key Strengths
                      </h4>
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {evaluationResult.strengths?.map((str: string, i: number) => (
                          <li key={i}>{str}</li>
                        ))}
                        {(!evaluationResult.strengths || evaluationResult.strengths.length === 0) && (
                          <li style={{ color: 'var(--text-muted)', listStyleType: 'none' }}>No specific strengths noted.</li>
                        )}
                      </ul>
                    </div>

                    <div style={{ background: 'rgba(244, 63, 94, 0.03)', border: '1px solid rgba(244, 63, 94, 0.1)', borderRadius: '12px', padding: '1rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fda4af', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <AlertTriangle size={14} /> Gaps & Knowledge Holes
                      </h4>
                      <ul style={{ paddingLeft: '1.1rem', fontSize: '0.85rem', lineHeight: '1.5', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {evaluationResult.gaps?.map((gap: string, i: number) => (
                          <li key={i}>{gap}</li>
                        ))}
                        {(!evaluationResult.gaps || evaluationResult.gaps.length === 0) && (
                          <li style={{ color: 'var(--text-muted)', listStyleType: 'none' }}>No key conceptual gaps identified. Great!</li>
                        )}
                      </ul>
                    </div>
                  </div>

                  {/* Expected concepts */}
                  {evaluationResult.expectedConcepts && evaluationResult.expectedConcepts.length > 0 && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1rem' }}>
                      <h4 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Expected Concepts Checked</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {evaluationResult.expectedConcepts.map((concept: string, i: number) => (
                          <span key={i} className="badge badge-primary" style={{ textTransform: 'none', fontSize: '0.75rem' }}>
                            {concept}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Detailed Feedback text */}
                  {evaluationResult.detailedFeedback && (
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '12px', padding: '1.25rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--foreground)', marginBottom: '0.5rem' }}>AI Detailed Feedback</h4>
                      <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: 'var(--text-bright)' }}>
                        {evaluationResult.detailedFeedback}
                      </p>
                    </div>
                  )}

                  {/* Next Question Navigation */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1.25rem' }}>
                    <button style={{ padding: '0.85rem 2rem' }} onClick={handleNextQuestion}>
                      Next Question <ArrowRight size={16} />
                    </button>
                  </div>

                </div>
              )}

            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', padding: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Exam Buddy &copy; {new Date().getFullYear()} &mdash; AI Adaptive Multi-Stage Exam & Interview Coaching Platform
      </footer>
    </div>
  );
}
