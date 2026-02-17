import { CVContent, ATSResult } from '@/types/documents';
import { logger } from '@/lib/logger';

/**
 * Common action verbs used in strong CVs
 */
const ACTION_VERBS = new Set([
  'achieved', 'administered', 'analyzed', 'architected', 'automated', 'built',
  'created', 'delivered', 'designed', 'developed', 'drove', 'enhanced',
  'established', 'executed', 'generated', 'implemented', 'improved', 'increased',
  'initiated', 'launched', 'led', 'managed', 'optimized', 'orchestrated',
  'performed', 'produced', 'reduced', 'resolved', 'streamlined', 'transformed',
]);

/**
 * Weak phrases to avoid
 */
const WEAK_PHRASES = [
  'responsible for',
  'worked on',
  'helped with',
  'assisted in',
  'involved in',
  'participated in',
  'contributed to',
];

/**
 * Extract keywords from job description
 */
function extractKeywords(jobDescription: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
    'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'should', 'could', 'may', 'might', 'must', 'can', 'this', 'that',
    'these', 'those', 'we', 'you', 'they', 'our', 'your', 'their',
  ]);

  const words = jobDescription
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 3 && !stopWords.has(word));

  // Count word frequency
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Return top 20 most frequent words
  return Array.from(wordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word]) => word);
}

/**
 * Check if CV contains quantified achievements
 */
function hasQuantifiedAchievements(cvContent: CVContent): boolean {
  const allText = [
    cvContent.summary,
    ...cvContent.experience.flatMap(e => e.highlights),
    ...(cvContent.projects?.flatMap(p => p.highlights) || []),
  ].join(' ');

  // Look for numbers, percentages, dollar amounts
  const hasNumbers = /\d+/.test(allText);
  const hasPercentages = /%/.test(allText);
  const hasCurrency = /\$|USD|EUR|GBP/.test(allText);

  return hasNumbers || hasPercentages || hasCurrency;
}

/**
 * Check if CV uses action verbs
 */
function hasActionVerbs(cvContent: CVContent): boolean {
  const highlights = cvContent.experience.flatMap(e => e.highlights);

  let actionVerbCount = 0;
  for (const highlight of highlights) {
    const firstWord = highlight.trim().split(/\s+/)[0]?.toLowerCase();
    if (firstWord && ACTION_VERBS.has(firstWord)) {
      actionVerbCount++;
    }
  }

  // At least 60% of highlights should start with action verbs
  return actionVerbCount >= highlights.length * 0.6;
}

/**
 * Check if CV has weak phrases
 */
function hasWeakPhrases(cvContent: CVContent): string[] {
  const allText = [
    cvContent.summary,
    ...cvContent.experience.flatMap(e => e.highlights),
  ].join(' ').toLowerCase();

  return WEAK_PHRASES.filter(phrase => allText.includes(phrase));
}

/**
 * Check CV for ATS compatibility and quality
 */
export function checkATS(cvContent: CVContent, jobDescription?: string): ATSResult {
  logger.info('Starting ATS check');

  // Formatting checks
  const formattingPassed: string[] = [];
  const formattingFailed: string[] = [];

  // Check contact info
  if (cvContent.contactInfo.name && cvContent.contactInfo.email) {
    formattingPassed.push('Complete contact information');
  } else {
    formattingFailed.push('Missing contact information');
  }

  // Check summary
  if (cvContent.summary && cvContent.summary.length >= 100) {
    formattingPassed.push('Professional summary present');
  } else {
    formattingFailed.push('Summary too short or missing');
  }

  // Check experience bullets
  if (cvContent.experience.length > 0) {
    formattingPassed.push('Work experience included');
  } else {
    formattingFailed.push('No work experience');
  }

  // Check education
  if (cvContent.education.length > 0) {
    formattingPassed.push('Education section included');
  } else {
    formattingFailed.push('No education information');
  }

  // Check skills
  if (cvContent.skills.technical.length > 0) {
    formattingPassed.push('Technical skills listed');
  } else {
    formattingFailed.push('No technical skills listed');
  }

  const formattingScore = Math.round((formattingPassed.length / (formattingPassed.length + formattingFailed.length)) * 100);

  // Keyword analysis
  let keywordScore = 100;
  let foundKeywords: string[] = [];
  let missingKeywords: string[] = [];
  let keywordSuggestions: string[] = [];

  if (jobDescription) {
    const keywords = extractKeywords(jobDescription);
    const cvText = [
      cvContent.summary,
      ...cvContent.experience.flatMap(e => e.highlights),
      ...cvContent.skills.technical,
      ...cvContent.skills.soft,
    ].join(' ').toLowerCase();

    for (const keyword of keywords) {
      if (cvText.includes(keyword)) {
        foundKeywords.push(keyword);
      } else {
        missingKeywords.push(keyword);
      }
    }

    keywordScore = keywords.length > 0
      ? Math.round((foundKeywords.length / keywords.length) * 100)
      : 100;

    if (missingKeywords.length > 0) {
      keywordSuggestions.push(
        `Consider adding these keywords from the job description: ${missingKeywords.slice(0, 5).join(', ')}`
      );
    }
  } else {
    foundKeywords = ['No job description provided'];
    keywordSuggestions.push('Provide a job description for keyword analysis');
  }

  // Content checks
  const contentPassed: string[] = [];
  const contentFailed: string[] = [];
  const contentSuggestions: string[] = [];

  // Check for summary
  const hasSummary = Boolean(cvContent.summary && cvContent.summary.length > 0);
  if (hasSummary) {
    contentPassed.push('Professional summary included');
  } else {
    contentFailed.push('No professional summary');
    contentSuggestions.push('Add a 2-3 sentence professional summary highlighting your unique value proposition');
  }

  // Check for quantified achievements
  const quantified = hasQuantifiedAchievements(cvContent);
  if (quantified) {
    contentPassed.push('Quantified achievements present');
  } else {
    contentFailed.push('Lacks quantified achievements');
    contentSuggestions.push('Add specific metrics, percentages, or dollar amounts to your achievements');
  }

  // Check for action verbs
  const actionVerbs = hasActionVerbs(cvContent);
  if (actionVerbs) {
    contentPassed.push('Uses strong action verbs');
  } else {
    contentFailed.push('Weak action verbs');
    contentSuggestions.push('Start bullet points with strong action verbs like: achieved, architected, drove, optimized');
  }

  // Check for weak phrases
  const weakPhrases = hasWeakPhrases(cvContent);
  if (weakPhrases.length === 0) {
    contentPassed.push('No weak phrases detected');
  } else {
    contentFailed.push(`Contains weak phrases: ${weakPhrases.join(', ')}`);
    contentSuggestions.push('Replace phrases like "responsible for" with action verbs and specific achievements');
  }

  // Check contact info completeness
  const hasContact = Boolean(cvContent.contactInfo.email && cvContent.contactInfo.phone);
  if (hasContact) {
    contentPassed.push('Complete contact information');
  } else {
    contentFailed.push('Incomplete contact information');
    contentSuggestions.push('Include both email and phone number');
  }

  const contentScore = Math.round((contentPassed.length / (contentPassed.length + contentFailed.length)) * 100);

  // Calculate overall score (weighted average)
  const overallScore = Math.round(
    formattingScore * 0.3 +
    keywordScore * 0.4 +
    contentScore * 0.3
  );

  // Overall suggestions
  const overallSuggestions: string[] = [];

  if (overallScore < 70) {
    overallSuggestions.push('Consider revising your CV to improve ATS compatibility');
  }

  if (keywordScore < 60 && jobDescription) {
    overallSuggestions.push('Tailor your CV more closely to the job description');
  }

  if (!quantified) {
    overallSuggestions.push('Add specific metrics to demonstrate impact (e.g., "Increased revenue by 25%")');
  }

  if (!actionVerbs) {
    overallSuggestions.push('Use stronger action verbs to start your bullet points');
  }

  const result: ATSResult = {
    score: overallScore,
    breakdown: {
      formatting: {
        score: formattingScore,
        passed: formattingPassed,
        failed: formattingFailed,
      },
      keywords: {
        score: keywordScore,
        found: foundKeywords,
        missing: missingKeywords,
        suggestions: keywordSuggestions,
      },
      content: {
        score: contentScore,
        hasSummary,
        hasQuantifiedAchievements: quantified,
        hasActionVerbs: actionVerbs,
        hasContactInfo: hasContact,
        suggestions: contentSuggestions,
      },
    },
    overallSuggestions,
  };

  logger.info({
    overallScore,
    formattingScore,
    keywordScore,
    contentScore,
  });

  return result;
}
