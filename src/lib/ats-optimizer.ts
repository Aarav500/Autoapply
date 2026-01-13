// ============================================
// ATS (Applicant Tracking System) OPTIMIZER
// Advanced keyword extraction and CV optimization
// ============================================

/**
 * Extracts technical keywords and key skills from a job description
 */
export function extractATSKeywords(jobDescription: string): {
    technical: string[];
    skills: string[];
    tools: string[];
    methodologies: string[];
    certifications: string[];
    all: string[];
} {
    const text = jobDescription.toLowerCase();

    // Common technical keywords by category
    const technicalPatterns = [
        // Programming Languages
        /\b(javascript|typescript|python|java|c\+\+|c#|ruby|go|rust|swift|kotlin|scala|php|perl|r|matlab)\b/gi,
        // Web Technologies
        /\b(react|vue|angular|node\.?js|express|next\.?js|django|flask|spring|laravel|rails)\b/gi,
        // Databases
        /\b(sql|mysql|postgresql|mongodb|redis|elasticsearch|dynamodb|cassandra|oracle|firebase)\b/gi,
        // Cloud & DevOps
        /\b(aws|azure|gcp|docker|kubernetes|jenkins|gitlab|github actions|terraform|ansible|ci\/cd)\b/gi,
        // Data & ML
        /\b(machine learning|ml|ai|deep learning|nlp|computer vision|tensorflow|pytorch|scikit-learn|pandas|numpy)\b/gi,
        // Mobile
        /\b(ios|android|react native|flutter|xamarin|mobile development)\b/gi,
    ];

    const skillPatterns = [
        /\b(leadership|communication|problem[- ]solving|analytical|team[- ]work|collaboration|creativity|critical thinking)\b/gi,
        /\b(agile|scrum|kanban|project management|product management|stakeholder management)\b/gi,
        /\b(data analysis|data visualization|statistical analysis|a\/b testing|experimentation)\b/gi,
    ];

    const toolPatterns = [
        /\b(git|jira|confluence|slack|figma|sketch|adobe|visual studio|intellij|eclipse|vscode)\b/gi,
        /\b(tableau|power bi|looker|grafana|datadog|new relic|splunk)\b/gi,
    ];

    const methodologyPatterns = [
        /\b(agile|scrum|kanban|waterfall|lean|six sigma|devops|tdd|bdd|ci\/cd|microservices|restful api|graphql)\b/gi,
    ];

    const certificationPatterns = [
        /\b(aws certified|azure certified|gcp certified|pmp|csm|cissp|comptia|oracle certified)\b/gi,
    ];

    // Extract matches
    const technical = new Set<string>();
    const skills = new Set<string>();
    const tools = new Set<string>();
    const methodologies = new Set<string>();
    const certifications = new Set<string>();

    technicalPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        matches?.forEach(match => technical.add(normalizeKeyword(match)));
    });

    skillPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        matches?.forEach(match => skills.add(normalizeKeyword(match)));
    });

    toolPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        matches?.forEach(match => tools.add(normalizeKeyword(match)));
    });

    methodologyPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        matches?.forEach(match => methodologies.add(normalizeKeyword(match)));
    });

    certificationPatterns.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        matches?.forEach(match => certifications.add(normalizeKeyword(match)));
    });

    // Extract requirement bullets
    const requirementKeywords = extractRequirementKeywords(jobDescription);
    requirementKeywords.forEach(kw => {
        if (!technical.has(kw) && !skills.has(kw) && !tools.has(kw)) {
            skills.add(kw);
        }
    });

    const all = new Set([
        ...technical,
        ...skills,
        ...tools,
        ...methodologies,
        ...certifications,
    ]);

    return {
        technical: Array.from(technical),
        skills: Array.from(skills),
        tools: Array.from(tools),
        methodologies: Array.from(methodologies),
        certifications: Array.from(certifications),
        all: Array.from(all),
    };
}

/**
 * Extract keywords from requirement sections
 */
function extractRequirementKeywords(jobDescription: string): string[] {
    const keywords = new Set<string>();

    // Look for requirement sections
    const requirementSections = [
        /(?:requirements?|qualifications?|skills?|experience)[:\s]+([^]*?)(?=\n\n|\n[A-Z]|$)/gi,
    ];

    requirementSections.forEach(pattern => {
        const matches = jobDescription.match(pattern);
        matches?.forEach(section => {
            // Extract bullet points or lines
            const bullets = section.match(/[-•]\s*([^\n]+)/g);
            bullets?.forEach(bullet => {
                // Extract key phrases (typically 1-3 words)
                const cleaned = bullet.replace(/[-•]\s*/, '').toLowerCase();
                const phrases = cleaned.match(/\b[a-z][a-z\s]{2,25}\b/gi);
                phrases?.forEach(phrase => {
                    const trimmed = phrase.trim();
                    if (trimmed.split(' ').length <= 4 && trimmed.length > 3) {
                        keywords.add(trimmed);
                    }
                });
            });
        });
    });

    return Array.from(keywords);
}

/**
 * Normalize keyword for consistency
 */
function normalizeKeyword(keyword: string): string {
    // Standardize common variations
    const normalized = keyword
        .toLowerCase()
        .replace(/\./g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const standardizations: Record<string, string> = {
        'nodejs': 'Node.js',
        'node js': 'Node.js',
        'reactjs': 'React',
        'react js': 'React',
        'vuejs': 'Vue',
        'vue js': 'Vue',
        'nextjs': 'Next.js',
        'next js': 'Next.js',
        'mongodb': 'MongoDB',
        'postgresql': 'PostgreSQL',
        'mysql': 'MySQL',
        'graphql': 'GraphQL',
        'javascript': 'JavaScript',
        'typescript': 'TypeScript',
        'c++': 'C++',
        'c#': 'C#',
        'aws': 'AWS',
        'gcp': 'GCP',
        'ml': 'Machine Learning',
        'ai': 'Artificial Intelligence',
        'nlp': 'Natural Language Processing',
        'cicd': 'CI/CD',
        'ci/cd': 'CI/CD',
    };

    return standardizations[normalized] || keyword;
}

/**
 * Analyze CV for ATS optimization and provide score
 */
export function analyzeATSOptimization(cv: string, keywords: string[]): {
    score: number;
    matchedKeywords: string[];
    missingKeywords: string[];
    suggestions: string[];
} {
    const cvLower = cv.toLowerCase();
    const matched: string[] = [];
    const missing: string[] = [];

    keywords.forEach(keyword => {
        if (cvLower.includes(keyword.toLowerCase())) {
            matched.push(keyword);
        } else {
            missing.push(keyword);
        }
    });

    const score = keywords.length > 0 ? (matched.length / keywords.length) * 100 : 0;

    const suggestions: string[] = [];

    if (score < 70) {
        suggestions.push('Your CV is missing many key requirements from the job description. Consider adding more relevant keywords.');
    }

    if (!cv.includes('## Skills') && !cv.includes('## Technical Skills')) {
        suggestions.push('Add a dedicated "Skills" or "Technical Skills" section to improve ATS parsing.');
    }

    if (missing.length > 0) {
        suggestions.push(`Missing important keywords: ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? `, and ${missing.length - 5} more` : ''}`);
    }

    if (!/\d/.test(cv)) {
        suggestions.push('Include quantifiable metrics (numbers, percentages, dollar amounts) to demonstrate impact.');
    }

    return {
        score: Math.round(score),
        matchedKeywords: matched,
        missingKeywords: missing,
        suggestions,
    };
}

/**
 * Generate optimized skills section based on job description
 */
export function generateOptimizedSkillsSection(
    userSkills: string[],
    jobKeywords: { technical: string[]; skills: string[]; tools: string[] }
): string {
    const { technical, skills, tools } = jobKeywords;

    // Match user skills with job requirements
    const matchedTechnical = technical.filter(kw =>
        userSkills.some(skill => skill.toLowerCase().includes(kw.toLowerCase()))
    );

    const matchedTools = tools.filter(kw =>
        userSkills.some(skill => skill.toLowerCase().includes(kw.toLowerCase()))
    );

    const matchedSkills = skills.filter(kw =>
        userSkills.some(skill => skill.toLowerCase().includes(kw.toLowerCase()))
    );

    // Add remaining user skills that don't match but might be relevant
    const otherSkills = userSkills.filter(skill =>
        ![...matchedTechnical, ...matchedTools, ...matchedSkills].some(kw =>
            skill.toLowerCase().includes(kw.toLowerCase())
        )
    );

    let skillsSection = '## Technical Skills & Core Competencies\n\n';

    if (matchedTechnical.length > 0) {
        skillsSection += `**Programming & Technologies:** ${matchedTechnical.join(', ')}`;
        if (otherSkills.filter(s => !matchedTools.some(t => s.includes(t))).length > 0) {
            skillsSection += `, ${otherSkills.slice(0, 3).join(', ')}`;
        }
        skillsSection += '\n\n';
    }

    if (matchedTools.length > 0) {
        skillsSection += `**Tools & Platforms:** ${matchedTools.join(', ')}\n\n`;
    }

    if (matchedSkills.length > 0) {
        skillsSection += `**Core Competencies:** ${matchedSkills.join(', ')}\n\n`;
    }

    return skillsSection.trim();
}

/**
 * Optimize CV bullet points for ATS by incorporating keywords
 */
export function optimizeBulletPoints(
    bulletPoints: string[],
    keywords: string[]
): string[] {
    return bulletPoints.map(bullet => {
        let optimized = bullet;

        // Check if bullet already contains strong action verb
        const actionVerbs = [
            'achieved', 'architected', 'built', 'created', 'delivered', 'designed',
            'developed', 'drove', 'engineered', 'enhanced', 'implemented', 'improved',
            'increased', 'launched', 'led', 'managed', 'optimized', 'orchestrated',
            'pioneered', 'reduced', 'scaled', 'spearheaded', 'streamlined',
        ];

        const startsWithActionVerb = actionVerbs.some(verb =>
            bullet.toLowerCase().startsWith(verb)
        );

        if (!startsWithActionVerb && bullet.length > 10) {
            // Suggest starting with action verb
            optimized = `Contributed to ${bullet.charAt(0).toLowerCase()}${bullet.slice(1)}`;
        }

        return optimized;
    });
}

/**
 * Calculate keyword density to avoid keyword stuffing
 */
export function checkKeywordDensity(cv: string): {
    totalWords: number;
    keywordCount: number;
    density: number;
    warning?: string;
} {
    const words = cv.split(/\s+/).filter(w => w.length > 0);
    const totalWords = words.length;

    // Count repeated important terms
    const wordFrequency: Record<string, number> = {};
    words.forEach(word => {
        const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (normalized.length > 3) {
            wordFrequency[normalized] = (wordFrequency[normalized] || 0) + 1;
        }
    });

    const keywordCount = Object.values(wordFrequency).reduce((sum, count) => sum + count, 0);
    const density = (keywordCount / totalWords) * 100;

    const warning = density > 30
        ? 'Warning: Keyword density is too high. This may be flagged as keyword stuffing by ATS.'
        : undefined;

    return {
        totalWords,
        keywordCount,
        density: Math.round(density * 10) / 10,
        warning,
    };
}
