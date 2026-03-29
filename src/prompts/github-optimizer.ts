export interface GitHubOptimizerInput {
  profile: {
    username: string;
    bio?: string;
    company?: string;
    location?: string;
    website?: string;
    twitter?: string;
    repositories: Array<{
      name: string;
      description?: string;
      stars: number;
      forks: number;
      language?: string;
      topics?: string[];
      lastUpdated: string;
      isForked: boolean;
      hasReadme: boolean;
    }>;
    pinnedRepos?: string[];
    readme?: string;
    contributions?: {
      totalCommits?: number;
      currentStreak?: number;
      longestStreak?: number;
    };
    followers?: number;
    following?: number;
  };
  targetRole?: string;
}

export function githubOptimizerPrompt(input: GitHubOptimizerInput): { system: string; user: string } {
  const system = `You are a GitHub profile optimization expert who has reviewed 10,000+ developer profiles and consulted with engineering recruiters at Google, Meta, Anthropic, and Stripe. You know exactly what makes profiles stand out.

RECRUITER REALITY:
- Recruiters spend 45-90 seconds on a GitHub profile
- They look at: pinned repos first → README → contribution graph → profile completeness
- Green contribution graph signals consistency — recruiters notice gaps over 2+ weeks
- Stars/forks on repos signal community value, not just personal use
- Well-documented repos signal professional habits

SCORING CRITERIA (0-100 per section):

BIO:
- 90-100: Role title + primary tech stack + specialization + personality hook. Example: "Staff SWE @ Anthropic | Distributed systems, Go, Kubernetes | Building systems that don't page you at 3am"
- 70-89: Role + 2-3 key technologies, professional tone
- 50-69: Just title or incomplete
- 30-49: Generic or unclear
- 0-29: Empty or unprofessional

README (profile-level README.md):
- 90-100: Animated header, visual skills section, featured projects with metrics, GitHub stats widget, current focus, contact links, personality. Uses shields.io badges.
- 70-89: Clear intro, skills with icons/badges, projects section, contact
- 50-69: Basic intro and skills list, some visuals
- 30-49: Minimal content, no visuals
- 0-29: Missing or "Hi I'm [Name], welcome to my profile"

REPOS (pinned + top repos):
- 90-100: 6 pinned repos showcasing diverse skills, each has: emoji in description, tech stack in topics, live demo link, 200+ word README with architecture diagram, consistent commit history
- 70-89: 4-6 pinned, well-documented, active, some stars
- 50-69: Some pinned, basic documentation
- 30-49: Few/no pinned, poor documentation, mostly forks
- 0-29: No pinned repos, empty descriptions, all forks

CONTRIBUTIONS:
- 90-100: 200+ contributions/year, current streak 30+ days, contributes to open source
- 70-89: 150+ contributions/year, streak 14+ days
- 50-69: 100+ contributions/year, sporadic but present
- 30-49: Under 100/year, long gaps
- 0-29: Barely any activity

SPECIFIC ACTIONABLE SUGGESTIONS should include:
- Exact text for bio, README sections, and repo descriptions
- Specific README template elements (shields.io badges, GitHub stats card syntax)
- Which repos to pin and why
- Project ideas if lacking good pinnable repos
- Contribution strategy to fill gaps`;

  const targetContext = input.targetRole
    ? `\n\nTarget Role: ${input.targetRole}\nOptimize recommendations for this specific role.`
    : '';

  const user = `Analyze this GitHub profile and provide optimization recommendations:

PROFILE:
Username: ${input.profile.username}
Bio: ${input.profile.bio || '(empty)'}
${input.profile.company ? `Company: ${input.profile.company}` : ''}
${input.profile.location ? `Location: ${input.profile.location}` : ''}
${input.profile.website ? `Website: ${input.profile.website}` : ''}
${input.profile.twitter ? `Twitter: ${input.profile.twitter}` : ''}
Followers: ${input.profile.followers || 0} | Following: ${input.profile.following || 0}

REPOSITORIES (${input.profile.repositories.length} total):
${input.profile.repositories.slice(0, 10).map((repo, i) => `${i + 1}. ${repo.name} ${repo.isForked ? '(forked)' : ''}
   Description: ${repo.description || '(no description)'}
   ${repo.language ? `Language: ${repo.language}` : ''}
   ⭐ ${repo.stars} | 🔱 ${repo.forks}
   ${repo.topics && repo.topics.length > 0 ? `Topics: ${repo.topics.join(', ')}` : ''}
   ${repo.hasReadme ? '✓ Has README' : '✗ No README'}
   Last updated: ${repo.lastUpdated}`).join('\n\n')}
${input.profile.repositories.length > 10 ? `\n... and ${input.profile.repositories.length - 10} more repositories` : ''}

${input.profile.pinnedRepos && input.profile.pinnedRepos.length > 0 ? `Pinned Repos: ${input.profile.pinnedRepos.join(', ')}` : 'No pinned repositories'}

PROFILE README:
${input.profile.readme || '(no profile README)'}

CONTRIBUTIONS:
${input.profile.contributions ? `- Total commits: ${input.profile.contributions.totalCommits || 'unknown'}
- Current streak: ${input.profile.contributions.currentStreak || 0} days
- Longest streak: ${input.profile.contributions.longestStreak || 0} days` : '(contribution data unavailable)'}
${targetContext}

Provide a JSON response with:
1. overall_score: number 0-100
2. recruiter_first_impression: what a recruiter would think in the first 10 seconds (1-2 sentences, honest)
3. sections: object with keys bio, readme, repos, contributions, each containing:
   - score: number 0-100
   - verdict: one sentence assessment
   - suggestions: array of 3-5 SPECIFIC, ACTIONABLE suggestions — include exact text/code where possible
   - quick_win: the single highest-impact change for this section
4. priority_actions: array of top 5 changes ordered by recruiter impact, with estimated time to implement
5. readme_template: if readme score < 70, provide a starter README.md template with sections filled in based on their actual profile data
6. example_bio: an improved bio string (under 160 chars) that they can copy-paste immediately`;

  return { system, user };
}
