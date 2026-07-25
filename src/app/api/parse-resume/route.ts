import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';
import mammoth from 'mammoth';

export const runtime = 'nodejs';

// Define structured JSON schema for parsed resume output
const resumeResponseSchema = {
  type: Type.OBJECT,
  properties: {
    candidateName: {
      type: Type.STRING,
      description: "Candidate's full name if identified in the resume/document, otherwise 'Candidate'."
    },
    skills: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "List of key technical skills, programming languages, databases, cloud platforms, and tools."
    },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { 
            type: Type.STRING, 
            description: "Title or name of the project" 
          },
          techStack: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Programming languages, frameworks, libraries, databases, or cloud tools used in this project" 
          },
          description: { 
            type: Type.STRING, 
            description: "Clear, detailed summary of what the project does and its core objective" 
          },
          keyFeatures: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Notable architectural decisions, scalability solutions, key features, or accomplishments" 
          }
        },
        required: ["title", "techStack", "description"]
      },
      description: "List of technical projects, portfolio applications, open-source work, or capstone projects."
    },
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          company: { type: Type.STRING, description: "Company, organization, or client name" },
          role: { type: Type.STRING, description: "Job title or role" },
          keyContributions: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING }, 
            description: "Key technical achievements, responsibilities, or engineering impact" 
          }
        },
        required: ["company", "role"]
      },
      description: "List of professional work experience, internships, or freelance roles."
    },
    summary: {
      type: Type.STRING,
      description: "A concise 2-sentence technical snapshot summarizing the candidate's core expertise, primary stack, and background."
    }
  },
  required: ["candidateName", "skills", "projects", "experience", "summary"]
};

/**
 * Extracts printable ASCII / UTF-8 text from raw binary buffers (e.g. pptx, doc files)
 */
function extractPrintableText(buffer: Buffer): string {
  const str = buffer.toString('utf-8');
  // Clean up non-printable XML/binary characters while preserving words and punctuation
  const cleanStr = str.replace(/[^\x20-\x7E\t\r\n]/g, ' ');
  // Split into chunks of printable text longer than 3 chars
  const words = cleanStr.split(/\s+/).filter(w => w.length > 2 && /^[a-zA-Z0-9#+.\-_/()]+$/.test(w));
  return words.join(' ');
}

export async function POST(req: NextRequest) {
  try {
    const { fileContent, fileType, fileName } = await req.json();

    if (!fileContent) {
      return NextResponse.json(
        { error: 'Missing required field: fileContent' },
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
    const normalizedType = (fileType || '').toLowerCase().replace('.', '');
    
    let textPromptContent = '';
    let contentsPayload: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (normalizedType === 'pdf') {
      // Pass PDF natively via Gemini inlineData
      contentsPayload = [
        {
          inlineData: {
            mimeType: 'application/pdf',
            data: fileContent // Base64 encoded string
          }
        },
        `Analyze the attached resume/document for "${fileName || 'Candidate Resume'}". Extract candidate details, key technical skills, all personal or professional projects (with their specific tech stacks and architectural details), work experience, and a concise technical summary according to the output schema.`
      ];
    } else if (normalizedType === 'docx' || normalizedType === 'doc') {
      try {
        const buffer = Buffer.from(fileContent, 'base64');
        const mammothResult = await mammoth.extractRawText({ buffer });
        textPromptContent = mammothResult.value;
      } catch (err) {
        console.warn('Mammoth extraction fallback to raw text parsing:', err);
        const buffer = Buffer.from(fileContent, 'base64');
        textPromptContent = extractPrintableText(buffer);
      }
    } else if (normalizedType === 'pptx' || normalizedType === 'ppt') {
      try {
        const buffer = Buffer.from(fileContent, 'base64');
        textPromptContent = extractPrintableText(buffer);
      } catch (err) {
        console.warn('PPTX parsing fallback:', err);
        textPromptContent = fileContent;
      }
    } else {
      // Plain text, Markdown (.md), or raw text copy-paste
      textPromptContent = fileContent;
    }

    if (!contentsPayload) {
      if (!textPromptContent || textPromptContent.trim().length === 0) {
        return NextResponse.json(
          { error: 'Could not extract readable text from the provided document.' },
          { status: 400 }
        );
      }

      contentsPayload = `You are an expert technical recruiter and AI interviewer parser.
Analyze the following resume / portfolio document (${fileName || 'Uploaded Document'}):

--- DOCUMENT START ---
${textPromptContent.slice(0, 15000)}
--- DOCUMENT END ---

Instructions:
1. Extract candidate name, technical skills, detailed projects (including tech stack, features, and descriptions), work experience, and a 2-sentence snapshot summary.
2. Ensure project titles, tech stacks (e.g. React, Node.js, PostgreSQL, Docker, PyTorch), and key architectural highlights are accurately captured.
3. Return your analysis strictly formatted inside JSON matching the requested schema.`;
    }

    // Call Gemini API to parse the resume into structured JSON
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: contentsPayload,
      config: {
        responseMimeType: "application/json",
        responseSchema: resumeResponseSchema,
      }
    });

    const responseText = response.text;
    if (!responseText) {
      throw new Error("No response returned from Gemini API resume parser.");
    }

    const parsedData = JSON.parse(responseText);

    return NextResponse.json({
      success: true,
      resumeData: parsedData
    });

  } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    console.error('API Error in parse-resume:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error while parsing resume' },
      { status: 500 }
    );
  }
}
