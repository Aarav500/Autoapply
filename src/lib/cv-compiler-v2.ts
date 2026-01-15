// ============================================
// UNIVERSAL CV COMPILER SYSTEM V2
// Multi-target CV generation from canonical graph
// ============================================

/**
 * HARD BAN LIST - These phrases trigger IMMEDIATE rejection
 * NO-ESSAY RULE: CVs must be factual, impersonal, compressed
 */
const BANNED_PHRASES = [
    // Pronouns - ALL "I" variants forbidden
    'I', 'I realized', 'I watched', 'I believe', 'I was', 'I am',
    'I became', 'I saw', 'I hope', 'I dream', 'I learned', 'I discovered',
    'I created', 'I built', 'I led', 'I developed', 'I implemented',
    // Essay language - triggers immediate rejection
    'When', 'Because', 'Inspired', 'Aligns with', 'Mens et Manus',
    'belief', 'passion', 'my passion', 'fascinated', 'inspired me',
    // Narrative triggers
    'One day', 'Growing up', 'Ever since', 'As a child', 'From a young age',
    'This experience taught me', 'Through this', 'This showed me',
    // School/target name contamination
    'MIT', 'Stanford', 'Harvard', 'Yale', 'Princeton',
    // Philosophy/abstract language
    'meaningful', 'impactful', 'transformative', 'journey', 'path',
    'calling', 'destiny', 'dream', 'goal in life'
] as const;

/**
 * DROP KEYWORDS BY MODE
 * Experiences containing these keywords are excluded per target type
 */
const DROP_KEYWORDS: Record<'research' | 'industry' | 'college', string[]> = {
    research: [
        // DROP: SAP, Hackathons, Community service, Leadership, Entrepreneurship
        'hackathon', 'community service', 'rotary', 'volunteer', 'chess club',
        'olympiad', 'farming', 'church', 'mentoring', 'tutoring', 'fundraising'
    ],
    industry: [
        // DROP: Afghan curriculum, Rotary, Farming, Chess, Olympiads, Research narratives
        'curriculum', 'rotary', 'farming', 'chess', 'olympiad', 'teaching',
        'tutoring', 'essay', 'philosophy', 'humanities', 'literature'
    ],
    college: [
        // DROP: Deep system architecture, Quantum math, Enterprise ML detail
        'QUBO formulation', 'distributed consensus', 'Byzantine fault',
        'enterprise architecture', 'microservice mesh', 'kernel module'
    ]
};

/**
 * CANONICAL EXPERIENCE NODE
 * Single source of truth - no duplication, no invention
 */
export interface ExperienceNode {
    id: string;
    title: string;
    role: string;
    organization: string;
    dates: { start: string; end: string; duration: string };

    // Technical depth
    domain: string;
    methods: string[];      // Algorithms, models, techniques
    tools: string[];        // Technologies, frameworks
    datasets: string[];     // Data specs with size/type

    // Scale indicators
    scale: {
        users?: string;     // "200+ students", "1M+ customers"
        team?: string;      // "Led team of 8"
        budget?: string;    // "$50K funding"
        geographic?: string; // "3 provinces"
        temporal?: string;  // "5 years historical data" (legacy: not used by old compiler)
    };

    // Outcomes (MUST have at least one)
    outcomes: {
        metrics: string[];       // ["23% reduction", "97% SLA"]
        publications?: string[]; // ["IEEE ICSIT 2024"]
        deployments?: string[];  // ["Production at SAP"]
        awards?: string[];       // ["1st place hackathon"]
    };

    // Classification
    category: 'research' | 'industry' | 'leadership' | 'volunteer' | 'entrepreneurship';

    // Metadata
    hours: number;
    isPublished: boolean;
    isProduction: boolean;
    priority?: number; // 0-100, computed (optional, added during ranking)

    // Legacy fields (for compatibility with cv-compiler.ts)
    description?: string;
    impact?: string;
    researchQuestion?: string;
    businessContext?: string;
    isUnique?: boolean;
}

/**
 * TARGET SPECIFICATION
 */
export interface CVTarget {
    id: string;
    name: string;
    type: 'research' | 'industry' | 'college';

    // Intelligence
    domains?: string[];        // ["Operations Research", "ML"]
    keywords?: string[];       // From job description
    prioritySignals?: string[]; // ["publications", "production", "leadership"]

    // Constraints
    pageLimit: 1 | 2 | 3 | 4;
    maxExperiences?: number;

    // Context
    description?: string; // Job posting, research focus, etc.
}

/**
 * COMPILED CV OUTPUT
 */
export interface CompiledCV {
    targetId: string;
    targetName: string;
    mode: 'research' | 'industry' | 'college';

    content: string; // Markdown

    metadata: {
        experienceCount: number;
        publicationCount: number;
        wordCount: number;
        pageEstimate: number;
        signal: 'elite' | 'strong' | 'medium' | 'weak';
        violations: string[]; // Ban list violations
        warnings: string[];   // Signal preservation issues
    };
}

// ============================================
// CORE COMPILER ENGINE
// ============================================

export class CVCompiler {
    private experiences: ExperienceNode[];
    private profile: any;

    constructor(experiences: ExperienceNode[], profile: any) {
        this.experiences = experiences;
        this.profile = profile;
    }

    /**
     * MAIN ENTRY POINT
     * Compile CV for single target
     */
    compile(target: CVTarget): CompiledCV {
        // Step 1: Filter by mode
        const filtered = this.filterByMode(target.type);

        // Step 2: Rank by relevance to target
        const ranked = this.rankForTarget(filtered, target);

        // Step 3: Apply limits
        const selected = this.applyLimits(ranked, target);

        // Step 4: Render
        const content = this.render(selected, target);

        // Step 5: Validate
        const validated = this.validate(content, target);

        // Step 6: Generate metadata
        const metadata = this.generateMetadata(validated, selected, target);

        return {
            targetId: target.id,
            targetName: target.name,
            mode: target.type,
            content: validated,
            metadata
        };
    }

    /**
     * BATCH COMPILATION
     * Generate CVs for all targets
     */
    compileAll(targets: CVTarget[]): CompiledCV[] {
        return targets.map(target => this.compile(target));
    }

    // ========================================
    // FILTERING BY MODE
    // ========================================

    private filterByMode(mode: 'research' | 'industry' | 'college'): ExperienceNode[] {
        // Get drop keywords for this mode
        const dropKeywords = DROP_KEYWORDS[mode];

        // Check if experience contains any drop keywords
        const containsDropKeyword = (exp: ExperienceNode): boolean => {
            const text = `${exp.title} ${exp.description || ''} ${exp.organization} ${exp.domain}`.toLowerCase();
            return dropKeywords.some(kw => text.includes(kw.toLowerCase()));
        };

        const rules: Record<typeof mode, (exp: ExperienceNode) => boolean> = {
            research: (exp) => {
                // DROP if contains drop keywords
                if (containsDropKeyword(exp)) return false;
                // DROP: Volunteer, leadership, entrepreneurship categories
                if (['volunteer', 'leadership', 'entrepreneurship'].includes(exp.category)) return false;
                // KEEP: Research projects
                if (exp.category === 'research') return true;
                // KEEP: Industry if production or published (systems/ML work)
                if (exp.category === 'industry' && (exp.isProduction || exp.isPublished)) return true;
                return false;
            },

            industry: (exp) => {
                // DROP if contains drop keywords
                if (containsDropKeyword(exp)) return false;
                // DROP: Volunteer, most leadership
                if (exp.category === 'volunteer') return false;
                // KEEP: Industry and production research
                if (exp.category === 'industry') return true;
                if (exp.category === 'research' && exp.isProduction) return true;
                return false;
            },

            college: (exp) => {
                // DROP if contains drop keywords (enterprise-level tech detail)
                if (containsDropKeyword(exp)) return false;
                // KEEP: All activities for college applications (admissions want to see everything)
                return true;
            }
        };

        return this.experiences.filter(rules[mode]);
    }

    // ========================================
    // RANKING BY RELEVANCE
    // ========================================

    private rankForTarget(experiences: ExperienceNode[], target: CVTarget): ExperienceNode[] {
        return experiences
            .map(exp => ({
                exp,
                score: this.scoreForTarget(exp, target)
            }))
            .sort((a, b) => b.score - a.score)
            .map(item => ({ ...item.exp, priority: item.score }));
    }

    private scoreForTarget(exp: ExperienceNode, target: CVTarget): number {
        let score = 0;

        // Base: hours invested
        score += Math.min(exp.hours / 100, 10);

        // Publications (massive boost for research)
        if (target.type === 'research' && exp.isPublished) score += 30;

        // Production (massive boost for industry)
        if (target.type === 'industry' && exp.isProduction) score += 25;

        // Leadership (boost for college)
        if (target.type === 'college' && exp.category === 'leadership') score += 15;

        // Domain match
        if (target.domains && target.domains.some(d =>
            exp.domain.toLowerCase().includes(d.toLowerCase())
        )) {
            score += 20;
        }

        // Keyword match (for industry)
        if (target.keywords) {
            const expText = `${exp.title} ${exp.description || ''} ${exp.methods.join(' ')} ${exp.tools.join(' ')}`.toLowerCase();
            const matches = target.keywords.filter(kw => expText.includes(kw.toLowerCase())).length;
            score += matches * 3;
        }

        // Outcomes boost
        score += exp.outcomes.metrics.length * 2;
        if (exp.outcomes.publications) score += exp.outcomes.publications.length * 5;
        if (exp.outcomes.awards) score += exp.outcomes.awards.length * 3;

        return score;
    }

    // ========================================
    // APPLY LIMITS
    // ========================================

    private applyLimits(experiences: ExperienceNode[], target: CVTarget): ExperienceNode[] {
        // Page limit → experience count mapping
        const limits: Record<number, number> = {
            1: 4,   // Industry: 1 page = 4 experiences
            2: 8,   // Industry/Research: 2 pages = 8 experiences
            3: 12,  // Research: 3 pages = 12 experiences
            4: 16   // College: 4 pages = 16 experiences (but aim for 2-3)
        };

        const maxCount = target.maxExperiences || limits[target.pageLimit];
        return experiences.slice(0, maxCount);
    }

    // ========================================
    // RENDERING BY MODE
    // ========================================

    private render(experiences: ExperienceNode[], target: CVTarget): string {
        switch (target.type) {
            case 'research':
                return this.renderResearch(experiences);
            case 'industry':
                return this.renderIndustry(experiences, target);
            case 'college':
                return this.renderCollege(experiences);
        }
    }

    private renderResearch(experiences: ExperienceNode[]): string {
        const lines: string[] = [];

        // Header
        lines.push(`# ${this.profile.name}`);
        lines.push(`${this.profile.email}`);
        if (this.profile.researchPaper) lines.push(`Research: ${this.profile.researchPaper}`);
        lines.push('');
        lines.push('---');
        lines.push('');

        // Research interests
        const domains = [...new Set(experiences.map(e => e.domain))];
        lines.push('## Research Interests');
        lines.push('');
        lines.push(domains.join(' • '));
        lines.push('');
        lines.push('---');
        lines.push('');

        // Publications
        const pubs = experiences.flatMap(e => e.outcomes.publications || []);
        if (pubs.length > 0) {
            lines.push('## Publications');
            lines.push('');
            pubs.forEach(pub => lines.push(`- ${pub}`));
            lines.push('');
            lines.push('---');
            lines.push('');
        }

        // Research experience
        lines.push('## Research Experience');
        lines.push('');

        experiences.filter(e => e.isPublished || e.category === 'research').forEach(exp => {
            lines.push(`### ${exp.title}`);
            lines.push(`*${exp.organization}* | ${exp.dates.start} - ${exp.dates.end}`);
            lines.push('');

            // Methods
            if (exp.methods.length > 0) {
                lines.push(`**Methods:** ${exp.methods.join(', ')}`);
            }

            // Data
            if (exp.datasets.length > 0) {
                lines.push(`**Data:** ${exp.datasets[0]}`);
            }

            // Results (MUST have metrics)
            if (exp.outcomes.metrics.length > 0) {
                lines.push(`**Results:** ${exp.outcomes.metrics.join(', ')}`);
            }

            // Publications
            if (exp.outcomes.publications && exp.outcomes.publications.length > 0) {
                lines.push(`**Published:** ${exp.outcomes.publications[0]}`);
            }

            lines.push('');
        });

        // Technical projects (non-published work)
        const technical = experiences.filter(e => !e.isPublished && e.category !== 'research');
        if (technical.length > 0) {
            lines.push('## Technical Projects');
            lines.push('');

            technical.forEach(exp => {
                lines.push(`### ${exp.title}`);
                lines.push(`*${exp.organization}* | ${exp.dates.duration}`);
                lines.push('');

                // Bullet format: Method + Data + Result
                if (exp.methods.length > 0 && exp.outcomes.metrics.length > 0) {
                    lines.push(`- Applied ${exp.methods.join(', ')} to ${exp.datasets[0] || 'production data'}, achieving ${exp.outcomes.metrics[0]}`);
                }

                lines.push('');
            });
        }

        return lines.join('\n');
    }

    private renderIndustry(experiences: ExperienceNode[], target: CVTarget): string {
        const lines: string[] = [];

        // Header
        lines.push(`# ${this.profile.name}`);
        lines.push(`${this.profile.email} | ${this.profile.phone || ''} | ${this.profile.location || ''}`);
        lines.push(`${this.profile.linkedin ? `[LinkedIn](${this.profile.linkedin})` : ''} ${this.profile.github ? `| [GitHub](${this.profile.github})` : ''}`);
        lines.push('');
        lines.push('---');
        lines.push('');

        // Technical skills
        lines.push('## Technical Skills');
        lines.push('');
        const allTools = [...new Set(experiences.flatMap(e => e.tools))];
        const allMethods = [...new Set(experiences.flatMap(e => e.methods))];
        lines.push(`**Technologies:** ${allTools.slice(0, 15).join(', ')}`);
        lines.push(`**Methods:** ${allMethods.slice(0, 12).join(', ')}`);
        lines.push('');
        lines.push('---');
        lines.push('');

        // Professional experience
        lines.push('## Professional Experience');
        lines.push('');

        experiences.forEach(exp => {
            lines.push(`### ${exp.role} | ${exp.organization}`);
            lines.push(`*${exp.dates.start} - ${exp.dates.end}*`);
            lines.push('');

            // Industry format: Action + Method + Scale + Result
            const bullets = this.generateIndustryBullets(exp);
            bullets.forEach(bullet => lines.push(`- ${bullet}`));

            lines.push('');
        });

        return lines.join('\n');
    }

    private generateIndustryBullets(exp: ExperienceNode): string[] {
        const bullets: string[] = [];

        // Rule: Each bullet MUST have: method + scale/data + outcome
        // No bullet without a number or method

        // Bullet 1: Main achievement
        if (exp.outcomes.metrics.length > 0 && exp.methods.length > 0) {
            bullets.push(
                `Achieved ${exp.outcomes.metrics[0]} by implementing ${exp.methods[0]}` +
                (exp.datasets.length > 0 ? ` on ${exp.datasets[0]}` : '')
            );
        }

        // Bullet 2: Technical architecture
        if (exp.methods.length > 1 && exp.tools.length > 0) {
            bullets.push(
                `Built ${exp.title.toLowerCase()} using ${exp.methods.slice(0, 2).join(', ')} ` +
                `with ${exp.tools.slice(0, 3).join(', ')}`
            );
        }

        // Bullet 3: Scale/impact (only if has metric)
        if (exp.scale.users || exp.scale.team) {
            const scaleMetric = exp.scale.users || exp.scale.team;
            if (exp.outcomes.metrics.length > 1) {
                bullets.push(`${scaleMetric}, resulting in ${exp.outcomes.metrics[1]}`);
            }
        }

        // Bullet 4: Deployment (only if production)
        if (exp.isProduction && exp.outcomes.deployments) {
            bullets.push(exp.outcomes.deployments[0]);
        }

        // Filter: Remove any bullet without a number or method keyword
        return bullets.filter(b => {
            const hasNumber = /\d+/.test(b);
            const hasMethod = exp.methods.some(m => b.includes(m)) || exp.tools.some(t => b.includes(t));
            return hasNumber || hasMethod;
        });
    }

    private renderCollege(experiences: ExperienceNode[]): string {
        const lines: string[] = [];

        // Header
        lines.push(`# ${this.profile.name}`);
        lines.push(`${this.profile.email} | ${this.profile.location || ''}`);
        if (this.profile.linkedin) lines.push(`[LinkedIn](${this.profile.linkedin})`);
        lines.push('');
        lines.push('---');
        lines.push('');

        // Education section (if in profile)
        if (this.profile.education) {
            lines.push('## Education');
            lines.push('');
            lines.push(this.profile.education);
            lines.push('');
            lines.push('---');
            lines.push('');
        }

        // Leadership & significant activities
        lines.push('## Leadership & Significant Activities');
        lines.push('');

        experiences.forEach((exp, idx) => {
            lines.push(`### ${idx + 1}. ${exp.title}`);
            lines.push(`**${exp.role}** at ${exp.organization}`);
            lines.push(`*${exp.dates.start} - ${exp.dates.end}* | ${exp.hours} hours`);
            lines.push('');

            // Full description
            if (exp.description) {
                lines.push(exp.description);
                lines.push('');
            } else {
                lines.push(`Led ${exp.title.toLowerCase()} initiatives at ${exp.organization}.`);
                if (exp.methods.length > 0) {
                    lines.push(`Applied ${exp.methods.join(', ')} methodology.`);
                }
                lines.push('');
            }

            // Scale/Impact
            if (exp.scale.users || exp.scale.team || exp.scale.geographic) {
                lines.push('**Impact:**');
                if (exp.scale.users) lines.push(`• Reached ${exp.scale.users}`);
                if (exp.scale.team) lines.push(`• ${exp.scale.team}`);
                if (exp.scale.geographic) lines.push(`• Geographic reach: ${exp.scale.geographic}`);
                lines.push('');
            }

            // Key outcomes
            if (exp.outcomes.metrics.length > 0 || exp.outcomes.publications || exp.outcomes.awards) {
                lines.push('**Key Outcomes:**');
                exp.outcomes.metrics.forEach(m => lines.push(`• ${m}`));
                if (exp.outcomes.publications && exp.outcomes.publications.length > 0) {
                    exp.outcomes.publications.forEach(p => lines.push(`• Published: ${p}`));
                }
                if (exp.outcomes.awards && exp.outcomes.awards.length > 0) {
                    exp.outcomes.awards.forEach(a => lines.push(`• Award: ${a}`));
                }
                if (exp.outcomes.deployments && exp.outcomes.deployments.length > 0) {
                    exp.outcomes.deployments.forEach(d => lines.push(`• ${d}`));
                }
                lines.push('');
            }

            // Skills/Methods used
            if (exp.methods.length > 0 || exp.tools.length > 0) {
                const skills = [...exp.methods.slice(0, 3), ...exp.tools.slice(0, 3)];
                lines.push(`**Skills:** ${skills.join(', ')}`);
                lines.push('');
            }

            lines.push('---');
            lines.push('');
        });

        // Separate Achievements/Awards section
        const allAwards = experiences.flatMap(e => e.outcomes.awards || []);
        const allPubs = experiences.flatMap(e => e.outcomes.publications || []);

        if (allAwards.length > 0 || allPubs.length > 0) {
            lines.push('## Honors & Awards');
            lines.push('');
            allAwards.forEach(a => lines.push(`• ${a}`));
            allPubs.forEach(p => lines.push(`• Publication: ${p}`));
            lines.push('');
        }

        return lines.join('\n');
    }

    // ========================================
    // VALIDATION
    // ========================================

    private validate(content: string, target: CVTarget): string {
        let validated = content;
        const violations: string[] = [];

        // Check ban list (case-insensitive, word boundary)
        // CRITICAL: Any match triggers content removal
        BANNED_PHRASES.forEach(phrase => {
            // Escape special regex characters in the phrase
            const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
            if (regex.test(validated)) {
                violations.push(phrase);
                // Remove the banned phrase entirely (not just mark it)
                validated = validated.replace(regex, '');
            }
        });

        // Signal preservation: Remove empty bullets after ban list cleanup
        validated = validated.split('\n').map(line => {
            // Skip empty lines
            if (!line.trim()) return line;
            // If bullet line, check it has substance
            if (line.startsWith('-') || line.startsWith('•')) {
                const content = line.replace(/^[-•]\s*/, '').trim();
                // If bullet is now empty or just whitespace, remove it
                if (!content || content.length < 5) return null;
            }
            return line;
        }).filter(line => line !== null).join('\n');

        // Clean up any double spaces or empty markers left behind
        validated = validated.replace(/\s{2,}/g, ' ').replace(/\[\s*\]/g, '').trim();

        if (violations.length > 0) {
            console.warn(`🚨 CV REGENERATION NEEDED - Ban list violations found: ${violations.join(', ')}`);
            console.warn(`   Target: ${target.name} (${target.type})`);
            console.warn(`   Violations removed from output. Review source content.`);
        }

        return validated;
    }

    // ========================================
    // METADATA GENERATION
    // ========================================

    private generateMetadata(
        content: string,
        experiences: ExperienceNode[],
        target: CVTarget
    ): CompiledCV['metadata'] {
        const wordCount = content.split(/\s+/).length;
        const publicationCount = experiences.flatMap(e => e.outcomes.publications || []).length;
        const violations: string[] = [];
        const warnings: string[] = [];

        // Check ban list
        BANNED_PHRASES.forEach(phrase => {
            if (new RegExp(`\\b${phrase}\\b`, 'i').test(content)) {
                violations.push(`Contains banned phrase: "${phrase}"`);
            }
        });

        // Check signal preservation
        const lines = content.split('\n');
        lines.forEach(line => {
            if (line.startsWith('-') || line.startsWith('•')) {
                const hasNumber = /\d+/.test(line);
                const hasTech = /\b(Python|Java|ML|AI|AWS|React|PyTorch|TensorFlow|algorithm|model|system)\b/i.test(line);

                if (!hasNumber && !hasTech) {
                    warnings.push(`Weak bullet (no metric/method): "${line.substring(0, 50)}..."`);
                }
            }
        });

        // Page estimate (500 words per page)
        const pageEstimate = Math.ceil(wordCount / 500);

        if (pageEstimate > target.pageLimit) {
            warnings.push(`Exceeds page limit: ${pageEstimate} pages (limit: ${target.pageLimit})`);
        }

        // Signal strength
        let signal: 'elite' | 'strong' | 'medium' | 'weak' = 'weak';
        if (publicationCount >= 2 || experiences.filter(e => e.isProduction).length >= 3) {
            signal = 'elite';
        } else if (publicationCount >= 1 || experiences.filter(e => e.isProduction).length >= 2) {
            signal = 'strong';
        } else if (experiences.length >= 5 && experiences.some(e => e.outcomes.metrics.length > 2)) {
            signal = 'medium';
        }

        return {
            experienceCount: experiences.length,
            publicationCount,
            wordCount,
            pageEstimate,
            signal,
            violations,
            warnings
        };
    }
}

// ============================================
// TARGET INTELLIGENCE
// Automatically determine mode from target description
// ============================================

export function inferTargetMode(target: { name: string; description?: string }): 'research' | 'industry' | 'college' {
    const text = `${target.name} ${target.description || ''}`.toLowerCase();

    // Research indicators
    const researchKeywords = ['phd', 'research', 'lab', 'csail', 'orc', 'postdoc', 'faculty', 'publication'];
    if (researchKeywords.some(kw => text.includes(kw))) {
        return 'research';
    }

    // Industry indicators
    const industryKeywords = ['engineer', 'developer', 'swe', 'software', 'google', 'meta', 'amazon', 'openai', 'microsoft', 'production'];
    if (industryKeywords.some(kw => text.includes(kw))) {
        return 'industry';
    }

    // College indicators
    const collegeKeywords = ['undergraduate', 'admissions', 'college', 'university', 'freshman', 'application'];
    if (collegeKeywords.some(kw => text.includes(kw))) {
        return 'college';
    }

    // Default to college for ambiguous cases
    return 'college';
}

// ============================================
// BATCH TARGET BUILDER
// ============================================

export function buildTargetList(
    colleges: Array<{ id: string; name: string; focus?: string[] }>,
    jobs: Array<{ id: string; title: string; company: string; description: string }>
): CVTarget[] {
    const targets: CVTarget[] = [];

    // Add college targets
    colleges.forEach(college => {
        targets.push({
            id: college.id,
            name: college.name,
            type: inferTargetMode({ name: college.name }),
            domains: college.focus,
            pageLimit: 3,
            maxExperiences: 12
        });
    });

    // Add job targets
    jobs.forEach(job => {
        targets.push({
            id: job.id,
            name: `${job.title} at ${job.company}`,
            type: 'industry',
            description: job.description,
            keywords: extractKeywords(job.description),
            pageLimit: 2,
            maxExperiences: 8
        });
    });

    return targets;
}

function extractKeywords(text: string): string[] {
    const techPattern = /\b(Python|Java|JavaScript|TypeScript|React|AWS|GCP|Azure|ML|AI|TensorFlow|PyTorch|Docker|Kubernetes|SQL|NoSQL|API|REST|GraphQL|Microservices|Agile|Scrum)\b/gi;
    const matches = text.match(techPattern) || [];
    return [...new Set(matches.map(m => m.toLowerCase()))];
}
