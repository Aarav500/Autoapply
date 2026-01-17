// ============================================
// TARGET ANALYZER
// Uses Claude to parse job descriptions and college profiles
// Extracts domains, keywords, and priorities
// ============================================

import { callClaude } from './claude-api';
import { CVTarget } from './cv-compiler-v2';

/**
 * TARGET PROFILE
 * Extracted information about what the target wants
 */
export interface TargetProfile {
    mode: 'research' | 'industry' | 'college';
    priorityDomains: string[];
    priorityMethods: string[];
    requiredSkills: string[];
    niceToHaveSkills: string[];
    keywords: string[];
    signals: string[]; // What to emphasize: publications, scale, leadership, etc.
}

/**
 * TARGET ANALYZER
 * Parses job descriptions, college profiles, research lab pages
 */
export class TargetAnalyzer {
    private apiKey: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * ANALYZE JOB DESCRIPTION
     * Extract requirements and build CVTarget
     */
    async analyzeJob(
        jobTitle: string,
        company: string,
        jobDescription: string,
        pageLimit: number = 2
    ): Promise<CVTarget> {
        const systemPrompt = `You are an expert job description analyzer. Extract key requirements, skills, and priorities from job postings.

Your task:
1. Determine if this is a research or industry role
2. Extract technical domains (e.g., "ML", "Systems", "Operations Research")
3. Extract required methods/algorithms
4. Extract required technologies/tools
5. Identify what signals to emphasize (publications, scale, production, leadership)

Respond ONLY in JSON format.`;

        const userMessage = `Analyze this job posting:

TITLE: ${jobTitle}
COMPANY: ${company}

DESCRIPTION:
${jobDescription}

Extract:
1. Mode (research or industry)
2. Priority domains
3. Priority methods/algorithms
4. Required skills
5. Nice-to-have skills
6. Keywords for matching
7. Signals to emphasize

Respond with this JSON structure:
{
  "mode": "research" | "industry",
  "priorityDomains": ["domain1", "domain2"],
  "priorityMethods": ["method1", "method2"],
  "requiredSkills": ["skill1", "skill2"],
  "niceToHaveSkills": ["skill1", "skill2"],
  "keywords": ["keyword1", "keyword2"],
  "signals": ["publications" | "production" | "scale" | "metrics"]
}`;

        const response = await callClaude(
            this.apiKey,
            systemPrompt,
            [{ role: 'user', content: userMessage }],
            'claude-opus-4-20250514',
            2048
        );

        const profile = this.parseTargetProfile(response);

        return {
            id: this.generateJobId(jobTitle, company),
            name: `${jobTitle} at ${company}`,
            type: profile.mode === 'research' ? 'research' : 'industry',
            domains: profile.priorityDomains,
            keywords: profile.keywords,
            prioritySignals: profile.signals,
            pageLimit: pageLimit as 1 | 2 | 3 | 4,
            maxExperiences: pageLimit === 1 ? 4 : pageLimit * 4,
            description: jobDescription
        };
    }

    /**
     * ANALYZE COLLEGE
     * Extract values and priorities from college profile
     */
    async analyzeCollege(
        collegeName: string,
        collegeDescription: string,
        values?: string[],
        pageLimit: number = 3
    ): Promise<CVTarget> {
        const systemPrompt = `You are an expert college admissions analyzer. Extract what colleges value from their mission statements and program descriptions.

Your task:
1. Identify priority domains (STEM, Humanities, Entrepreneurship, etc.)
2. Identify what signals to emphasize (leadership, research, service, innovation)
3. Extract keywords that indicate fit

Respond ONLY in JSON format.`;

        const userMessage = `Analyze this college:

NAME: ${collegeName}
${values ? `STATED VALUES: ${values.join(', ')}` : ''}

DESCRIPTION:
${collegeDescription}

Extract:
1. Priority domains (what they're known for)
2. Signals to emphasize (leadership, research, service, innovation, entrepreneurship)
3. Keywords for matching

Respond with this JSON structure:
{
  "priorityDomains": ["domain1", "domain2"],
  "signals": ["leadership" | "research" | "service" | "innovation" | "entrepreneurship"],
  "keywords": ["keyword1", "keyword2"]
}`;

        const response = await callClaude(
            this.apiKey,
            systemPrompt,
            [{ role: 'user', content: userMessage }],
            'claude-opus-4-20250514',
            1024
        );

        const profile = this.parseCollegeProfile(response);

        return {
            id: this.generateCollegeId(collegeName),
            name: `${collegeName} Undergraduate Admissions`,
            type: 'college',
            domains: profile.priorityDomains,
            keywords: profile.keywords,
            prioritySignals: profile.signals,
            pageLimit: pageLimit as 1 | 2 | 3 | 4,
            maxExperiences: 12,
            description: collegeDescription
        };
    }

    /**
     * ANALYZE RESEARCH LAB
     * Extract research focus from lab website/description
     */
    async analyzeResearchLab(
        labName: string,
        university: string,
        labDescription: string,
        pageLimit: number = 3
    ): Promise<CVTarget> {
        const systemPrompt = `You are an expert research lab analyzer. Extract research focus areas and methodologies from lab descriptions.

Your task:
1. Identify research domains
2. Identify priority methods/techniques
3. Extract keywords for matching
4. Determine what signals to emphasize

Respond ONLY in JSON format.`;

        const userMessage = `Analyze this research lab:

LAB: ${labName}
UNIVERSITY: ${university}

DESCRIPTION:
${labDescription}

Extract:
1. Research domains
2. Priority methods/algorithms
3. Keywords for matching
4. Signals to emphasize (publications, methods, datasets, benchmarks)

Respond with this JSON structure:
{
  "priorityDomains": ["domain1", "domain2"],
  "priorityMethods": ["method1", "method2"],
  "keywords": ["keyword1", "keyword2"],
  "signals": ["publications" | "methods" | "datasets" | "benchmarks"]
}`;

        const response = await callClaude(
            this.apiKey,
            systemPrompt,
            [{ role: 'user', content: userMessage }],
            'claude-opus-4-20250514',
            1024
        );

        const profile = this.parseResearchProfile(response);

        return {
            id: this.generateResearchId(labName, university),
            name: `${labName} at ${university}`,
            type: 'research',
            domains: profile.priorityDomains,
            keywords: profile.keywords,
            prioritySignals: profile.signals,
            pageLimit: pageLimit as 1 | 2 | 3 | 4,
            maxExperiences: pageLimit === 4 ? 10 : 8,
            description: labDescription
        };
    }

    /**
     * PARSE TARGET PROFILE (JOB)
     */
    private parseTargetProfile(response: string): TargetProfile {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found');

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                mode: parsed.mode || 'industry',
                priorityDomains: parsed.priorityDomains || [],
                priorityMethods: parsed.priorityMethods || [],
                requiredSkills: parsed.requiredSkills || [],
                niceToHaveSkills: parsed.niceToHaveSkills || [],
                keywords: parsed.keywords || [],
                signals: parsed.signals || ['production', 'scale']
            };
        } catch (error) {
            console.error('Failed to parse target profile:', error);
            return {
                mode: 'industry',
                priorityDomains: [],
                priorityMethods: [],
                requiredSkills: [],
                niceToHaveSkills: [],
                keywords: [],
                signals: ['production']
            };
        }
    }

    /**
     * PARSE COLLEGE PROFILE
     */
    private parseCollegeProfile(response: string): {
        priorityDomains: string[];
        signals: string[];
        keywords: string[];
    } {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found');

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                priorityDomains: parsed.priorityDomains || [],
                signals: parsed.signals || ['leadership', 'research'],
                keywords: parsed.keywords || []
            };
        } catch (error) {
            console.error('Failed to parse college profile:', error);
            return {
                priorityDomains: [],
                signals: ['leadership'],
                keywords: []
            };
        }
    }

    /**
     * PARSE RESEARCH PROFILE
     */
    private parseResearchProfile(response: string): {
        priorityDomains: string[];
        priorityMethods: string[];
        keywords: string[];
        signals: string[];
    } {
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) throw new Error('No JSON found');

            const parsed = JSON.parse(jsonMatch[0]);

            return {
                priorityDomains: parsed.priorityDomains || [],
                priorityMethods: parsed.priorityMethods || [],
                keywords: parsed.keywords || [],
                signals: parsed.signals || ['publications', 'methods']
            };
        } catch (error) {
            console.error('Failed to parse research profile:', error);
            return {
                priorityDomains: [],
                priorityMethods: [],
                keywords: [],
                signals: ['publications']
            };
        }
    }

    /**
     * GENERATE IDS
     */
    private generateJobId(title: string, company: string): string {
        return `${company.toLowerCase().replace(/\s+/g, '-')}-${title.toLowerCase().replace(/\s+/g, '-')}`;
    }

    private generateCollegeId(name: string): string {
        return `${name.toLowerCase().replace(/\s+/g, '-')}-undergrad`;
    }

    private generateResearchId(labName: string, university: string): string {
        return `${university.toLowerCase().replace(/\s+/g, '-')}-${labName.toLowerCase().replace(/\s+/g, '-')}`;
    }
}

/**
 * CONVENIENCE FUNCTIONS
 */
export async function analyzeJobDescription(
    apiKey: string,
    jobTitle: string,
    company: string,
    jobDescription: string,
    pageLimit: number = 2
): Promise<CVTarget> {
    const analyzer = new TargetAnalyzer(apiKey);
    return analyzer.analyzeJob(jobTitle, company, jobDescription, pageLimit);
}

export async function analyzeCollegeProfile(
    apiKey: string,
    collegeName: string,
    collegeDescription: string,
    values?: string[],
    pageLimit: number = 3
): Promise<CVTarget> {
    const analyzer = new TargetAnalyzer(apiKey);
    return analyzer.analyzeCollege(collegeName, collegeDescription, values, pageLimit);
}

export async function analyzeResearchLabProfile(
    apiKey: string,
    labName: string,
    university: string,
    labDescription: string,
    pageLimit: number = 3
): Promise<CVTarget> {
    const analyzer = new TargetAnalyzer(apiKey);
    return analyzer.analyzeResearchLab(labName, university, labDescription, pageLimit);
}
