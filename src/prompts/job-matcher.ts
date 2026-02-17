export interface JobMatcherInput {
  profile: {
    title: string;
    skills: string[];
    experience: Array<{
      role: string;
      company: string;
      yearsInRole: number;
      technologies: string[];
      domain?: string;
    }>;
    education: Array<{
      degree: string;
      field: string;
    }>;
    totalYearsExperience: number;
    certifications?: string[];
    preferences?: {
      desiredRoles?: string[];
      industries?: string[];
      dealBreakers?: string[];
    };
  };
  jobDescription: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
    niceToHave?: string[];
    experienceLevel?: string;
    location?: string;
    remote?: boolean;
    salary?: {
      min?: number;
      max?: number;
      currency?: string;
    };
  };
}

export function jobMatcherPrompt(input: JobMatcherInput): { system: string; user: string } {
  const system = `You are an expert job matching analyst with deep knowledge of tech hiring practices, skill transferability, and career progression. Your role is to evaluate job-candidate fit with precision and provide actionable recommendations.

Evaluation criteria:
1. HARD SKILLS MATCH (40% weight)
   - Direct technology/tool matches
   - Transferable skills from related technologies
   - Domain expertise relevance

2. EXPERIENCE LEVEL (25% weight)
   - Years of experience vs. job requirements
   - Seniority level alignment (junior/mid/senior/lead/principal)
   - Career trajectory fit

3. ROLE ALIGNMENT (20% weight)
   - Job responsibilities match past experience
   - Title progression makes sense
   - Scope and impact level

4. SOFT REQUIREMENTS (15% weight)
   - Education requirements (if specified)
   - Certifications
   - Industry experience
   - Location/remote preferences

Scoring guidelines:
- 90-100: Exceptional fit, all key requirements met + many nice-to-haves
- 75-89: Strong fit, all key requirements met, some nice-to-haves
- 60-74: Good fit, most key requirements met, minor gaps
- 45-59: Moderate fit, several gaps but transferable skills
- 30-44: Weak fit, significant gaps
- 0-29: Poor fit, fundamental misalignment

Recommendations:
- strong_apply (85+): Excellent match, apply ASAP
- apply (65-84): Good match, worth applying
- maybe (45-64): Borderline, apply if motivated and willing to address gaps
- skip (<45): Not a good use of time

Be honest but encouraging. Consider skill transferability (e.g., React → Vue, AWS → GCP). Account for career changers and non-traditional backgrounds positively when relevant experience exists.`;

  const preferencesContext = input.profile.preferences
    ? `
Candidate Preferences:
${input.profile.preferences.desiredRoles ? `- Desired Roles: ${input.profile.preferences.desiredRoles.join(', ')}` : ''}
${input.profile.preferences.industries ? `- Target Industries: ${input.profile.preferences.industries.join(', ')}` : ''}
${input.profile.preferences.dealBreakers ? `- Deal Breakers: ${input.profile.preferences.dealBreakers.join(', ')}` : ''}`
    : '';

  const user = `Analyze the fit between this candidate and job opportunity:

CANDIDATE PROFILE:
Current Title: ${input.profile.title}
Total Experience: ${input.profile.totalYearsExperience} years

Skills: ${input.profile.skills.join(', ')}

Experience:
${input.profile.experience.map((exp, i) => `${i + 1}. ${exp.role} at ${exp.company} (${exp.yearsInRole} years)
   Technologies: ${exp.technologies.join(', ')}
   ${exp.domain ? `Domain: ${exp.domain}` : ''}`).join('\n\n')}

Education:
${input.profile.education.map((edu, i) => `${i + 1}. ${edu.degree} in ${edu.field}`).join('\n')}

${input.profile.certifications && input.profile.certifications.length > 0 ? `Certifications: ${input.profile.certifications.join(', ')}` : ''}
${preferencesContext}

JOB OPPORTUNITY:
Title: ${input.jobDescription.title}
Company: ${input.jobDescription.company}
${input.jobDescription.experienceLevel ? `Experience Level: ${input.jobDescription.experienceLevel}` : ''}
${input.jobDescription.location ? `Location: ${input.jobDescription.location}` : ''}
${input.jobDescription.remote !== undefined ? `Remote: ${input.jobDescription.remote ? 'Yes' : 'No'}` : ''}
${input.jobDescription.salary ? `Salary Range: ${input.jobDescription.salary.min ? `${input.jobDescription.salary.currency || '$'}${input.jobDescription.salary.min.toLocaleString()}` : ''} - ${input.jobDescription.salary.max ? `${input.jobDescription.salary.currency || '$'}${input.jobDescription.salary.max.toLocaleString()}` : ''}` : ''}

Description:
${input.jobDescription.description}

Required Skills/Qualifications:
${input.jobDescription.requirements.map((req, i) => `${i + 1}. ${req}`).join('\n')}

${input.jobDescription.niceToHave && input.jobDescription.niceToHave.length > 0 ? `Nice to Have:\n${input.jobDescription.niceToHave.map((item, i) => `${i + 1}. ${item}`).join('\n')}` : ''}

Provide:
1. match_score: Overall fit score (0-100)
2. matching_skills: Skills the candidate has that match requirements
3. missing_skills: Required skills the candidate lacks (be specific)
4. recommendation: strong_apply/apply/maybe/skip
5. reasoning: Detailed explanation covering:
   - Why this score (cite specific matches/gaps)
   - Transferable skills that could compensate for gaps
   - Key strengths that make candidate attractive
   - Main concerns or dealbreakers
   - Whether candidate should still apply despite any gaps and why`;

  return { system, user };
}
