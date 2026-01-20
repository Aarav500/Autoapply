// ============================================
// JOB CONVERTER
// Converts Opportunity objects from the store to EnhancedJob format for UI
// ============================================

import { Opportunity } from './opportunity-store';

// Types expected by the Jobs page UI
export type ApplicationStatus = 'not_started' | 'docs_generated' | 'applied' | 'interview' | 'rejected' | 'offer';
export type LocationType = 'remote' | 'hybrid' | 'onsite';
export type EmploymentType = 'internship' | 'full-time' | 'part-time' | 'contract';

export interface EnhancedJob {
    id: string;
    title: string;
    company: string;
    companyLogo?: string;
    locations: string[];
    remoteType: LocationType;
    employmentType: EmploymentType;
    salary?: { min: number; max: number; currency: string; period: string };
    postedDate: string;
    deadline?: string;
    description: string;
    requiredSkills: string[];
    preferredSkills: string[];
    qualifications: string[];
    responsibilities: string[];
    sponsorsVisa: boolean;
    applyUrl: string;
    sourceUrl: string;
    sourceName: string;
    matchScore: number;
    matchExplanation: string[];
    applicationStatus: ApplicationStatus;
    saved: boolean;
    hidden: boolean;
    requiredDocuments: string[];
    generatedDocuments?: { cv?: string; coverLetter?: string };
}

/**
 * Parse salary string like "$50/hour" or "$80,000 - $100,000" into structured format
 */
function parseSalary(salaryStr?: string): EnhancedJob['salary'] | undefined {
    if (!salaryStr) return undefined;

    // Try to extract numbers
    const numbers = salaryStr.match(/[\d,]+/g);
    if (!numbers || numbers.length === 0) return undefined;

    const min = parseInt(numbers[0].replace(',', ''));
    const max = numbers.length > 1 ? parseInt(numbers[1].replace(',', '')) : min;

    // Determine period
    const period = salaryStr.toLowerCase().includes('hour') ? 'hourly'
        : salaryStr.toLowerCase().includes('month') ? 'monthly'
            : 'yearly';

    return { min, max, currency: 'USD', period };
}

/**
 * Detect location type from location string
 */
function detectLocationType(location?: string, description?: string): LocationType {
    const text = `${location} ${description}`.toLowerCase();
    if (text.includes('remote')) return 'remote';
    if (text.includes('hybrid')) return 'hybrid';
    return 'onsite';
}

/**
 * Detect employment type from title/description
 */
function detectEmploymentType(title: string, description?: string): EmploymentType {
    const text = `${title} ${description}`.toLowerCase();
    if (text.includes('intern')) return 'internship';
    if (text.includes('part-time') || text.includes('part time')) return 'part-time';
    if (text.includes('contract') || text.includes('contractor')) return 'contract';
    return 'full-time';
}

/**
 * Map opportunity status to application status
 */
function mapStatus(status: Opportunity['status']): ApplicationStatus {
    switch (status) {
        case 'discovered':
        case 'queued':
            return 'not_started';
        case 'tailoring':
            return 'docs_generated';
        case 'applying':
        case 'applied':
            return 'applied';
        case 'accepted':
            return 'offer';
        case 'rejected':
        case 'failed':
            return 'rejected';
        default:
            return 'not_started';
    }
}

/**
 * Generate match explanation strings based on score and requirements
 */
function generateMatchExplanation(opp: Opportunity): string[] {
    const explanations: string[] = [];

    if (opp.matchScore >= 80) {
        explanations.push('✓ High match with your profile');
    } else if (opp.matchScore >= 60) {
        explanations.push('○ Good match with your profile');
    }

    if (opp.requirements.length > 0) {
        const skillMatches = opp.requirements.slice(0, 3).join(', ');
        explanations.push(`✓ Skills: ${skillMatches}`);
    }

    // Check for visa sponsorship in description
    if (opp.description.toLowerCase().includes('sponsor') ||
        opp.description.toLowerCase().includes('visa')) {
        explanations.push('✓ May sponsor work visas');
    }

    return explanations;
}

/**
 * Get company logo URL using Clearbit Logo API
 */
function getCompanyLogo(company: string): string | undefined {
    // Clean company name for domain lookup
    const cleanName = company.toLowerCase()
        .replace(/\s+(inc|llc|corp|ltd|co)\.?$/i, '')
        .replace(/\s+/g, '')
        .replace(/[^a-z0-9]/g, '');

    // Known company domain mappings
    const knownDomains: Record<string, string> = {
        'google': 'google.com',
        'meta': 'meta.com',
        'facebook': 'meta.com',
        'amazon': 'amazon.com',
        'microsoft': 'microsoft.com',
        'apple': 'apple.com',
        'netflix': 'netflix.com',
        'spotify': 'spotify.com',
        'uber': 'uber.com',
        'lyft': 'lyft.com',
        'airbnb': 'airbnb.com',
        'stripe': 'stripe.com',
        'openai': 'openai.com',
    };

    const domain = knownDomains[cleanName] || `${cleanName}.com`;
    return `https://logo.clearbit.com/${domain}`;
}

/**
 * Convert an Opportunity from the store to EnhancedJob for the UI
 */
export function convertToEnhancedJob(opp: Opportunity): EnhancedJob {
    return {
        id: opp.id,
        title: opp.title,
        company: opp.organization,
        companyLogo: getCompanyLogo(opp.organization),
        locations: [opp.location || 'Remote'],
        remoteType: detectLocationType(opp.location, opp.description),
        employmentType: detectEmploymentType(opp.title, opp.description),
        salary: parseSalary(opp.salary),
        postedDate: opp.discoveredAt.toISOString(),
        deadline: opp.deadline,
        description: opp.description,
        requiredSkills: opp.requirements,
        preferredSkills: [],
        qualifications: [],
        responsibilities: [],
        sponsorsVisa: opp.description.toLowerCase().includes('visa') ||
            opp.description.toLowerCase().includes('sponsor'),
        applyUrl: opp.url,
        sourceUrl: opp.url,
        sourceName: extractSourceName(opp.url),
        matchScore: opp.matchScore,
        matchExplanation: generateMatchExplanation(opp),
        applicationStatus: mapStatus(opp.status),
        saved: false,
        hidden: false,
        requiredDocuments: ['resume', 'cover_letter'],
        generatedDocuments: opp.tailoredCV || opp.tailoredCoverLetter
            ? { cv: opp.tailoredCV, coverLetter: opp.tailoredCoverLetter }
            : undefined,
    };
}

/**
 * Extract source name from URL
 */
function extractSourceName(url: string): string {
    try {
        const hostname = new URL(url).hostname;
        if (hostname.includes('linkedin')) return 'LinkedIn';
        if (hostname.includes('indeed')) return 'Indeed';
        if (hostname.includes('glassdoor')) return 'Glassdoor';
        if (hostname.includes('handshake')) return 'Handshake';
        if (hostname.includes('google')) return 'Google Careers';
        if (hostname.includes('meta') || hostname.includes('facebook')) return 'Meta Careers';
        if (hostname.includes('amazon')) return 'Amazon Jobs';
        if (hostname.includes('microsoft')) return 'Microsoft Careers';
        if (hostname.includes('apple')) return 'Apple Jobs';
        return hostname.replace('www.', '').split('.')[0];
    } catch {
        return 'Direct';
    }
}

/**
 * Convert multiple opportunities to EnhancedJob array
 */
export function convertToEnhancedJobs(opportunities: Opportunity[]): EnhancedJob[] {
    return opportunities.map(convertToEnhancedJob);
}
