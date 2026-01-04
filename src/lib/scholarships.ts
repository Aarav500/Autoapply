// ============================================
// SCHOLARSHIP DATABASE
// Scholarships for international/Indian students
// ============================================

export interface Scholarship {
    id: string;
    name: string;
    provider: string;
    amount: string;
    deadline: Date;
    eligibility: string[];
    forInternational: boolean;
    forIndian: boolean;
    forTransfer: boolean;
    gpaRequired?: number;
    applicationUrl: string;
    autoApplySupported: boolean;
    category: 'merit' | 'need' | 'diversity' | 'field' | 'college';
    colleges?: string[]; // Specific colleges, or empty for general
    majors?: string[];
    description: string;
    requirements: {
        essays: number;
        lors: number;
        transcript: boolean;
        financialDocs: boolean;
    };
}

// ============================================
// SCHOLARSHIPS FOR INTERNATIONAL/INDIAN STUDENTS
// ============================================

export const SCHOLARSHIPS: Scholarship[] = [
    // ============================================
    // COLLEGE-SPECIFIC (From your target colleges)
    // ============================================
    {
        id: 'usc-global',
        name: 'USC Global Scholars Award',
        provider: 'University of Southern California',
        amount: '$10,000 - Full Tuition',
        deadline: new Date('2026-02-01'),
        eligibility: ['International student', 'High academic achievement', 'Leadership'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        gpaRequired: 3.7,
        applicationUrl: 'https://admission.usc.edu/apply/international/',
        autoApplySupported: false,
        category: 'college',
        colleges: ['usc'],
        description: 'Merit-based scholarship for exceptional international students at USC.',
        requirements: { essays: 1, lors: 2, transcript: true, financialDocs: true },
    },
    {
        id: 'umich-international',
        name: 'Michigan International Student Scholarship',
        provider: 'University of Michigan',
        amount: '$5,000 - $15,000/year',
        deadline: new Date('2026-02-01'),
        eligibility: ['International student', 'Academic excellence', 'Community involvement'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        gpaRequired: 3.5,
        applicationUrl: 'https://finaid.umich.edu/types-of-aid/scholarships/',
        autoApplySupported: false,
        category: 'college',
        colleges: ['umich'],
        description: 'Need and merit-based aid for international students at UMich.',
        requirements: { essays: 0, lors: 0, transcript: true, financialDocs: true },
    },
    {
        id: 'mit-international',
        name: 'MIT Need-Based Financial Aid',
        provider: 'Massachusetts Institute of Technology',
        amount: 'Full Need Met',
        deadline: new Date('2026-03-15'),
        eligibility: ['International student', 'Demonstrates financial need'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        applicationUrl: 'https://sfs.mit.edu/undergraduate-students/types-of-aid/',
        autoApplySupported: false,
        category: 'need',
        colleges: ['mit'],
        description: 'MIT meets 100% of demonstrated need for all admitted students, including internationals.',
        requirements: { essays: 0, lors: 0, transcript: true, financialDocs: true },
    },
    {
        id: 'stanford-knight-hennessy',
        name: 'Knight-Hennessy Scholars',
        provider: 'Stanford University',
        amount: 'Full Funding (Tuition + Stipend)',
        deadline: new Date('2026-03-15'),
        eligibility: ['Graduate student', 'Leadership potential', 'Civic commitment'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        gpaRequired: 3.7,
        applicationUrl: 'https://knight-hennessy.stanford.edu/',
        autoApplySupported: false,
        category: 'merit',
        colleges: ['stanford'],
        description: 'Full funding for graduate study at Stanford for leaders worldwide.',
        requirements: { essays: 3, lors: 3, transcript: true, financialDocs: false },
    },
    {
        id: 'cmu-tartans',
        name: 'CMU Tartans Scholarship',
        provider: 'Carnegie Mellon University',
        amount: '$10,000 - $20,000/year',
        deadline: new Date('2026-02-15'),
        eligibility: ['Strong academics', 'International student'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        gpaRequired: 3.6,
        applicationUrl: 'https://www.cmu.edu/sfs/financial-aid/types/scholarships-grants/',
        autoApplySupported: false,
        category: 'merit',
        colleges: ['cmu'],
        description: 'Merit scholarship for exceptional students at Carnegie Mellon.',
        requirements: { essays: 0, lors: 0, transcript: true, financialDocs: false },
    },

    // ============================================
    // INDIA-SPECIFIC SCHOLARSHIPS
    // ============================================
    {
        id: 'inlaks-shivdasani',
        name: 'Inlaks Shivdasani Foundation Scholarship',
        provider: 'Inlaks Foundation',
        amount: 'Up to $100,000 (Tuition + Living)',
        deadline: new Date('2026-02-28'),
        eligibility: ['Indian citizen', 'Under 30', 'Excellent academics', 'Graduate study abroad'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        gpaRequired: 3.5,
        applicationUrl: 'https://www.inlaksfoundation.org/scholarships/',
        autoApplySupported: false,
        category: 'merit',
        description: 'Prestigious scholarship for Indians pursuing graduate studies at top universities abroad.',
        requirements: { essays: 2, lors: 3, transcript: true, financialDocs: false },
    },
    {
        id: 'tata-scholarship',
        name: 'Tata Scholarship at Cornell',
        provider: 'Tata Education and Development Trust',
        amount: 'Full Financial Need',
        deadline: new Date('2026-01-15'),
        eligibility: ['Indian citizen', 'Undergraduate at Cornell'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        applicationUrl: 'https://finaid.cornell.edu/types-aid/grants-scholarships/tata-scholarship',
        autoApplySupported: false,
        category: 'need',
        colleges: ['cornell'],
        description: 'Covers full demonstrated need for Indian students at Cornell University.',
        requirements: { essays: 0, lors: 0, transcript: true, financialDocs: true },
    },
    {
        id: 'narotam-sekhsaria',
        name: 'Narotam Sekhsaria Scholarship',
        provider: 'Narotam Sekhsaria Foundation',
        amount: 'Up to ₹20 Lakhs',
        deadline: new Date('2026-03-31'),
        eligibility: ['Indian citizen', 'Pursuing postgraduate abroad', 'Below 30 years'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        gpaRequired: 3.3,
        applicationUrl: 'https://pg.nsfoundation.co.in/',
        autoApplySupported: true,
        category: 'merit',
        description: 'Interest-free loan scholarship for Indian students studying abroad.',
        requirements: { essays: 1, lors: 2, transcript: true, financialDocs: true },
    },
    {
        id: 'aga-khan-foundation',
        name: 'Aga Khan Foundation Scholarship',
        provider: 'Aga Khan Foundation',
        amount: '50% Grant + 50% Loan',
        deadline: new Date('2026-03-31'),
        eligibility: ['From developing country', 'Financial need', 'Graduate study'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        applicationUrl: 'https://www.akdn.org/our-agencies/aga-khan-foundation/international-scholarship-programme',
        autoApplySupported: false,
        category: 'need',
        description: 'Half-grant half-loan for students from developing countries.',
        requirements: { essays: 2, lors: 2, transcript: true, financialDocs: true },
    },
    {
        id: 'jn-tata-endowment',
        name: 'JN Tata Endowment Loan Scholarship',
        provider: 'JN Tata Endowment',
        amount: 'Up to ₹10 Lakhs (Interest-free)',
        deadline: new Date('2026-03-15'),
        eligibility: ['Indian national', 'Graduate study abroad', 'Age 25-35'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        gpaRequired: 3.4,
        applicationUrl: 'https://www.jntataendowment.org/',
        autoApplySupported: false,
        category: 'merit',
        description: 'Prestigious interest-free loan for Indians studying overseas.',
        requirements: { essays: 1, lors: 2, transcript: true, financialDocs: true },
    },

    // ============================================
    // GENERAL INTERNATIONAL SCHOLARSHIPS
    // ============================================
    {
        id: 'fulbright',
        name: 'Fulbright Foreign Student Program',
        provider: 'US Department of State',
        amount: 'Full Funding',
        deadline: new Date('2026-05-01'),
        eligibility: ['International student', 'Graduate study in US'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        gpaRequired: 3.0,
        applicationUrl: 'https://foreign.fulbrightonline.org/',
        autoApplySupported: false,
        category: 'merit',
        description: 'Prestigious US government scholarship for international graduate students.',
        requirements: { essays: 3, lors: 3, transcript: true, financialDocs: false },
    },
    {
        id: 'aauw-fellowship',
        name: 'AAUW International Fellowship',
        provider: 'American Association of University Women',
        amount: '$18,000 - $30,000',
        deadline: new Date('2026-11-15'),
        eligibility: ['Female', 'International', 'Graduate/postdoc in US'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        applicationUrl: 'https://www.aauw.org/resources/programs/fellowships-grants/current-opportunities/international/',
        autoApplySupported: false,
        category: 'diversity',
        description: 'For women pursuing graduate study in the United States.',
        requirements: { essays: 2, lors: 3, transcript: true, financialDocs: false },
    },
    {
        id: 'peo-international',
        name: 'P.E.O. International Peace Scholarship',
        provider: 'P.E.O. Sisterhood',
        amount: 'Up to $12,500',
        deadline: new Date('2026-12-15'),
        eligibility: ['Female', 'International', 'Graduate study in US/Canada'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        applicationUrl: 'https://www.peointernational.org/about-peo-international-peace-scholarship-ips',
        autoApplySupported: false,
        category: 'diversity',
        description: 'For international women pursuing graduate degrees.',
        requirements: { essays: 1, lors: 2, transcript: true, financialDocs: true },
    },
    {
        id: 'rotary-peace',
        name: 'Rotary Peace Fellowship',
        provider: 'Rotary Foundation',
        amount: 'Full Funding',
        deadline: new Date('2026-05-15'),
        eligibility: ['International', 'Peace/conflict resolution focus'],
        forInternational: true,
        forIndian: true,
        forTransfer: false,
        applicationUrl: 'https://www.rotary.org/en/our-programs/peace-fellowships',
        autoApplySupported: false,
        category: 'field',
        majors: ['Peace Studies', 'International Relations', 'Conflict Resolution'],
        description: 'For future peacemakers studying conflict resolution.',
        requirements: { essays: 3, lors: 3, transcript: true, financialDocs: false },
    },

    // ============================================
    // STEM/CS SPECIFIC
    // ============================================
    {
        id: 'google-lime',
        name: 'Google Lime Scholarship',
        provider: 'Google',
        amount: '$10,000',
        deadline: new Date('2026-03-10'),
        eligibility: ['CS/related major', 'Disability', 'US/Canada university'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        gpaRequired: 2.5,
        applicationUrl: 'https://buildyourfuture.withgoogle.com/scholarships/google-lime-scholarship',
        autoApplySupported: false,
        category: 'diversity',
        majors: ['Computer Science', 'Engineering'],
        description: 'For CS students with disabilities.',
        requirements: { essays: 3, lors: 0, transcript: true, financialDocs: false },
    },
    {
        id: 'generation-google',
        name: 'Generation Google Scholarship',
        provider: 'Google',
        amount: '$10,000',
        deadline: new Date('2026-03-15'),
        eligibility: ['CS/related major', 'Underrepresented group in tech'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        gpaRequired: 3.0,
        applicationUrl: 'https://buildyourfuture.withgoogle.com/scholarships',
        autoApplySupported: false,
        category: 'diversity',
        majors: ['Computer Science', 'Software Engineering'],
        description: 'For underrepresented students in CS.',
        requirements: { essays: 3, lors: 0, transcript: true, financialDocs: false },
    },
    {
        id: 'palantir-global-impact',
        name: 'Palantir Global Impact Scholarship',
        provider: 'Palantir',
        amount: '$10,000 + Internship Interview',
        deadline: new Date('2026-04-01'),
        eligibility: ['CS/STEM major', 'Active in community'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        gpaRequired: 3.0,
        applicationUrl: 'https://www.palantir.com/students/scholarship/global-impact/',
        autoApplySupported: false,
        category: 'merit',
        majors: ['Computer Science', 'Engineering', 'Math'],
        description: 'For STEM students making positive community impact.',
        requirements: { essays: 2, lors: 0, transcript: false, financialDocs: false },
    },
    {
        id: 'adobe-research-women',
        name: 'Adobe Research Women-in-Technology Scholarship',
        provider: 'Adobe',
        amount: '$10,000 + Mentorship + Internship',
        deadline: new Date('2026-02-28'),
        eligibility: ['Female', 'CS/related major', 'Undergraduate'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        gpaRequired: 3.0,
        applicationUrl: 'https://research.adobe.com/scholarship/',
        autoApplySupported: false,
        category: 'diversity',
        majors: ['Computer Science', 'Engineering', 'Statistics'],
        description: 'For women in technology fields.',
        requirements: { essays: 2, lors: 1, transcript: true, financialDocs: false },
    },

    // ============================================
    // GENERAL MERIT/AUTO-APPLY FRIENDLY
    // ============================================
    {
        id: 'bold-org',
        name: 'Bold.org Scholarships',
        provider: 'Bold.org',
        amount: '$500 - $25,000 (Various)',
        deadline: new Date('2026-12-31'),
        eligibility: ['Various - check platform'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        applicationUrl: 'https://bold.org/scholarships/',
        autoApplySupported: true,
        category: 'merit',
        description: 'Platform with hundreds of no-essay and quick-apply scholarships.',
        requirements: { essays: 0, lors: 0, transcript: false, financialDocs: false },
    },
    {
        id: 'scholarships-com',
        name: 'Scholarships.com Listings',
        provider: 'Scholarships.com',
        amount: 'Various ($500 - $50,000)',
        deadline: new Date('2026-12-31'),
        eligibility: ['Various'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        applicationUrl: 'https://www.scholarships.com/',
        autoApplySupported: true,
        category: 'merit',
        description: 'Aggregator of thousands of scholarships.',
        requirements: { essays: 0, lors: 0, transcript: false, financialDocs: false },
    },
    {
        id: 'fastweb',
        name: 'Fastweb Scholarships',
        provider: 'Fastweb',
        amount: 'Various',
        deadline: new Date('2026-12-31'),
        eligibility: ['Various'],
        forInternational: true,
        forIndian: true,
        forTransfer: true,
        applicationUrl: 'https://www.fastweb.com/',
        autoApplySupported: true,
        category: 'merit',
        description: 'One of the largest scholarship search engines.',
        requirements: { essays: 0, lors: 0, transcript: false, financialDocs: false },
    },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getScholarshipsForProfile(profile: {
    isInternational: boolean;
    isIndian: boolean;
    isTransfer: boolean;
    gpa: number;
    major: string;
    colleges: string[];
}): Scholarship[] {
    return SCHOLARSHIPS.filter(s => {
        // Basic eligibility
        if (profile.isInternational && !s.forInternational) return false;
        if (profile.isIndian && s.forIndian === false) return false;
        if (profile.isTransfer && !s.forTransfer) return false;
        if (s.gpaRequired && profile.gpa < s.gpaRequired) return false;

        // Major match
        if (s.majors && s.majors.length > 0) {
            const majorMatch = s.majors.some(m =>
                profile.major.toLowerCase().includes(m.toLowerCase())
            );
            if (!majorMatch) return false;
        }

        // Deadline not passed
        if (s.deadline < new Date()) return false;

        return true;
    }).sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
}

export function getCollegeSpecificScholarships(collegeId: string): Scholarship[] {
    return SCHOLARSHIPS.filter(s =>
        s.colleges?.includes(collegeId) ||
        (!s.colleges && s.forInternational)
    );
}

export function getAutoApplyScholarships(): Scholarship[] {
    return SCHOLARSHIPS.filter(s => s.autoApplySupported);
}

export function getIndianScholarships(): Scholarship[] {
    return SCHOLARSHIPS.filter(s => s.forIndian);
}

export const TOTAL_SCHOLARSHIPS = SCHOLARSHIPS.length;
export const INDIA_SPECIFIC_COUNT = SCHOLARSHIPS.filter(s => s.forIndian).length;
export const AUTO_APPLY_COUNT = SCHOLARSHIPS.filter(s => s.autoApplySupported).length;
