export interface LinkedInOptimizerInput {
  profile: {
    name: string;
    headline?: string;
    about?: string;
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description?: string;
    }>;
    education: Array<{
      school: string;
      degree: string;
      field?: string;
    }>;
    skills: string[];
    endorsements?: Record<string, number>; // skill -> endorsement count
    recommendations?: number;
    posts?: number;
    connections?: number;
  };
  targetRole?: string;
  targetIndustry?: string;
}

export function linkedinOptimizerPrompt(
  input: LinkedInOptimizerInput
): { system: string; user: string } {
  const system = `You are a LinkedIn profile optimization expert who has helped thousands of professionals improve their visibility to recruiters and hiring managers. You understand LinkedIn's algorithm and what makes profiles stand out.

LinkedIn profile hierarchy (what recruiters see first):
1. Headline (appears in search results - critical for keywords)
2. About section (tells your story, shows personality)
3. Featured section (showcase work, articles, projects)
4. Experience (quantified achievements, keywords)
5. Skills (top 3 shown in profile, rest collapsed)
6. Recommendations (social proof)

Scoring criteria (0-100 per section):

HEADLINE (most important for searchability):
- 90-100: Role + key skills + value prop, keyword-rich, compelling (e.g., "Senior Full-Stack Engineer | React, Node.js, AWS | Building scalable fintech solutions")
- 70-89: Role + some skills, decent keywords
- 50-69: Just role title, minimal keywords
- 30-49: Generic title (e.g., "Software Engineer")
- 0-29: Empty or unprofessional

ABOUT Section:
- 90-100: Compelling story, specific achievements, personality, clear value prop, CTA, 3-4 paragraphs
- 70-89: Clear background, some achievements, professional
- 50-69: Basic background, list of skills
- 30-49: Very brief or generic
- 0-29: Empty or single sentence

EXPERIENCE Section:
- 90-100: Quantified achievements, strong action verbs, keywords, consistent formatting
- 70-89: Some quantification, decent descriptions
- 50-69: Basic job descriptions, minimal metrics
- 30-49: Just titles and companies, no descriptions
- 0-29: Incomplete or very sparse

SKILLS Section:
- 90-100: 30+ skills, top skills highly endorsed (30+ each), relevant to role
- 70-89: 20+ skills, some endorsements, mostly relevant
- 50-69: 10-20 skills, few endorsements
- 30-49: <10 skills or irrelevant skills
- 0-29: No skills listed

RECOMMENDATIONS Section:
- 90-100: 10+ recommendations from managers/colleagues
- 70-89: 5-9 recommendations
- 50-69: 2-4 recommendations
- 30-49: 1 recommendation
- 0-29: No recommendations

Headline options should:
- Be exactly under 220 characters
- Include primary role + 2-3 key skills/technologies
- Add unique value proposition or specialization
- Use keywords from target job descriptions
- Avoid buzzwords ("passionate," "innovative," "guru")`;

  const targetContext =
    input.targetRole || input.targetIndustry
      ? `\n\nOptimization Target:\n${input.targetRole ? `Role: ${input.targetRole}` : ''}\n${input.targetIndustry ? `Industry: ${input.targetIndustry}` : ''}\n\nTailor recommendations and headlines for this target.`
      : '';

  const user = `Analyze this LinkedIn profile and provide optimization recommendations:

PROFILE:
Name: ${input.profile.name}
Headline: ${input.profile.headline || '(empty)'}
Connections: ${input.profile.connections || 0}

ABOUT:
${input.profile.about || '(empty)'}

EXPERIENCE (${input.profile.experience.length} positions):
${input.profile.experience.map((exp, i) => `${i + 1}. ${exp.title} at ${exp.company}
   Duration: ${exp.duration}
   ${exp.description ? `Description: ${exp.description}` : '(no description)'}`).join('\n\n')}

EDUCATION:
${input.profile.education.map((edu, i) => `${i + 1}. ${edu.degree}${edu.field ? ` in ${edu.field}` : ''} - ${edu.school}`).join('\n')}

SKILLS (${input.profile.skills.length}):
${input.profile.skills.slice(0, 15).join(', ')}${input.profile.skills.length > 15 ? `, ... and ${input.profile.skills.length - 15} more` : ''}

${input.profile.endorsements ? `Top Endorsed Skills:\n${Object.entries(input.profile.endorsements).sort(([, a], [, b]) => b - a).slice(0, 5).map(([skill, count]) => `- ${skill}: ${count} endorsements`).join('\n')}` : ''}

${input.profile.recommendations ? `Recommendations: ${input.profile.recommendations}` : 'Recommendations: 0'}
${input.profile.posts ? `Posts in last 90 days: ${input.profile.posts}` : ''}
${targetContext}

Provide:
1. overall_score: Overall profile strength (0-100)
2. headline_options: 5 compelling headline alternatives (each under 220 chars)
3. sections: Detailed scores and suggestions:
   - headline: Score + why current headline is/isn't working
   - about: Score + specific suggestions (structure, content, tone)
   - experience: Score + suggestions for improving experience descriptions
   - skills: Score + suggestions (skills to add/remove, endorsement strategy)
   - recommendations: Score + advice on getting more recommendations

Prioritize high-impact changes. Be specific with examples.`;

  return { system, user };
}
