import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorResponse, successResponse, authenticate, handleError } from '@/lib/api-utils';
import { aiClient } from '@/lib/ai-client';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { careerRoadmapPrompt, projectIdeasPrompt, weeklyActionsPrompt } from '@/prompts/mentor';

const inputSchema = z.object({
  action: z.enum(['roadmap', 'projects', 'research-ideas', 'weekly', 'chat']),
  goals: z.array(z.string()).optional(),
  timeframe: z.string().optional(),
  targetField: z.string().optional(),
  goalType: z.string().optional(),
  completedActions: z.array(z.string()).optional(),
  message: z.string().max(2000).optional(),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
});

const chatSchema = z.object({
  response: z.string(),
  follow_up_questions: z.array(z.string()).default([]),
  action_items: z.array(z.string()).default([]),
  resources: z.array(z.object({
    title: z.string(),
    type: z.string().default('resource'),
    description: z.string().default(''),
  })).default([]),
});

const milestoneSchema = z.object({
  milestone: z.string().default(''),
  title: z.string().optional(),
  actions: z.array(z.string()).default([]),
  metrics: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([]),
}).transform((m) => ({
  ...m,
  milestone: m.milestone || m.title || '',
}));

const quarterSchema = z.object({
  quarter: z.string().default(''),
  name: z.string().optional(),
  title: z.string().optional(),
  period: z.string().optional(),
  theme: z.string().default(''),
  focus: z.string().optional(),
  description: z.string().optional(),
  milestones: z.array(milestoneSchema).default([]),
  goals: z.array(milestoneSchema).optional(),
}).transform((q) => ({
  quarter: q.quarter || q.name || q.title || q.period || '',
  theme: q.theme || q.focus || q.description || '',
  milestones: q.milestones.length > 0 ? q.milestones : (q.goals || []),
}));

const roadmapSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  const aliasMap: Record<string, string> = {
    overview: 'summary',
    strategy_summary: 'summary',
    executive_summary: 'summary',
    overall_strategy: 'summary',
    phases: 'quarters',
    timeline: 'quarters',
    roadmap: 'quarters',
    milestones: 'quarters',
    plan: 'quarters',
    risks: 'key_risks',
    advantages: 'competitive_advantages',
    strengths: 'competitive_advantages',
  };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = aliasMap[key] || key;
    if (!(mappedKey in result) || result[mappedKey] === undefined) {
      result[mappedKey] = value;
    }
  }
  return result;
}, z.object({
  summary: z.string().default(''),
  quarters: z.array(quarterSchema).default([]),
  key_risks: z.array(z.string()).default([]),
  competitive_advantages: z.array(z.string()).default([]),
}));

const projectsSchema = z.object({
  projects: z.array(z.object({
    title: z.string(),
    description: z.string(),
    impact: z.string().default('high'),
    difficulty: z.string().default('medium'),
    time_estimate: z.string().default('2-4 weeks'),
    tech_stack: z.array(z.string()).default([]),
    learning_outcomes: z.array(z.string()).default([]),
    portfolio_value: z.string().default(''),
    steps: z.array(z.string()).default([]),
  })).default([]),
});

const researchIdeasSchema = z.object({
  ideas: z.array(z.object({
    title: z.string(),
    field: z.string(),
    description: z.string(),
    novelty: z.string().default(''),
    methodology: z.string().default(''),
    potential_venues: z.array(z.string()).default([]),
    required_skills: z.array(z.string()).default([]),
    estimated_timeline: z.string().default('3-6 months'),
  })).default([]),
});

const taskSchema = z.object({
  task: z.string(),
  category: z.string().default('learning'),
  priority: z.string().default('medium'),
  estimated_time: z.string().default('1h'),
});

const dayActionSchema = z.object({
  day: z.string(),
  tasks: z.array(taskSchema).default([]),
});

// AI sometimes returns daily_actions as an object keyed by day name instead of an array
const coerceDailyActions = z.union([
  z.array(dayActionSchema),
  z.record(z.string(), z.array(taskSchema)),
]).transform((val) => {
  if (Array.isArray(val)) return val;
  // Convert { "Monday": [...tasks], "Tuesday": [...tasks] } to [{ day: "Monday", tasks: [...] }]
  return Object.entries(val).map(([day, tasks]) => ({ day, tasks }));
}).default([]);

const weeklySchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const obj = raw as Record<string, unknown>;
  // Map common AI aliases to expected schema keys
  const aliasMap: Record<string, string> = {
    daily_schedule: 'daily_actions',
    schedule: 'daily_actions',
    daily_plan: 'daily_actions',
    motivational_message: 'motivation',
    motivation_message: 'motivation',
    message: 'motivation',
    goals: 'weekly_goals',
  };
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const mappedKey = aliasMap[key] || key;
    // Don't overwrite if the canonical key already exists
    if (!(mappedKey in result) || result[mappedKey] === undefined) {
      result[mappedKey] = value;
    }
  }
  return result;
}, z.object({
  focus_areas: z.array(z.string()).default([]),
  daily_actions: coerceDailyActions,
  weekly_goals: z.array(z.string()).default([]),
  motivation: z.string().default(''),
}));

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: Array<{ name: string; proficiency: string }>;
  experience: Array<{
    company: string;
    role: string;
    startDate: string;
    endDate: string | null;
    location: string;
    responsibilities: string[];
    achievements?: string[];
    technologies?: string[];
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field: string;
    startDate: string;
    endDate: string | null;
    gpa?: string;
    honors?: string[];
  }>;
  socialLinks: Array<{ platform: string; url: string }>;
  interests?: string[];
  projects?: Array<{
    name: string;
    description: string;
    technologies: string[];
  }>;
}

/**
 * POST /api/mentor
 * AI Mentor - career roadmap, project ideas, research ideas, weekly actions
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    const body = await req.json();
    const validation = inputSchema.safeParse(body);

    if (!validation.success) {
      return errorResponse('Invalid request body', 400, 'VALIDATION_ERROR');
    }

    const { action, goals, timeframe, targetField, goalType, completedActions } = validation.data;

    logger.info({ userId, action }, 'Mentor request');

    // Load user profile
    const profile = await storage.getJSON<ProfileData>(`users/${userId}/profile.json`);
    if (!profile) {
      return errorResponse('Profile not found. Please complete your profile first.', 404, 'PROFILE_NOT_FOUND');
    }

    let result: unknown;

    switch (action) {
      case 'roadmap': {
        const prompt = careerRoadmapPrompt({
          profile: {
            name: profile.name || 'User',
            education: profile.education || [],
            experience: (profile.experience || []).map(exp => ({
              company: exp.company,
              role: exp.role,
              startDate: exp.startDate,
              endDate: exp.endDate,
              responsibilities: exp.responsibilities || [],
              achievements: exp.achievements,
            })),
            skills: profile.skills || [],
            currentRole: profile.headline || undefined,
          },
          goals: goals || ['Advance my career'],
          timeframe: timeframe || '1 year',
        });

        result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          roadmapSchema,
          { model: 'balanced', maxTokens: 8192 }
        );
        break;
      }

      case 'projects': {
        const prompt = projectIdeasPrompt({
          profile: {
            name: profile.name || 'User',
            skills: profile.skills || [],
            experience: (profile.experience || []).map(exp => ({
              company: exp.company,
              role: exp.role,
              startDate: exp.startDate,
              endDate: exp.endDate,
            })),
            interests: profile.interests || [],
          },
          targetField: targetField || 'AI',
          goalType: goalType || 'portfolio',
        });

        result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          projectsSchema,
          { model: 'balanced', maxTokens: 8192 }
        );
        break;
      }

      case 'research-ideas': {
        const skillsSummary = (profile.skills || []).map(s => `${s.name} (${s.proficiency})`).join(', ');
        const experienceSummary = (profile.experience || []).map(exp =>
          `${exp.role} at ${exp.company}`
        ).join('; ');

        const researchSystem = `You are an expert research advisor specializing in AI, Machine Learning, Quantitative Finance, and Cybersecurity. You have extensive experience guiding research at top universities and labs including MIT CSAIL, Stanford AI Lab, CMU, and Berkeley.

Your research idea recommendations are:
1. NOVEL: Each idea should address a genuine gap in current research or propose a fresh approach
2. FEASIBLE: Ideas should be achievable with available tools and within realistic timelines
3. PUBLISHABLE: Each idea should have clear potential for publication at top venues (NeurIPS, ICML, AAAI, IEEE S&P, USENIX, ACM CCS, etc.)
4. IMPACTFUL: Ideas should have real-world applications or advance fundamental understanding
5. SPECIFIC: Include concrete methodology suggestions, not vague research directions
6. SKILL-APPROPRIATE: Match the complexity to the researcher's current skill level while providing stretch

For each research idea, provide the title, field, description, what makes it novel, suggested methodology, potential publication venues, required skills, and estimated timeline.`;

        const researchUser = `Generate 5-7 novel research ideas for ${profile.name || 'User'}.

Profile:
Skills: ${skillsSummary || 'General CS background'}
Experience: ${experienceSummary || 'None listed'}
Education: ${(profile.education || []).map(e => `${e.degree} in ${e.field} at ${e.institution}`).join('; ') || 'Not specified'}

Target Field: ${targetField || 'AI'}

Generate research ideas that are specifically relevant to ${targetField || 'AI'} and appropriate for someone with this background. Each idea should be meaningfully different and cover different sub-areas of the target field.`;

        result = await aiClient.completeJSON(
          researchSystem,
          researchUser,
          researchIdeasSchema,
          { model: 'balanced', maxTokens: 8192 }
        );
        break;
      }

      case 'weekly': {
        const prompt = weeklyActionsPrompt({
          profile: {
            name: profile.name || 'User',
            skills: profile.skills || [],
            currentFocus: profile.headline || 'General development',
          },
          goals: goals || ['Make progress on career goals'],
          completedActions,
        });

        result = await aiClient.completeJSON(
          prompt.system,
          prompt.user,
          weeklySchema,
          { model: 'balanced', maxTokens: 8192 }
        );
        break;
      }

      case 'chat': {
        if (!validation.data.message) {
          return errorResponse('message is required for chat action', 400, 'VALIDATION_ERROR');
        }

        const conversationHistory = (validation.data.history || [])
          .map((m) => `${m.role === 'user' ? 'Candidate' : 'Mentor'}: ${m.content}`)
          .join('\n\n');

        const profileSummary = `
Name: ${profile.name || 'User'}
Current Headline: ${profile.headline || 'Not set'}
Skills: ${(profile.skills || []).slice(0, 10).map((s: { name: string; proficiency: string }) => `${s.name} (${s.proficiency})`).join(', ')}
Experience: ${(profile.experience || []).slice(0, 3).map((e: { role: string; company: string }) => `${e.role} at ${e.company}`).join('; ')}
Education: ${(profile.education || []).slice(0, 2).map((e: { degree: string; field: string; institution: string }) => `${e.degree} in ${e.field} at ${e.institution}`).join('; ')}
`.trim();

        const chatSystem = `You are an elite AI career mentor with the combined expertise of a top FAANG engineering manager, a YC alumni founder, a MIT career counselor, and a Wharton MBA advisor. You give direct, personalized, and actionable career advice.

Your mentoring style:
- DIRECT: Skip platitudes — give honest, specific advice even if uncomfortable
- PERSONALIZED: Reference the candidate's actual background in every response
- ACTIONABLE: Every response ends with 1-3 concrete next steps the candidate can do TODAY or THIS WEEK
- SOCRATIC: Ask one focused follow-up question to better understand their situation before giving generic advice
- RESOURCEFUL: Recommend specific books, courses, people to follow, or communities when relevant

Your expertise covers:
- Career transitions and pivots (entry-level to FAANG, IC to manager, academia to industry)
- Technical interview preparation (LeetCode, system design, behavioral)
- Salary negotiation and compensation strategy
- Building a personal brand on GitHub/LinkedIn/Twitter
- Research careers (PhD, industry research labs, publishing)
- Startup founding and product development
- Networking and referrals at specific companies
- Visa and immigration for tech workers
- Work-life balance and avoiding burnout
- Remote work and distributed team dynamics

Candidate Profile:
${profileSummary}`;

        const chatUser = conversationHistory
          ? `Previous conversation:\n${conversationHistory}\n\nCandidate's new message: ${validation.data.message}`
          : `Candidate's message: ${validation.data.message}`;

        result = await aiClient.completeJSON(
          chatSystem,
          chatUser + '\n\nRespond conversationally in 2-4 paragraphs. Be specific to their background. Include follow_up_questions (1-2 questions to better understand their situation), action_items (1-3 concrete tasks), and resources (0-2 relevant books/courses/tools) in the JSON response.',
          chatSchema,
          { model: 'balanced', maxTokens: 2048 }
        );

        // Save chat message to history
        const chatKey = `users/${userId}/mentor/chat-history.json`;
        const existing = await storage.getJSON<{ messages: unknown[] }>(chatKey);
        const messages = existing?.messages || [];
        messages.push({
          role: 'user',
          content: validation.data.message,
          timestamp: new Date().toISOString(),
        });
        messages.push({
          role: 'assistant',
          content: (result as { response: string }).response,
          timestamp: new Date().toISOString(),
        });
        // Keep last 50 messages
        if (messages.length > 50) messages.splice(0, messages.length - 50);
        await storage.putJSON(chatKey, { messages });

        break;
      }
    }

    // Save results (chat saves its own history inline above)
    if (action !== 'chat') {
      const mentorKey = `users/${userId}/mentor/${action}.json`;
      await storage.putJSON(mentorKey, {
        action,
        result,
        generatedAt: new Date().toISOString(),
        inputs: { goals, timeframe, targetField, goalType, completedActions },
      });
    }

    logger.info({ userId, action }, 'Mentor result generated and saved');

    return successResponse({ action, data: result });
  } catch (error) {
    logger.error({ error }, 'Mentor API error');
    return handleError(error);
  }
}

/**
 * GET /api/mentor
 * Retrieve mentor chat history
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const chatKey = `users/${userId}/mentor/chat-history.json`;
    const history = await storage.getJSON<{ messages: unknown[] }>(chatKey);
    return successResponse({ messages: history?.messages || [] });
  } catch (error) {
    return handleError(error);
  }
}
