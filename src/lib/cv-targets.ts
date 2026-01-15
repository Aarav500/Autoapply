// ============================================
// PREDEFINED CV TARGETS
// 15 Universities + Elite Jobs for Multi-Target CV Compilation
// ============================================

import { CVTarget } from './cv-compiler-v2';

/**
 * RESEARCH CV TARGETS
 * For: MIT ORC, CSAIL, Stanford, PhD programs
 * 
 * KEEP: Research projects, Methods, Datasets, Experiments, Publications
 * DROP: SAP, Hackathons, Community service, Leadership, Entrepreneurship, Essays
 */
export const RESEARCH_TARGETS: CVTarget[] = [
    {
        id: 'mit-orc',
        name: 'MIT Operations Research Center',
        type: 'research',
        domains: ['Operations Research', 'Optimization', 'Supply Chain', 'ML'],
        prioritySignals: ['publications', 'methods', 'datasets', 'benchmarks'],
        pageLimit: 3,
        maxExperiences: 8,
        description: 'PhD-level research in operations research, optimization, and decision-making under uncertainty'
    },
    {
        id: 'mit-csail',
        name: 'MIT CSAIL',
        type: 'research',
        domains: ['AI', 'ML', 'Systems', 'Robotics', 'NLP'],
        prioritySignals: ['publications', 'methods', 'production', 'scale'],
        pageLimit: 3,
        maxExperiences: 8,
        description: 'Computer science and artificial intelligence research'
    },
    {
        id: 'stanford-cs',
        name: 'Stanford Computer Science',
        type: 'research',
        domains: ['ML', 'AI', 'Systems', 'HCI', 'Theory'],
        prioritySignals: ['publications', 'methods', 'benchmarks'],
        pageLimit: 3,
        maxExperiences: 8,
        description: 'Research in computer science across ML, AI, systems, and theory'
    },
    {
        id: 'cmu-scs',
        name: 'CMU School of Computer Science',
        type: 'research',
        domains: ['ML', 'Robotics', 'HCI', 'Systems', 'PL'],
        prioritySignals: ['publications', 'methods', 'technical_depth'],
        pageLimit: 3,
        maxExperiences: 8,
        description: 'Research at the intersection of computer science and engineering'
    },
    {
        id: 'phd-ml',
        name: 'PhD in Machine Learning',
        type: 'research',
        domains: ['ML', 'Deep Learning', 'NLP', 'Computer Vision'],
        prioritySignals: ['publications', 'methods', 'datasets', 'benchmarks'],
        pageLimit: 4,
        maxExperiences: 10,
        description: 'General PhD application in machine learning'
    }
];

/**
 * INDUSTRY CV TARGETS
 * For: Google, OpenAI, Quant firms, Big Tech
 * 
 * KEEP: SAP, F1, Inventory Quantum, Systems, Production ML, Infra
 * DROP: Afghan curriculum, Rotary, Farming, Chess, Olympiads, Research narratives
 * 
 * Format: Action + Method + Scale + Result (1-2 lines per bullet)
 */
export const INDUSTRY_TARGETS: CVTarget[] = [
    {
        id: 'google-ml',
        name: 'Google ML Engineer',
        type: 'industry',
        domains: ['ML', 'AI', 'Systems'],
        keywords: ['Python', 'TensorFlow', 'PyTorch', 'ML', 'distributed systems', 'scalable', 'API', 'production'],
        prioritySignals: ['production', 'scale', 'metrics'],
        pageLimit: 2,
        maxExperiences: 6,
        description: 'Machine learning engineering role at Google'
    },
    {
        id: 'openai-research',
        name: 'OpenAI Research Engineer',
        type: 'industry',
        domains: ['AI', 'ML', 'NLP', 'Deep Learning'],
        keywords: ['Python', 'PyTorch', 'Transformers', 'LLM', 'distributed training', 'scale'],
        prioritySignals: ['production', 'publications', 'scale'],
        pageLimit: 2,
        maxExperiences: 6,
        description: 'Research engineering at OpenAI'
    },
    {
        id: 'meta-swe',
        name: 'Meta Software Engineer',
        type: 'industry',
        domains: ['Systems', 'Infrastructure', 'ML'],
        keywords: ['Python', 'C++', 'React', 'distributed systems', 'scale', 'production'],
        prioritySignals: ['production', 'scale', 'metrics'],
        pageLimit: 2,
        maxExperiences: 6,
        description: 'Software engineering at Meta'
    },
    {
        id: 'jane-street-quant',
        name: 'Jane Street Quantitative Trader',
        type: 'industry',
        domains: ['Quantitative Finance', 'Trading', 'Optimization'],
        keywords: ['OCaml', 'Python', 'math', 'probability', 'optimization', 'trading'],
        prioritySignals: ['production', 'metrics', 'methods'],
        pageLimit: 1,
        maxExperiences: 4,
        description: 'Quantitative trading at Jane Street'
    },
    {
        id: 'citadel-quant',
        name: 'Citadel Quantitative Researcher',
        type: 'industry',
        domains: ['Quantitative Finance', 'ML', 'Statistics'],
        keywords: ['Python', 'C++', 'statistics', 'ML', 'trading', 'optimization'],
        prioritySignals: ['production', 'metrics', 'methods'],
        pageLimit: 1,
        maxExperiences: 4,
        description: 'Quantitative research at Citadel'
    },
    {
        id: 'amazon-sde',
        name: 'Amazon Software Development Engineer',
        type: 'industry',
        domains: ['Systems', 'Cloud', 'ML'],
        keywords: ['Python', 'Java', 'AWS', 'distributed systems', 'scale', 'microservices'],
        prioritySignals: ['production', 'scale', 'metrics'],
        pageLimit: 2,
        maxExperiences: 6,
        description: 'Software development engineering at Amazon'
    },
    {
        id: 'microsoft-swe',
        name: 'Microsoft Software Engineer',
        type: 'industry',
        domains: ['Cloud', 'Systems', 'ML'],
        keywords: ['C#', 'Python', 'Azure', 'TypeScript', 'cloud', 'scale'],
        prioritySignals: ['production', 'scale', 'metrics'],
        pageLimit: 2,
        maxExperiences: 6,
        description: 'Software engineering at Microsoft'
    }
];

/**
 * COLLEGE CV TARGETS
 * For: Undergraduate admissions
 * 
 * KEEP: Leadership, Service, Research, Awards, Academics
 * DROP: Deep system architecture, Quantum math, Enterprise ML detail
 */
export const COLLEGE_TARGETS: CVTarget[] = [
    {
        id: 'mit-undergrad',
        name: 'MIT Undergraduate Admissions',
        type: 'college',
        domains: ['STEM', 'Research', 'Innovation'],
        prioritySignals: ['leadership', 'uniqueness', 'hours', 'awards'],
        pageLimit: 3,
        maxExperiences: 12,
        description: 'MIT undergraduate transfer application'
    },
    {
        id: 'stanford-undergrad',
        name: 'Stanford Undergraduate Admissions',
        type: 'college',
        domains: ['Entrepreneurship', 'Research', 'Impact'],
        prioritySignals: ['leadership', 'uniqueness', 'impact', 'awards'],
        pageLimit: 3,
        maxExperiences: 12,
        description: 'Stanford undergraduate transfer application'
    },
    {
        id: 'cmu-undergrad',
        name: 'Carnegie Mellon Undergraduate Admissions',
        type: 'college',
        domains: ['Technical', 'Creative', 'Research'],
        prioritySignals: ['technical', 'creativity', 'hours'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'CMU undergraduate transfer application'
    },
    {
        id: 'cornell-undergrad',
        name: 'Cornell Undergraduate Admissions',
        type: 'college',
        domains: ['Research', 'Community', 'Leadership'],
        prioritySignals: ['community', 'leadership', 'research'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'Cornell undergraduate transfer application'
    },
    {
        id: 'gatech-undergrad',
        name: 'Georgia Tech Undergraduate Admissions',
        type: 'college',
        domains: ['Engineering', 'Innovation', 'Leadership'],
        prioritySignals: ['technical', 'innovation', 'leadership'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'Georgia Tech undergraduate transfer application'
    },
    {
        id: 'umich-undergrad',
        name: 'UMich Undergraduate Admissions',
        type: 'college',
        domains: ['Research', 'Leadership', 'Community'],
        prioritySignals: ['leadership', 'community', 'research'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'University of Michigan undergraduate transfer application'
    },
    {
        id: 'uiuc-undergrad',
        name: 'UIUC Undergraduate Admissions',
        type: 'college',
        domains: ['Engineering', 'CS', 'Innovation'],
        prioritySignals: ['technical', 'research', 'innovation'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'UIUC undergraduate transfer application'
    },
    {
        id: 'uwash-undergrad',
        name: 'UW Undergraduate Admissions',
        type: 'college',
        domains: ['Tech', 'Research', 'Community'],
        prioritySignals: ['community', 'research', 'innovation'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'University of Washington undergraduate transfer application'
    },
    {
        id: 'nyu-undergrad',
        name: 'NYU Undergraduate Admissions',
        type: 'college',
        domains: ['Business', 'Arts', 'Research'],
        prioritySignals: ['creativity', 'leadership', 'impact'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'New York University undergraduate transfer application'
    },
    {
        id: 'usc-undergrad',
        name: 'USC Undergraduate Admissions',
        type: 'college',
        domains: ['Engineering', 'Film', 'Business'],
        prioritySignals: ['creativity', 'leadership', 'community'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'University of Southern California undergraduate transfer application'
    },
    {
        id: 'utaustin-undergrad',
        name: 'UT Austin Undergraduate Admissions',
        type: 'college',
        domains: ['Engineering', 'CS', 'Business'],
        prioritySignals: ['technical', 'leadership', 'research'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'University of Texas at Austin undergraduate transfer application'
    },
    {
        id: 'northeastern-undergrad',
        name: 'Northeastern Undergraduate Admissions',
        type: 'college',
        domains: ['Co-op', 'Research', 'Engineering'],
        prioritySignals: ['technical', 'work_experience', 'innovation'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'Northeastern University undergraduate transfer application'
    },
    {
        id: 'nus-undergrad',
        name: 'NUS Undergraduate Admissions',
        type: 'college',
        domains: ['Research', 'Global', 'Innovation'],
        prioritySignals: ['research', 'global', 'technical'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'National University of Singapore undergraduate application'
    },
    {
        id: 'umd-undergrad',
        name: 'UMD Undergraduate Admissions',
        type: 'college',
        domains: ['Research', 'Engineering', 'Leadership'],
        prioritySignals: ['research', 'leadership', 'community'],
        pageLimit: 3,
        maxExperiences: 10,
        description: 'University of Maryland undergraduate transfer application'
    }
];

/**
 * ALL TARGETS - Combined list for UI dropdown
 */
export const ALL_TARGETS: CVTarget[] = [
    ...RESEARCH_TARGETS,
    ...INDUSTRY_TARGETS,
    ...COLLEGE_TARGETS
];

/**
 * Get targets grouped by type for UI
 */
export function getTargetsByType(): {
    research: CVTarget[];
    industry: CVTarget[];
    college: CVTarget[];
} {
    return {
        research: RESEARCH_TARGETS,
        industry: INDUSTRY_TARGETS,
        college: COLLEGE_TARGETS
    };
}

/**
 * Get target by ID
 */
export function getTargetById(id: string): CVTarget | undefined {
    return ALL_TARGETS.find(t => t.id === id);
}

/**
 * GOLD STANDARD IMPRESSIONS
 * What the CV should make the reader think
 */
export const GOLD_STANDARD: Record<string, string> = {
    'mit-orc': 'This person is already publishing at ORC level.',
    'mit-csail': 'This person is already doing CSAIL-level research.',
    'stanford-cs': 'This person thinks like a Stanford researcher.',
    'google-ml': 'This person is already deploying at scale.',
    'openai-research': 'This person understands production AI systems.',
    'jane-street-quant': 'This person has the quantitative rigor we need.',
    'mit-undergrad': 'This person leads, builds, and wins.',
    'stanford-undergrad': 'This person will change the world.',
};

/**
 * EXPERIENCE DROP RULES BY MODE
 * Defines what categories/keywords to exclude per CV type
 */
export const DROP_RULES: Record<string, { categories: string[]; keywords: string[] }> = {
    research: {
        categories: ['volunteer', 'entrepreneurship'],
        keywords: ['hackathon', 'community service', 'rotary', 'chess', 'olympiad', 'farming']
    },
    industry: {
        categories: ['volunteer', 'leadership'],
        keywords: ['curriculum', 'rotary', 'farming', 'chess', 'olympiad', 'teaching', 'tutoring']
    },
    college: {
        categories: [],
        keywords: ['quantum mechanics', 'QUBO formulation', 'enterprise architecture']
    }
};
