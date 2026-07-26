import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import { validateTopicName } from '@/lib/topic-moderation';

export const runtime = 'nodejs';

// Define the response schema to return an array of questions
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List containing exactly the requested number of practice questions generated for this topic."
    }
  },
  required: ["questions"]
};

export async function POST(req: NextRequest) {
  try {
    const { 
      domain, 
      topic, 
      mode, 
      currentLevel, 
      targetRole, 
      count,
      companyType,
      yearsOfExperience,
      extractedEntities,
      resumeData
    } = await req.json();

    if (!domain || !topic || !mode || currentLevel === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: domain, topic, mode, currentLevel' },
        { status: 400 }
      );
    }

    // Validate topic safety
    const topicValidation = validateTopicName(topic);
    if (!topicValidation.isAllowed) {
      return NextResponse.json(
        { error: topicValidation.reason || 'Inappropriate or unsafe topic name detected.' },
        { status: 400 }
      );
    }

    const questionCount = count || 1;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured on the server.' },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Generate prompt instructing the model
    let prompt = "";

    if (mode === 'AI_INTERVIEW') {
      prompt = `You are a professional technical interviewer representing a "${companyType || 'Standard Startup'}" company. You are conducting an AI-powered live interview for the role of "${targetRole || 'Software Engineer'}" (Candidate YoE: ${yearsOfExperience || 0} years).
The target topic is "${topic}".
The difficulty level is ${currentLevel} out of 10.
`;
      if (resumeData && resumeData.projects && resumeData.projects.length > 0) {
        const resumeSummary = `Candidate Resume Snapshot:
- Name: ${resumeData.candidateName || 'Candidate'}
- Profile: ${resumeData.summary || 'Technical candidate'}
- Key Skills: ${resumeData.skills?.join(', ') || 'N/A'}
- Projects: ${JSON.stringify(resumeData.projects)}
- Experience: ${JSON.stringify(resumeData.experience || [])}`;
        
        prompt += `
[RESUME & PORTFOLIO CONTEXT AVAILABLE]:
${resumeSummary}

Instructions:
1. Generate EXACTLY ${questionCount} distinct question(s) tailored to this candidate.
2. Ground your questions directly in the candidate's actual projects and experience listed above while focusing on the target topic "${topic}" and role "${targetRole}".
   - Mimic a realistic interviewer: Reference a specific project by name (e.g. "I see on your resume that you built [Project Title] using [Tech Stack]...").
   - Probe into their architectural decisions, tech stack choices, trade-offs, scaling challenges, database queries, state management, or concurrency handling in that project.
3. Align the question complexity with level ${currentLevel}/10 for a "${companyType}" style interview.
`;
      } else {
        prompt += `
Instructions:
1. Generate EXACTLY ${questionCount} distinct question(s) that fits a "${companyType}" interview style:
   - MAANG: Focus on core computer science foundations, highly optimized algorithms, scale, complex system design, and deep technical rigor.
   - Tech Unicorn: Focus on system architecture, handling rapid growth, performance optimizations, API designs, and real-world tools.
   - Service-based Giants (e.g. TCS): Focus on structured programming principles, database queries, core technology frameworks (e.g., Spring Boot, React), and syntax.
   - New Startups: Focus on practical full-stack knowledge, agile tool sets, speedy implementation, and debugging.
2. The question complexity must align with level ${currentLevel}/10.
`;
      }

      if (extractedEntities && (extractedEntities.technologies?.length > 0 || extractedEntities.frameworks?.length > 0 || extractedEntities.architecturalChoices?.length > 0 || extractedEntities.projectDetails?.length > 0)) {
        const entitiesStr = JSON.stringify(extractedEntities);
        prompt += `
3. DYNAMIC FOLLOW-UP REQUIREMENT: The candidate recently mentioned the following technologies/architectures/projects in their previous answers: ${entitiesStr}.
   Instead of asking a generic question, generate a dynamic follow-up question. Mimic a real human interviewer who says: "Oh, you mentioned using X, can you explain how you handled Y in that design?". Probe deeper into the specific trade-offs, scaling limits, or failures related to those tools.
4. Output the questions inside the JSON array matching the requested schema.`;
      } else {
        prompt += `
3. Ask a structured, open-ended technical question suitable for the role, experience level, and candidate's portfolio.
4. Output the questions inside the JSON array matching the requested schema.`;
      }
    } else {
      prompt = `You are a professional examiner and interview coach for the track "${domain}" and topic/role "${topic}".
Generate exactly ${questionCount} distinct practice questions suited for a candidate at skill level ${currentLevel} out of 10.
User's Target Role: ${targetRole || 'Software Engineer'}
Mode: ${mode === 'STUDY' ? 'Study Mode (Concept Deep-Dive, high learning value, conceptual questions)' : 'Mock Interview Mode (Strict mock interview, realistic, testing precision and communication)'}

Instructions:
1. Generate EXACTLY ${questionCount} distinct, relevant, and clear questions.
2. The question complexity must align with level ${currentLevel}/10:
   - Level 1-3: Core fundamentals, simple syntax, definitions, basic concepts.
   - Level 4-6: Optimization, intermediate concepts, edge cases, implementation details.
   - Level 7-8: Advanced concepts, trade-offs, architecture, design choices, concurrency.
   - Level 9-10: Complex system design, distributed systems, high scalability, trade-offs under constraints.
3. For software engineering/development domains, if level >= 4, feel free to ask questions that require writing or explaining code.
4. Output the questions inside the JSON array matching the requested schema. Ensure they are distinct and do not repeat.`;
    }

    // Call Gemini API for structured JSON output
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response from Gemini API question generator.");
    }

    const result = JSON.parse(responseText);
    
    // Safety check to ensure we returned the correct size list
    let questions = result.questions || [];
    if (questions.length === 0) {
      questions = [`Explain the core concepts of ${topic} at difficulty level ${currentLevel}.`];
    }

    return NextResponse.json({
      questions: questions
    });

  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('API Error in generate-questions:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
