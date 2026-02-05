import Anthropic from '@anthropic-ai/sdk';

// ============================================
// CLAUDE API CONFIGURATION
// ============================================

// Support both CLAUDE_API_KEY and ANTHROPIC_API_KEY for flexibility
const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

if (!apiKey) {
  console.warn('Claude API key not configured. Set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable.');
}

const anthropic = new Anthropic({
  apiKey: apiKey || '', // Will fail gracefully if not set
});

// ============================================
// TYPE DEFINITIONS
// ============================================

export type ClaudeModel =
  | 'claude-sonnet-4-20250514'
  | 'claude-3-5-sonnet-20241022'
  | 'claude-3-opus-20240229'
  | 'claude-3-haiku-20240307';

export interface GenerateOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  system?: string;
}

export interface GenerateResult {
  text: string;
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================
// CONFIGURATION HELPERS
// ============================================

export function isClaudeConfigured(): boolean {
  return !!apiKey;
}

function validateConfiguration(): void {
  if (!apiKey) {
    throw new Error('Claude API key not configured. Set CLAUDE_API_KEY or ANTHROPIC_API_KEY environment variable.');
  }
}

// ============================================
// CORE GENERATION FUNCTIONS
// ============================================

/**
 * Generate text using Claude
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<string> {
  validateConfiguration();

  const {
    model = 'claude-3-5-sonnet-20241022',
    maxTokens = 4096,
    temperature = 0.7,
    system,
  } = options;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(system && { system }),
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.content[0];
    if (content.type === 'text') {
      return content.text;
    }

    throw new Error('Unexpected response type from Claude');
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Generate and parse JSON response from Claude
 */
export async function generateJSON<T>(
  prompt: string,
  options: GenerateOptions = {}
): Promise<T> {
  const systemPrompt = `${options.system || ''}

IMPORTANT: You must respond with valid JSON only. No markdown code blocks, no explanations, just pure JSON.`;

  const response = await generateText(prompt, {
    ...options,
    system: systemPrompt,
    temperature: options.temperature ?? 0.3, // Lower temp for structured output
  });

  // Clean up response in case it has markdown
  let cleanedResponse = response.trim();
  if (cleanedResponse.startsWith('```json')) {
    cleanedResponse = cleanedResponse.slice(7);
  }
  if (cleanedResponse.startsWith('```')) {
    cleanedResponse = cleanedResponse.slice(3);
  }
  if (cleanedResponse.endsWith('```')) {
    cleanedResponse = cleanedResponse.slice(0, -3);
  }

  try {
    return JSON.parse(cleanedResponse.trim()) as T;
  } catch (parseError) {
    console.error('Failed to parse Claude response as JSON:', cleanedResponse);
    throw new Error('Claude returned invalid JSON response');
  }
}

// ============================================
// JOB MATCHING & ANALYSIS
// ============================================

export interface JobMatchResult {
  matchScore: number;
  matchReasons: string[];
  missingSkills: string[];
  recommendations: string[];
}

/**
 * Analyze how well a job matches a candidate's profile
 */
export async function analyzeJobMatch(
  jobDescription: string,
  userProfile: {
    skills: string[];
    experience: string;
    preferences: string;
  }
): Promise<JobMatchResult> {
  const prompt = `Analyze how well this job matches the candidate's profile.

JOB DESCRIPTION:
${jobDescription}

CANDIDATE PROFILE:
Skills: ${userProfile.skills.join(', ')}
Experience: ${userProfile.experience}
Preferences: ${userProfile.preferences}

Respond with JSON containing:
{
  "matchScore": <number 0-100>,
  "matchReasons": ["reason1", "reason2", ...],
  "missingSkills": ["skill1", "skill2", ...],
  "recommendations": ["recommendation1", ...]
}`;

  return generateJSON<JobMatchResult>(prompt, {
    system: 'You are an expert job matching AI. Analyze job-candidate fit accurately and provide actionable insights.',
    model: 'claude-3-5-sonnet-20241022',
  });
}

// ============================================
// COVER LETTER GENERATION
// ============================================

/**
 * Generate a personalized cover letter
 */
export async function generateCoverLetter(
  jobDetails: {
    title: string;
    company: string;
    description: string;
  },
  userProfile: {
    name: string;
    headline: string;
    experience: string;
    skills: string[];
    achievements: string[];
  }
): Promise<string> {
  const prompt = `Write a professional, personalized cover letter for this job application.

JOB:
Title: ${jobDetails.title}
Company: ${jobDetails.company}
Description: ${jobDetails.description}

CANDIDATE:
Name: ${userProfile.name}
Headline: ${userProfile.headline}
Experience: ${userProfile.experience}
Skills: ${userProfile.skills.join(', ')}
Key Achievements: ${userProfile.achievements.join('; ')}

Write a compelling 3-4 paragraph cover letter that:
1. Opens with a strong hook connecting the candidate to the company
2. Highlights relevant experience and skills with specific examples
3. Shows enthusiasm and cultural fit
4. Ends with a clear call to action

Keep it professional but personable. No generic filler. Be specific about how the candidate's experience matches the job requirements.`;

  return generateText(prompt, {
    system: 'You are an expert cover letter writer. Write compelling, ATS-friendly cover letters that get interviews. Focus on specific achievements and value the candidate brings.',
    model: 'claude-3-opus-20240229',
    temperature: 0.7,
  });
}

// ============================================
// EMAIL CLASSIFICATION
// ============================================

export interface EmailClassification {
  classification: 'recruiter' | 'rejection' | 'interview' | 'offer' | 'follow_up' | 'newsletter' | 'spam';
  confidence: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  extractedInfo: {
    interviewDate?: string;
    interviewType?: string;
    contactName?: string;
    companyName?: string;
    actionRequired?: string;
  };
  suggestedReply?: string;
}

/**
 * Classify job-related emails and extract key information
 */
export async function classifyEmail(emailContent: {
  from: string;
  subject: string;
  body: string;
}): Promise<EmailClassification> {
  const prompt = `Classify this email related to job applications.

FROM: ${emailContent.from}
SUBJECT: ${emailContent.subject}
BODY:
${emailContent.body}

Respond with JSON:
{
  "classification": "recruiter" | "rejection" | "interview" | "offer" | "follow_up" | "newsletter" | "spam",
  "confidence": <0-1>,
  "sentiment": "positive" | "neutral" | "negative",
  "extractedInfo": {
    "interviewDate": "if mentioned (ISO format)",
    "interviewType": "phone/video/onsite if mentioned",
    "contactName": "recruiter/hiring manager name",
    "companyName": "company name",
    "actionRequired": "what user needs to do, if any"
  },
  "suggestedReply": "brief professional reply if response needed, null otherwise"
}`;

  return generateJSON<EmailClassification>(prompt, {
    system: 'You are an expert at analyzing job-related emails. Extract key information accurately and provide helpful insights.',
    model: 'claude-3-haiku-20240307',
    temperature: 0.2,
  });
}

// ============================================
// INTERVIEW PREPARATION
// ============================================

export interface InterviewPrep {
  companyOverview: string;
  likelyQuestions: { question: string; guidance: string }[];
  questionsToAsk: string[];
  tips: string[];
}

/**
 * Generate comprehensive interview preparation materials
 */
export async function generateInterviewPrep(
  interviewDetails: {
    company: string;
    role: string;
    type: string;
    interviewers?: { name: string; title: string }[];
  },
  userProfile: {
    experience: string;
    skills: string[];
  }
): Promise<InterviewPrep> {
  const prompt = `Generate comprehensive interview preparation materials.

INTERVIEW:
Company: ${interviewDetails.company}
Role: ${interviewDetails.role}
Type: ${interviewDetails.type}
${interviewDetails.interviewers ? `Interviewers: ${interviewDetails.interviewers.map((i) => `${i.name} (${i.title})`).join(', ')}` : ''}

CANDIDATE:
Experience: ${userProfile.experience}
Skills: ${userProfile.skills.join(', ')}

Provide JSON with:
{
  "companyOverview": "Brief company background and culture insights",
  "likelyQuestions": [
    {"question": "question text", "guidance": "how to answer well with specific examples"}
  ],
  "questionsToAsk": ["smart question 1", "smart question 2", ...],
  "tips": ["specific tip 1", "specific tip 2", ...]
}`;

  return generateJSON<InterviewPrep>(prompt, {
    system: 'You are an expert interview coach. Provide practical, actionable interview preparation tailored to the specific company and role.',
    model: 'claude-3-5-sonnet-20241022',
  });
}

// ============================================
// RESUME OPTIMIZATION
// ============================================

export interface ResumeOptimization {
  overallScore: number;
  strengths: string[];
  improvements: { section: string; suggestion: string; priority: 'high' | 'medium' | 'low' }[];
  keywordsToAdd: string[];
  atsCompatibility: {
    score: number;
    issues: string[];
  };
}

/**
 * Analyze and provide optimization suggestions for a resume
 */
export async function analyzeResume(
  resumeContent: string,
  targetRole?: string
): Promise<ResumeOptimization> {
  const prompt = `Analyze this resume and provide optimization suggestions${targetRole ? ` for a ${targetRole} position` : ''}.

RESUME:
${resumeContent}

Provide JSON with:
{
  "overallScore": <0-100>,
  "strengths": ["strength1", "strength2", ...],
  "improvements": [
    {"section": "section name", "suggestion": "specific improvement", "priority": "high|medium|low"}
  ],
  "keywordsToAdd": ["keyword1", "keyword2", ...],
  "atsCompatibility": {
    "score": <0-100>,
    "issues": ["issue1", "issue2", ...]
  }
}`;

  return generateJSON<ResumeOptimization>(prompt, {
    system: 'You are an expert resume reviewer and ATS optimization specialist. Provide specific, actionable feedback to improve job application success rates.',
    model: 'claude-3-5-sonnet-20241022',
  });
}

// ============================================
// JOB DESCRIPTION PARSING
// ============================================

export interface ParsedJobDescription {
  title: string;
  company: string;
  location: string;
  salary?: { min?: number; max?: number; currency?: string };
  employmentType: string;
  experienceLevel: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  benefits: string[];
  applicationDeadline?: string;
}

/**
 * Parse and extract structured information from a job description
 */
export async function parseJobDescription(
  jobDescription: string
): Promise<ParsedJobDescription> {
  const prompt = `Parse this job description and extract structured information.

JOB DESCRIPTION:
${jobDescription}

Provide JSON with:
{
  "title": "job title",
  "company": "company name",
  "location": "location (include remote status)",
  "salary": {"min": number, "max": number, "currency": "USD"} or null,
  "employmentType": "full-time|part-time|contract|internship",
  "experienceLevel": "entry|mid|senior|lead|executive",
  "requiredSkills": ["skill1", "skill2", ...],
  "preferredSkills": ["skill1", "skill2", ...],
  "responsibilities": ["responsibility1", "responsibility2", ...],
  "benefits": ["benefit1", "benefit2", ...],
  "applicationDeadline": "ISO date if mentioned" or null
}`;

  return generateJSON<ParsedJobDescription>(prompt, {
    system: 'You are an expert at parsing job descriptions. Extract all relevant information accurately.',
    model: 'claude-3-haiku-20240307',
    temperature: 0.1,
  });
}

// Export default client for advanced usage
export default anthropic;
