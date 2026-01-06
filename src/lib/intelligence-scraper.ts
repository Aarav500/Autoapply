/**
 * Intelligence Web Scraper
 * Collects comprehensive data about colleges and jobs to feed Claude
 * for hyper-personalized essay and application generation
 */

import { targetColleges } from './colleges-data';

// ============================================
// TYPES
// ============================================

export interface CollegeIntelligence {
    id: string;
    name: string;
    lastUpdated: string;

    // Official data (from .edu sites)
    official: {
        deadline: string;
        deadlineType: 'EA' | 'ED' | 'Regular' | 'Rolling' | 'Priority';
        essayPrompts: Array<{
            title: string;
            prompt: string;
            wordLimit: number;
            required: boolean;
        }>;
        acceptanceRate: string;
        avgGPA: string;
        avgSAT?: string;
        avgACT?: string;
        applicationUrl: string;
        requirements: string[];
    };

    // Insider insights (from Reddit, forums)
    insights: {
        whatTheyReallyLookFor: string[];
        successfulApplicantTraits: string[];
        commonMistakes: string[];
        tipsFromAdmittedStudents: string[];
        interviewTips?: string[];
        essayThatWorked?: string[];
    };

    // Culture & fit data
    culture: {
        values: string[];
        campusVibe: string;
        studentLife: string;
        notablePrograms: string[];
        famousAlumni: string[];
        recentNews: string[];
    };

    // Transfer-specific data
    transfer: {
        acceptanceRate: string;
        avgGPA: string;
        keyRequirements: string[];
        tips: string[];
        commonPathways: string[];
    };
}

export interface JobIntelligence {
    id: string;
    role: string;
    company?: string;
    lastUpdated: string;

    requirements: {
        skills: string[];
        experience: string;
        education: string;
        certifications?: string[];
    };

    insights: {
        salaryRange: string;
        growthPath: string[];
        interviewTips: string[];
        whatTheyLookFor: string[];
        redFlags: string[];
    };

    culture?: {
        workLifeBalance: string;
        companyValues: string[];
        reviews: string[];
    };
}

export interface ScrapedData {
    colleges: Record<string, CollegeIntelligence>;
    jobs: Record<string, JobIntelligence>;
    lastFullUpdate: string;
}

// ============================================
// WEB SCRAPING UTILITIES
// ============================================

/**
 * Fetch and extract text content from a URL
 * Uses server-side fetch to avoid CORS issues
 */
export async function fetchPageContent(url: string): Promise<string> {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            },
            next: { revalidate: 86400 }, // Cache for 24 hours
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error);
        throw error;
    }
}

/**
 * Extract text content from HTML, removing scripts and styles
 */
export function extractTextFromHTML(html: string): string {
    // Remove scripts, styles, and comments
    let text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    // Decode HTML entities
    text = text
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");

    return text;
}

/**
 * Extract specific data patterns from text
 */
export function extractPatterns(text: string, patterns: Record<string, RegExp>): Record<string, string[]> {
    const results: Record<string, string[]> = {};

    for (const [key, pattern] of Object.entries(patterns)) {
        const matches = text.match(pattern);
        results[key] = matches || [];
    }

    return results;
}

// ============================================
// COLLEGE INTELLIGENCE SCRAPING
// ============================================

/**
 * Scrape official college admission data
 */
export async function scrapeCollegeOfficial(collegeId: string): Promise<Partial<CollegeIntelligence['official']>> {
    const college = targetColleges.find(c => c.id === collegeId);
    if (!college) {
        throw new Error(`College not found: ${collegeId}`);
    }

    try {
        const html = await fetchPageContent(college.applicationUrl);
        const text = extractTextFromHTML(html);

        // Extract deadline patterns
        const deadlinePatterns = {
            dates: /(?:deadline|due|by)\s*:?\s*(\w+\s+\d{1,2},?\s*\d{4})/gi,
            acceptance: /acceptance\s*rate\s*:?\s*([\d.]+%?)/gi,
            gpa: /(?:average|median)\s*GPA\s*:?\s*([\d.]+)/gi,
        };

        const extracted = extractPatterns(text, deadlinePatterns);

        return {
            deadline: extracted.dates[0] || college.deadline.toISOString(),
            acceptanceRate: extracted.acceptance[0] || college.transferInfo?.acceptanceRate || 'Unknown',
            avgGPA: extracted.gpa[0] || college.transferInfo?.avgGPA || 'Unknown',
            applicationUrl: college.applicationUrl,
        };
    } catch (error) {
        console.error(`Failed to scrape official data for ${collegeId}:`, error);
        // Return data from our static file as fallback
        return {
            deadline: college.deadline.toISOString(),
            acceptanceRate: college.transferInfo?.acceptanceRate || 'Unknown',
            avgGPA: college.transferInfo?.avgGPA || 'Unknown',
            applicationUrl: college.applicationUrl,
        };
    }
}

/**
 * Get Reddit insights for a college
 * Note: Reddit has strict rate limits, so we cache aggressively
 */
export async function getRedditInsights(collegeName: string): Promise<Partial<CollegeIntelligence['insights']>> {
    // Reddit API requires authentication for reliable access
    // For now, return placeholder structure
    // In production, would use Reddit API or a service like Pushshift

    console.log(`Would fetch Reddit insights for: ${collegeName}`);

    return {
        whatTheyReallyLookFor: [
            'Specific interest in the school - not generic',
            'Clear narrative connecting past to future goals',
            'Evidence of initiative and curiosity',
        ],
        successfulApplicantTraits: [
            'Showed genuine passion for specific programs',
            'Connected personal story to school values',
            'Demonstrated growth and self-awareness',
        ],
        commonMistakes: [
            'Too generic - could apply to any school',
            'Focusing only on prestige',
            'Not answering the actual prompt',
        ],
        tipsFromAdmittedStudents: [
            'Be specific about professors and programs',
            'Show you researched the school deeply',
            'Make your essays personal and memorable',
        ],
    };
}

/**
 * Compile full college intelligence from all sources
 */
export async function compileCollegeIntelligence(collegeId: string): Promise<CollegeIntelligence> {
    const college = targetColleges.find(c => c.id === collegeId);
    if (!college) {
        throw new Error(`College not found: ${collegeId}`);
    }

    // Scrape official data
    const official = await scrapeCollegeOfficial(collegeId);

    // Get Reddit insights
    const insights = await getRedditInsights(college.fullName);

    return {
        id: college.id,
        name: college.fullName,
        lastUpdated: new Date().toISOString(),

        official: {
            deadline: official.deadline || college.deadline.toISOString(),
            deadlineType: college.deadlineType as 'EA' | 'ED' | 'Regular' | 'Rolling' | 'Priority',
            essayPrompts: college.essays.map(e => ({
                title: e.title,
                prompt: e.prompt,
                wordLimit: e.wordLimit,
                required: e.required,
            })),
            acceptanceRate: official.acceptanceRate || 'Unknown',
            avgGPA: official.avgGPA || 'Unknown',
            applicationUrl: college.applicationUrl,
            requirements: college.transferInfo?.requirements || [],
        },

        insights: {
            whatTheyReallyLookFor: insights.whatTheyReallyLookFor || college.research.whatTheyLookFor,
            successfulApplicantTraits: insights.successfulApplicantTraits || [],
            commonMistakes: insights.commonMistakes || [],
            tipsFromAdmittedStudents: insights.tipsFromAdmittedStudents || college.transferInfo?.tips || [],
        },

        culture: {
            values: college.research.values,
            campusVibe: college.research.campusVibe,
            studentLife: college.research.studentLife,
            notablePrograms: college.research.notablePrograms,
            famousAlumni: college.research.famousAlumni,
            recentNews: college.research.recentNews,
        },

        transfer: {
            acceptanceRate: college.transferInfo?.acceptanceRate || 'Unknown',
            avgGPA: college.transferInfo?.avgGPA || 'Unknown',
            keyRequirements: college.transferInfo?.requirements || [],
            tips: college.transferInfo?.tips || [],
            commonPathways: [],
        },
    };
}

// ============================================
// JOB INTELLIGENCE SCRAPING
// ============================================

/**
 * Compile job intelligence for a role
 */
export async function compileJobIntelligence(role: string, company?: string): Promise<JobIntelligence> {
    // In production, would scrape LinkedIn, Glassdoor, Indeed
    // For now, return a structured template

    return {
        id: `${role}${company ? `-${company}` : ''}`.toLowerCase().replace(/\s+/g, '-'),
        role,
        company,
        lastUpdated: new Date().toISOString(),

        requirements: {
            skills: ['Problem solving', 'Communication', 'Technical skills'],
            experience: '2-5 years',
            education: 'Bachelor\'s degree',
        },

        insights: {
            salaryRange: '$70,000 - $120,000',
            growthPath: ['Junior → Mid → Senior → Lead → Manager'],
            interviewTips: ['Research the company', 'Prepare STAR stories', 'Ask thoughtful questions'],
            whatTheyLookFor: ['Culture fit', 'Technical ability', 'Growth mindset'],
            redFlags: ['Job hopping without growth', 'Unable to explain past work'],
        },
    };
}

// ============================================
// MAIN SCRAPER CLASS
// ============================================

export class IntelligenceScraper {
    private data: ScrapedData;

    constructor() {
        this.data = {
            colleges: {},
            jobs: {},
            lastFullUpdate: new Date().toISOString(),
        };
    }

    /**
     * Update intelligence for a specific college
     */
    async updateCollege(collegeId: string): Promise<CollegeIntelligence> {
        console.log(`Updating intelligence for: ${collegeId}`);
        const intelligence = await compileCollegeIntelligence(collegeId);
        this.data.colleges[collegeId] = intelligence;
        return intelligence;
    }

    /**
     * Update intelligence for all colleges
     */
    async updateAllColleges(): Promise<void> {
        console.log('Updating all college intelligence...');

        for (const college of targetColleges) {
            try {
                await this.updateCollege(college.id);
                // Rate limiting - wait between requests
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Failed to update ${college.id}:`, error);
            }
        }

        this.data.lastFullUpdate = new Date().toISOString();
        console.log('College intelligence update complete');
    }

    /**
     * Update job intelligence
     */
    async updateJob(role: string, company?: string): Promise<JobIntelligence> {
        const intelligence = await compileJobIntelligence(role, company);
        this.data.jobs[intelligence.id] = intelligence;
        return intelligence;
    }

    /**
     * Get college intelligence (with optional refresh)
     */
    async getCollegeIntelligence(collegeId: string, refresh = false): Promise<CollegeIntelligence | null> {
        if (refresh || !this.data.colleges[collegeId]) {
            return this.updateCollege(collegeId);
        }
        return this.data.colleges[collegeId];
    }

    /**
     * Get all scraped data
     */
    getData(): ScrapedData {
        return this.data;
    }

    /**
     * Generate a prompt context for Claude with all relevant intelligence
     */
    generateClaudeContext(collegeId: string, userActivities: string[]): string {
        const college = this.data.colleges[collegeId];
        if (!college) {
            return '';
        }

        return `
## College Intelligence for ${college.name}

### What They Look For
${college.insights.whatTheyReallyLookFor.map(t => `- ${t}`).join('\n')}

### Essay Prompts
${college.official.essayPrompts.map(e => `**${e.title}** (${e.wordLimit} words)\n${e.prompt}`).join('\n\n')}

### Campus Culture
${college.culture.campusVibe}

### Values
${college.culture.values.join(', ')}

### Tips from Admitted Students
${college.insights.tipsFromAdmittedStudents.map(t => `- ${t}`).join('\n')}

### Common Mistakes to Avoid
${college.insights.commonMistakes.map(t => `- ${t}`).join('\n')}

### Your Activities to Connect
${userActivities.map(a => `- ${a}`).join('\n')}

Use this intelligence to write a hyper-personalized essay that connects the student's activities to what ${college.name} values.
`;
    }
}

// Singleton instance
export const intelligenceScraper = new IntelligenceScraper();

export default intelligenceScraper;
