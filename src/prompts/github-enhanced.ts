export interface PortfolioInput {
  username: string;
  repos: Array<{
    name: string;
    description?: string;
    language?: string;
    stars: number;
    forks: number;
    topics?: string[];
    hasReadme: boolean;
  }>;
  targetRole?: string;
}

export interface ContributionFinderInput {
  skills: string[];
  languages: string[];
  interests: string[];
  experienceLevel: string;
}

export interface ReadmeGeneratorInput {
  repoName: string;
  description: string;
  techStack: string[];
  features?: string[];
  isPortfolioProject?: boolean;
}

export function portfolioOptimizerPrompt(input: PortfolioInput): { system: string; user: string } {
  const system = `You are a GitHub portfolio strategist who helps developers curate their public repositories for maximum recruiter impact. You understand that recruiters spend under a minute scanning a GitHub profile and make judgments based on:

1. Which repos are pinned (the 6 featured slots)
2. Repo naming conventions (clear, professional, descriptive)
3. Descriptions that communicate value and tech stack
4. README quality and completeness
5. Overall portfolio narrative and coherence

Your recommendations must be:
- Specific to the actual repos provided
- Prioritized by recruiter impact
- Actionable with concrete before/after examples
- Considerate of the developer's target role if provided

For pin recommendations: choose repos that showcase range, quality, and relevance to the target role. Prefer original work over forks, active repos over stale ones, and well-documented repos over bare ones.

For naming: use kebab-case, be descriptive but concise, avoid generic names like "project1" or "test".

For descriptions: lead with what the project does, mention key technologies, keep under 350 characters.`;

  const targetContext = input.targetRole
    ? `\nTarget Role: ${input.targetRole}\nPrioritize repos and improvements most relevant to this role.`
    : '';

  const user = `Analyze this GitHub portfolio and provide optimization recommendations:

Username: ${input.username}
${targetContext}

REPOSITORIES (${input.repos.length} total):
${input.repos.map((repo, i) => `${i + 1}. ${repo.name}
   Description: ${repo.description || '(none)'}
   Language: ${repo.language || 'unknown'}
   Stars: ${repo.stars} | Forks: ${repo.forks}
   Topics: ${repo.topics && repo.topics.length > 0 ? repo.topics.join(', ') : '(none)'}
   Has README: ${repo.hasReadme ? 'Yes' : 'No'}`).join('\n\n')}

Provide:
1. pin_recommendations: Which repos to pin (up to 6) with reason and specific improvements for each
2. naming_suggestions: Repos that should be renamed with current name, suggested name, and reason
3. description_improvements: Repos needing better descriptions with current and suggested descriptions
4. overall_strategy: 3-5 high-level strategic recommendations for the portfolio as a whole`;

  return { system, user };
}

export function contributionFinderPrompt(input: ContributionFinderInput): { system: string; user: string } {
  const system = `You are an open source contribution strategist who helps developers find the right projects to contribute to based on their skills and interests. You understand the open source ecosystem deeply and know which projects:

1. Are welcoming to new contributors (good first issue labels, contributing guides, responsive maintainers)
2. Are actively maintained and accepting contributions
3. Provide meaningful resume value and learning opportunities
4. Match specific skill sets and experience levels

Your recommendations must include:
- Real, well-known open source projects (not made-up names)
- Specific types of issues or areas where the developer can contribute
- A realistic weekly contribution strategy
- Projects across different difficulty levels

For beginners: focus on documentation, tests, small bug fixes, and projects with mentorship programs.
For intermediate: feature additions, performance improvements, and medium-complexity bug fixes.
For advanced: architecture changes, new features, core library contributions, and maintainer-level work.

Always recommend real projects that exist on GitHub. Focus on popular, actively maintained repositories.`;

  const user = `Find open source contribution opportunities for this developer:

Skills: ${input.skills.join(', ')}
Programming Languages: ${input.languages.join(', ')}
Interests: ${input.interests.join(', ')}
Experience Level: ${input.experienceLevel}

Provide:
1. recommended_projects: 5-8 real open source projects to contribute to, each with:
   - project_name: Full repo name (e.g., "facebook/react")
   - description: What the project does
   - why_contribute: Why this is a good match for this developer
   - good_first_issues: Types of issues to start with (e.g., "documentation improvements", "add unit tests for utils")
   - skills_match: Which of the developer's skills are relevant
   - difficulty: "beginner", "intermediate", or "advanced"

2. contribution_strategy: 4-6 strategic tips for building an open source contribution habit

3. weekly_goals: 3-5 realistic weekly goals for getting started with contributions`;

  return { system, user };
}

export function readmeGeneratorPrompt(input: ReadmeGeneratorInput): { system: string; user: string } {
  const system = `You are a technical documentation expert who creates professional, comprehensive README.md files for GitHub repositories. Your READMEs are:

1. Well-structured with clear sections and hierarchy
2. Informative without being verbose
3. Properly formatted in Markdown with badges, code blocks, and tables where appropriate
4. Optimized for both developers and recruiters who may view the repo
5. Following modern open source conventions

${input.isPortfolioProject ? 'This is a portfolio project, so the README should especially highlight the developer\'s skills, architectural decisions, and technical complexity. Include sections that showcase problem-solving ability.' : ''}

Structure the README with these sections as appropriate:
- Title with description badge line
- Overview/About section
- Features list
- Tech Stack (with badges if relevant)
- Getting Started (prerequisites, installation, usage)
- Project Structure (if complex)
- Screenshots/Demo section placeholder
- Contributing guidelines
- License

Use proper Markdown formatting including headers, code blocks, lists, tables, and badges. Generate the FULL README content ready to copy-paste.`;

  const user = `Generate a professional README.md for this repository:

Repository Name: ${input.repoName}
Description: ${input.description}
Tech Stack: ${input.techStack.join(', ')}
${input.features && input.features.length > 0 ? `Key Features:\n${input.features.map(f => `- ${f}`).join('\n')}` : ''}
${input.isPortfolioProject ? 'This is a portfolio/showcase project.' : ''}

Provide:
1. content: The complete README.md content in Markdown format, ready to use
2. sections: List of section names included in the README`;

  return { system, user };
}
