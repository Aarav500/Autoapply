// User profile for job matching

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  headline?: string;
  summary?: string;
  location?: string;
  state?: string;
  citizenship?: string;
  ethnicity?: string;
  gender?: string;
  gpa?: number;
  major?: string;
  school?: string;
  graduationYear?: number;
  degree?: string;
  skills: string[];
  activities?: {
    name: string;
    description?: string;
    role?: string;
  }[];
  achievements?: {
    type: string;
    title: string;
    description?: string;
  }[];
  experience: {
    title: string;
    company: string;
    years: number;
    description?: string;
  }[];
  education: {
    degree: string;
    institution: string;
    year?: number;
  }[];
  preferences: {
    desiredRoles: string[];
    desiredLocations: string[];
    remotePreference: 'remote' | 'hybrid' | 'onsite' | 'any';
    salaryMin?: number;
    salaryMax?: number;
    yearsOfExperience?: number;
  };
}

export const DEFAULT_PROFILE: UserProfile = {
  id: '',
  name: '',
  email: '',
  gpa: 0,
  skills: [],
  experience: [],
  education: [],
  preferences: {
    desiredRoles: [],
    desiredLocations: [],
    remotePreference: 'any',
  },
};

// Create a profile from database data
export function createProfileFromDb(data: {
  id: string;
  name: string | null;
  email: string | null;
  profile?: {
    headline?: string | null;
    summary?: string | null;
    location?: string | null;
    remotePreference?: string | null;
    salaryMin?: number | null;
    salaryMax?: number | null;
    yearsOfExperience?: number | null;
    skills?: { name: string }[];
    experiences?: {
      title: string;
      company: string;
      description?: string | null;
      startDate: Date;
      endDate?: Date | null;
    }[];
    education?: {
      degree: string;
      institution: string;
      endDate?: Date | null;
    }[];
  } | null;
}): UserProfile {
  const profile = data.profile;

  return {
    id: data.id,
    name: data.name || '',
    email: data.email || '',
    headline: profile?.headline || undefined,
    summary: profile?.summary || undefined,
    location: profile?.location || undefined,
    skills: profile?.skills?.map((s) => s.name) || [],
    experience:
      profile?.experiences?.map((e) => ({
        title: e.title,
        company: e.company,
        years: calculateYears(e.startDate, e.endDate),
        description: e.description || undefined,
      })) || [],
    education:
      profile?.education?.map((e) => ({
        degree: e.degree,
        institution: e.institution,
        year: e.endDate?.getFullYear(),
      })) || [],
    preferences: {
      desiredRoles: [],
      desiredLocations: profile?.location ? [profile.location] : [],
      remotePreference:
        (profile?.remotePreference as UserProfile['preferences']['remotePreference']) || 'any',
      salaryMin: profile?.salaryMin || undefined,
      salaryMax: profile?.salaryMax || undefined,
      yearsOfExperience: profile?.yearsOfExperience || undefined,
    },
  };
}

function calculateYears(startDate: Date, endDate?: Date | null): number {
  const end = endDate || new Date();
  const diffMs = end.getTime() - startDate.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365)));
}
