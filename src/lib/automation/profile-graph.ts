// Profile Graph Service for aggregating user profile data

import { db } from '@/lib/db';

export interface Experience {
  id: string;
  role: string;
  organization: string;
  startDate?: Date | null;
  endDate?: Date | null;
  description?: string;
  achievements?: string[];
  skills?: string[];
}

export interface ProfileGraph {
  userId: string;
  name: string;
  email: string;
  headline?: string;
  about?: string;
  skills: string[];
  workExperience: Experience[];
  projects: Experience[];
  education: {
    school: string;
    degree: string;
    field?: string;
    startDate?: Date | null;
    endDate?: Date | null;
  }[];
}

export class ProfileGraphService {
  static async getProfileGraph(userId: string): Promise<ProfileGraph> {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            skills: true,
            experiences: true,
            education: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Build the profile graph from available data
    const profile = user.profile;

    return {
      userId: user.id,
      name: user.name || '',
      email: user.email || '',
      headline: profile?.headline || undefined,
      about: profile?.summary || undefined,
      skills: profile?.skills?.map((s) => s.name) || [],
      workExperience: this.parseExperiencesFromDb(profile?.experiences),
      projects: [], // Projects would need a separate relation
      education: this.parseEducationFromDb(profile?.education),
    };
  }

  private static parseExperiencesFromDb(data: unknown): Experience[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>, index) => ({
      id: (item.id as string) || `exp-${index}`,
      role: (item.title as string) || 'Position',
      organization: (item.company as string) || 'Organization',
      startDate: item.startDate ? new Date(item.startDate as string) : null,
      endDate: item.endDate ? new Date(item.endDate as string) : null,
      description: (item.description as string) || undefined,
      achievements: (item.achievements as string[]) || [],
      skills: (item.skills as string[]) || [],
    }));
  }

  private static parseExperiences(data: unknown): Experience[] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>, index) => ({
      id: (item.id as string) || `exp-${index}`,
      role: (item.role as string) || (item.title as string) || 'Position',
      organization: (item.organization as string) || (item.company as string) || 'Organization',
      startDate: item.startDate ? new Date(item.startDate as string) : null,
      endDate: item.endDate ? new Date(item.endDate as string) : null,
      description: (item.description as string) || undefined,
      achievements: (item.achievements as string[]) || [],
      skills: (item.skills as string[]) || [],
    }));
  }

  private static parseEducationFromDb(data: unknown): ProfileGraph['education'] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>) => ({
      school: (item.institution as string) || 'School',
      degree: (item.degree as string) || 'Degree',
      field: (item.field as string) || undefined,
      startDate: item.startDate ? new Date(item.startDate as string) : null,
      endDate: item.endDate ? new Date(item.endDate as string) : null,
    }));
  }

  private static parseEducation(data: unknown): ProfileGraph['education'] {
    if (!data || !Array.isArray(data)) return [];

    return data.map((item: Record<string, unknown>) => ({
      school: (item.school as string) || (item.institution as string) || 'School',
      degree: (item.degree as string) || 'Degree',
      field: (item.field as string) || (item.major as string) || undefined,
      startDate: item.startDate ? new Date(item.startDate as string) : null,
      endDate: item.endDate ? new Date(item.endDate as string) : null,
    }));
  }
}
