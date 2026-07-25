import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { supabase } from '@/lib/supabase';

export const runtime = 'nodejs';

// Define the response schema to structure the final verdict evaluation
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    hiringVerdict: {
      type: Type.STRING,
      description: "Overall hiring decision. Must be exactly one of: 'Strong Hire', 'Hire', 'Needs Improvement', 'No Hire'."
    },
    executiveSummary: {
      type: Type.STRING,
      description: "A professional, detailed summary (2-3 paragraphs) assessing the candidate's core competencies, depth of technical explanations, areas of mastery, and communication skills relative to the target role and company tier."
    },
    overallStrengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of top 3-4 key technical or architectural strengths demonstrated during the interview."
    },
    overallGaps: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of top 3-4 conceptual holes, missing trade-offs, or improvement areas identified."
    }
  },
  required: ["hiringVerdict", "executiveSummary", "overallStrengths", "overallGaps"]
};

export async function POST(req: NextRequest) {
  try {
    const {
      sessionId,
      domain,
      topic,
      companyType,
      yearsOfExperience,
      proctoringWarningsCount,
      proctoringLog,
      localEvaluations // fallback if Supabase not configured
    } = await req.json();

    if (!domain || !topic) {
      return NextResponse.json(
        { error: 'Missing required fields: domain, topic' },
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

    // 1. Gather all evaluations for this session
    let evaluations = localEvaluations || [];
    let isDbConfigured = true;
    let dbError = null;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes("your-supabase") || supabaseUrl.includes("placeholder-url-for-build")) {
      isDbConfigured = false;
    }

    if (isDbConfigured && sessionId) {
      try {
        const { data: dbEvals, error: fetchErr } = await supabase
          .from('evaluations')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });
        
        if (fetchErr) throw fetchErr;
        if (dbEvals) {
          evaluations = dbEvals;
        }
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error("Error fetching evaluations in finish-session:", err);
        dbError = err.message || err;
      }
    }

    if (!evaluations || evaluations.length === 0) {
      return NextResponse.json({
        hiringVerdict: 'Needs Improvement',
        executiveSummary: 'No answer evaluations were recorded for this session. It is not possible to generate a comprehensive hiring verdict.',
        overallStrengths: [],
        overallGaps: [],
        averageScore: 0
      });
    }

    // Calculate average score
    const sumScores = evaluations.reduce((sum: number, ev: any) => sum + (ev.score || 0), 0); // eslint-disable-line @typescript-eslint/no-explicit-any
    const averageScore = parseFloat((sumScores / evaluations.length).toFixed(2));

    // Construct detailed prompt for executive evaluation
    const evaluationsText = evaluations.map((ev: any, idx: number) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      return `[Question ${idx + 1}] (${ev.difficulty_level || 'Level ?'}/10)
Question: ${ev.question_text}
Candidate Spoken Answer: ${ev.user_answer_text}
Score Given: ${ev.score}/100
Extracted Strengths: ${JSON.stringify(ev.strengths || [])}
Extracted Gaps: ${JSON.stringify(ev.gaps || [])}
`;
    }).join('\n\n');

    const summaryPrompt = `You are a Principal Software Architect and Hiring Manager conducting an executive review of an AI technical interview.
You are evaluating a candidate who applied for a "${companyType || 'Standard Startup'}" company.
Target Role: ${topic}
Expected Years of Experience: ${yearsOfExperience || 0} years.
Proctoring Warnings Flagged: ${proctoringWarningsCount || 0} occurrences.
Average Score: ${averageScore}/100

Here is the transcript and individual questions evaluation for the 7-question session:
----------------------------------------
${evaluationsText}
----------------------------------------

Instructions:
1. Review all candidate answers. Provide a comprehensive aggregate assessment of their tech stack suitability and architectural depth.
2. Determine an overall hiring verdict from these options:
   - 'Strong Hire': Average score is generally >= 85, demonstrates high clarity and technical depth.
   - 'Hire': Average score is generally 70 - 84, solid answers with minor gaps.
   - 'Needs Improvement': Average score is 50 - 69, significant gaps in systems understanding or fundamentals.
   - 'No Hire': Average score is < 50, or severe proctoring violations (multiple attempts of tab switching or cheating).
3. If proctoringWarningsCount is high (e.g. >= 2), adjust the hiring verdict downward or mention it as a major concern in the summary.
4. Extract the top 3-4 aggregate technical strengths and top 3-4 critical concept gaps across the entire interview.
5. Write a professional 2-3 paragraph hiring verdict executive summary. Explain the verdict, assessing their technical maturity and communication skills relative to the target role.
6. Return your evaluation strictly in the JSON format matching the requested schema.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: summaryPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from Gemini API session summary.");
    }

    const summaryResult = JSON.parse(responseText);

    // Save final details in DB if configured
    if (isDbConfigured && sessionId) {
      try {
        const { error: updateErr } = await supabase
          .from('sessions')
          .update({
            status: 'COMPLETED',
            overall_session_score: averageScore,
            completed_at: new Date().toISOString(),
            company_type: companyType,
            years_of_experience: yearsOfExperience,
            hiring_verdict: summaryResult.hiringVerdict,
            executive_summary: summaryResult.executiveSummary,
            overall_strengths: summaryResult.overallStrengths,
            overall_gaps: summaryResult.overallGaps,
            proctoring_warnings_count: proctoringWarningsCount || 0,
            proctoring_log: proctoringLog || []
          })
          .eq('id', sessionId);

        if (updateErr) throw updateErr;
      } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        console.error("Error updating session with final details:", err);
        dbError = err.message || err;
      }
    }

    return NextResponse.json({
      hiringVerdict: summaryResult.hiringVerdict,
      executiveSummary: summaryResult.executiveSummary,
      overallStrengths: summaryResult.overallStrengths,
      overallGaps: summaryResult.overallGaps,
      averageScore: averageScore,
      dbStatus: {
        written: isDbConfigured && !dbError,
        isConfigured: isDbConfigured,
        error: dbError
      }
    });

  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('API Error in finish-session:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
