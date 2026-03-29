export interface CareerRoadmapInput {
  profile: {
    name: string;
    education: Array<{
      institution: string;
      degree: string;
      field: string;
      startDate: string;
      endDate: string | null;
      gpa?: string;
      honors?: string[];
    }>;
    experience: Array<{
      company: string;
      role: string;
      startDate: string;
      endDate: string | null;
      responsibilities: string[];
      achievements?: string[];
    }>;
    skills: Array<{ name: string; proficiency: string }>;
    currentRole?: string;
  };
  goals: string[];
  timeframe: string;
}

export interface ProjectIdeasInput {
  profile: {
    name: string;
    skills: Array<{ name: string; proficiency: string }>;
    experience: Array<{
      company: string;
      role: string;
      startDate: string;
      endDate: string | null;
    }>;
    interests: string[];
  };
  targetField: string;
  goalType: string;
}

export interface WeeklyActionsInput {
  profile: {
    name: string;
    skills: Array<{ name: string; proficiency: string }>;
    currentFocus: string;
  };
  goals: string[];
  completedActions?: string[];
}

export function careerRoadmapPrompt(input: CareerRoadmapInput): { system: string; user: string } {
  const system = `You are an elite career strategist specializing in Computer Science, Artificial Intelligence, Quantitative Finance, and Cybersecurity career paths. You have deep knowledge of:

- Admissions processes and what it takes to transfer into or get accepted at MIT, CMU, Stanford, UC Berkeley, and NUS
- FAANG and top-tier tech company career ladders from IC to VP-level and beyond
- Academic research career paths from undergrad to tenure-track professor
- Quantitative finance career progression at firms like Jane Street, Citadel, Two Sigma, DE Shaw
- Cybersecurity career paths from analyst to CISO

Your approach:
1. PRACTICAL: Every recommendation must be actionable and specific, not generic advice
2. MILESTONE-BASED: Break down goals into quarterly milestones with clear deliverables
3. METRICS-DRIVEN: Define measurable success criteria for each milestone
4. RISK-AWARE: Identify obstacles and provide contingency plans
5. PERSONALIZED: Tailor advice to the individual's current position, strengths, and gaps
6. TIMELINE-REALISTIC: Be honest about what is achievable in the given timeframe

Output a structured career roadmap with quarterly milestones, specific actions, measurable metrics, recommended resources, key risks, and competitive advantages the candidate already has.`;

  const educationSummary = input.profile.education.map((edu, i) =>
    `${i + 1}. ${edu.degree} in ${edu.field} at ${edu.institution} (${edu.startDate} - ${edu.endDate || 'Present'})${edu.gpa ? ` | GPA: ${edu.gpa}` : ''}${edu.honors?.length ? ` | Honors: ${edu.honors.join(', ')}` : ''}`
  ).join('\n');

  const experienceSummary = input.profile.experience.map((exp, i) =>
    `${i + 1}. ${exp.role} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})\n   Key work: ${exp.responsibilities.slice(0, 3).join('; ')}${exp.achievements?.length ? `\n   Achievements: ${exp.achievements.join('; ')}` : ''}`
  ).join('\n');

  const skillsSummary = input.profile.skills.map(s => `${s.name} (${s.proficiency})`).join(', ');

  const user = `Create a detailed career roadmap for ${input.profile.name}.

Current Profile:
${input.profile.currentRole ? `Current Role: ${input.profile.currentRole}` : ''}

Education:
${educationSummary || 'No formal education listed'}

Experience:
${experienceSummary || 'No experience listed'}

Skills: ${skillsSummary || 'None listed'}

Career Goals:
${input.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Target Timeframe: ${input.timeframe}

Generate a comprehensive roadmap with:
1. A brief summary of the overall strategy
2. Quarterly milestones with specific actions, measurable metrics, and recommended resources
3. Key risks that could derail progress and how to mitigate them
4. Competitive advantages this candidate already has that they should leverage`;

  return { system, user };
}

export function projectIdeasPrompt(input: ProjectIdeasInput): { system: string; user: string } {
  const system = `You are an expert technical mentor who specializes in recommending high-impact projects that build real credibility in target fields. Your project recommendations are:

1. PORTFOLIO-WORTHY: Each project should impress hiring managers, admissions committees, or investors
2. PUBLISHABLE: Projects should have potential for blog posts, papers, or open-source contributions
3. STARTUP-VIABLE: Where applicable, projects should address real problems with market potential
4. SKILL-BUILDING: Each project should push the candidate to learn new, valuable skills
5. DIFFERENTIATED: Avoid common tutorial projects — recommend things that stand out
6. FEASIBLE: Projects should be completable given the candidate's current skill level with reasonable stretch

For each project, provide a clear title, description, why it has impact, difficulty level, realistic time estimate, specific tech stack, learning outcomes, portfolio value explanation, and concrete implementation steps.`;

  const skillsSummary = input.profile.skills.map(s => `${s.name} (${s.proficiency})`).join(', ');
  const experienceSummary = input.profile.experience.map(exp =>
    `${exp.role} at ${exp.company} (${exp.startDate} - ${exp.endDate || 'Present'})`
  ).join('; ');
  const interestsSummary = input.profile.interests.join(', ');

  const user = `Suggest 5-7 high-impact projects for ${input.profile.name}.

Profile:
Skills: ${skillsSummary || 'None listed'}
Experience: ${experienceSummary || 'None listed'}
Interests: ${interestsSummary || 'General CS'}

Target Field: ${input.targetField}
Goal Type: ${input.goalType} (${input.goalType === 'research' ? 'projects suitable for academic publications or research portfolios' : input.goalType === 'portfolio' ? 'projects that showcase engineering skill and creativity to employers' : 'projects that could become viable startups or products'})

Generate projects that are specifically relevant to ${input.targetField} and appropriate for someone with this background. Each project should be meaningfully different from the others and cover different aspects of the target field.`;

  return { system, user };
}

export function weeklyActionsPrompt(input: WeeklyActionsInput): { system: string; user: string } {
  const system = `You are a productivity coach for ambitious CS professionals and students. You specialize in creating specific, measurable weekly action plans that drive consistent progress toward career goals.

Your approach:
1. SPECIFIC: Never say "study algorithms" — say "Complete 5 LeetCode medium problems on dynamic programming"
2. MEASURABLE: Every task has a clear done/not-done criteria
3. TIME-BOXED: Every task has a realistic time estimate
4. BALANCED: Mix learning, building, networking, and health across the week
5. PROGRESSIVE: Build on completed actions from previous weeks
6. PRIORITIZED: Mark tasks as high/medium/low priority so the person knows what to cut if short on time
7. MOTIVATING: Include an encouraging, personalized motivation message

Generate a daily action plan for Monday through Sunday with categorized, prioritized tasks, overall focus areas for the week, and weekly goals to hit.`;

  const skillsSummary = input.profile.skills.map(s => `${s.name} (${s.proficiency})`).join(', ');

  const completedSection = input.completedActions?.length
    ? `\nCompleted Last Week:\n${input.completedActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    : '';

  const user = `Create a detailed weekly action plan for ${input.profile.name}.

Profile:
Skills: ${skillsSummary || 'None listed'}
Current Focus: ${input.profile.currentFocus || 'General development'}

Goals:
${input.goals.map((g, i) => `${i + 1}. ${g}`).join('\n')}
${completedSection}

Generate a practical daily schedule (Monday-Sunday) with specific, actionable tasks. Each task should have a category (learning, building, networking, health, admin), priority (high, medium, low), and time estimate. Also provide 3-5 focus areas, 3-5 measurable weekly goals, and a motivational message.`;

  return { system, user };
}
