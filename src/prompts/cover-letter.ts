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
  const system = `You are a world-class cover letter writer who has helped candidates land roles at Google, Anthropic, Stripe, and other top companies. You understand that a great cover letter is a story, not a list of qualifications.

Your writing philosophy:
- NEVER open with "I am writing to apply for..." or "I am excited to apply for..." — these are immediately forgettable
- The HOOK must grab attention in the first 10 words: lead with a surprising insight, a specific achievement with numbers, or a connection to the company's mission
- Make it about THEM (the company's problems, goals, mission) first — YOU are the solution
- Every claim must be backed by a specific, quantified example: not "improved performance" but "reduced API latency by 40% serving 2M users"
- Show you've done real research: reference a specific product, engineering blog post, company decision, or founder quote
- Sound like a human wrote it: conversational, direct, confident — not corporate speak
- 3 paragraphs MAX. Recruiters read for 8 seconds. Every sentence must earn its place.

Structure:
1. HOOK (2-3 sentences): A bold opening that connects YOUR most relevant achievement to THEIR specific challenge. Make them think "this person gets us."
2. PROOF (3-4 sentences): 2-3 concrete accomplishments directly mapped to the job requirements. Use the STAR-lite format: what you did, the scale, the impact. Name-drop relevant technologies.
3. FIT + CTA (2-3 sentences): Why THIS company specifically — not just any company. Reference something specific about their product/culture/mission. End with confident next-step invitation.

Tone: Direct, confident, specific. Like a top performer who knows their worth and is genuinely excited about this company's work.

Anti-patterns to avoid:
- "I am a passionate/motivated/dedicated professional..."
- "I believe I would be a great fit..."
- "I am excited about the opportunity to..."
- Listing skills without context
- Generic company praise ("innovative culture", "dynamic team")
- Exceeding 250 words`;

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

Generate a cover letter that is:
1. Under 250 words total
2. Opens with a hook that would make a ${input.jobListing.company} engineer stop and read
3. Uses at least 2 specific metrics/numbers from the candidate's achievements
4. References something specific about ${input.jobListing.company} (their product, mission, tech choices, or recent news)
5. Addresses the top 2-3 must-have requirements from the job description
6. Ends with a confident, non-desperate CTA

Output format — return a JSON object with:
- greeting: "Dear [Name/Hiring Manager/Engineering Team]" — be specific if we know the team
- paragraphs: Array of { content: string, purpose: "hook" | "proof" | "fit_cta" }
- signoff: "Best," or "Looking forward to connecting," — match energy of the letter
- word_count: approximate word count (aim for 200-250)
- key_points_addressed: Array of job requirements explicitly addressed in the letter`;

  return { system, user };
}
