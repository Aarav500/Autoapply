// ============================================
// MULTI-TARGET CV COMPILER SYSTEM
// Transforms activities into targeted CVs for Industry/Research/College
// ============================================

/**
 * CANONICAL EXPERIENCE GRAPH
 *
 * This is the single source of truth for all experience data.
 * Everything is stored once, then projected differently for each target.
 */

export interface ExperienceNode {
    // Identity
    id: string;
    title: string;
    organization: string;
    role: string;
    dates: {
        start: string;
        end: string;
        duration: string; // "2.5 years", "6 months"
    };

    // Methods & Execution
    methods: string[]; // ["ARIMA", "Reinforcement Learning", "QUBO"]
    tools: string[]; // ["Python", "PyTorch", "AWS Lambda"]
    datasets: string[]; // ["1M+ customer transactions", "5 years historical data"]
    scale: {
        team?: string; // "Led team of 8"
        users?: string; // "200+ students"
        budget?: string; // "$50K funding"
        geographic?: string; // "3 provinces in Afghanistan"
    };

    // Outcomes & Evidence
    outcomes: {
        metrics: string[]; // ["23% reduction in stockouts", "97% service level"]
        publications?: string[]; // ["IEEE ICSIT 2024", "Under review at Nature"]
        deployments?: string[]; // ["Production at SAP", "Open-source: 500+ stars"]
        awards?: string[]; // ["1st place hackathon", "$10K research grant"]
    };

    // Domain & Classification
    domain: string; // "Supply Chain Optimization", "Accessibility Technology"
    category: 'research' | 'industry' | 'leadership' | 'volunteer' | 'entrepreneurship';

    // Raw data for narrative generation
    description: string;
    impact: string;
    researchQuestion?: string; // For research CVs
    businessContext?: string; // For industry CVs

    // Metadata
    hours: number; // Total hours invested
    isPublished: boolean;
    isProduction: boolean;
    isUnique: boolean; // Standout/unusual experience
}

/**
 * Extract canonical experience nodes from raw activities
 */
export function extractExperienceGraph(
    activities: any[],
    achievements: any[]
): ExperienceNode[] {
    const nodes: ExperienceNode[] = [];

    for (const activity of activities) {
        const totalHours = (activity.hoursPerWeek || 0) * (activity.weeksPerYear || 0);

        // Extract methods, tools, datasets from description using patterns
        const description = activity.description || '';
        const methods = extractMethods(description);
        const tools = extractTools(description);
        const datasets = extractDatasets(description);
        const outcomes = extractOutcomes(description, achievements, activity.id);

        const node: ExperienceNode = {
            id: activity.id,
            title: activity.name || activity.role,
            organization: activity.organization || '',
            role: activity.role || '',
            dates: {
                start: activity.startDate || '',
                end: activity.endDate || 'Present',
                duration: calculateDuration(activity.startDate, activity.endDate)
            },
            methods,
            tools,
            datasets,
            scale: extractScale(description, totalHours),
            outcomes,
            domain: inferDomain(activity),
            category: inferCategory(activity, description),
            description,
            impact: activity.impact || '',
            researchQuestion: extractResearchQuestion(description),
            businessContext: extractBusinessContext(description),
            hours: totalHours,
            isPublished: hasPublication(achievements, activity.id) || description.toLowerCase().includes('published'),
            isProduction: description.toLowerCase().includes('production') || description.toLowerCase().includes('deployed'),
            isUnique: totalHours > 500 || hasPublication(achievements, activity.id)
        };

        nodes.push(node);
    }

    return nodes;
}

// ============================================
// EXTRACTION UTILITIES
// ============================================

function extractMethods(text: string): string[] {
    const methods: string[] = [];
    const patterns = [
        /\b(ARIMA|LSTM|CNN|Transformer|Random Forest|XGBoost|QUBO|Quantum|Neural Network|Regression|Classification)\b/gi,
        /\b(Machine Learning|Deep Learning|Reinforcement Learning|Supervised|Unsupervised|Transfer Learning)\b/gi,
        /\b(Optimization|Gradient Descent|Backpropagation|Dynamic Programming)\b/gi,
        /\b(A\/B Testing|Hypothesis Testing|Statistical Analysis|Monte Carlo)\b/gi
    ];

    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) methods.push(...matches);
    });

    return [...new Set(methods)]; // Deduplicate
}

function extractTools(text: string): string[] {
    const tools: string[] = [];
    const patterns = [
        /\b(Python|JavaScript|TypeScript|Java|C\+\+|Go|Rust|R|SQL)\b/gi,
        /\b(PyTorch|TensorFlow|scikit-learn|Pandas|NumPy|React|Next\.js|FastAPI)\b/gi,
        /\b(AWS|Azure|GCP|Docker|Kubernetes|Jenkins|GitHub Actions)\b/gi,
        /\b(PostgreSQL|MongoDB|Redis|Elasticsearch|S3)\b/gi
    ];

    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) tools.push(...matches);
    });

    return [...new Set(tools)];
}

function extractDatasets(text: string): string[] {
    const datasets: string[] = [];
    const patterns = [
        /(\d+[\+M]*\s*(customers|users|students|records|samples|images|transactions))/gi,
        /(\d+\s*years?\s*(of\s*)?(historical\s*)?(data|records))/gi,
        /(dataset\s*of\s*\d+)/gi
    ];

    patterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) datasets.push(...matches);
    });

    return datasets;
}

function extractOutcomes(text: string, achievements: any[], activityId: string): ExperienceNode['outcomes'] {
    const metrics: string[] = [];
    const publications: string[] = [];
    const deployments: string[] = [];
    const awards: string[] = [];

    // Extract metrics
    const metricPatterns = [
        /(\d+%\s*(increase|decrease|improvement|reduction|growth))/gi,
        /(reduced\s+\w+\s+by\s+\d+%)/gi,
        /(improved\s+\w+\s+by\s+\d+%)/gi,
        /(\d+x\s*faster)/gi,
        /(\$\d+[\w\s]*)/gi,
        /(\d+\+?\s*(users|students|members|participants))/gi
    ];

    metricPatterns.forEach(pattern => {
        const matches = text.match(pattern);
        if (matches) metrics.push(...matches);
    });

    // Extract publications from achievements
    achievements
        .filter(a => a.category === 'publication' || a.type?.includes('publication'))
        .forEach(a => publications.push(a.title));

    // Extract deployments
    if (text.toLowerCase().includes('production')) deployments.push('Deployed to production');
    if (text.toLowerCase().includes('open source') || text.toLowerCase().includes('open-source')) {
        deployments.push('Open-source release');
    }

    // Extract awards from achievements
    achievements
        .filter(a => a.category === 'award')
        .forEach(a => awards.push(a.title));

    return { metrics, publications, deployments, awards };
}

function extractScale(text: string, hours: number): ExperienceNode['scale'] {
    const scale: ExperienceNode['scale'] = {};

    // Team size
    const teamMatch = text.match(/team\s+of\s+(\d+)/i) || text.match(/led\s+(\d+)\s+\w+/i);
    if (teamMatch) scale.team = `Team of ${teamMatch[1]}`;

    // Users
    const usersMatch = text.match(/(\d+\+?)\s*(users|students|members|participants)/i);
    if (usersMatch) scale.users = `${usersMatch[1]}+ ${usersMatch[2]}`;

    // Budget
    const budgetMatch = text.match(/\$(\d+[KM]?)/);
    if (budgetMatch) scale.budget = `$${budgetMatch[1]}`;

    // Geographic
    const geoMatch = text.match(/(nationwide|international|global|\d+\s*(countries|provinces|states))/i);
    if (geoMatch) scale.geographic = geoMatch[0];

    // If hours > 1000, mention it
    if (hours > 1000) scale.team = scale.team || `${hours} hours invested`;

    return scale;
}

function inferDomain(activity: any): string {
    const text = (activity.description + ' ' + activity.name + ' ' + activity.role).toLowerCase();

    if (text.includes('quantum') || text.includes('supply chain')) return 'Supply Chain Optimization';
    if (text.includes('accessibility') || text.includes('disability')) return 'Accessibility Technology';
    if (text.includes('education') || text.includes('teaching')) return 'Educational Technology';
    if (text.includes('ml') || text.includes('machine learning') || text.includes('neural')) return 'Machine Learning';
    if (text.includes('web') || text.includes('frontend') || text.includes('backend')) return 'Software Engineering';
    if (text.includes('research')) return 'Academic Research';

    return 'General Technology';
}

function inferCategory(activity: any, description: string): ExperienceNode['category'] {
    const text = description.toLowerCase();

    if (text.includes('research') || text.includes('publication') || text.includes('paper')) return 'research';
    if (text.includes('production') || text.includes('deployed') || text.includes('enterprise')) return 'industry';
    if (text.includes('founded') || text.includes('startup') || text.includes('entrepreneur')) return 'entrepreneurship';
    if (text.includes('volunteer') || text.includes('community') || text.includes('nonprofit')) return 'volunteer';
    if (text.includes('led') || text.includes('president') || text.includes('director')) return 'leadership';

    return 'leadership';
}

function extractResearchQuestion(text: string): string | undefined {
    // Look for research framing
    const patterns = [
        /research question:?\s*(.+?)[\.;]/i,
        /investigating\s+(.+?)[\.;]/i,
        /explored\s+(.+?)[\.;]/i,
        /studied\s+(.+?)[\.;]/i
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1].trim();
    }

    return undefined;
}

function extractBusinessContext(text: string): string | undefined {
    const patterns = [
        /(enterprise|production|customer|revenue|business|commercial)/i
    ];

    for (const pattern of patterns) {
        if (pattern.test(text)) {
            return text.split('.')[0]; // Return first sentence as context
        }
    }

    return undefined;
}

function hasPublication(achievements: any[], activityId: string): boolean {
    return achievements.some(a =>
        (a.category === 'publication' || a.type?.includes('publication')) &&
        a.activities?.includes(activityId)
    );
}

function calculateDuration(start: string, end: string): string {
    if (!start || !end) return 'Unknown';

    try {
        const startDate = new Date(start);
        const endDate = end.toLowerCase().includes('present') ? new Date() : new Date(end);

        const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 +
                       (endDate.getMonth() - startDate.getMonth());

        if (months < 12) return `${months} months`;
        const years = Math.floor(months / 12);
        const remainingMonths = months % 12;

        if (remainingMonths === 0) return `${years} year${years > 1 ? 's' : ''}`;
        return `${years}.${Math.round(remainingMonths / 12 * 10)} years`;
    } catch {
        return 'Unknown';
    }
}

// ============================================
// CV PROJECTION RENDERERS
// ============================================

export type CVTarget = 'industry' | 'research' | 'college';
export type PageLimit = 1 | 2 | 3 | 4;

export interface CVCompilerOptions {
    target: CVTarget;
    pageLimit: PageLimit;
    jobDescription?: string; // For industry target
    collegeId?: string; // For college target
    emphasis?: 'technical' | 'leadership' | 'impact' | 'research';
}

export interface CompiledCV {
    content: string;
    metadata: {
        wordCount: number;
        experienceCount: number;
        publicationCount: number;
        signal: 'strong' | 'medium' | 'weak';
        warnings: string[];
    };
}

/**
 * MAIN COMPILER FUNCTION
 * Compiles experiences into target-specific CV
 */
export function compileCV(
    experiences: ExperienceNode[],
    profile: any,
    options: CVCompilerOptions
): CompiledCV {
    // Step 1: Filter and rank experiences based on target
    const ranked = rankExperiencesForTarget(experiences, options);

    // Step 2: Apply page limit compression
    const compressed = compressToPageLimit(ranked, options.pageLimit);

    // Step 3: Render using appropriate template
    let content: string;
    switch (options.target) {
        case 'industry':
            content = renderIndustryCV(compressed, profile, options);
            break;
        case 'research':
            content = renderResearchCV(compressed, profile, options);
            break;
        case 'college':
            content = renderCollegeCV(compressed, profile, options);
            break;
    }

    // Step 4: Validate and return
    const metadata = generateMetadata(content, compressed);

    return { content, metadata };
}

/**
 * INDUSTRY CV RENDERER
 * Google / Meta / OpenAI / Quant firms
 */
function renderIndustryCV(
    experiences: ExperienceNode[],
    profile: any,
    options: CVCompilerOptions
): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${profile.name || 'Your Name'}`);
    lines.push(`${profile.email} | ${profile.phone || ''} | ${profile.location || ''}`);
    lines.push(`${profile.linkedin ? `[LinkedIn](${profile.linkedin})` : ''} ${profile.github ? `| [GitHub](${profile.github})` : ''}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Professional summary with keywords
    if (options.jobDescription) {
        const keywords = extractJobKeywords(options.jobDescription);
        lines.push('## Professional Summary');
        lines.push('');
        lines.push(generateIndustrySummary(experiences, keywords, profile));
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    // Technical skills
    lines.push('## Technical Skills');
    lines.push('');
    const allTools = [...new Set(experiences.flatMap(e => e.tools))];
    const allMethods = [...new Set(experiences.flatMap(e => e.methods))];
    lines.push(`**Technologies:** ${allTools.slice(0, 12).join(', ')}`);
    lines.push(`**Methods:** ${allMethods.slice(0, 10).join(', ')}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // Professional experience (ordered by relevance)
    lines.push('## Professional Experience');
    lines.push('');

    experiences.forEach(exp => {
        lines.push(`### ${exp.role} | ${exp.organization}`);
        lines.push(`*${exp.dates.start} - ${exp.dates.end}* • ${exp.dates.duration}`);
        lines.push('');

        // Bullets: Action → Method → Scale → Outcome
        const bullets = generateIndustryBullets(exp);
        bullets.forEach(bullet => lines.push(`- ${bullet}`));
        lines.push('');
    });

    return lines.join('\n');
}

/**
 * RESEARCH CV RENDERER
 * MIT / Stanford / PhD labs
 */
function renderResearchCV(
    experiences: ExperienceNode[],
    profile: any,
    options: CVCompilerOptions
): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${profile.name || 'Your Name'}`);
    lines.push(`${profile.email}`);
    if (profile.researchPaper) lines.push(`Research: ${profile.researchPaper}`);
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

    // Publications (if any)
    const publications = experiences.flatMap(e => e.outcomes.publications || []);
    if (publications.length > 0) {
        lines.push('## Publications');
        lines.push('');
        publications.forEach(pub => lines.push(`- ${pub}`));
        lines.push('');
        lines.push('---');
        lines.push('');
    }

    // Research experience
    lines.push('## Research Experience');
    lines.push('');

    experiences.filter(e => e.category === 'research' || e.isPublished).forEach(exp => {
        lines.push(`### ${exp.title}`);
        lines.push(`*${exp.organization}* | ${exp.dates.start} - ${exp.dates.end}`);
        lines.push('');

        if (exp.researchQuestion) {
            lines.push(`**Research Question:** ${exp.researchQuestion}`);
            lines.push('');
        }

        if (exp.methods.length > 0) {
            lines.push(`**Methods:** ${exp.methods.join(', ')}`);
        }

        if (exp.datasets.length > 0) {
            lines.push(`**Data:** ${exp.datasets[0]}`);
        }

        if (exp.outcomes.metrics.length > 0) {
            lines.push(`**Results:** ${exp.outcomes.metrics.join(', ')}`);
        }

        if (exp.outcomes.publications && exp.outcomes.publications.length > 0) {
            lines.push(`**Published:** ${exp.outcomes.publications[0]}`);
        }

        lines.push('');
    });

    // Technical projects
    lines.push('## Technical Projects');
    lines.push('');

    experiences.filter(e => e.category !== 'research' && !e.isPublished).forEach(exp => {
        lines.push(`### ${exp.title}`);
        lines.push(`*${exp.organization}* | ${exp.dates.duration}`);
        lines.push('');

        const bullets = generateResearchBullets(exp);
        bullets.forEach(bullet => lines.push(`- ${bullet}`));
        lines.push('');
    });

    return lines.join('\n');
}

/**
 * COLLEGE CV RENDERER
 * MIT / Stanford / undergrad admissions
 */
function renderCollegeCV(
    experiences: ExperienceNode[],
    profile: any,
    options: CVCompilerOptions
): string {
    const lines: string[] = [];

    // Header
    lines.push(`# ${profile.name || 'Your Name'}`);
    lines.push(`${profile.email} | ${profile.location || ''}`);
    lines.push('');
    lines.push('---');
    lines.push('');

    // About me
    lines.push('## About Me');
    lines.push('');
    lines.push(profile.summary || generateCollegeSummary(experiences));
    lines.push('');
    lines.push('---');
    lines.push('');

    // Leadership & activities (with narratives)
    lines.push('## Leadership & Significant Activities');
    lines.push('');

    experiences.forEach(exp => {
        lines.push(`### ${exp.title} | ${exp.role}`);
        lines.push(`*${exp.dates.start} - ${exp.dates.end}* • ${exp.hours} total hours`);
        lines.push('');

        // NARRATIVE: Why started + What did + Impact
        const narrative = generateCollegeNarrative(exp);
        lines.push(narrative);
        lines.push('');

        // Key outcomes
        if (exp.outcomes.metrics.length > 0 || exp.outcomes.publications?.length) {
            lines.push('**Key Outcomes:**');
            exp.outcomes.metrics.slice(0, 3).forEach(m => lines.push(`• ${m}`));
            if (exp.outcomes.publications && exp.outcomes.publications.length > 0) {
                lines.push(`• Published: ${exp.outcomes.publications[0]}`);
            }
            lines.push('');
        }
    });

    return lines.join('\n');
}

// ============================================
// BULLET GENERATION
// ============================================

function generateIndustryBullets(exp: ExperienceNode): string[] {
    const bullets: string[] = [];

    // Bullet 1: Main achievement with scale
    if (exp.outcomes.metrics.length > 0) {
        const metric = exp.outcomes.metrics[0];
        const method = exp.methods[0] || 'technical solutions';
        bullets.push(`Achieved ${metric} by implementing ${method}`);
    }

    // Bullet 2: Technical depth
    if (exp.methods.length > 0 && exp.tools.length > 0) {
        bullets.push(`Architected system using ${exp.methods.slice(0, 2).join(', ')} with ${exp.tools.slice(0, 3).join(', ')}`);
    }

    // Bullet 3: Scale/impact
    if (exp.scale.users || exp.scale.team) {
        bullets.push(`${exp.scale.team ? 'Led ' + exp.scale.team : 'Impacted ' + exp.scale.users}`);
    }

    // Bullet 4: Production/deployment
    if (exp.outcomes.deployments && exp.outcomes.deployments.length > 0) {
        bullets.push(exp.outcomes.deployments[0]);
    }

    return bullets.filter(b => b.length > 10); // Remove empty
}

function generateResearchBullets(exp: ExperienceNode): string[] {
    const bullets: string[] = [];

    if (exp.researchQuestion) {
        bullets.push(`Investigated: ${exp.researchQuestion}`);
    }

    if (exp.methods.length > 0) {
        bullets.push(`Applied ${exp.methods.join(', ')} to ${exp.datasets[0] || 'real-world data'}`);
    }

    if (exp.outcomes.metrics.length > 0) {
        bullets.push(`Achieved ${exp.outcomes.metrics.join(', ')}`);
    }

    return bullets;
}

function generateCollegeNarrative(exp: ExperienceNode): string {
    // 75-150 word narrative format
    const parts: string[] = [];

    // Context (why started)
    if (exp.description.length > 50) {
        const firstSentence = exp.description.split('.')[0];
        parts.push(firstSentence + '.');
    }

    // Action (what did)
    if (exp.methods.length > 0 || exp.tools.length > 0) {
        parts.push(`I ${exp.isPublished ? 'researched' : 'built'} ${exp.title.toLowerCase()} using ${exp.methods[0] || exp.tools[0]}.`);
    }

    // Result (impact)
    if (exp.outcomes.metrics.length > 0) {
        parts.push(`This resulted in ${exp.outcomes.metrics[0]}.`);
    }

    return parts.join(' ');
}

// ============================================
// RANKING & COMPRESSION
// ============================================

function rankExperiencesForTarget(
    experiences: ExperienceNode[],
    options: CVCompilerOptions
): ExperienceNode[] {
    return experiences
        .map(exp => ({
            exp,
            score: scoreExperienceForTarget(exp, options)
        }))
        .sort((a, b) => b.score - a.score)
        .map(item => item.exp);
}

function scoreExperienceForTarget(exp: ExperienceNode, options: CVCompilerOptions): number {
    let score = 0;

    // Base: hours invested
    score += Math.min(exp.hours / 100, 10);

    // Target-specific bonuses
    if (options.target === 'industry') {
        if (exp.isProduction) score += 15;
        if (exp.category === 'industry') score += 10;
        if (exp.outcomes.deployments && exp.outcomes.deployments.length > 0) score += 10;
        if (exp.scale.users) score += 5;
    }

    if (options.target === 'research') {
        if (exp.isPublished) score += 20;
        if (exp.category === 'research') score += 15;
        if (exp.researchQuestion) score += 10;
        if (exp.methods.length > 3) score += 5;
    }

    if (options.target === 'college') {
        if (exp.isUnique) score += 15;
        if (exp.hours > 500) score += 10;
        if (exp.category === 'volunteer' || exp.category === 'leadership') score += 10;
        if (exp.outcomes.awards && exp.outcomes.awards.length > 0) score += 8;
    }

    // Job description keyword matching
    if (options.jobDescription && options.target === 'industry') {
        const keywords = extractJobKeywords(options.jobDescription);
        const expText = (exp.description + ' ' + exp.methods.join(' ') + ' ' + exp.tools.join(' ')).toLowerCase();

        const matchCount = keywords.filter(kw => expText.includes(kw.toLowerCase())).length;
        score += matchCount * 3;
    }

    return score;
}

function compressToPageLimit(experiences: ExperienceNode[], limit: PageLimit): ExperienceNode[] {
    const targetCounts: Record<PageLimit, number> = {
        1: 4,
        2: 8,
        3: 12,
        4: 16
    };

    const targetCount = targetCounts[limit];
    return experiences.slice(0, targetCount);
}

// ============================================
// KEYWORD EXTRACTION
// ============================================

function extractJobKeywords(jobDescription: string): string[] {
    const keywords: string[] = [];

    // Technical terms
    const techPattern = /\b(Python|Java|React|AWS|ML|AI|Data|API|Database|Cloud|DevOps|Agile|Scrum|Git|Docker|Kubernetes)\b/gi;
    const matches = jobDescription.match(techPattern);
    if (matches) keywords.push(...matches);

    // Skills
    const skillPattern = /\b(leadership|communication|teamwork|problem.solving|analytical|creative)\b/gi;
    const skillMatches = jobDescription.match(skillPattern);
    if (skillMatches) keywords.push(...skillMatches);

    return [...new Set(keywords.map(k => k.toLowerCase()))];
}

function generateIndustrySummary(experiences: ExperienceNode[], keywords: string[], profile: any): string {
    const topDomains = [...new Set(experiences.slice(0, 3).map(e => e.domain))];
    const totalYears = Math.max(...experiences.map(e => parseInt(e.dates.duration) || 0));

    const parts = [
        `${totalYears}+ years of experience in ${topDomains.slice(0, 2).join(' and ')}.`,
        `Expertise in ${keywords.slice(0, 5).join(', ')}.`,
        `Proven track record of delivering high-impact solutions with measurable business results.`
    ];

    return parts.join(' ');
}

function generateCollegeSummary(experiences: ExperienceNode[]): string {
    const topDomain = experiences[0]?.domain || 'technology';
    return `Passionate about ${topDomain.toLowerCase()} with deep commitment to using technical skills for social impact. Driven by intellectual curiosity and desire to solve meaningful problems.`;
}

function generateMetadata(content: string, experiences: ExperienceNode[]): CompiledCV['metadata'] {
    const wordCount = content.split(/\s+/).length;
    const publicationCount = experiences.flatMap(e => e.outcomes.publications || []).length;

    const warnings: string[] = [];
    if (wordCount > 2000) warnings.push('CV exceeds recommended word count');
    if (experiences.length < 3) warnings.push('Too few experiences included');

    const signal = publicationCount > 0 || experiences.some(e => e.isProduction) ? 'strong' :
                   experiences.length > 5 ? 'medium' : 'weak';

    return {
        wordCount,
        experienceCount: experiences.length,
        publicationCount,
        signal,
        warnings
    };
}
