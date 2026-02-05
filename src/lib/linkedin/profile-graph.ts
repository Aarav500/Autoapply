// LinkedIn Profile Graph types and utilities

export interface ProfileSnapshot {
  headline?: string;
  about?: string;
  lastUpdated?: Date | string;
  experiences: {
    id: string;
    title: string;
    company: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    isCurrent?: boolean;
  }[];
  education: {
    id: string;
    school: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }[];
  skills: string[];
  certifications: string[];
  projects: {
    id: string;
    name: string;
    description?: string;
  }[];
}

export interface ProfileRecommendation {
  id: string;
  type: 'headline' | 'about' | 'experience' | 'skills' | 'education' | 'projects' | 'missing';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  currentValue?: string;
  suggestedValue?: string;
  // Component-specific fields
  impact: 'high' | 'medium' | 'low';
  section?: string;
  message?: string;
  suggestedAction?: string;
  contentToCopy?: string;
}

export interface LinkedInProfileGraph {
  snapshot: ProfileSnapshot;
  recommendations: ProfileRecommendation[];
  score: number;
  lastUpdated: Date;
}

// Generate profile recommendations based on snapshot
export function generateRecommendations(snapshot: ProfileSnapshot): ProfileRecommendation[] {
  const recommendations: ProfileRecommendation[] = [];

  // Check headline
  if (!snapshot.headline || snapshot.headline.length < 20) {
    recommendations.push({
      id: 'headline-1',
      type: 'headline',
      priority: 'high',
      title: 'Improve your headline',
      description: 'Your headline is the first thing recruiters see. Make it compelling and keyword-rich.',
      currentValue: snapshot.headline || '(empty)',
      suggestedValue: 'Software Engineer | Full-Stack Developer | React & Node.js Expert',
      impact: 'high',
      message: 'Your headline needs improvement',
      suggestedAction: 'Increases profile views by up to 40%',
    });
  }

  // Check about section
  if (!snapshot.about || snapshot.about.length < 100) {
    recommendations.push({
      id: 'about-1',
      type: 'about',
      priority: 'high',
      title: 'Write a compelling summary',
      description: 'Your summary should tell your professional story and highlight key achievements.',
      impact: 'high',
      message: 'Add a compelling summary',
      suggestedAction: 'Profiles with summaries get 10x more views',
    });
  }

  // Check skills
  if (snapshot.skills.length < 10) {
    recommendations.push({
      id: 'skills-1',
      type: 'skills',
      priority: 'medium',
      title: 'Add more skills',
      description: `You have ${snapshot.skills.length} skills. Aim for at least 10 relevant skills to improve discoverability.`,
      impact: 'medium',
      message: 'Add more relevant skills',
      suggestedAction: 'Profiles with 10+ skills get 17x more views',
    });
  }

  // Check experience descriptions
  const experiencesWithoutDescriptions = snapshot.experiences.filter(
    (e) => !e.description || e.description.length < 50
  );
  if (experiencesWithoutDescriptions.length > 0) {
    recommendations.push({
      id: 'experience-1',
      type: 'experience',
      priority: 'high',
      title: 'Add details to your experience',
      description: `${experiencesWithoutDescriptions.length} experience(s) lack detailed descriptions. Add bullet points highlighting achievements.`,
      impact: 'high',
      message: 'Enhance your experience descriptions',
      suggestedAction: 'Detailed experiences increase recruiter interest by 3x',
    });
  }

  return recommendations;
}

// Calculate profile optimization score
export function calculateScore(snapshot: ProfileSnapshot): number {
  let score = 0;
  const maxScore = 100;

  // Headline: 15 points
  if (snapshot.headline) {
    score += snapshot.headline.length > 50 ? 15 : 10;
  }

  // About: 20 points
  if (snapshot.about) {
    if (snapshot.about.length > 500) score += 20;
    else if (snapshot.about.length > 200) score += 15;
    else if (snapshot.about.length > 50) score += 10;
  }

  // Experience: 25 points
  if (snapshot.experiences.length > 0) {
    const detailedExperiences = snapshot.experiences.filter(
      (e) => e.description && e.description.length > 100
    ).length;
    score += Math.min(25, (detailedExperiences / snapshot.experiences.length) * 25);
  }

  // Skills: 20 points
  score += Math.min(20, snapshot.skills.length * 2);

  // Education: 10 points
  if (snapshot.education.length > 0) score += 10;

  // Projects: 10 points
  if (snapshot.projects.length > 0) {
    score += Math.min(10, snapshot.projects.length * 3);
  }

  return Math.round(Math.min(maxScore, score));
}
