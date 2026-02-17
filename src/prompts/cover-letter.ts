export interface CoverLetterInput {
  profile: {
    name: string;
    currentTitle: string;
    experience: Array<{
      company: string;
      role: string;
      achievements: string[];
      technologies?: string[];
    }>;
    skills: string[];
    achievements?: string[];
  };
  jobListing: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
    companyInfo?: string;
  };
}

export function coverLetterPrompt(input: CoverLetterInput): { system: string; user: string } {
  const system = `You are an expert cover letter writer who has helped thousands of candidates land interviews at top companies. You understand that recruiters spend 6-10 seconds scanning a cover letter, so every word must count.

Your writing philosophy:
- NEVER open with "I am writing to apply for..." or similar clichés
- START with a compelling hook: a relevant achievement, insight about the company, or bold statement
- Make it about THEM (the company) more than YOU
- Use SPECIFIC examples and quantified achievements
- Show you've researched the company and understand their challenges
- Demonstrate clear value proposition: what you bring to solve their problems
- Be authentic and conversational while maintaining professionalism
- Keep it concise: 3-4 short paragraphs maximum

Structure:
1. Hook paragraph: Grab attention with a relevant achievement or company insight
2. Experience paragraph: 2-3 specific examples showing relevant skills/achievements
3. Company-fit paragraph: Why this company specifically (not just any company)
4. Call-to-action: Express enthusiasm and next steps

Writing style:
- Active voice, strong verbs
- Specific metrics and outcomes
- Industry terminology (shows you know the field)
- Conversational but professional tone
- No buzzwords or corporate speak ("synergy," "leverage," "dynamic team player")
- Each paragraph has a clear purpose

Key points to address from job listing:
- Mirror language from job description (ATS optimization)
- Address 2-3 key requirements explicitly
- Show how your experience solves their specific needs`;

  const user = `Write a compelling cover letter for the following job application:

CANDIDATE PROFILE:
Name: ${input.profile.name}
Current Title: ${input.profile.currentTitle}

Recent Experience:
${input.profile.experience.map((exp, i) => `${i + 1}. ${exp.role} at ${exp.company}
   Key Achievements: ${exp.achievements.join('; ')}
   ${exp.technologies ? `Technologies: ${exp.technologies.join(', ')}` : ''}`).join('\n\n')}

Core Skills: ${input.profile.skills.join(', ')}

${input.profile.achievements ? `Notable Achievements:\n${input.profile.achievements.map((a, i) => `${i + 1}. ${a}`).join('\n')}` : ''}

TARGET JOB:
Position: ${input.jobListing.title}
Company: ${input.jobListing.company}
${input.jobListing.companyInfo ? `Company Background: ${input.jobListing.companyInfo}` : ''}

Job Description:
${input.jobListing.description}

Key Requirements:
${input.jobListing.requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

Generate a cover letter that:
1. Opens with a hook that relates to ${input.jobListing.company} or a standout achievement
2. Explicitly addresses at least 2-3 key requirements from the job listing
3. Uses specific examples and metrics from the candidate's experience
4. Shows genuine interest in ${input.jobListing.company} specifically
5. Ends with a confident call-to-action
6. Keeps each paragraph focused and concise

Output format:
- greeting: Appropriate salutation (use "Dear Hiring Manager" if name unknown)
- paragraphs: Array of paragraph objects with content and purpose
- signoff: Professional closing
- key_points_addressed: List of specific requirements from job listing that were addressed`;

  return { system, user };
}
