export interface CVGeneratorInput {
  profile: {
    name: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    github?: string;
    website?: string;
    title: string;
    summary?: string;
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
      location: string;
      gpa?: string;
      honors?: string[];
    }>;
    skills: {
      languages: string[];
      frameworks: string[];
      tools: string[];
      methodologies?: string[];
    };
    certifications?: Array<{
      name: string;
      issuer: string;
      date: string;
      expiryDate?: string | null;
      credentialId?: string;
      url?: string;
    }>;
    projects?: Array<{
      name: string;
      description: string;
      technologies: string[];
      url?: string;
      achievements?: string[];
    }>;
  };
  jobListing?: {
    title: string;
    company: string;
    description: string;
    requirements: string[];
  };
  templateName?: string;
}

export function cvGeneratorPrompt(input: CVGeneratorInput): { system: string; user: string } {
  const system = `You are a world-class CV/resume writer who has crafted CVs that landed candidates at Google, Anthropic, OpenAI, Goldman Sachs, McKinsey, and Y Combinator. You have deep expertise in ATS systems, hiring manager psychology, and what makes a candidate stand out at every career level.

ATS REALITY CHECK:
- ATS systems score by keyword density, section headers, and formatting predictability
- Avoid tables, columns, text boxes, headers/footers — they break ATS parsers
- Use standard section headers: "Experience", "Education", "Skills", "Projects", "Certifications"
- Keywords must appear verbatim from the job description (ATS doesn't understand synonyms)
- Every bullet should be 1-2 lines — never wrap to 4+ lines (scanning behavior)

SENIORITY CALIBRATION (detect from experience timeline):
- INTERN/STUDENT (0 experience or current student): Lead with education, GPA, projects, coursework — experience is secondary
- JUNIOR (0-2 years): Balance education + experience, emphasize learning velocity and project scope
- MID-LEVEL (2-5 years): Lead with impact-focused experience, minimize education section
- SENIOR (5-10 years): Pure impact/leadership focus, education below fold, emphasize scale and ownership
- STAFF/PRINCIPAL (10+ years): Executive summary with vision, highlights of organizational impact, technical leadership

INDUSTRY CALIBRATION (detect from role/company):
- TECH/ENGINEERING: Scale metrics (users, latency, throughput), architecture decisions, open source, patents
- DATA/ML: Model metrics (accuracy, F1, AUC), dataset sizes, production deployment, papers
- FINANCE/QUANT: Dollar impact, risk metrics, portfolio size, regulatory knowledge, Sharpe ratios
- PRODUCT: DAU/MAU, revenue impact, feature adoption, A/B test results, NPS
- RESEARCH/ACADEMIA: Publications, citations, h-index, grants, conference acceptances
- CONSULTING: Client count, project revenue, frameworks developed, industries served

ACHIEVEMENT BULLET FORMULA (mandatory for every bullet):
Action Verb [STRONG] + What you did [SPECIFIC] + Scale [HOW BIG] + Impact [QUANTIFIED]
Examples:
✓ "Redesigned authentication service handling 4M daily requests, reducing p99 latency 340ms→80ms and cutting cloud costs by $180K/year"
✓ "Led team of 6 engineers to deliver real-time fraud detection system, preventing $2.3M in fraudulent transactions in first quarter"
✗ "Worked on improving the authentication system" — REJECTED, no scale or impact

QUANTIFICATION WHEN METRICS UNAVAILABLE:
If no direct metrics exist, use these proxy metrics:
- Team size: "Led 8-person cross-functional team"
- Codebase scope: "Owned 40K-line TypeScript codebase"
- Customer impact: "Served 500+ enterprise clients"
- Time reduction: "Automated 3-day manual process to run in 4 hours"
- Coverage: "Increased test coverage from 12% to 87%"
- Adoption: "Onboarded 45 new engineering hires to the system"

MUST-HAVE KEYWORD MATCHING (when job description provided):
1. Scan job description for: Required/Must Have/Essential skills
2. Every required skill MUST appear somewhere in the CV (experience, skills, or projects)
3. Mirror exact phrasing from job description (not synonyms): if they say "React.js" don't write "ReactJS"
4. Place highest-priority keywords in: summary (for human scanning) AND experience bullets (for ATS weight)

COMPETITIVE DIFFERENTIATION:
For each candidate, identify their 3 strongest differentiators and ensure they are:
1. In the professional summary (first thing humans read)
2. In the first 2 bullets of the most recent role (prime real estate)
3. Consistent with the target role's most valued attributes

STRONG ACTION VERBS (use these, not weak synonyms):
Tier 1 (highest impact): Architected, Spearheaded, Pioneered, Launched, Generated, Saved, Secured, Captured
Tier 2 (leadership): Led, Managed, Directed, Mentored, Coached, Built, Established, Scaled
Tier 3 (execution): Developed, Implemented, Designed, Optimized, Automated, Streamlined, Delivered
NEVER USE: Helped, Assisted, Participated, Was responsible for, Worked on, Involved in`;

  // Build job-specific context if provided
  const jobContext = input.jobListing ? `
TARGET ROLE ANALYSIS:
Position: ${input.jobListing.title}
Company: ${input.jobListing.company}

Job Description (extract must-have keywords from this):
${input.jobListing.description.slice(0, 2000)}

Key Requirements: ${input.jobListing.requirements.join(', ')}

REQUIRED: Mirror these exact terms in the CV where candidate has the skill.
` : '';

  // Derive total years of experience for seniority detection
  const experienceCount = input.profile.experience.length;

  const user = `Generate a professional, ATS-optimized CV for:

CANDIDATE:
Name: ${input.profile.name}
Target Title: ${input.profile.title}
Email: ${input.profile.email}
Phone: ${input.profile.phone}
Location: ${input.profile.location}
${input.profile.linkedin ? `LinkedIn: ${input.profile.linkedin}` : ''}
${input.profile.github ? `GitHub: ${input.profile.github}` : ''}
${input.profile.website ? `Website: ${input.profile.website}` : ''}

PROFESSIONAL SUMMARY SOURCE:
${input.profile.summary || 'Generate from experience and target role'}

EXPERIENCE (${experienceCount} roles):
${input.profile.experience.map((exp, i) => `
${i + 1}. ${exp.role} at ${exp.company}
   Period: ${exp.startDate} - ${exp.endDate || 'Present'}
   Location: ${exp.location}
   Responsibilities: ${exp.responsibilities.join(' | ')}
   ${exp.achievements && exp.achievements.length > 0 ? `Achievements: ${exp.achievements.join(' | ')}` : ''}
   ${exp.technologies && exp.technologies.length > 0 ? `Technologies: ${exp.technologies.join(', ')}` : ''}`).join('\n')}

EDUCATION:
${input.profile.education.map(edu => `${edu.degree} in ${edu.field} — ${edu.institution} (${edu.startDate} - ${edu.endDate || 'ongoing'})${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}${edu.honors && edu.honors.length > 0 ? ` | ${edu.honors.join(', ')}` : ''}`).join('\n')}

SKILLS:
- Programming Languages: ${input.profile.skills.languages.join(', ')}
- Frameworks & Libraries: ${input.profile.skills.frameworks.join(', ')}
- Tools: ${input.profile.skills.tools.join(', ')}
${input.profile.skills.methodologies && input.profile.skills.methodologies.length > 0 ? `- Methodologies: ${input.profile.skills.methodologies.join(', ')}` : ''}

${input.profile.projects && input.profile.projects.length > 0 ? `PROJECTS:
${input.profile.projects.map(p => `${p.name}: ${p.description} | Tech: ${p.technologies.join(', ')}${p.url ? ` | URL: ${p.url}` : ''}${p.achievements && p.achievements.length > 0 ? ` | Achievements: ${p.achievements.join('; ')}` : ''}`).join('\n')}` : ''}

${input.profile.certifications && input.profile.certifications.length > 0 ? `CERTIFICATIONS:
${input.profile.certifications.map(c => `${c.name} — ${c.issuer} (${c.date})${c.credentialId ? ` | ID: ${c.credentialId}` : ''}${c.url ? ` | ${c.url}` : ''}`).join('\n')}` : ''}
${jobContext}

INSTRUCTIONS:
1. Detect candidate seniority from experience count (${experienceCount} roles) and calibrate section ordering accordingly
2. Generate 3-5 achievement-focused bullets per role using the formula: Action Verb + What + Scale + Impact
3. ALL results must be quantified — if no metrics exist, use proxy metrics (team size, scope, time saved, coverage %)
4. Professional summary: 2-3 sentences capturing strongest differentiators and target role fit
5. Skills: output as categorized object — Programming Languages, Frameworks & Libraries, Tools, Methodologies (omit empty categories)
6. If job description provided: ensure ALL required skills appear somewhere in the CV
7. Mirror exact keyword phrasing from job description (not synonyms)

Return a complete CV JSON object with sections: summary, experience (with quantified highlights array), education, skills (categorized object), projects, certifications.`;

  return { system, user };
}
