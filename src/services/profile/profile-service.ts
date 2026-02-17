/**
 * Profile service - handles all profile CRUD operations with S3 storage
 */

import { nanoid } from 'nanoid';
import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { ValidationError, NotFoundError } from '@/lib/errors';
import {
  Profile,
  ProfileUpdate,
  Skill,
  Experience,
  ExperienceCreate,
  ExperienceUpdate,
  Education,
  EducationCreate,
  EducationUpdate,
  Certification,
  CertificationCreate,
  Project,
  ProjectCreate,
  Language,
  LanguageCreate,
  SocialLink,
  SocialLinkCreate,
  Preferences,
  PreferencesUpdate,
} from '@/types/profile';
import { calculateCompleteness } from './completeness';

/**
 * Get profile key in S3
 */
function getProfileKey(userId: string): string {
  return `users/${userId}/profile.json`;
}

/**
 * Get user profile from S3
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  try {
    const profileKey = getProfileKey(userId);
    const profile = await storage.getJSON<Profile>(profileKey);
    return profile;
  } catch (error) {
    logger.error({ error, userId }, 'Failed to get profile');
    return null;
  }
}

/**
 * Initialize a new empty profile for a user
 */
export async function initializeProfile(
  userId: string,
  email: string,
  name: string
): Promise<Profile> {
  const now = new Date().toISOString();

  const profile: Profile = {
    id: userId,
    email,
    name,
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    languages: [],
    socialLinks: [],
    preferences: {
      targetRoles: [],
      targetCompanies: [],
      locations: [],
      industries: [],
      dealBreakers: [],
    },
    completenessScore: 0,
    createdAt: now,
    updatedAt: now,
  };

  // Calculate initial completeness
  const completeness = calculateCompleteness(profile);
  profile.completenessScore = completeness.score;

  // Save to S3
  const profileKey = getProfileKey(userId);
  await storage.putJSON(profileKey, profile);

  logger.info({ userId }, 'Profile initialized');
  return profile;
}

/**
 * Update profile basic fields
 */
export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    // Merge updates
    profile = {
      ...profile,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId }, 'Profile updated');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to update profile');
    throw new Error('Failed to update profile');
  }
}

// ==================== Skills ====================

/**
 * Update skills array (replaces entire array)
 */
export async function updateSkills(userId: string, skills: Skill[]): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    profile.skills = skills;
    profile.updatedAt = new Date().toISOString();

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId, skillCount: skills.length }, 'Skills updated');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to update skills');
    throw new Error('Failed to update skills');
  }
}

// ==================== Experience ====================

/**
 * Add experience entry
 */
export async function addExperience(
  userId: string,
  experienceData: ExperienceCreate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const experience: Experience = {
      id: nanoid(),
      ...experienceData,
    };

    profile.experience.push(experience);
    profile.updatedAt = new Date().toISOString();

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId, experienceId: experience.id }, 'Experience added');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to add experience');
    throw new Error('Failed to add experience');
  }
}

/**
 * Update experience entry
 */
export async function updateExperience(
  userId: string,
  experienceId: string,
  updates: ExperienceUpdate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const experienceIndex = profile.experience.findIndex((exp) => exp.id === experienceId);

    if (experienceIndex === -1) {
      throw new NotFoundError('Experience not found');
    }

    profile.experience[experienceIndex] = {
      ...profile.experience[experienceIndex],
      ...updates,
    };
    profile.updatedAt = new Date().toISOString();

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId, experienceId }, 'Experience updated');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId, experienceId }, 'Failed to update experience');
    throw new Error('Failed to update experience');
  }
}

/**
 * Remove experience entry
 */
export async function removeExperience(
  userId: string,
  experienceId: string
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const experienceIndex = profile.experience.findIndex((exp) => exp.id === experienceId);

    if (experienceIndex === -1) {
      throw new NotFoundError('Experience not found');
    }

    profile.experience.splice(experienceIndex, 1);
    profile.updatedAt = new Date().toISOString();

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId, experienceId }, 'Experience removed');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId, experienceId }, 'Failed to remove experience');
    throw new Error('Failed to remove experience');
  }
}

// ==================== Education ====================

/**
 * Add education entry
 */
export async function addEducation(
  userId: string,
  educationData: EducationCreate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const education: Education = {
      id: nanoid(),
      ...educationData,
    };

    profile.education.push(education);
    profile.updatedAt = new Date().toISOString();

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId, educationId: education.id }, 'Education added');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to add education');
    throw new Error('Failed to add education');
  }
}

/**
 * Remove education entry
 */
export async function removeEducation(
  userId: string,
  educationId: string
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const educationIndex = profile.education.findIndex((edu) => edu.id === educationId);

    if (educationIndex === -1) {
      throw new NotFoundError('Education not found');
    }

    profile.education.splice(educationIndex, 1);
    profile.updatedAt = new Date().toISOString();

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId, educationId }, 'Education removed');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId, educationId }, 'Failed to remove education');
    throw new Error('Failed to remove education');
  }
}

// ==================== Other Array Operations ====================

/**
 * Add certification
 */
export async function addCertification(
  userId: string,
  certificationData: CertificationCreate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const certification: Certification = {
      id: nanoid(),
      ...certificationData,
    };

    profile.certifications.push(certification);
    profile.updatedAt = new Date().toISOString();

    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    await storage.putJSON(getProfileKey(userId), profile);

    logger.info({ userId, certificationId: certification.id }, 'Certification added');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to add certification');
    throw new Error('Failed to add certification');
  }
}

/**
 * Add project
 */
export async function addProject(
  userId: string,
  projectData: ProjectCreate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    const project: Project = {
      id: nanoid(),
      ...projectData,
    };

    profile.projects.push(project);
    profile.updatedAt = new Date().toISOString();

    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    await storage.putJSON(getProfileKey(userId), profile);

    logger.info({ userId, projectId: project.id }, 'Project added');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to add project');
    throw new Error('Failed to add project');
  }
}

/**
 * Add language
 */
export async function addLanguage(
  userId: string,
  languageData: LanguageCreate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    profile.languages.push(languageData);
    profile.updatedAt = new Date().toISOString();

    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    await storage.putJSON(getProfileKey(userId), profile);

    logger.info({ userId, language: languageData.language }, 'Language added');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to add language');
    throw new Error('Failed to add language');
  }
}

/**
 * Add social link
 */
export async function addSocialLink(
  userId: string,
  socialLinkData: SocialLinkCreate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    profile.socialLinks.push(socialLinkData);
    profile.updatedAt = new Date().toISOString();

    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    await storage.putJSON(getProfileKey(userId), profile);

    logger.info({ userId, platform: socialLinkData.platform }, 'Social link added');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to add social link');
    throw new Error('Failed to add social link');
  }
}

// ==================== Preferences ====================

/**
 * Update job preferences
 */
export async function updatePreferences(
  userId: string,
  preferencesUpdate: PreferencesUpdate
): Promise<Profile> {
  try {
    let profile = await getProfile(userId);

    if (!profile) {
      throw new NotFoundError('Profile not found');
    }

    profile.preferences = {
      ...profile.preferences,
      ...preferencesUpdate,
    };
    profile.updatedAt = new Date().toISOString();

    // Recalculate completeness
    const completeness = calculateCompleteness(profile);
    profile.completenessScore = completeness.score;

    // Save to S3
    const profileKey = getProfileKey(userId);
    await storage.putJSON(profileKey, profile);

    logger.info({ userId }, 'Preferences updated');
    return profile;
  } catch (error) {
    if (error instanceof NotFoundError) {
      throw error;
    }
    logger.error({ error, userId }, 'Failed to update preferences');
    throw new Error('Failed to update preferences');
  }
}
