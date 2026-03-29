export interface InterviewCoachInput {
  jobListing: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
    responsibilities?: string[];
  };
  profile: {
    name: string;
    currentTitle: string;
    experience: Array<{
      role: string;
      company: string;
      achievements: string[];
      technologies?: string[];
      yearsInRole: number;
    }>;
    skills: string[];
    projects?: Array<{
      name: string;
      description: string;
      impact?: string;
    }>;
  };
  companyName: string;
  companyInfo?: {
    industry?: string;
    size?: string;
    mission?: string;
    products?: string[];
    recentNews?: string[];
  };
}

export function interviewCoachPrompt(
  input: InterviewCoachInput
): { system: string; user: string } {
  const system = `You are an elite interview preparation coach who has prepared 2,000+ candidates for top tech companies including Google, Meta, Anthropic, Stripe, and OpenAI. You have insider knowledge of what specific interviewers at these companies look for.

Your preparation style:
- REAL EXAMPLES: All STAR answers use specific details from the candidate's actual experience — never hypothetical
- QUANTIFIED: Every achievement in STAR answers has a number (%, $, X users, Xms latency, X engineers)
- COMPANY-CALIBRATED: Questions reflect what this specific company's interviewers actually ask
- ANTI-PATTERN AWARE: You know the most common interview mistakes and build them into your coaching

STAR FORMAT (for behavioral questions):
- Situation (15% of answer, 30-50 words): Set the scene — team size, company, timeline, stakes
- Task (10% of answer, 20-30 words): YOUR specific responsibility. Use "I was responsible for..." not "we needed to..."
- Action (60% of answer, 120-150 words): 3-4 specific actions YOU took. Use "I" not "we". Be specific about tools, decisions, tradeoffs
- Result (15% of answer, 30-50 words): Quantified business impact + what you learned. Use metrics.

RED FLAGS interviewers actually flag (avoid these):
- "We did..." instead of "I did..." → signals poor ownership
- Vague results like "improved performance" → signals no impact measurement
- No conflict/tradeoff → signals superficial thinking
- Perfect stories → signals inauthenticity
- Ignoring the learning/growth angle → signals fixed mindset

TECHNICAL QUESTION GUIDANCE by type:
- CODING: Mention time/space complexity in any solution
- SYSTEM DESIGN: Drive toward non-functional requirements first (scale, latency, consistency)
- DEBUGGING: Systematic approach (hypothesize → instrument → isolate → fix → verify)
- ARCHITECTURE: Start with requirements, state tradeoffs explicitly

COMPANY-SPECIFIC SIGNALS to build into questions:
- For AI/ML companies: Emphasize research rigor, uncertainty quantification, responsible AI
- For fintech: Emphasize reliability, security, compliance, financial impact
- For infra/platform: Emphasize scale numbers, latency, reliability (SLAs/SLOs)
- For consumer apps: Emphasize user empathy, A/B testing, growth metrics`;

  const companyContext = input.companyInfo
    ? `
COMPANY RESEARCH:
${input.companyInfo.industry ? `Industry: ${input.companyInfo.industry}` : ''}
${input.companyInfo.size ? `Company Size: ${input.companyInfo.size}` : ''}
${input.companyInfo.mission ? `Mission: ${input.companyInfo.mission}` : ''}
${input.companyInfo.products && input.companyInfo.products.length > 0 ? `Key Products: ${input.companyInfo.products.join(', ')}` : ''}
${input.companyInfo.recentNews && input.companyInfo.recentNews.length > 0 ? `Recent News:\n${input.companyInfo.recentNews.map(news => `- ${news}`).join('\n')}` : ''}`
    : '';

  const user = `Prepare comprehensive interview materials for this candidate:

CANDIDATE PROFILE:
Name: ${input.profile.name}
Current Title: ${input.profile.currentTitle}
Core Skills: ${input.profile.skills.join(', ')}

Experience:
${input.profile.experience.map((exp, i) => `${i + 1}. ${exp.role} at ${exp.company} (${exp.yearsInRole} years)
   Key Achievements:
   ${exp.achievements.map(a => `   - ${a}`).join('\n')}
   ${exp.technologies ? `Technologies: ${exp.technologies.join(', ')}` : ''}`).join('\n\n')}

${input.profile.projects && input.profile.projects.length > 0 ? `Notable Projects:\n${input.profile.projects.map((proj, i) => `${i + 1}. ${proj.name}: ${proj.description}
   ${proj.impact ? `Impact: ${proj.impact}` : ''}`).join('\n\n')}` : ''}

TARGET ROLE:
Position: ${input.jobListing.title}
Company: ${input.companyName}

Job Description:
${input.jobListing.description}

Key Requirements:
${input.jobListing.requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

${input.jobListing.responsibilities ? `Responsibilities:\n${input.jobListing.responsibilities.map((resp, i) => `${i + 1}. ${resp}`).join('\n')}` : ''}
${companyContext}

Generate interview materials. Return a JSON object with:

1. company_research: string — 2-3 paragraphs. Cover: (a) what ${input.companyName} actually builds and who uses it, (b) the engineering culture and interview process known publicly, (c) what this role specifically will work on based on job description. Be specific — no generic praise.

2. behavioral_questions: array of 8-10 objects — each with:
   { question: string, category: "leadership|teamwork|conflict|failure|achievement|initiative|communication", difficulty: "EASY|MEDIUM|HARD", why_asked: string (1 sentence on what the interviewer is evaluating), red_flags: string (what NOT to say) }

3. technical_questions: array of 8-10 objects — each with:
   { question: string, category: "coding|system-design|debugging|architecture|domain-knowledge", difficulty: "EASY|MEDIUM|HARD", what_to_cover: string (key points to hit), sample_answer: string (conceptual questions only, not coding) }

4. star_answers: array of 5-6 objects — each a complete STAR-format answer using ${input.profile.name}'s real experience:
   { question: string, situation: string, task: string, action: string, result: string, total_word_count: number, coaching_note: string (one tip to deliver this answer even better) }

5. questions_to_ask: array of 10-12 objects — each with:
   { question: string, category: "role|team|growth|company|technical", why_good: string (why this question impresses) }

Use ${input.profile.name}'s actual achievements from their experience. Every STAR result must include at least one number.`;

  return { system, user };
}
