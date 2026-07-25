# 🎯 Exam Buddy — Presentation Deck

---

## 📌 Slide 1: Title & Executive Overview

# Exam Buddy ⚡
### Next-Gen AI Study Coach & Resume-Grounded Proctored Mock Interviewer

> **Empowering candidate readiness through adaptive AI coaching, multi-format resume grounding, and real-time proctored mock technical interviews.**

- **Tech Stack**: Next.js 16 (App Router), React 19, TypeScript, Google Gemini 3.5 Flash, Supabase PostgreSQL.
- **Key Highlight**: Grounding technical interview questions directly in candidate portfolio projects across **PDF, Word, PPTX, Markdown, and TXT** documents.

---

## 📌 Slide 2: Problem Statement & Vision

### The Problem with Traditional Interview Prep
1. **Generic Questions**: Most interview tools ask static, cookie-cutter questions unrelated to what candidates actually built.
2. **Lack of Realism**: Real MAANG/Unicorn technical interviewers spend 40-60% of an interview probing candidate projects and trade-offs.
3. **No Proctored Environment**: Candidate practice lacks focus accountability, anti-cheat monitoring, or verbal articulation practice.

### Our Vision
To build **Exam Buddy** — an intelligent, adaptive interview and study coach that listens to candidates, evaluates their real project experience, monitors test focus, and dynamically adjusts question difficulty level-by-level (1 to 10).

---

## 📌 Slide 3: Core Platform Features

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           EXAM BUDDY PLATFORM                           │
├───────────────────────────────────────┬─────────────────────────────────┤
│ 📄 Multi-Format Resume Grounding      │ 🔒 Anti-Cheat Proctor Guard     │
│ • Parses PDF, DOCX, PPTX, MD & TXT    │ • Focus & tab-switch monitoring │
│ • Extracts projects, tech stack & YoE │ • Strict warning & forfeit rules│
├───────────────────────────────────────┼─────────────────────────────────┤
│ 📈 Dynamic Level Adaptation (1-10)    │ 🎙️ Hands-Free Speech Evaluation  │
│ • >80% Score ➔ Difficulty Level Up   │ • Real-time Web Speech API      │
│ • <50% Score ➔ Level Decrease         │ • Automated entity extraction   │
└───────────────────────────────────────┴─────────────────────────────────┘
```

---

## 📌 Slide 4: Feature Deep-Dive — Resume Upload & AI Grounding

### 📄 Multi-Format Document Support
Candidates can upload or paste their resume/portfolio in:
- **PDF** (`.pdf`) via native Gemini 3.5 Flash multimodal base64 parsing.
- **Word Documents** (`.docx`, `.doc`) using `mammoth` binary text extraction.
- **PowerPoint Presentations** (`.pptx`, `.ppt`) slide text parsing.
- **Markdown (`.md`) & Plain Text (`.txt`)** direct string parsing.
- **Direct Copy-Paste** raw text modal input.

### 🧠 Gemini 3.5 Flash Entity Extraction
The system extracts:
1. **Candidate Profile Snapshot & Skills**
2. **Projects Matrix**: Title, Tech Stack, Core Objective, Architectural Features.
3. **Work History & Contributions**

### 💬 Hyper-Realistic Interviewing
*Example Question Generated*:
> *"I see on your resume that you built a real-time collaborative editor using WebSockets and Redis — how did you handle synchronization conflicts when concurrent users edited the same section?"*

---

## 📌 Slide 5: Company Tier Mimicry & Mode Selection

Candidates can configure their practice sessions tailored to specific target tiers:

| Company Tier | Interview Focus & Question Style |
| :--- | :--- |
| **🌐 MAANG Tier** | Deep Data Structures & Algorithms, scale, distributed systems rigor. |
| **🦄 Tech Unicorns** | High-growth system architecture, API design, trade-off optimization. |
| **🏢 Service Giants (e.g. TCS)** | Core programming principles, SQL, framework mechanics (React, Spring Boot). |
| **🚀 Early Startups** | Full-stack building, rapid debugging, practical tooling & agility. |

---

## 📌 Slide 6: System Architecture & Technical Stack

```mermaid
graph TD
    A[Client User Interface - Next.js 16 / React 19] --> B[Resume & Portfolio Uploader]
    A --> C[Voice / Web Speech API]
    A --> D[Anti-Cheat Focus Monitor]
    
    B --> E[/api/parse-resume API Route]
    E --> F[Mammoth DOCX Extractor / Multimodal Buffer]
    F --> G[Gemini 3.5 Flash Structured JSON Engine]

    A --> H[/api/generate-questions API Route]
    G --> H
    H --> G

    A --> I[/api/evaluate-answer API Route]
    I --> G
    I --> J[(Supabase PostgreSQL / Local Cache)]
```

- **Frontend**: Next.js 16 (Turbopack), React 19, Vanilla CSS Design System, Lucide Icons.
- **AI Engine**: `@google/genai` with Gemini 3.5 Flash structured JSON response schemas.
- **Persistence**: Supabase PostgreSQL database + `localStorage` fallback state.

---

## 📌 Slide 7: Product Demo & User Journey

1. **Dashboard Setup**: Pick a domain track (*Tech & Software, Data & AI, Competitive Prep*), choose target role, and upload resume.
2. **Portfolio Preview**: Review parsed projects, technical skills matrix, and summary overview.
3. **Launch Interview Wizard**: Set company tier (*MAANG, Unicorn, Startup*) and years of experience.
4. **Live Interview Session**:
   - Answer via spoken voice or keyboard.
   - Grounded project questions reference uploaded portfolio.
   - Proctor guard ensures active focus.
5. **Instant Granular Feedback**: Score breakdown out of 100, identified strengths, gap analysis, expected concepts, and recommended learning resources.

---

## 📌 Slide 8: Summary & Future Roadmap

### Accomplishments
- ✅ Full multi-format resume parsing API built & integrated.
- ✅ Dynamic project-grounded question generator deployed.
- ✅ Proctored AI interview experience with anti-cheat monitoring.
- ✅ 100% clean Next.js build compilation verified.

### Next Horizons
- 💻 **Live Code Sandbox**: In-browser compiler & unit test execution for coding interviews.
- 📹 **Facial Gaze AI Detection**: Computer vision proctoring via `face-api.js`.
- 📊 **Recruiter Dashboards**: Candidate capability reports for hiring teams.

---
*Thank you! Questions & Live Demo* 🚀
