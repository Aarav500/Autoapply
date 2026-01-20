export interface Activity {
    id: string;
    name: string;
    role?: string;
    organization?: string;
    category?: 'academic' | 'leadership' | 'work' | 'volunteer' | 'creative' | 'athletic' | 'other';
    type?: string;
    description: string;
    startDate?: string;
    endDate?: string;
    isOngoing?: boolean;
    hoursPerWeek?: number;
    weeksPerYear?: number;
    achievements?: string[];
    skills?: string[];
    impact?: string;
    // Legacy support
    hours?: number;
    years?: string;
}

export interface Achievement {
    id: string;
    title: string;
    category?: 'academic' | 'award' | 'publication' | 'certification' | 'other';
    type?: string;
    date: string;
    description: string;
    issuer?: string;
    url?: string;
    // Legacy
    activities?: string[];
}
