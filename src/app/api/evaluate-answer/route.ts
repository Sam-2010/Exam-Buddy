import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

// Define the response schema using Google Gen AI Type constants or uppercase string representation
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    score: { 
      type: Type.INTEGER, 
      description: "Numeric score between 0 and 100 representing how well the user answered the question based on technical accuracy and completeness." 
    },
    expectedConcepts: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of key technical concepts, terms, or patterns that should be included in a complete answer." 
    },
    strengths: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of positive aspects in the user's answer (e.g., correct concepts, clear explanation, good coding practice)." 
    },
    gaps: { 
      type: Type.ARRAY, 
      items: { type: Type.STRING },
      description: "List of technical omissions, incorrect claims, or areas for improvement in the user's answer." 
    },
    detailedFeedback: { 
      type: Type.STRING, 
      description: "Comprehensive, constructive feedback explaining why the score was given and how to write a better answer next time." 
    },
    extractedEntities: {
      type: Type.OBJECT,
      properties: {
        technologies: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Key programming languages, databases, message queues, caches, or tools explicitly mentioned (e.g. ['TypeScript', 'Redis', 'PostgreSQL'])."
        },
        frameworks: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Key frameworks, libraries, or runtimes explicitly mentioned (e.g. ['Next.js', 'Spring Boot', 'TensorFlow'])."
        },
        architecturalChoices: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Key architectural designs or patterns explicitly mentioned (e.g. ['Microservices', 'Event Sourcing', 'CQRS', 'MVC'])."
        },
        projectDetails: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Key details or descriptions of personal projects, crawlers, or apps mentioned by the candidate."
        }
      },
      description: "Technologies, frameworks, architectures, or project details extracted from the candidate's response."
    }
  },
  required: ["score", "expectedConcepts", "strengths", "gaps", "detailedFeedback", "extractedEntities"]
};

export async function POST(req: NextRequest) {
  try {
    const { 
      userId, 
      sessionId, 
      domain, 
      topic, 
      questionText, 
      userAnswerText, 
      isVoiceInput, 
      difficultyLevel,
      mode,
      proctoringFlags 
    } = await req.json();

    if (!domain || !topic || !questionText || !userAnswerText || difficultyLevel === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: domain, topic, questionText, userAnswerText, difficultyLevel' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Construct prompt for evaluation
    const evaluationPrompt = `You are a professional examiner and interview coach.
Evaluate the user's answer to the following question.

Track/Domain: ${domain}
Topic/Role: ${topic}
Difficulty Level: ${difficultyLevel}/10
Interview Mode: ${mode === 'STUDY' ? 'Study Mode (Concept Deep-Dive, be constructive, check for core conceptual understanding)' : mode === 'AI_INTERVIEW' ? 'AI Interview Mode (Strict technical evaluation, perform entity extraction, grade communication clarity and correctness)' : 'Mock Interview Mode (Strict mock interview, rate based on professional clarity, precise technical details, and accuracy)'}

[Question]
${questionText}

[User's Answer]
${userAnswerText}

Instructions:
1. Grade the answer objectively out of 100.
2. In Mock/AI Interview Mode, be strict about correctness and complete explanations. If the answer is vague, extremely short, or marked wrong due to proctoring, give a score of 0 or very low (e.g. < 30).
3. Extract the key concepts expected for this question at this difficulty level.
4. Extract key technologies, frameworks, architectures, and personal projects mentioned in the candidate's response.
5. Identify specific strengths and gaps.
6. Provide structured feedback.
7. Return your response in JSON matching the requested schema.`;

    // Call Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: evaluationPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from Gemini API evaluation.");
    }

    const evaluationResult = JSON.parse(responseText);
    const score = evaluationResult.score;

    // Database updates with safety fallback
    let isDbConfigured = true;
    let dbError = null;
    let nextLevel = difficultyLevel;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-supabase") || supabaseUrl.includes("placeholder-url-for-build")) {
      isDbConfigured = false;
      console.warn("Supabase is not configured or placeholder is present. Skipping DB writes, executing memory adaptive difficulty.");
    }

    if (isDbConfigured && userId) {
      try {
        // 1. Insert into evaluations table
        if (sessionId) {
          const { error: evalErr } = await supabase.from('evaluations').insert({
            session_id: sessionId,
            user_id: userId,
            topic: topic,
            question_text: questionText,
            expected_concepts: evaluationResult.expectedConcepts,
            user_answer_text: userAnswerText,
            is_voice_input: !!isVoiceInput,
            score: score,
            strengths: evaluationResult.strengths,
            gaps: evaluationResult.gaps,
            difficulty_level: difficultyLevel,
            extracted_entities: evaluationResult.extractedEntities || {},
            proctoring_flags: proctoringFlags || []
          });
          if (evalErr) throw evalErr;
        }

        // 2. Fetch and update user_topic_scores table
        const { data: topicScoreData, error: scoreFetchErr } = await supabase
          .from('user_topic_scores')
          .select('*')
          .eq('user_id', userId)
          .eq('domain', domain)
          .eq('topic', topic)
          .maybeSingle();

        if (scoreFetchErr) throw scoreFetchErr;

        let totalQuestions = 1;
        let averageScore = score;
        let highestScore = score;
        let currentLevel = difficultyLevel;

        if (topicScoreData) {
          totalQuestions = (topicScoreData.total_questions_answered || 0) + 1;
          const oldAvg = topicScoreData.average_score || 0;
          averageScore = parseFloat((((oldAvg * (totalQuestions - 1)) + score) / totalQuestions).toFixed(2));
          highestScore = Math.max(topicScoreData.highest_score || 0, score);
          currentLevel = topicScoreData.current_level || 1;
        }

        // Adaptive level adjustment logic:
        // - score > 80% -> currentLevel + 1 (max 10)
        // - score < 50% -> currentLevel - 1 (min 1)
        // - 50% to 80% -> no change
        if (score > 80) {
          nextLevel = Math.min(currentLevel + 1, 10);
        } else if (score < 50) {
          nextLevel = Math.max(currentLevel - 1, 1);
        } else {
          nextLevel = currentLevel;
        }

        const { error: upsertErr } = await supabase
          .from('user_topic_scores')
          .upsert({
            user_id: userId,
            domain: domain,
            topic: topic,
            current_level: nextLevel,
            total_questions_answered: totalQuestions,
            average_score: averageScore,
            highest_score: highestScore,
            last_practiced_at: new Date().toISOString()
          }, { onConflict: 'user_id,domain,topic' });

        if (upsertErr) throw upsertErr;

        // 3. Update parent session details
        if (sessionId) {
          // Fetch all evaluations in this session to compute aggregate stats
          const { data: sessionEvals, error: evalsFetchErr } = await supabase
            .from('evaluations')
            .select('score')
            .eq('session_id', sessionId);

          if (!evalsFetchErr && sessionEvals && sessionEvals.length > 0) {
            const sumScores = sessionEvals.reduce((sum, item) => sum + (item.score || 0), 0);
            const avgSessionScore = parseFloat((sumScores / sessionEvals.length).toFixed(2));

            await supabase
              .from('sessions')
              .update({
                total_questions: sessionEvals.length,
                overall_session_score: avgSessionScore
              })
              .eq('id', sessionId);
          }
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        dbError = err.message || err;
        console.error('Supabase DB write error in evaluate-answer:', err);
      }
    } else {
      // Local testing / simulation mode adaptive logic
      if (score > 80) {
        nextLevel = Math.min(difficultyLevel + 1, 10);
      } else if (score < 50) {
        nextLevel = Math.max(difficultyLevel - 1, 1);
      } else {
        nextLevel = difficultyLevel;
      }
    }

    return NextResponse.json({
      evaluation: evaluationResult,
      dbStatus: {
        written: isDbConfigured && !dbError,
        isConfigured: isDbConfigured,
        error: dbError
      },
      nextLevel: nextLevel
    });

  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('API Error in evaluate-answer:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
