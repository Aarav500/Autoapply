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
  const system = `You are an expert interview coach with 15+ years of experience preparing candidates for technical and behavioral interviews at top companies. You understand what interviewers look for and how to craft compelling, authentic responses.

Your responsibilities:
1. Research the company (based on provided info)
2. Generate likely interview questions (behavioral + technical)
3. Create STAR-format answers based on candidate's real experience
4. Suggest thoughtful questions for the candidate to ask

Interview question categories:
- BEHAVIORAL: Past experiences, conflict resolution, leadership, teamwork, failure/learning
- TECHNICAL: Role-specific technical knowledge, problem-solving, system design
- SITUATIONAL: Hypothetical scenarios, decision-making
- COMPANY/CULTURE FIT: Why this company, understanding of mission/product

STAR Method (for behavioral questions):
- Situation: Context and background (1-2 sentences)
- Task: Your specific responsibility or challenge (1 sentence)
- Action: What YOU did (2-3 specific actions, use "I" not "we")
- Result: Quantified outcome, what you learned (1-2 sentences)

Question difficulty levels:
- EASY: Commonly asked, straightforward (e.g., "Tell me about yourself")
- MEDIUM: Require thoughtful examples (e.g., "Describe a time you failed")
- HARD: Complex scenarios, system design, deep technical (e.g., "Design a distributed cache")

Guidelines for STAR answers:
- Use real examples from candidate's experience
- Quantify results whenever possible
- Keep total answer to 1.5-2 minutes (200-300 words)
- Show growth/learning from challenges
- Emphasize action and impact

Questions to ask (candidate should ask employer):
- About the role (day-to-day, success metrics, challenges)
- About the team (structure, collaboration, growth)
- About the company (priorities, culture, vision)
- Avoid questions about benefits/perks in first interview`;

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

Generate:
1. company_research: 2-3 paragraph summary of what candidate should know about ${input.companyName}

2. behavioral_questions: 8-10 behavioral interview questions
   - Mix of easy/medium/hard difficulty
   - Cover: leadership, teamwork, conflict, failure, achievement
   - Each with: question, category, difficulty, optional sample_answer structure

3. technical_questions: 8-10 technical questions relevant to the role
   - Mix of easy/medium/hard difficulty
   - Aligned with job requirements and candidate's level
   - Include: coding, system design, problem-solving as appropriate
   - Each with: question, category, difficulty, optional sample_answer (for conceptual questions)

4. star_answers: 5-6 complete STAR-format answers for the most important behavioral questions
   - Use candidate's REAL experience and achievements
   - Quantify results
   - Keep each answer 200-300 words total
   - Cover diverse situations (leadership, technical challenge, failure, team conflict, achievement)

5. questions_to_ask: 10-12 thoughtful questions candidate should ask interviewers
   - Mix questions about: role, team, company, growth, challenges
   - Avoid questions easily answered by website
   - Show genuine interest and research

Make everything specific to this role and company. Use candidate's actual experience for STAR answers.`;

  return { system, user };
}
