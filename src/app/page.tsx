'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Brain, Mic, MicOff, Send, Sparkles, Trophy, TrendingUp, 
  Play, BookOpen, Award, ArrowRight, Compass, Activity, 
  ChevronRight, LogOut, CheckCircle, AlertTriangle,
  ShieldAlert, Lock, Trash2, RefreshCw,
  XCircle, UserCheck
} from 'lucide-react';

// Domain & Track Schema
const DOMAINS_SCHEMA = [
  {
    name: "Tech & Software",
    roles: ["Backend Engineer", "Frontend Engineer", "Full Stack Developer", "Cloud/DevOps Engineer"],
    topics: ["Java & Spring Boot", "System Design", "Docker & Kubernetes", "Database Design", "Data Structures & Algorithms"]
  },
  {
    name: "Data & AI",
    roles: ["AI/ML Engineer", "Data Analyst", "Data Engineer"],
    topics: ["Machine Learning", "Python & SQL", "LLM & RAG Architecture", "Data Pipelines"]
  },
  {
    name: "Competitive Prep & Exams",
    roles: ["GATE CS/IT Prep", "Campus Placements"],
    topics: ["GATE Computer Science", "General Aptitude & Logic", "Operating Systems", "DBMS", "Computer Networks"]
  },
  {
    name: "Core Engineering",
    roles: ["Embedded Systems Developer", "System Administrator"],
    topics: ["Embedded C & IoT", "Linux Systems & Scripting", "Operating System Fundamentals"]
  }
];

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

  // Session Config State
  const [selectedDomain, setSelectedDomain] = useState(DOMAINS_SCHEMA[0].name);
  const [selectedTopic, setSelectedTopic] = useState(DOMAINS_SCHEMA[0].topics[0]);
  const [selectedRole, setSelectedRole] = useState(DOMAINS_SCHEMA[0].roles[0]);
  const [customTopic, setCustomTopic] = useState('');
  const [isCustomTopic, setIsCustomTopic] = useState(false);
  const [sessionMode, setSessionMode] = useState<'STUDY' | 'MOCK_INTERVIEW' | 'AI_INTERVIEW'>('STUDY');
  
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

  // AI Interview Mode state hooks
  const [showInterviewWizard, setShowInterviewWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [companyType, setCompanyType] = useState('MAANG');
  const [yearsOfExperience, setYearsOfExperience] = useState(2);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [proctoringWarnings, setProctoringWarnings] = useState(0);
  const [proctoringLog, setProctoringLog] = useState<{ timestamp: string; type: string; details?: string }[]>([]);
  const [extractedEntitiesAccumulated, setExtractedEntitiesAccumulated] = useState<{
    technologies: string[];
    frameworks: string[];
    architecturalChoices: string[];
    projectDetails: string[];
  }>({ technologies: [], frameworks: [], architecturalChoices: [], projectDetails: [] });
  const [proctoringWarningActive, setProctoringWarningActive] = useState<string | null>(null);
  
  const [isInterviewFinished, setIsInterviewFinished] = useState(false);
  const [interviewSummaryResult, setInterviewSummaryResult] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [evaluationsList, setEvaluationsList] = useState<any[]>([]); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  
  // Suggested Resources state
  const [suggestedResources, setSuggestedResources] = useState<StudyResource[]>([]);

  // Speech Recognition state
  const [isRecording, setIsRecording] = useState(false);
  const [recognition, setRecognition] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [interimTranscript, setInterimTranscript] = useState('');

  // Initialize simulated auth profile and browser check
  useEffect(() => {
    const savedProfile = localStorage.getItem('exam_buddy_profile');
    if (!savedProfile) {
      router.push('/login');
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProfile(JSON.parse(savedProfile));
    setIsCheckingAuth(false);

    // Speech recognition setup
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

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
        console.error('Speech recognition error:', e);
        setIsRecording(false);
      };

      rec.onend = () => {
        setIsRecording(false);
      };

      setRecognition(rec);
    }
  }, [router]);

  // Sync topics list when domain changes
  useEffect(() => {
    const domainData = DOMAINS_SCHEMA.find(d => d.name === selectedDomain);
    if (domainData) {
      if (!isCustomTopic) {
        setSelectedTopic(domainData.topics[0]); // eslint-disable-line react-hooks/set-state-in-effect
      }
      setSelectedRole(domainData.roles[0]);
    }
  }, [selectedDomain, isCustomTopic]);

  const calculateGlobalStats = (scores: TopicScore[]) => {
    if (scores.length === 0) return;
    const totalQ = scores.reduce((sum, item) => sum + (item.total_questions_answered || 0), 0);
    const avgSum = scores.reduce((sum, item) => sum + (item.average_score || 0), 0);
    const avg = parseFloat((avgSum / scores.length).toFixed(1));
    setGlobalStats({ totalQuestions: totalQ, avgScore: avg });
  };

  const loadLocalScores = () => {
    const localScores = localStorage.getItem(`exam_buddy_scores_${profile?.id}`);
    if (localScores) {
      const parsed = JSON.parse(localScores);
      setTopicScores(parsed);
      calculateGlobalStats(parsed);
    } else {
      // Seed default scores for a fresh profile
      const seedScores = [
        { domain: 'Tech & Software', topic: 'System Design', current_level: 2, total_questions_answered: 3, average_score: 72.0, highest_score: 84 },
        { domain: 'Tech & Software', topic: 'Database Design', current_level: 1, total_questions_answered: 1, average_score: 45.0, highest_score: 45 },
      ];
      setTopicScores(seedScores);
      calculateGlobalStats(seedScores);
      localStorage.setItem(`exam_buddy_scores_${profile?.id}`, JSON.stringify(seedScores));
    }
  };

  // Fetch topic scores helper
  const fetchTopicScores = async () => {
    if (!profile) return;
    
    if (dbConfigured) {
      try {
        const { data: scores, error } = await supabase
          .from('user_topic_scores')
          .select('*')
          .eq('user_id', profile.id)
          .order('last_practiced_at', { ascending: false });

        if (error) throw error;
        if (scores) {
          setTopicScores(scores);
          calculateGlobalStats(scores);
        }
      } catch (err) {
        console.error('Error fetching scores from Supabase:', err);
        loadLocalScores();
      }
    } else {
      loadLocalScores();
    }
  };

  // Load scores & history from DB or LocalStorage
  useEffect(() => {
    if (profile) {
      fetchTopicScores(); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => {
    localStorage.removeItem('exam_buddy_profile');
    setProfile(null);
    setActiveTab('dashboard');
    setTopicScores([]);
    setGlobalStats({ totalQuestions: 0, avgScore: 0 });
    router.push('/login');
  };

  // Toggle voice recording
  const handleToggleRecording = () => {
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please try Google Chrome or MS Edge.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setUserAnswer('');
      setInterimTranscript('');
      setIsRecording(true);
      recognition.start();
    }
  };

  // Start Session (Questions generation loop initialization)
  const handleStartSession = async () => {
    if (!profile) return;
    
    const topicName = isCustomTopic ? customTopic.trim() : selectedTopic;
    if (!topicName) {
      alert("Please specify a topic");
      return;
    }

    // Determine current level for this topic
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

    // Fetch related study resources from database
    fetchSuggestedResources(topicName);

    // Create session in Supabase if DB configured
    let sessId = null;
    if (dbConfigured) {
      try {
        const { data: sessData, error: sessErr } = await supabase
          .from('sessions')
          .insert({
            user_id: profile.id,
            domain: selectedDomain,
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
        console.error('Error creating database session:', err);
      }
    }
    
    // Load initial 2 questions
    loadInitialQuestions(topicName, startingLevel);
  };

  // Fetch suggested study resources
  const fetchSuggestedResources = async (topic: string) => {
    if (dbConfigured) {
      try {
        const { data, error } = await supabase
          .from('study_resources')
          .select('*')
          .ilike('topic', `%${topic}%`)
          .limit(4);
        if (error) throw error;
        setSuggestedResources(data || []);
      } catch (err) {
        console.error("Resource fetch failed:", err);
      }
    } else {
      setSuggestedResources([]);
    }
  };

  // Fetch questions API client helper
  const fetchQuestions = async (topic: string, level: number, count: number): Promise<string[]> => {
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: selectedDomain,
          topic: topic,
          mode: sessionMode,
          currentLevel: level,
          targetRole: selectedRole,
          count: count
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          return data.questions;
        }
      }
      throw new Error("Invalid response format");
    } catch (err) {
      console.error("Error fetching questions:", err);
      // Fallback placeholder questions if Gemini key is missing or API errors out
      const placeholders = [];
      for (let i = 0; i < count; i++) {
        placeholders.push(`Explain key concepts related to ${topic} (Level ${level}, Part ${i + 1}).`);
      }
      return placeholders;
    }
  };

  // Load the initial 2 questions at starting difficulty
  const loadInitialQuestions = async (topic: string, level: number) => {
    setIsPrefetching(true);
    const initialList = await fetchQuestions(topic, level, 2);
    setQuestionQueue(initialList);
    setActiveQuestionIndex(0);
    setIsPrefetching(false);
  };

  // Prefetch a single question at the new adapted level and append to queue
  const prefetchNextQuestion = async (topic: string, level: number) => {
    setIsPrefetching(true);
    const nextQList = await fetchQuestions(topic, level, 1);
    setQuestionQueue(prev => [...prev, ...nextQList]);
    setIsPrefetching(false);
  };

  // Answer Evaluation Action
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      alert("Please type or record an answer first.");
      return;
    }

    setIsEvaluating(true);
    setEvaluationResult(null);
    setLevelChangeBadge(null);

    const topicName = isCustomTopic ? customTopic.trim() : selectedTopic;

    try {
      const response = await fetch('/api/evaluate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          sessionId: currentSessionId,
          domain: selectedDomain,
          topic: topicName,
          questionText: questionQueue[activeQuestionIndex] || '',
          userAnswerText: userAnswer,
          isVoiceInput: isRecording || userAnswer.length < 500, // approximation or flag
          difficultyLevel: currentLevel,
          mode: sessionMode
        })
      });

      const data = await response.json();
      
      if (response.ok && data.evaluation) {
        setEvaluationResult(data.evaluation);
        const newScore = data.evaluation.score;
        const nextLevel = data.nextLevel;
        
        // Calculate level badge changes
        if (nextLevel > currentLevel) {
          setLevelChangeBadge({ text: `+1 Level Up! (Difficulty: ${currentLevel} ➜ ${nextLevel})`, type: 'up' });
        } else if (nextLevel < currentLevel) {
          setLevelChangeBadge({ text: `Level Decreased (Difficulty: ${currentLevel} ➜ ${nextLevel})`, type: 'down' });
        } else {
          setLevelChangeBadge({ text: `Level Maintained (Difficulty: ${currentLevel})`, type: 'none' });
        }

        // Increment stats
        setSessionQuestionsCount(prev => prev + 1);
        setSessionScoresSum(prev => prev + newScore);

        // Update current difficulty level state
        setCurrentLevel(nextLevel);

        // Prefetch next question at the new level in the background
        prefetchNextQuestion(topicName, nextLevel);

        // If local mode (DB not configured), update state in localStorage
        if (!dbConfigured) {
          updateLocalTopicScores(topicName, newScore, nextLevel);
        } else {
          // Refresh list from DB
          fetchTopicScores();
        }
      } else {
        alert(data.error || "Failed to evaluate answer.");
      }
    } catch (err) {
      console.error("Evaluation error:", err);
      alert("Failed to submit answer. Try again.");
    } finally {
      setIsEvaluating(false);
    }
  };

  const updateLocalTopicScores = (topicName: string, score: number, nextLvl: number) => {
    if (!profile) return;
    
    const scores = [...topicScores];
    const index = scores.findIndex(s => s.topic.toLowerCase() === topicName.toLowerCase());
    
    if (index >= 0) {
      const old = scores[index];
      const count = old.total_questions_answered + 1;
      scores[index] = {
        ...old,
        current_level: nextLvl,
        total_questions_answered: count,
        average_score: parseFloat((((old.average_score * old.total_questions_answered) + score) / count).toFixed(2)),
        highest_score: Math.max(old.highest_score, score),
        last_practiced_at: new Date().toISOString()
      };
    } else {
      scores.push({
        domain: selectedDomain,
        topic: topicName,
        current_level: nextLvl,
        total_questions_answered: 1,
        average_score: score,
        highest_score: score,
        last_practiced_at: new Date().toISOString()
      });
    }

    setTopicScores(scores);
    calculateGlobalStats(scores);
    localStorage.setItem(`exam_buddy_scores_${profile.id}`, JSON.stringify(scores));
  };

  // Next Question Button Handler
  const handleNextQuestion = async () => {
    setUserAnswer('');
    setInterimTranscript('');
    setEvaluationResult(null);
    setLevelChangeBadge(null);
    
    const topicName = isCustomTopic ? customTopic.trim() : selectedTopic;
    const nextIdx = activeQuestionIndex + 1;
    
    if (nextIdx < questionQueue.length) {
      setActiveQuestionIndex(nextIdx);
    } else {
      setIsPrefetching(true);
      try {
        const nextQList = await fetchQuestions(topicName, currentLevel, 1);
        setQuestionQueue(prev => [...prev, ...nextQList]);
        setActiveQuestionIndex(nextIdx);
      } catch (e) {
        console.error("Error fetching next question", e);
        setQuestionQueue(prev => [...prev, `Explain key concepts related to ${topicName} (Level ${currentLevel}).`]);
        setActiveQuestionIndex(nextIdx);
      } finally {
        setIsPrefetching(false);
      }
    }
  };

  // Finish Practice Session
  const handleFinishSession = async () => {
    if (dbConfigured && currentSessionId) {
      try {
        const finalSessionScore = sessionQuestionsCount > 0 
          ? parseFloat((sessionScoresSum / sessionQuestionsCount).toFixed(2))
          : 0;

        await supabase
          .from('sessions')
          .update({
            status: 'COMPLETED',
            overall_session_score: finalSessionScore,
            completed_at: new Date().toISOString()
          })
          .eq('id', currentSessionId);
      } catch (err) {
        console.error("Error finalizing session in DB:", err);
      }
    }

    setActiveTab('dashboard');
    setCurrentSessionId(null);
    setEvaluationResult(null);
    setLevelChangeBadge(null);
    fetchTopicScores();
  };

  // Simulated circular score display
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'var(--success)';
    if (score >= 50) return 'var(--warning)';
    return 'var(--danger)';
  };

  const triggerProctoringWarning = useCallback((type: string, details: string) => {
    if (proctoringWarningActive || isEvaluating || isPrefetching || isFinishingSession || isInterviewFinished) return;

    const timestamp = new Date().toLocaleTimeString();
    const newLog = { timestamp, type, details };
    setProctoringLog(prev => [...prev, newLog]);

    const newWarningsCount = proctoringWarnings + 1;
    setProctoringWarnings(newWarningsCount);

    if (newWarningsCount >= 3) {
      setProctoringWarningActive('FORFEIT');
    } else {
      setProctoringWarningActive(type);
    }
  }, [proctoringWarningActive, proctoringWarnings, isEvaluating, isPrefetching, isFinishingSession, isInterviewFinished]);

  // Sync profile target role when profile loads
  useEffect(() => {
    if (profile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTargetRole(profile.target_role || 'Software Engineer');
    }
  }, [profile]);

  // Tab-switch & focus monitoring proctoring listener
  useEffect(() => {
    if (activeTab === 'session' && sessionMode === 'AI_INTERVIEW' && !isInterviewFinished) {
      const handleBlur = () => {
        triggerProctoringWarning('TAB_SWITCH', 'User navigated away or clicked out of the interview.');
      };
      
      const handleVisibilityChange = () => {
        if (document.hidden) {
          triggerProctoringWarning('TAB_SWITCH', 'User switched browser tabs.');
        }
      };

      window.addEventListener('blur', handleBlur);
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        window.removeEventListener('blur', handleBlur);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [activeTab, sessionMode, isInterviewFinished, triggerProctoringWarning]);

  const handleStartInterviewSession = async () => {
    if (!profile) return;
    
    // Reset state
    setQuestionQueue([]);
    setActiveQuestionIndex(0);
    setUserAnswer('');
    setEvaluationResult(null);
    setLevelChangeBadge(null);
    setProctoringWarnings(0);
    setProctoringLog([]);
    setExtractedEntitiesAccumulated({ technologies: [], frameworks: [], architecturalChoices: [], projectDetails: [] });
    setEvaluationsList([]);
    setIsInterviewFinished(false);
    setInterviewSummaryResult(null);
    setProctoringWarningActive(null);
    setActiveTab('session');
    setSessionMode('AI_INTERVIEW');

    // Create session in Supabase/local
    let sessId = null;
    if (dbConfigured) {
      try {
        const { data: sessData, error: sessErr } = await supabase
          .from('sessions')
          .insert({
            user_id: profile.id,
            domain: selectedDomain,
            topic_or_role: targetRole,
            mode: 'AI_INTERVIEW',
            status: 'IN_PROGRESS',
            company_type: companyType,
            years_of_experience: yearsOfExperience
          })
          .select()
          .single();
        
        if (sessErr) throw sessErr;
        sessId = sessData.id;
        setCurrentSessionId(sessId);
      } catch (err) {
        console.error('Error creating database session:', err);
      }
    } else {
      // Offline mode ID
      sessId = 'local-' + Date.now();
      setCurrentSessionId(sessId);
    }

    // Load first question
    setIsPrefetching(true);
    try {
      const response = await fetch('/api/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: selectedDomain,
          topic: targetRole,
          mode: 'AI_INTERVIEW',
          currentLevel: yearsOfExperience >= 9 ? 8 : yearsOfExperience >= 5 ? 6 : yearsOfExperience >= 2 ? 4 : 2, // starting level based on YoE
          targetRole: targetRole,
          companyType: companyType,
          yearsOfExperience: yearsOfExperience,
          count: 1
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.questions && data.questions.length > 0) {
          setQuestionQueue(data.questions);
          setIsPrefetching(false);
          return;
        }
      }
      throw new Error("Failed to load");
    } catch (e) {
      console.error(e);
      setQuestionQueue([`Tell me about your technical background and experience working with ${selectedDomain} roles.`]);
    }
    setIsPrefetching(false);
  };

  const handleInterviewSubmitAnswer = async (forfeitedText?: string) => {
    if (isEvaluating || isPrefetching || isFinishingSession) return;

    const isForfeit = !!forfeitedText;
    const answerText = isForfeit ? "Forfeited due to proctoring violation." : userAnswer.trim();
    
    if (!answerText && !isForfeit) {
      alert("Please record an answer first.");
      return;
    }

    // Immediately dismiss warning overlays and reset warnings counter to transition smoothly
    setProctoringWarningActive(null);
    setProctoringWarnings(0);

    setIsEvaluating(true);
    
    // Stop recording if active
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }

    const topicName = targetRole; // target role acts as the main topic context
    const currentQ = questionQueue[activeQuestionIndex] || '';

    let scoreValue = 0;
    let evalObj: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    try {
      // 1. Evaluate answer (Gemini call)
      // If forfeited, we bypass the AI API and record a 0 score immediately to save API cost
      if (isForfeit) {
        evalObj = {
          score: 0,
          expectedConcepts: [],
          strengths: [],
          gaps: ['Question was forfeited due to multiple proctoring warnings (focus loss / tab switching).'],
          detailedFeedback: 'You lost focus of the interview window too many times. According to the strict rules, this question has been marked wrong with 0 points.',
          extractedEntities: { technologies: [], frameworks: [], architecturalChoices: [], projectDetails: [] }
        };
      } else {
        const response = await fetch('/api/evaluate-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: profile?.id,
            sessionId: currentSessionId,
            domain: selectedDomain,
            topic: topicName,
            questionText: currentQ,
            userAnswerText: answerText,
            isVoiceInput: true,
            difficultyLevel: currentLevel,
            mode: 'AI_INTERVIEW',
            proctoringFlags: proctoringLog.filter(log => log.type !== 'CAMERA_DISABLED') // attach proctoring infractions
          })
        });

        if (response.ok) {
          const data = await response.json();
          evalObj = data.evaluation;
        } else {
          throw new Error("Grading failed");
        }
      }

      if (evalObj) {
        scoreValue = evalObj.score;
        
        // Append evaluation to history
        const updatedEvals = [...evaluationsList, {
          question_text: currentQ,
          user_answer_text: answerText,
          score: scoreValue,
          strengths: evalObj.strengths,
          gaps: evalObj.gaps,
          expected_concepts: evalObj.expectedConcepts,
          detailedFeedback: evalObj.detailedFeedback,
          extracted_entities: evalObj.extractedEntities,
          difficulty_level: currentLevel
        }];
        setEvaluationsList(updatedEvals);

        // Accumulate extracted entities
        const newEntities = evalObj.extractedEntities || {};
        setExtractedEntitiesAccumulated(prev => ({
          technologies: Array.from(new Set([...prev.technologies, ...(newEntities.technologies || [])])),
          frameworks: Array.from(new Set([...prev.frameworks, ...(newEntities.frameworks || [])])),
          architecturalChoices: Array.from(new Set([...prev.architecturalChoices, ...(newEntities.architecturalChoices || [])])),
          projectDetails: Array.from(new Set([...prev.projectDetails, ...(newEntities.projectDetails || [])])),
        }));

        // Determine next level adaptation
        let nextLvl = currentLevel;
        if (scoreValue > 80) {
          nextLvl = Math.min(currentLevel + 1, 10);
        } else if (scoreValue < 50) {
          nextLvl = Math.max(currentLevel - 1, 1);
        }
        setCurrentLevel(nextLvl);

        // Check if we finished the 7-question set
        const nextIndex = activeQuestionIndex + 1;
        if (nextIndex >= 7) {
          // Finish Interview Session!
          await handleFinishInterview(updatedEvals);
        } else {
          // Fetch next follow-up question dynamically
          setIsPrefetching(true);
          
          // Construct entities context to feed the follow-up prompt
          const combinedEntities = {
            technologies: Array.from(new Set([...extractedEntitiesAccumulated.technologies, ...(newEntities.technologies || [])])),
            frameworks: Array.from(new Set([...extractedEntitiesAccumulated.frameworks, ...(newEntities.frameworks || [])])),
            architecturalChoices: Array.from(new Set([...extractedEntitiesAccumulated.architecturalChoices, ...(newEntities.architecturalChoices || [])])),
            projectDetails: Array.from(new Set([...extractedEntitiesAccumulated.projectDetails, ...(newEntities.projectDetails || [])])),
          };

          try {
            const nextQResp = await fetch('/api/generate-questions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                domain: selectedDomain,
                topic: topicName,
                mode: 'AI_INTERVIEW',
                currentLevel: nextLvl,
                targetRole: targetRole,
                companyType: companyType,
                yearsOfExperience: yearsOfExperience,
                extractedEntities: combinedEntities,
                count: 1
              })
            });

            if (nextQResp.ok) {
              const nextQData = await nextQResp.json();
              if (nextQData.questions && nextQData.questions.length > 0) {
                setQuestionQueue(prev => [...prev, nextQData.questions[0]]);
                setActiveQuestionIndex(nextIndex);
              } else {
                throw new Error("Fallback needed");
              }
            } else {
              throw new Error("Fallback needed");
            }
          } catch (e) {
            console.error("Error fetching dynamic follow-up, using static question", e);
            setQuestionQueue(prev => [...prev, `Explain some advanced architecture patterns and scaling bottlenecks when working with ${topicName}.`]);
            setActiveQuestionIndex(nextIndex);
          } finally {
            setIsPrefetching(false);
          }
        }
      } else {
        alert("Evaluation parsing error. Please try submitting again.");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to evaluate response. Please try again.");
    } finally {
      setIsEvaluating(false);
      setUserAnswer('');
      setInterimTranscript('');
      setProctoringWarnings(0); // reset proctoring warning counter for the next question
      setProctoringWarningActive(null); // dismiss forfeit/warning modal overlay
    }
  };

  const handleFinishInterview = async (finalEvals: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    setIsFinishingSession(true);

    try {
      const response = await fetch('/api/finish-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          userId: profile?.id,
          domain: selectedDomain,
          topic: targetRole,
          companyType: companyType,
          yearsOfExperience: yearsOfExperience,
          proctoringWarningsCount: proctoringLog.length,
          proctoringLog: proctoringLog,
          localEvaluations: finalEvals // pass evaluations directly for localStorage fallback
        })
      });

      if (response.ok) {
        const data = await response.json();
        setInterviewSummaryResult(data);
        setIsInterviewFinished(true);

        // Update local topic scores to maintain dashboard stats (just like standard mock interview)
        if (!dbConfigured) {
          updateLocalTopicScores(targetRole, data.averageScore, currentLevel);
          // Also save completed session in localStorage
          const localSessions = JSON.parse(localStorage.getItem(`exam_buddy_sessions_${profile?.id}`) || '[]');
          localSessions.push({
            id: currentSessionId,
            domain: selectedDomain,
            topic_or_role: targetRole,
            mode: 'AI_INTERVIEW',
            overall_session_score: data.averageScore,
            company_type: companyType,
            years_of_experience: yearsOfExperience,
            hiring_verdict: data.hiringVerdict,
            executive_summary: data.executiveSummary,
            overall_strengths: data.overallStrengths,
            overall_gaps: data.overallGaps,
            proctoring_warnings_count: proctoringLog.length,
            proctoring_log: proctoringLog,
            evaluations: finalEvals,
            completed_at: new Date().toISOString()
          });
          localStorage.setItem(`exam_buddy_sessions_${profile?.id}`, JSON.stringify(localSessions));
        }
      } else {
        alert("Failed to summarize interview results.");
      }
    } catch (e) {
      console.error("Error compiling session", e);
      alert("Failed to compile final score card.");
    } finally {
      setIsFinishingSession(false);
    }
  };

  const handleExitInterviewEarly = () => {
    if (confirm("Are you sure you want to quit the interview early? Your progress will not be saved.")) {
      setActiveTab('dashboard');
      setIsInterviewFinished(false);
      setInterviewSummaryResult(null);
      setEvaluationsList([]);
    }
  };

  const renderInterviewReport = () => {
    if (!interviewSummaryResult) return null;
    const { hiringVerdict, executiveSummary, overallStrengths, overallGaps, averageScore } = interviewSummaryResult;
    
    const getVerdictColor = (v: string) => {
      if (v === 'Strong Hire') return '#10b981';
      if (v === 'Hire') return '#6366f1';
      if (v === 'Needs Improvement') return '#f59e0b';
      return '#f43f5e';
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeIn 0.5s ease-out' }}>
        {/* Title Block */}
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', borderLeft: `6px solid ${getVerdictColor(hiringVerdict)}` }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>AI INTERVIEW COMPLETE</div>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.25rem' }}>{targetRole} Technical Review</h2>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Target Company Tier: <strong>{companyType}</strong> &bull; Experience level: <strong>{yearsOfExperience} Years</strong>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Overall Rating</div>
              <div style={{ fontSize: '2.2rem', fontWeight: 900, color: getScoreColor(averageScore) }}>{averageScore}%</div>
            </div>
            <div style={{
              background: getVerdictColor(hiringVerdict) + '15',
              border: `1px solid ${getVerdictColor(hiringVerdict)}`,
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              color: getVerdictColor(hiringVerdict),
              fontWeight: 800,
              fontSize: '1.1rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              boxShadow: `0 0 20px ${getVerdictColor(hiringVerdict)}15`
            }}>
              {hiringVerdict}
            </div>
          </div>
        </div>

        {/* Executive summary & Proctor log */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }} className="grid-summary-row">
          {/* Executive Summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              <UserCheck size={18} color="var(--primary)" /> Executive Summary & Verdict
            </h3>
            <p style={{ fontSize: '0.95rem', lineHeight: '1.6', color: 'var(--text-bright)', whiteSpace: 'pre-line' }}>
              {executiveSummary}
            </p>
          </div>

          {/* Proctoring Log Card */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
              <ShieldAlert size={18} color="var(--danger)" /> Proctoring Violations Log
            </h3>
            
            {proctoringLog.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--success)', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={32} />
                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Clean Record!</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No tab-switches or camera issues detected.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '200px' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(244, 63, 94, 0.05)', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(244, 63, 94, 0.1)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <AlertTriangle size={14} color="var(--danger)" />
                  <span>Total warnings logged: <strong>{proctoringLog.length}</strong></span>
                </div>
                {proctoringLog.map((log, idx) => (
                  <div key={idx} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <strong style={{ color: 'var(--danger)' }}>{log.type}</strong>
                      <span style={{ color: 'var(--text-muted)' }}>{log.timestamp}</span>
                    </div>
                    <div style={{ color: 'var(--text-muted)' }}>{log.details}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Strengths & Gaps Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }} className="grid-summary-row">
          {/* Strengths */}
          <div className="card" style={{ background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#6ee7b7', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle size={16} /> Demonstrated Strengths
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {overallStrengths.map((str: string, i: number) => (
                <li key={i}>{str}</li>
              ))}
              {overallStrengths.length === 0 && <li style={{ color: 'var(--text-muted)', listStyleType: 'none' }}>No specific strengths highlighted.</li>}
            </ul>
          </div>

          {/* Gaps */}
          <div className="card" style={{ background: 'rgba(244, 63, 94, 0.03)', border: '1px solid rgba(244, 63, 94, 0.1)' }}>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#fda4af', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <AlertTriangle size={16} /> Critical Gaps & Revision Areas
            </h4>
            <ul style={{ paddingLeft: '1.25rem', fontSize: '0.9rem', lineHeight: '1.6', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {overallGaps.map((gap: string, i: number) => (
                <li key={i}>{gap}</li>
              ))}
              {overallGaps.length === 0 && <li style={{ color: 'var(--text-muted)', listStyleType: 'none' }}>No conceptual gaps flagged. Outstanding performance!</li>}
            </ul>
          </div>
        </div>

        {/* Timeline breakdown */}
        <div className="card">
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '0.75rem' }}>
            Question-by-Question Technical Evaluation
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {evaluationsList.map((ev, idx) => (
              <div key={idx} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '12px', padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{ background: 'rgba(139,92,246,0.1)', color: 'var(--secondary)', width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }} className="flex-center">
                      {idx + 1}
                    </span>
                    <strong style={{ fontSize: '0.95rem' }}>Difficulty Level {ev.difficulty_level}/10</strong>
                  </div>
                  <div style={{ fontWeight: 700, color: getScoreColor(ev.score), fontSize: '1.1rem', background: getScoreColor(ev.score) + '15', padding: '0.25rem 0.75rem', borderRadius: '8px', border: `1px solid ${getScoreColor(ev.score)}30` }}>
                    Score: {ev.score}/100
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                    <strong>Q:</strong> {ev.question_text}
                  </div>
                  <div style={{ fontSize: '0.9rem', background: 'rgba(0,0,0,0.2)', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.02)', color: 'var(--text-bright)', fontStyle: 'italic' }}>
                    <strong>Your Response (Voice Transcript):</strong> &ldquo;{ev.user_answer_text}&rdquo;
                  </div>
                  
                  {/* Expandable detailed feedback details */}
                  <details style={{ cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <summary style={{ fontWeight: 600, color: 'var(--primary)', padding: '0.25rem 0' }}>Show detailed assessment feedback</summary>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem', cursor: 'default' }}>
                      <div style={{ background: 'rgba(16,185,129,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.05)' }}>
                        <strong style={{ color: '#6ee7b7', display: 'block', marginBottom: '0.25rem' }}>Strengths:</strong>
                        <ul style={{ paddingLeft: '1rem' }}>
                          {ev.strengths?.map((s: string, i: number) => <li key={i}>{s}</li>)}
                          {(!ev.strengths || ev.strengths.length === 0) && <li>No specific strengths recorded.</li>}
                        </ul>
                      </div>
                      <div style={{ background: 'rgba(244,63,94,0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(244,63,94,0.05)' }}>
                        <strong style={{ color: '#fda4af', display: 'block', marginBottom: '0.25rem' }}>Gaps & Holes:</strong>
                        <ul style={{ paddingLeft: '1rem' }}>
                          {ev.gaps?.map((g: string, i: number) => <li key={i}>{g}</li>)}
                          {(!ev.gaps || ev.gaps.length === 0) && <li>No conceptual gaps found.</li>}
                        </ul>
                      </div>
                    </div>
                    {ev.extracted_entities && (ev.extracted_entities.technologies?.length > 0 || ev.extracted_entities.frameworks?.length > 0) && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', cursor: 'default' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Extracted Stack:</span>
                        {ev.extracted_entities.technologies?.map((tech: string) => <span key={tech} className="badge badge-primary" style={{ fontSize: '0.65rem', textTransform: 'none' }}>{tech}</span>)}
                        {ev.extracted_entities.frameworks?.map((fw: string) => <span key={fw} className="badge badge-success" style={{ fontSize: '0.65rem', textTransform: 'none' }}>{fw}</span>)}
                      </div>
                    )}
                    <div style={{ marginTop: '0.75rem', borderTop: '1px dashed rgba(255,255,255,0.05)', paddingTop: '0.75rem', lineHeight: '1.5', cursor: 'default', color: 'var(--foreground)' }}>
                      <strong>Feedback & Advice:</strong>
                      <p style={{ marginTop: '0.25rem', whiteSpace: 'pre-line' }}>{ev.detailedFeedback}</p>
                    </div>
                  </details>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button 
            style={{ padding: '0.85rem 2.5rem' }} 
            onClick={() => {
              setActiveTab('dashboard');
              setIsInterviewFinished(false);
              setInterviewSummaryResult(null);
              setEvaluationsList([]);
              fetchTopicScores();
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  };

  const renderProctoredActiveInterview = () => {
    const currentQ = questionQueue[activeQuestionIndex] || '';
    
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }} className="grid-session">
        
        {/* Full-screen Warning Overlays */}
        {proctoringWarningActive && proctoringWarningActive !== 'FORFEIT' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(7, 8, 14, 0.9)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div className="card" style={{
              maxWidth: '450px',
              padding: '2.5rem',
              border: '2px solid var(--danger)',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(244, 63, 94, 0.15)'
            }}>
              <ShieldAlert size={48} color="var(--danger)" style={{ margin: '0 auto 1.5rem', animation: 'pulseGlow 2s infinite' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--danger)' }}>
                PROCTORING WARNING
              </h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-bright)', marginBottom: '1rem', fontWeight: 600 }}>
                {proctoringWarningActive === 'TAB_SWITCH' 
                  ? 'Focus Lost / Tab Switch Detected!' 
                  : 'Face Stream Lost or Eye Gaze Deviation!'}
              </p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                You have switched windows or looked away from the camera feed. Technical interviews are strictly monitored.
                This is warning <strong>{proctoringWarnings} of 2</strong>.
                On the 3rd warning, this question will be marked incorrect automatically.
              </p>
              <button 
                style={{ width: '100%', padding: '0.75rem', background: 'var(--danger)' }} 
                onClick={() => setProctoringWarningActive(null)}
              >
                I Understand, Resume Interview
              </button>
            </div>
          </div>
        )}

        {proctoringWarningActive === 'FORFEIT' && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(7, 8, 14, 0.95)',
            backdropFilter: 'blur(20px)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10000,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div className="card" style={{
              maxWidth: '450px',
              padding: '2.5rem',
              border: '2px solid var(--danger)',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(244, 63, 94, 0.3)'
            }}>
              <XCircle size={48} color="var(--danger)" style={{ margin: '0 auto 1.5rem' }} />
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--danger)' }}>
                STRIKE 3: QUESTION FORFEITED
              </h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.4' }}>
                You have reached 3 proctoring violations (tab switches or camera issues). 
                The response for this question has been marked as <strong>Incorrect (0 Score)</strong>.
              </p>
              <button 
                style={{ width: '100%', padding: '0.75rem', background: 'var(--danger)', opacity: (isEvaluating || isPrefetching) ? 0.7 : 1 }} 
                onClick={() => handleInterviewSubmitAnswer('FORFEIT')}
                disabled={isEvaluating || isPrefetching}
              >
                {(isEvaluating || isPrefetching) ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <RefreshCw size={16} className="spin-animation" style={{ animation: 'rotate 1.5s linear infinite' }} />
                    Loading Next Question...
                  </span>
                ) : (
                  'Move to Next Question'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Left panel: webcam and statistics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* AI Proctoring & Security Card */}
          <div className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '1rem',
            border: '1px solid var(--card-border)',
            transition: 'border-color 0.3s'
          }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Anti-Cheat Monitor
            </div>
            
            <div style={{
              width: '100%',
              padding: '1.25rem',
              borderRadius: '12px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              textAlign: 'center'
            }}>
              <ShieldAlert size={32} style={{ color: 'var(--primary)' }} />
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-bright)' }}>AI Session Guard</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Tab-switch & focus monitoring active</div>
            </div>

            {/* Status indicator bar */}
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Proctor Status:</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: '#6ee7b7',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ 
                    width: '6px', 
                    height: '6px', 
                    background: 'var(--success)', 
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'pulseGlow 1.5s infinite'
                  }}></span>
                  Active Monitoring
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Infractions:</span>
                <span style={{ 
                  fontWeight: 700, 
                  color: proctoringWarnings === 0 ? 'var(--success)' : proctoringWarnings === 1 ? 'var(--warning)' : 'var(--danger)'
                }}>
                  {proctoringWarnings} / 2 Warnings
                </span>
              </div>
            </div>
          </div>

          {/* Session Progress info */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <span className="badge badge-success" style={{ marginBottom: '0.5rem', background: 'rgba(139,92,246,0.1)', color: '#c084fc', borderColor: 'rgba(139,92,246,0.3)' }}>
                {companyType} Mode
              </span>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
                {targetRole}
              </h3>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{selectedDomain}</div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                <span>Session Question:</span>
                <span>{activeQuestionIndex + 1} of 7</span>
              </div>
              <div style={{ background: 'rgba(255, 255, 255, 0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ 
                  width: `${((activeQuestionIndex + 1) / 7) * 100}%`, 
                  height: '100%', 
                  background: 'linear-gradient(to right, var(--secondary), var(--primary))',
                  transition: 'width 0.4s ease'
                }}></div>
              </div>
            </div>

            <button 
              className="button-secondary" 
              style={{ width: '100%', marginTop: '0.5rem', borderColor: 'rgba(244,63,94,0.2)', color: '#fda4af' }} 
              onClick={handleExitInterviewEarly}
            >
              Quit Interview
            </button>
          </div>

        </div>

        {/* Right panel: Active Question work space */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Question card */}
          <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                AI Technical Interviewer (Question {activeQuestionIndex + 1})
              </span>
              {isPrefetching && (
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <RefreshCw size={12} className="spin-animation" style={{ animation: 'rotate 1.5s linear infinite' }} />
                  Analyzing context & generating question...
                </span>
              )}
            </div>
            
            <div style={{ 
              fontSize: '1.15rem', 
              fontWeight: 500, 
              lineHeight: '1.6', 
              color: 'var(--text-bright)',
              minHeight: '60px'
            }}>
              {currentQ || (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <RefreshCw size={16} className="spin-animation" style={{ animation: 'rotate 1.5s linear infinite' }} />
                  Interviewer is typing follow-up question...
                </div>
              )}
            </div>
          </div>

          {/* Answer Work space */}
          {!isEvaluating && !isFinishingSession && (
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Lock size={12} /> Spoken Voice Response Only (Type-Locked)
                </span>
                
                <button 
                  className={isRecording ? 'button' : 'button-secondary'} 
                  style={{ 
                    padding: '0.4rem 0.85rem', 
                    fontSize: '0.8rem',
                    background: isRecording ? 'var(--danger)' : '',
                    borderColor: isRecording ? 'var(--danger)' : ''
                  }}
                  onClick={handleToggleRecording}
                  disabled={isPrefetching}
                >
                  {isRecording ? <MicOff size={14} /> : <Mic size={14} />} 
                  {isRecording ? 'Stop Recording' : 'Start Spoken Answer'}
                </button>
              </div>

              {/* Microphone Waveform Visualizer */}
              {isRecording && (
                <div style={{ 
                  background: 'rgba(244, 63, 94, 0.03)', 
                  border: '1px dashed rgba(244, 63, 94, 0.3)', 
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
                  <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
                    Listening... Speak clearly. Tab focus and face visibility are monitored.
                  </div>
                  {interimTranscript && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-bright)', fontStyle: 'italic', textAlign: 'center', maxWidth: '85%' }}>
                      &ldquo;{interimTranscript}&rdquo;
                    </div>
                  )}
                </div>
              )}

              <textarea
                placeholder="Spoken words will appear here. Typing is locked for realistic voice testing..."
                value={userAnswer}
                rows={6}
                style={{ 
                  resize: 'vertical', 
                  lineHeight: '1.5',
                  background: 'rgba(255,255,255,0.01)',
                  borderColor: 'rgba(255,255,255,0.04)',
                  color: 'var(--text-bright)',
                  cursor: 'not-allowed'
                }}
                readOnly={true}
                disabled={true}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  className="button-secondary" 
                  style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderColor: 'rgba(255,255,255,0.08)' }} 
                  onClick={() => {
                    setUserAnswer('');
                    setInterimTranscript('');
                  }}
                  disabled={!userAnswer && !interimTranscript}
                >
                  <Trash2 size={14} /> Clear Box
                </button>
                
                <button 
                  style={{ padding: '0.85rem 2rem', background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }} 
                  onClick={() => handleInterviewSubmitAnswer()}
                  disabled={!userAnswer.trim() || isPrefetching}
                >
                  Submit Spoken Response <Send size={16} />
                </button>
              </div>
            </div>
          )}

          {/* Evaluating Answer / Finalizing session loaders */}
          {isEvaluating && (
            <div className="card" style={{ textAlign: 'center', padding: '4.5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                border: '4px solid rgba(139, 92, 246, 0.1)',
                borderTopColor: 'var(--secondary)',
                borderRadius: '50%',
                animation: 'rotate 1s linear infinite'
              }}></div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Evaluating Response & Synthesizing Context
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', lineHeight: '1.5' }}>
                  The AI is checking your response accuracy, performing tech entity extraction, and preparing your next follow-up challenge in the background...
                </p>
              </div>
            </div>
          )}

          {isFinishingSession && (
            <div className="card" style={{ textAlign: 'center', padding: '5rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{
                width: '56px',
                height: '56px',
                border: '4px solid rgba(16, 185, 129, 0.1)',
                borderTopColor: 'var(--success)',
                borderRadius: '50%',
                animation: 'rotate 1s linear infinite'
              }}></div>
              <div>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 700 }}>
                  Compiling Technical Verdict Report
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', maxWidth: '420px', lineHeight: '1.5' }}>
                  Reviewing transcript records, proctoring warnings, and scoring rubrics to output your overall hiring recommendation dashboard...
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
    );
  };

  if (isCheckingAuth) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: '#07080e',
        color: '#f3f4f6'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(99, 102, 241, 0.2)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'rotate 0.8s linear infinite',
          marginBottom: '1rem'
        }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Loading Exam Buddy...</span>
      </div>
    );
  }

  return (
    <div className="container" style={{ animation: 'fadeIn var(--transition-slow)' }}>
      {/* AI INTERVIEW SETUP WIZARD MODAL */}
      {showInterviewWizard && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(7, 8, 14, 0.85)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div className="card" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '2rem',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
            color: 'var(--foreground)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={20} color="var(--secondary)" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>AI Interview Setup</h3>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Step {wizardStep} of 3</span>
            </div>

            {/* STEP 1: Company Type */}
            {wizardStep === 1 && (
              <div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}>Choose Target Company Tier</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { id: 'MAANG', title: 'MAANG Tier', desc: 'Focuses on complex DSA, algorithms, and scale.', logo: '🌐' },
                    { id: 'Unicorn', title: 'Tech Unicorns', desc: 'Focuses on systems architecture, APIs, and tooling.', logo: '🦄' },
                    { id: 'Service-based Giant', title: 'Service Giants', desc: 'Focuses on frameworks, SQL, and syntax rules.', logo: '🏢' },
                    { id: 'New Startup', title: 'Early Startups', desc: 'Focuses on agility, full-stack building, and speed.', logo: '🚀' }
                  ].map(c => (
                    <div 
                      key={c.id}
                      onClick={() => setCompanyType(c.id)}
                      style={{
                        padding: '1rem',
                        borderRadius: '12px',
                        background: companyType === c.id ? 'rgba(139, 92, 246, 0.08)' : 'rgba(255,255,255,0.02)',
                        border: `1px solid ${companyType === c.id ? 'var(--secondary)' : 'rgba(255,255,255,0.06)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        textAlign: 'center'
                      }}
                      className="wizard-card-hover"
                    >
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{c.logo}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.25rem' }}>{c.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>{c.desc}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                  <button className="button-secondary" onClick={() => setShowInterviewWizard(false)}>Cancel</button>
                  <button onClick={() => setWizardStep(2)}>Next Step <ArrowRight size={16} /></button>
                </div>
              </div>
            )}

            {/* STEP 2: Role Selection */}
            {wizardStep === 2 && (
              <div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '1rem', fontWeight: 600 }}>Specify Target Role</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Select Predefined or Enter Custom</label>
                    <input 
                      type="text" 
                      placeholder="e.g. SDE II, Lead Architect, Business Analyst" 
                      value={targetRole}
                      onChange={e => setTargetRole(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {['SDE I', 'Backend Engineer', 'Frontend Engineer', 'Full Stack Developer', 'Cloud Architect', 'Business Analyst', 'Data Engineer'].map(r => (
                      <span 
                        key={r}
                        onClick={() => setTargetRole(r)}
                        style={{
                          padding: '0.35rem 0.75rem',
                          borderRadius: '8px',
                          background: targetRole === r ? 'var(--secondary)' : 'rgba(255,255,255,0.04)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 500,
                          border: '1px solid rgba(255,255,255,0.06)'
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="button-secondary" onClick={() => setWizardStep(1)}>Back</button>
                  <button onClick={() => setWizardStep(3)}>Next Step <ArrowRight size={16} /></button>
                </div>
              </div>
            )}

            {/* STEP 3: Years of Experience */}
            {wizardStep === 3 && (
              <div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', fontWeight: 600 }}>Years of Experience</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                  This adjusts the initial complexity bar of questions.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--secondary)' }}>{yearsOfExperience} Years</span>
                    <span className="badge badge-primary">
                      {yearsOfExperience >= 9 ? 'Lead/Principal' : yearsOfExperience >= 5 ? 'Senior' : yearsOfExperience >= 2 ? 'Mid-level' : 'Junior/Associate'}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="15" 
                    value={yearsOfExperience}
                    onChange={e => setYearsOfExperience(parseInt(e.target.value))}
                    style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', outline: 'none', borderRadius: '3px' }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <button className="button-secondary" onClick={() => setWizardStep(2)}>Back</button>
                  <button 
                    onClick={() => {
                      setShowInterviewWizard(false);
                      handleStartInterviewSession();
                    }}
                    style={{ background: 'linear-gradient(135deg, var(--secondary), var(--primary))' }}
                  >
                    Start Secure Interview <Play size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing configuration banner warning */}
      {!dbConfigured && (
        <div style={{
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          padding: '0.75rem 1rem',
          borderRadius: '12px',
          color: '#fde047',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <AlertTriangle size={18} />
          <span>
            <strong>Demo Simulator Mode active:</strong> Supabase variables are not set. The app is running fully locally, storing statistics in local storage. Set database credentials in your `.env.local` to enable cloud persistence!
          </span>
        </div>
      )}

      {/* Header */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: '1.5rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        marginBottom: '2rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
          }}>
            <Brain size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.02em', background: 'linear-gradient(to right, #ffffff, #a5b4fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Exam Buddy
            </h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              AI Study & Interview Coach
            </span>
          </div>
        </div>

        {profile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }} className="desktop-only">
              <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{profile.full_name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{profile.target_role}</div>
            </div>
            <button className="button-secondary" style={{ padding: '0.5rem 0.75rem', borderRadius: '8px' }} onClick={handleLogout} title="Sign Out">
              <LogOut size={16} />
            </button>
          </div>
        )}
      </header>

      {/* Main Application Workspace */}
      {profile && (
        <div>
          {/* Navigation Tabs */}
          {activeTab !== 'session' && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
              <button 
                className={activeTab === 'dashboard' ? '' : 'button-secondary'}
                onClick={() => setActiveTab('dashboard')}
              >
                <Activity size={16} /> Dashboard
              </button>
              <button 
                className={activeTab === 'progress' ? '' : 'button-secondary'}
                onClick={() => setActiveTab('progress')}
              >
                <Trophy size={16} /> Skill Progress
              </button>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }} className="grid-dashboard">
              {/* Stats & Start Session Form */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                
                {/* Global Stats Summary card */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <TrendingUp size={18} color="var(--primary)" /> Overall Performance
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
                      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Total Solved</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{globalStats.totalQuestions}</div>
                      </div>
                      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.04)' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase' }}>Average Score</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: getScoreColor(globalStats.avgScore) }}>{globalStats.avgScore}%</div>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle size={14} color="var(--success)" />
                    <span>Difficulty adapts dynamically level-by-level based on your score threshold (&gt;80% increases, &lt;50% decreases).</span>
                  </div>
                </div>

                {/* Session Configurator card */}
                <div className="card">
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Compass size={18} color="var(--secondary)" /> Configure Coach
                  </h3>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Domain Track</label>
                        <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)}>
                          {DOMAINS_SCHEMA.map(d => (
                            <option key={d.name} value={d.name}>{d.name}</option>
                          ))}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Role Context</label>
                        <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}>
                          {DOMAINS_SCHEMA.find(d => d.name === selectedDomain)?.roles.map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Topic Name</label>
                        <span style={{ fontSize: '0.75rem', color: 'var(--primary)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setIsCustomTopic(!isCustomTopic)}>
                          {isCustomTopic ? "Select Predefined" : "Enter Custom Topic"}
                        </span>
                      </div>
                      
                      {isCustomTopic ? (
                        <input 
                          type="text" 
                          placeholder="e.g. System Design for Agricultural Tech" 
                          value={customTopic}
                          onChange={e => setCustomTopic(e.target.value)}
                        />
                      ) : (
                        <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)}>
                          {DOMAINS_SCHEMA.find(d => d.name === selectedDomain)?.topics.map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Practice Mode</label>
                        <select value={sessionMode === 'AI_INTERVIEW' ? 'MOCK_INTERVIEW' : sessionMode} onChange={e => setSessionMode(e.target.value as 'STUDY' | 'MOCK_INTERVIEW')}>
                          <option value="STUDY">Study Mode (Conceptual)</option>
                          <option value="MOCK_INTERVIEW">Mock Interview (Strict)</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end' }}>
                        <button style={{ width: '100%', padding: '0.75rem' }} onClick={handleStartSession}>
                          Launch Coach <Play size={16} />
                        </button>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                        Looking for a realistic proctored coding/architecture evaluation?
                      </div>
                      <button 
                        style={{ 
                          width: '100%', 
                          padding: '0.75rem', 
                          background: 'linear-gradient(135deg, var(--secondary), var(--primary))',
                          boxShadow: '0 0 15px rgba(139, 92, 246, 0.2)'
                        }} 
                        onClick={() => {
                          setShowInterviewWizard(true);
                          setWizardStep(1);
                        }}
                      >
                        <Sparkles size={16} /> Launch AI Interview Mode
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              {/* Saved Topics & Difficulty Levels grid */}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', fontWeight: 600 }}>Active Subject Scores</h3>
                
                {topicScores.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                    <BookOpen size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                    <p>No practice history found. Pick a topic above to launch your first coach session!</p>
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
                          
                          {/* Difficulty level bar */}
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
            sessionMode === 'AI_INTERVIEW' ? (
              isInterviewFinished ? (
                renderInterviewReport()
              ) : (
                renderProctoredActiveInterview()
              )
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '2rem' }} className="grid-session">
              {/* Left Panel: Stats and metadata */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <span className="badge badge-success" style={{ marginBottom: '0.5rem' }}>{sessionMode}</span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                      {isCustomTopic ? customTopic : selectedTopic}
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>{selectedDomain}</div>
                  </div>

                  <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Coach Difficulty Level</span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)' }}>Level {currentLevel}/10</span>
                    </div>
                    {/* Level slider visualization */}
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
                      <span>Mid-Level</span>
                      <span>Senior Arch</span>
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
                          className="resource-link-hover"
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

              {/* Right Panel: Working Space */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Question view */}
                <div className="card" style={{ position: 'relative', overflow: 'hidden' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      AI Coach Prompt (Question {activeQuestionIndex + 1})
                    </span>
                    {isPrefetching && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <div style={{ width: '6px', height: '6px', background: 'var(--primary)', borderRadius: '50%', animation: 'rotate 1s linear infinite' }}></div>
                        Preloading Next...
                      </span>
                    )}
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

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button style={{ padding: '0.85rem 2rem' }} onClick={handleSubmitAnswer}>
                        Submit Response <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Evaluation evaluation loading */}
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
                        {/* Circular Score display */}
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

                      {/* Adaptive difficulty badge */}
                      {levelChangeBadge && (
                        <div className={`badge ${
                          levelChangeBadge.type === 'up' ? 'badge-success' : levelChangeBadge.type === 'down' ? 'badge-danger' : 'badge-warning'
                        }`} style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                          {levelChangeBadge.text}
                        </div>
                      )}
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

                    {/* Detailed textual feedback */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px solid rgba(255, 255, 255, 0.04)', borderRadius: '12px', padding: '1.25rem' }}>
                      <h4 style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Actionable Coach Advice</h4>
                      <p style={{ fontSize: '0.92rem', lineHeight: '1.6', color: 'var(--text-bright)', whiteSpace: 'pre-line' }}>
                        {evaluationResult.detailedFeedback}
                      </p>
                    </div>

                    {/* Resource Recommendations dynamically generated by AI if gaps present */}
                    {evaluationResult.gaps && evaluationResult.gaps.length > 0 && (
                      <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '1.25rem' }}>
                        <h4 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--secondary)' }}>Recommended Resources for Gaps</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }} className="grid-resources">
                          <a 
                            href={`https://www.google.com/search?q=${encodeURIComponent((isCustomTopic ? customTopic : selectedTopic) + ' ' + evaluationResult.gaps[0])}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              background: 'rgba(139, 92, 246, 0.04)',
                              border: '1px solid rgba(139, 92, 246, 0.1)',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>Search tutorial for: &ldquo;{evaluationResult.gaps[0]}&rdquo;</span>
                            <ChevronRight size={14} />
                          </a>
                          <a 
                            href={`https://wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(evaluationResult.expectedConcepts?.[0] || (isCustomTopic ? customTopic : selectedTopic))}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={{
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'space-between',
                              background: 'rgba(99, 102, 241, 0.04)',
                              border: '1px solid rgba(99, 102, 241, 0.1)',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              fontSize: '0.8rem'
                            }}
                          >
                            <span style={{ fontWeight: 500 }}>Wikipedia concept: {evaluationResult.expectedConcepts?.[0] || 'Reference'}</span>
                            <ChevronRight size={14} />
                          </a>
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
                      <button className="button-secondary" onClick={handleFinishSession}>
                        End Session & Exit
                      </button>
                      <button onClick={handleNextQuestion}>
                        Try Next Question <ArrowRight size={16} />
                      </button>
                    </div>

                  </div>
                )}
              </div>
            </div>
          )
        )}

          {/* PROGRESS TAB */}
          {activeTab === 'progress' && (
            <div className="card">
              <h3 style={{ fontSize: '1.3rem', fontWeight: 700, marginBottom: '0.5rem' }}>Skill Breakdown & Metrics</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '2rem' }}>
                Your adaptive ratings are shown below. Standard criteria increment your difficulty upon achieving scores above 80%.
              </p>

              {topicScores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
                  <Award size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
                  <p>No practice sessions saved yet. Start practicing to generate stats!</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {topicScores.map((score, i) => (
                    <div key={i} style={{
                      background: 'rgba(255, 255, 255, 0.01)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr',
                      alignItems: 'center',
                      gap: '1.5rem'
                    }} className="grid-progress-row">
                      
                      {/* Name and progress bar */}
                      <div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.15rem' }}>{score.domain}</div>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>{score.topic}</h4>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ background: 'rgba(255, 255, 255, 0.05)', flex: 1, height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                              width: `${(score.current_level || 1) * 10}%`, 
                              height: '100%', 
                              background: 'linear-gradient(to right, var(--primary), var(--secondary))',
                              borderRadius: '3px'
                            }}></div>
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, minWidth: '70px', textAlign: 'right' }}>
                            Level {score.current_level || 1}/10
                          </span>
                        </div>
                      </div>

                      {/* average score */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Average Score</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: getScoreColor(score.average_score) }}>
                          {score.average_score}%
                        </div>
                      </div>

                      {/* highest score */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Highest Score</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: getScoreColor(score.highest_score) }}>
                          {score.highest_score}
                        </div>
                      </div>

                      {/* Questions Solved */}
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>Total Questions</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                          {score.total_questions_answered}
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <footer style={{
        marginTop: '4rem',
        paddingTop: '1.5rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        fontSize: '0.8rem',
        color: 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <span>Exam Buddy &copy; {new Date().getFullYear()}</span>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <span>Powered by Gemini 2.0 Flash</span>
          <span>&bull;</span>
          <span>Web Speech API</span>
        </div>
      </footer>
    </div>
  );
}
