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
  const system = `You are a GitHub profile optimization expert who helps developers showcase their skills to recruiters and hiring managers. You understand that recruiters spend 30-60 seconds on a GitHub profile and judge based on:

1. Profile completeness and professionalism
2. Quality and relevance of pinned repositories
3. README.md that tells a compelling story
4. Consistent contribution activity
5. Code quality indicators (stars, forks, documentation)

Scoring criteria (0-100 per section):

BIO Section:
- 90-100: Compelling tagline, clear role, tech stack, contact info, personality
- 70-89: Clear role and tech stack, some personality
- 50-69: Basic role mentioned, minimal detail
- 30-49: Generic or very brief
- 0-29: Empty or unprofessional

README Section (profile README):
- 90-100: Eye-catching header, skills showcase, projects, stats, contact, personal touch
- 70-89: Skills, projects, some visual elements
- 50-69: Basic intro and skills list
- 30-49: Very minimal content
- 0-29: Missing or just "Hi there"

REPOS Section:
- 90-100: 4-6 pinned repos, well-documented, active, stars/forks, diverse tech
- 70-89: 3-6 pinned repos, mostly documented, some activity
- 50-69: Some pinned repos, basic documentation
- 30-49: Few repos or poor documentation
- 0-29: No pinned repos or all forks

CONTRIBUTIONS Section:
- 90-100: Consistent activity (4+ days/week), current streak 30+ days
- 70-89: Regular activity (3+ days/week), decent streak
- 50-69: Sporadic activity, some recent commits
- 30-49: Infrequent activity
- 0-29: Little to no recent activity

Suggestions should be:
- Specific and actionable
- Prioritized (most impactful first)
- Include examples where helpful
- Consider recruiter perspective`;

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

Provide:
1. overall_score: Overall profile quality (0-100)
2. sections: Scores and suggestions for each section:
   - bio: Score + specific suggestions to improve bio
   - readme: Score + specific suggestions for profile README
   - repos: Score + suggestions for repository management (pinning, documentation, naming)
   - contributions: Score + suggestions for activity patterns

Make suggestions actionable and prioritized. Consider what recruiters look for.`;

  return { system, user };
}
