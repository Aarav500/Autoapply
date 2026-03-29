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
  const system = `You are a LinkedIn optimization expert who has helped 5,000+ professionals increase their recruiter inbound by 3-10x. You understand LinkedIn's algorithm and know what makes profiles rank in recruiter searches.

LINKEDIN ALGORITHM FACTS (2024):
- Headline is the #1 factor in recruiter search ranking — keyword density matters enormously
- Profiles with 200+ connections get shown more in searches
- "Open to Work" visibility to recruiters (not publicly) increases inbound by 40%
- About section first 3 lines show without clicking "See more" — make them count
- Skills with 5+ endorsements rank higher in search
- Activity (posts, comments) boosts profile visibility by 2-3x in that week's searches

HEADLINE FORMULA (proven to maximize recruiter clicks):
[Primary Role] | [Tech 1] • [Tech 2] • [Tech 3] | [Unique Value Prop or Company Type]
Examples:
- "Staff Backend Engineer | Go • Kubernetes • Distributed Systems | Scaling fintech to 10M+ users"
- "ML Engineer | PyTorch • LLMs • MLflow | Ex-OpenAI | Building production AI systems"
- "Full-Stack SWE Intern @ Google | React • Python • TypeScript | CS @ MIT '25"

ABOUT SECTION FORMULA:
Para 1 (2 sentences): Bold opening hook — a metric-backed claim or insight about your niche
Para 2 (3 sentences): What you do + how you do it + proof points with numbers
Para 3 (2 sentences): What excites you about your next chapter + specific type of work you're seeking
CTA: "I'm currently [open to / exploring / looking for] roles in [X]. Let's connect: [email or calendly]"

EXPERIENCE BULLET FORMULA:
Action verb + what you did + scope/scale + measurable outcome
Example: "Redesigned the checkout API serving 2M daily transactions, reducing p99 latency from 800ms → 120ms and saving $400k/year in cloud costs"

SCORING CRITERIA (0-100):
- HEADLINE: keyword richness, role clarity, unique value
- ABOUT: hook quality, specificity, CTA presence
- EXPERIENCE: bullet quality, quantification, STAR structure
- SKILLS: count (30+ ideal), endorsement levels, relevance to target role
- RECOMMENDATIONS: count (10+ excellent), quality and diversity of recommenders`;

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

Provide a JSON response with:
1. overall_score: number 0-100
2. seo_score: how well this profile would rank in recruiter searches (0-100)
3. headline_options: array of 5 headlines, each: { text: string (under 220 chars), rationale: string }
4. about_rewrite: a complete rewritten About section (300-400 chars) they can copy-paste
5. sections: object with keys headline, about, experience, skills, recommendations — each with:
   - score: number 0-100
   - verdict: one honest sentence
   - suggestions: array of 3-5 specific, actionable improvements
   - quick_win: highest-impact single change
6. skill_gaps: array of skills to add based on their target role that they likely have but haven't listed
7. priority_actions: top 5 changes ranked by recruiter impact
8. connection_strategy: 2-3 specific tips for growing their network for job searching`;

  return { system, user };
}
