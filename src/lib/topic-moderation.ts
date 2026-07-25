/**
 * Topic Moderation & Safety Utility
 * Prevents inappropriate, sexually explicit, violent, or harmful content in custom topics.
 */

const INAPPROPRIATE_PATTERNS = [
  // Sexually Explicit / Adult Content
  /\b(porn|porno|pornography|sex|sexual|sexuality|hentai|erotic|xxx|nude|nudity|adult|boobs|vagina|penis|dick|pussy|fuck|bitch|slut|whore|fetish)\b/i,
  
  // Violence / Harm / Crime
  /\b(murder|murderer|kill|killer|killing|suicide|decapitate|slaughter|genocide|terrorist|terrorism|bomb|explosive|rape|rapist|torture|assassinate|blood|gore)\b/i,
  
  // Dangerous / Illegal / Substance Abuse
  /\b(heroin|cocaine|meth|methamphetamine|fentanyl|contraband|child abuse|pedophile|pedophilia)\b/i,

  // Hate Speech & Harassment
  /\b(nigger|nigga|chink|faggot|retard|hitler|nazi)\b/i,
];

export interface ValidationResult {
  isAllowed: boolean;
  reason?: string;
}

/**
 * Validates whether a custom topic name is educational and safe.
 */
export function validateTopicName(topic: string): ValidationResult {
  if (!topic || !topic.trim()) {
    return { isAllowed: false, reason: "Topic name cannot be empty." };
  }

  const trimmed = topic.trim();

  if (trimmed.length < 2) {
    return { isAllowed: false, reason: "Topic name must be at least 2 characters." };
  }
  
  if (trimmed.length > 100) {
    return { isAllowed: false, reason: "Topic name is too long (maximum 100 characters)." };
  }

  for (const pattern of INAPPROPRIATE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { 
        isAllowed: false, 
        reason: "Inappropriate or unsafe topic name detected. Please specify an educational, academic, or technical topic." 
      };
    }
  }

  return { isAllowed: true };
}
