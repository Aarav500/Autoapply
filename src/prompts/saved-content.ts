export interface CategorizeContentInput {
  title: string;
  url?: string;
  notes?: string;
  source?: string;
}

export interface RecommendContentInput {
  savedItems: Array<{ title: string; category: string; tags: string[] }>;
  interests: string[];
}

export function categorizeContentPrompt(input: CategorizeContentInput): { system: string; user: string } {
  const system = `You are a content categorization expert. Your job is to classify saved content into exactly one category and generate relevant tags.

Available categories (pick exactly one):
- Book
- Website
- GitHub Repo
- Course
- Tool
- Article
- Video
- Research Paper
- Podcast
- Newsletter
- Other

Guidelines:
1. Choose the single most accurate category based on the title, URL pattern, and any notes provided.
2. Generate 3-5 relevant tags that describe the content's topic, technology, or domain. Tags should be lowercase, concise, and specific.
3. Write a brief 1-2 sentence summary of what this content likely covers based on available information.
4. If a URL contains "github.com", it is almost certainly a "GitHub Repo".
5. If a URL contains "youtube.com" or "vimeo.com", it is likely a "Video".
6. If a URL contains "arxiv.org" or "papers.", it is likely a "Research Paper".
7. If a URL contains "udemy.com", "coursera.org", or "edx.org", it is likely a "Course".

Return a JSON object with: category (string), tags (array of strings), summary (string).`;

  const user = `Categorize the following saved content:

Title: ${input.title}
${input.url ? `URL: ${input.url}` : ''}
${input.notes ? `Notes: ${input.notes}` : ''}
${input.source ? `Source: ${input.source}` : ''}

Return JSON with:
- category: one of the allowed categories listed above
- tags: 3-5 relevant lowercase tags
- summary: brief 1-2 sentence description of the content`;

  return { system, user };
}

export function recommendContentPrompt(input: RecommendContentInput): { system: string; user: string } {
  const system = `You are a content recommendation engine that suggests high-quality learning resources. Based on a user's saved content library and stated interests, you recommend new resources they would find valuable.

Guidelines:
1. Analyze patterns in what the user has saved — topics, technologies, skill levels, and content types they prefer.
2. Recommend 5-10 resources that complement their existing collection.
3. Include a mix of content types: books, tools, GitHub repos, courses, articles, and videos.
4. Prioritize well-known, high-quality resources that are widely recommended by professionals.
5. Avoid recommending items that overlap too closely with what they already have saved.
6. For each recommendation, explain why it is relevant given their existing library.
7. Include a url_hint with a likely URL or search term when possible.

Return a JSON object with a "recommendations" array, where each item has: title (string), type (string — one of Book, Website, GitHub Repo, Course, Tool, Article, Video, Research Paper, Podcast, Newsletter), description (string), why_relevant (string), url_hint (string).`;

  const itemsList = input.savedItems
    .map((item, i) => `${i + 1}. "${item.title}" [${item.category}] — tags: ${item.tags.join(', ')}`)
    .join('\n');

  const user = `Here is my saved content library:

${itemsList || 'No items saved yet.'}

My interests: ${input.interests.length > 0 ? input.interests.join(', ') : 'general technology, software development, career growth'}

Based on my saved content and interests, recommend 5-10 new resources I should explore. Return JSON with a "recommendations" array.`;

  return { system, user };
}
