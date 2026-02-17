/**
 * Profile completeness scoring logic
 */

import { Profile, CompletenessResult, CompletenessSection } from '@/types/profile';

interface ScoringRule {
  category: string;
  maxPoints: number;
  check: (profile: Profile) => boolean;
  description: string;
  nextStep: string;
}

const SCORING_RULES: ScoringRule[] = [
  {
    category: 'Basic Info',
    maxPoints: 5,
    check: (p) => !!p.name && !!p.email,
    description: 'Name and email provided',
    nextStep: 'Add your name and email address',
  },
  {
    category: 'Phone',
    maxPoints: 5,
    check: (p) => !!p.phone,
    description: 'Phone number provided',
    nextStep: 'Add your phone number',
  },
  {
    category: 'Summary',
    maxPoints: 10,
    check: (p) => !!p.summary && p.summary.length >= 50,
    description: 'Professional summary (50+ characters)',
    nextStep: 'Write a compelling professional summary (at least 50 characters)',
  },
  {
    category: 'Work Experience',
    maxPoints: 15,
    check: (p) => p.experience.length >= 2,
    description: 'At least 2 work experiences',
    nextStep: 'Add at least 2 work experiences with details',
  },
  {
    category: 'Education',
    maxPoints: 10,
    check: (p) => p.education.length >= 1,
    description: 'At least 1 education entry',
    nextStep: 'Add your educational background',
  },
  {
    category: 'Skills',
    maxPoints: 10,
    check: (p) => p.skills.length >= 5,
    description: 'At least 5 skills listed',
    nextStep: 'Add at least 5 relevant skills',
  },
  {
    category: 'Job Preferences',
    maxPoints: 15,
    check: (p) =>
      p.preferences.targetRoles.length > 0 &&
      p.preferences.locations.length > 0 &&
      !!p.preferences.remotePreference,
    description: 'Job preferences configured',
    nextStep: 'Set your target roles, locations, and remote preference',
  },
  {
    category: 'Social Links',
    maxPoints: 5,
    check: (p) => p.socialLinks.length >= 1,
    description: 'At least 1 social/professional link',
    nextStep: 'Add LinkedIn or other professional profile links',
  },
  {
    category: 'Projects',
    maxPoints: 10,
    check: (p) => p.projects.length >= 1,
    description: 'At least 1 project showcased',
    nextStep: 'Showcase at least 1 project you\'ve worked on',
  },
  {
    category: 'Profile Photo',
    maxPoints: 5,
    check: (p) => !!p.photoUrl,
    description: 'Profile photo uploaded',
    nextStep: 'Upload a professional profile photo',
  },
  {
    category: 'Certifications',
    maxPoints: 5,
    check: (p) => p.certifications.length >= 1,
    description: 'At least 1 certification',
    nextStep: 'Add relevant certifications',
  },
  {
    category: 'Languages',
    maxPoints: 5,
    check: (p) => p.languages.length >= 1,
    description: 'At least 1 language listed',
    nextStep: 'Add languages you speak',
  },
];

/**
 * Calculate profile completeness score and breakdown
 */
export function calculateCompleteness(profile: Profile): CompletenessResult {
  const breakdown: CompletenessSection[] = [];
  let totalScore = 0;

  // Evaluate each scoring rule
  for (const rule of SCORING_RULES) {
    const isComplete = rule.check(profile);
    const points = isComplete ? rule.maxPoints : 0;

    breakdown.push({
      category: rule.category,
      points,
      maxPoints: rule.maxPoints,
      complete: isComplete,
      description: rule.description,
    });

    totalScore += points;
  }

  // Generate next steps (only for incomplete sections, sorted by point value)
  const nextSteps = SCORING_RULES.filter((rule) => !rule.check(profile))
    .sort((a, b) => b.maxPoints - a.maxPoints) // Highest point value first
    .map((rule) => rule.nextStep);

  return {
    score: totalScore,
    breakdown,
    nextSteps,
  };
}

/**
 * Get a quick completeness percentage (0-100)
 */
export function getCompletenessPercentage(profile: Profile): number {
  return calculateCompleteness(profile).score;
}
