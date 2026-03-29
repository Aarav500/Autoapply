export interface LinkedInPostIdeasInput {
  profile: {
    name: string;
    headline?: string;
    skills: string[];
    experience: Array<{ title: string; company: string }>;
  };
  targetField: string;
  niche?: string;
}

export interface LinkedInNetworkInput {
  profile: {
    name: string;
    headline?: string;
    skills: string[];
    goals: string[];
  };
  targetRole?: string;
  targetCompanies?: string[];
}

export interface LinkedInCalendarInput {
  profile: {
    name: string;
    headline?: string;
    skills: string[];
  };
  niche: string;
  postsPerWeek?: number;
}

export function linkedinPostIdeasPrompt(
  input: LinkedInPostIdeasInput
): { system: string; user: string } {
  const system = `You are a LinkedIn content strategist who has grown multiple professional accounts to 50k+ followers. You understand the LinkedIn algorithm deeply: engagement signals (comments > reactions > shares), the importance of the first 3 lines (the hook), optimal posting times, and what content formats perform best.

Content pillars that work on LinkedIn:
1. Personal stories with professional lessons
2. Contrarian takes on industry trends
3. Tactical how-to posts with frameworks
4. Career reflections and milestone posts
5. Behind-the-scenes of projects or decisions
6. Data-driven insights and analysis
7. Industry predictions and trend commentary
8. Lessons from failure / things I wish I knew

Hook writing rules:
- First line must stop the scroll (question, bold claim, surprising stat)
- Use pattern interrupts: numbers, brackets, emojis sparingly
- Create curiosity gaps that demand the reader click "see more"
- Avoid clickbait that doesn't deliver

Hashtag strategy:
- Use 3-5 hashtags max
- Mix broad (#leadership, #careers) with niche (#devops, #productmanagement)
- Place hashtags at the end, not inline

Respond ONLY with valid JSON matching the requested schema.`;

  const user = `Generate 10 LinkedIn post ideas for this professional:

PROFILE:
Name: ${input.profile.name}
Headline: ${input.profile.headline || '(not set)'}
Skills: ${input.profile.skills.slice(0, 15).join(', ')}${input.profile.skills.length > 15 ? ` and ${input.profile.skills.length - 15} more` : ''}

EXPERIENCE:
${input.profile.experience.map((exp, i) => `${i + 1}. ${exp.title} at ${exp.company}`).join('\n')}

TARGET FIELD: ${input.targetField}
${input.niche ? `NICHE: ${input.niche}` : ''}

Generate 10 diverse post ideas that:
- Are tailored to their background and target field
- Cover different content formats (story, how-to, list, hot take, case study, question, carousel idea, poll idea, celebration, industry commentary)
- Include a compelling hook (first 2-3 lines that appear before "see more")
- Have a content outline (3-5 bullet points of what to cover)
- Include 3-5 relevant hashtags per post
- Suggest the best day/time to post (e.g., "Tuesday 9am", "Thursday 12pm")
- Specify engagement type: "thought-leadership", "storytelling", "how-to", "debate", "celebration", "data-insight"

Return JSON with this structure:
{
  "posts": [
    {
      "title": "Short descriptive title for the post idea",
      "hook": "The actual first 2-3 lines that appear before 'see more'",
      "content_outline": ["Point 1 to cover", "Point 2 to cover", "Point 3 to cover"],
      "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
      "best_time": "Day and time, e.g. Tuesday 9am",
      "engagement_type": "thought-leadership"
    }
  ]
}`;

  return { system, user };
}

export function linkedinNetworkStrategyPrompt(
  input: LinkedInNetworkInput
): { system: string; user: string } {
  const system = `You are a LinkedIn networking strategist who has helped professionals build powerful networks that accelerate their careers. You understand the dynamics of professional relationship building: warm outreach vs cold, the importance of giving before asking, strategic group participation, and how to leverage LinkedIn events.

Networking principles:
1. Always lead with value, not asks
2. Personalize every connection request (reference shared interests, mutual connections, their content)
3. Engage with someone's content 2-3 times before sending a connection request
4. Join groups where your target connections are active
5. Attend virtual and in-person events for deeper relationship building
6. Follow up within 48 hours of connecting
7. Build relationships before you need them

Outreach message rules:
- Keep connection requests under 300 characters
- Reference something specific about them (article, role, shared background)
- Never pitch in the first message
- Ask insightful questions rather than making statements
- Follow-up messages should provide value (share an article, insight, or introduction)

Respond ONLY with valid JSON matching the requested schema.`;

  const user = `Create a LinkedIn networking strategy for this professional:

PROFILE:
Name: ${input.profile.name}
Headline: ${input.profile.headline || '(not set)'}
Skills: ${input.profile.skills.slice(0, 15).join(', ')}
Goals: ${input.profile.goals.join(', ')}

${input.targetRole ? `TARGET ROLE: ${input.targetRole}` : ''}
${input.targetCompanies && input.targetCompanies.length > 0 ? `TARGET COMPANIES: ${input.targetCompanies.join(', ')}` : ''}

Generate a comprehensive networking strategy including:

1. target_connections: 5-7 types of people they should connect with, each with:
   - role_type: The type of professional (e.g., "Engineering Managers at Series B+ startups")
   - why: Why this connection is valuable for their goals
   - where_to_find: Specific places to find them (groups, events, hashtags)
   - outreach_template: A personalized connection request message template (under 300 chars, with [brackets] for customization)

2. groups: 5-8 LinkedIn groups to join with:
   - name: Specific group name or type to search for
   - reason: Why this group helps their goals

3. weekly_actions: 7-10 specific weekly networking actions they should take (e.g., "Comment on 3 posts from target connections every morning", "Share 1 industry article with your own take on Wednesdays")

Return JSON with this structure:
{
  "target_connections": [
    {
      "role_type": "Type of professional",
      "why": "Why connect with them",
      "where_to_find": "Where to find them",
      "outreach_template": "Hi [Name], I noticed..."
    }
  ],
  "groups": [
    { "name": "Group name", "reason": "Why join" }
  ],
  "weekly_actions": ["Action 1", "Action 2"]
}`;

  return { system, user };
}

export function linkedinCalendarPrompt(
  input: LinkedInCalendarInput
): { system: string; user: string } {
  const system = `You are a LinkedIn content calendar strategist who helps professionals maintain consistent posting schedules that maximize engagement and build authority. You understand content planning: theme weeks, content mix ratios, seasonal timing, and how to maintain a sustainable posting cadence.

Calendar principles:
1. Consistency beats frequency - better to post 3x/week reliably than 7x/week for 2 weeks then stop
2. Each week should have a theme that builds on the previous one
3. Mix content formats: text posts (Mon/Wed), carousels or images (Tue/Thu), stories or polls (Fri)
4. Front-load the week: Tuesday-Thursday posts get the most engagement
5. Monday posts should be motivational/reflective, Friday posts lighter/conversational
6. Build narrative arcs across weeks
7. Include "engagement bait" days (questions, polls, hot takes) to boost algorithmic reach

Content format types:
- "text-post": Long-form text with hook (best for stories, lessons)
- "carousel": Multi-slide visual content (best for how-to, frameworks)
- "poll": Engagement-driving questions (best for Fridays)
- "image-post": Single image with caption (best for data, quotes)
- "video-idea": Short video concept (best for tutorials, behind-scenes)
- "article": Long-form LinkedIn article (best for deep dives)
- "document": PDF/slide share (best for guides, checklists)

Respond ONLY with valid JSON matching the requested schema.`;

  const postsPerWeek = input.postsPerWeek || 3;

  const user = `Create a 4-week LinkedIn content calendar for this professional:

PROFILE:
Name: ${input.profile.name}
Headline: ${input.profile.headline || '(not set)'}
Skills: ${input.profile.skills.slice(0, 15).join(', ')}

NICHE: ${input.niche}
POSTS PER WEEK: ${postsPerWeek}

Generate a 4-week posting schedule where:
- Each week has a cohesive theme that builds authority in their niche
- Posts are spread across the week on optimal days (prioritize Tue-Thu)
- Content formats are varied (text-post, carousel, poll, image-post, video-idea, article, document)
- Each post has specific key points to cover (not vague)
- The 4 weeks tell a progression story (Week 1: establish expertise, Week 2: share frameworks, Week 3: challenge conventions, Week 4: build community)
- Total posts per week: ${postsPerWeek}

Return JSON with this structure:
{
  "weeks": [
    {
      "week_number": 1,
      "theme": "Theme for this week",
      "posts": [
        {
          "day": "Tuesday",
          "topic": "Specific post topic",
          "format": "text-post",
          "key_points": ["Point 1", "Point 2", "Point 3"]
        }
      ]
    }
  ]
}`;

  return { system, user };
}
