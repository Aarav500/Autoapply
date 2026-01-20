// ============================================
// ENHANCED DOCUMENT GENERATOR
// Generates CVs, essays, cover letters with audit trails
// ============================================

import {
    JobListing,
    ScholarshipListing,
    ApplicationDocument,
    EssayPrompt,
    GeneratedDocumentResult,
    ClaimReference,
    UnifiedOpportunity
} from './opportunity-types';
import {
    UserProfile,
    DEFAULT_PROFILE,
    Activity,
    Achievement
} from './user-profile';

// ============================================
// DOCUMENT VERSION TRACKING
// ============================================

interface DocumentVersion {
    version: number;
    content: string;
    created_at: string;
    diff_summary?: string;
}

interface StoredGeneratedDocument {
    id: string;
    opportunity_id: string;
    type: ApplicationDocument;
    versions: DocumentVersion[];
    claims_used: ClaimReference[];
    placeholders: string[];
    current_version: number;
}

// In-memory store (would be S3 persisted in production)
const documentVersionStore: Map<string, StoredGeneratedDocument> = new Map();

// ============================================
// CLAIM EXTRACTION
// ============================================

function extractClaimsFromProfile(profile: UserProfile): ClaimReference[] {
    const claims: ClaimReference[] = [];

    // Profile claims
    claims.push({ claim: `Name: ${profile.fullName}`, source: 'profile' });
    claims.push({ claim: `Email: ${profile.email}`, source: 'profile' });
    claims.push({ claim: `Phone: ${profile.phone}`, source: 'profile' });
    claims.push({ claim: `School: ${profile.school}`, source: 'profile' });
    claims.push({ claim: `Major: ${profile.major}`, source: 'profile' });
    claims.push({ claim: `GPA: ${profile.gpa}`, source: 'grades' });
    claims.push({ claim: `Graduation: ${profile.graduationMonth} ${profile.graduationYear}`, source: 'profile' });

    // Skills
    profile.skills.forEach(skill => {
        claims.push({ claim: `Skill: ${skill}`, source: 'cv', source_detail: 'Skills section' });
    });

    // Work experience
    profile.workExperience?.forEach(exp => {
        claims.push({
            claim: `Work: ${exp.role} at ${exp.company}`,
            source: 'cv',
            source_detail: 'Experience section'
        });
    });

    // Activities
    profile.activities?.forEach(act => {
        claims.push({
            claim: `Activity: ${act.name} - ${act.role || act.type}`,
            source: 'activities'
        });
    });

    // Achievements
    profile.achievements?.forEach(ach => {
        claims.push({
            claim: `Achievement: ${ach.title}`,
            source: 'achievements'
        });
    });

    return claims;
}

function findMissingClaims(
    requiredFields: string[],
    profile: UserProfile
): string[] {
    const placeholders: string[] = [];

    // Check for common missing fields
    if (!profile.phone || profile.phone === '') {
        placeholders.push('[PLACEHOLDER: Add your phone number]');
    }
    if (!profile.address || profile.address === '') {
        placeholders.push('[PLACEHOLDER: Add your address]');
    }
    if (profile.workExperience.length === 0) {
        placeholders.push('[PLACEHOLDER: Add relevant work experience or projects]');
    }

    return placeholders;
}

// ============================================
// ATS OPTIMIZATION
// ============================================

function extractATSKeywords(job: JobListing): string[] {
    const keywords = new Set<string>();

    // From required skills
    job.required_skills.forEach(s => keywords.add(s.toLowerCase()));

    // From preferred skills
    job.preferred_skills.forEach(s => keywords.add(s.toLowerCase()));

    // From qualifications
    job.qualifications.forEach(q => {
        // Extract technical terms
        const techTerms = q.match(/\b(?:Python|JavaScript|TypeScript|React|Node|AWS|SQL|Java|C\+\+|Git|Docker|Kubernetes|Machine Learning|AI|Data|Cloud)\b/gi);
        techTerms?.forEach(t => keywords.add(t.toLowerCase()));
    });

    return Array.from(keywords);
}

function optimizeForATS(content: string, keywords: string[]): string {
    // Ensure key terms appear in the document
    // This is a simple implementation - could be enhanced
    let optimized = content;

    // Add a skills section if not present
    if (!content.toLowerCase().includes('technical skills') && !content.toLowerCase().includes('skills')) {
        const relevantKeywords = keywords.slice(0, 10).join(' • ');
        optimized += `\n\n## Technical Skills\n${relevantKeywords}`;
    }

    return optimized;
}

// ============================================
// CV/RESUME GENERATION
// ============================================

export function generateEnhancedCV(
    opportunity: UnifiedOpportunity,
    profile: UserProfile = DEFAULT_PROFILE
): { content: string; claims: ClaimReference[]; placeholders: string[] } {
    const claims = extractClaimsFromProfile(profile);
    const placeholders = findMissingClaims([], profile);

    const isJob = opportunity.type === 'job';
    const job = opportunity.job_data;
    const scholarship = opportunity.scholarship_data;

    // Extract relevant skills based on opportunity
    const relevantSkills = isJob && job
        ? profile.skills.filter(skill =>
            job.required_skills.some(rs => rs.toLowerCase().includes(skill.toLowerCase())) ||
            job.preferred_skills.some(ps => ps.toLowerCase().includes(skill.toLowerCase()))
        )
        : profile.skills.slice(0, 10);

    // Build objective based on opportunity type
    const objective = isJob && job
        ? `Seeking the ${job.title} position at ${job.company} to leverage expertise in ${relevantSkills.slice(0, 3).join(', ') || 'software development'}.`
        : `Motivated ${profile.major} student at ${profile.school} seeking opportunities to apply academic knowledge and contribute meaningfully.`;

    // Work experience section
    const experienceSection = profile.workExperience.length > 0
        ? profile.workExperience.map(exp =>
            `**${exp.role}** | ${exp.company} | ${exp.startDate} - ${exp.current ? 'Present' : exp.endDate}\n${exp.description}`
        ).join('\n\n')
        : placeholders.some(p => p.includes('experience'))
            ? '[PLACEHOLDER: Add relevant work experience, internships, or projects]'
            : '• Seeking first professional experience in the field';

    // Activities section
    const activitiesSection = profile.activities && profile.activities.length > 0
        ? profile.activities.slice(0, 4).map(act =>
            `**${act.name}** | ${act.organization || ''} | ${act.role || act.type}\n${act.description}`
        ).join('\n\n')
        : '';

    // Achievements section
    const achievementsSection = profile.achievements && profile.achievements.length > 0
        ? profile.achievements.slice(0, 3).map(ach =>
            `• **${ach.title}** - ${ach.issuer || ''} (${ach.date})`
        ).join('\n')
        : '';

    let cv = `
# ${profile.fullName}
${profile.email} | ${profile.phone || '[PLACEHOLDER: Phone]'} | ${profile.city}, ${profile.state}
${profile.linkedIn}${profile.github ? ` | ${profile.github}` : ''}${profile.portfolio ? ` | ${profile.portfolio}` : ''}

---

## Objective
${objective}

---

## Education
**${profile.school}**
${profile.degree} in ${profile.major} | Expected ${profile.graduationMonth} ${profile.graduationYear}
GPA: ${profile.gpa}/4.0

---

## Technical Skills
${profile.skills.join(' • ')}

---

## Experience
${experienceSection}
${activitiesSection ? `\n---\n\n## Activities & Leadership\n${activitiesSection}` : ''}
${achievementsSection ? `\n---\n\n## Achievements\n${achievementsSection}` : ''}

---

## Languages
${profile.languages.join(', ')}
`.trim();

    // ATS optimization for jobs
    if (isJob && job) {
        const atsKeywords = extractATSKeywords(job);
        cv = optimizeForATS(cv, atsKeywords);
    }

    return { content: cv, claims, placeholders };
}

// ============================================
// COVER LETTER GENERATION
// ============================================

export function generateEnhancedCoverLetter(
    opportunity: UnifiedOpportunity,
    profile: UserProfile = DEFAULT_PROFILE
): { content: string; claims: ClaimReference[]; placeholders: string[] } {
    const claims = extractClaimsFromProfile(profile);
    const placeholders: string[] = [];

    if (opportunity.type !== 'job' || !opportunity.job_data) {
        return {
            content: '',
            claims,
            placeholders: ['Cover letter only generated for job opportunities']
        };
    }

    const job = opportunity.job_data;

    // Find matching skills
    const matchedSkills = profile.skills.filter(skill =>
        job.required_skills.some(rs => rs.toLowerCase().includes(skill.toLowerCase())) ||
        job.preferred_skills.some(ps => ps.toLowerCase().includes(skill.toLowerCase()))
    );

    // Build qualifications bullets
    const qualificationBullets = job.qualifications.slice(0, 3).map(qual => {
        // Try to match with user's experience
        const hasRelated = profile.skills.some(s => qual.toLowerCase().includes(s.toLowerCase()));
        return hasRelated
            ? `• Demonstrated experience with ${qual.split(' ').slice(0, 4).join(' ')}`
            : `• Eager to develop skills in ${qual.split(' ').slice(0, 4).join(' ')}`;
    }).join('\n');

    const letter = `
${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

${profile.fullName}
${profile.address || '[PLACEHOLDER: Your address]'}
${profile.city}, ${profile.state} ${profile.zipCode}
${profile.email}
${profile.phone || '[PLACEHOLDER: Your phone]'}

Hiring Manager
${job.company}
${job.locations[0] || ''}

Dear Hiring Manager,

I am writing to express my strong interest in the **${job.title}** position at **${job.company}**. As a ${profile.major} student at ${profile.school} with expertise in ${matchedSkills.slice(0, 3).join(', ') || profile.skills.slice(0, 3).join(', ')}, I am excited about the opportunity to contribute to your team.

${job.description.split('.')[0]}. This mission resonates deeply with me, and I am eager to bring my technical skills and fresh perspective to ${job.company}.

**Key qualifications I bring:**
${qualificationBullets}

My academic background at ${profile.school}, where I maintain a ${profile.gpa} GPA, has equipped me with strong foundations in ${profile.skills.slice(0, 2).join(' and ')}. ${profile.workExperience.length > 0
            ? `Additionally, my experience as ${profile.workExperience[0].role} at ${profile.workExperience[0].company} has prepared me to contribute effectively from day one.`
            : `I am eager to apply my academic knowledge in a professional setting and grow alongside experienced professionals.`}

${job.visa_work_auth?.sponsors_visa
            ? 'I am pleased to note that visa sponsorship is available, which aligns with my work authorization needs.'
            : ''}

I am confident that my technical skills, combined with my passion for continuous learning, make me a strong candidate for this role. I would welcome the opportunity to discuss how I can contribute to ${job.company}'s success.

Thank you for considering my application. I look forward to hearing from you.

Sincerely,

${profile.fullName}
${profile.email}
${profile.phone || '[PLACEHOLDER: Phone]'}
`.trim();

    // Track placeholders
    if (!profile.address) placeholders.push('[PLACEHOLDER: Your address]');
    if (!profile.phone) placeholders.push('[PLACEHOLDER: Your phone]');

    return { content: letter, claims, placeholders };
}

// ============================================
// ESSAY GENERATION
// ============================================

export function generateScholarshipEssay(
    scholarship: ScholarshipListing,
    prompt: EssayPrompt,
    profile: UserProfile = DEFAULT_PROFILE
): { content: string; claims: ClaimReference[]; placeholders: string[] } {
    const claims = extractClaimsFromProfile(profile);
    const placeholders: string[] = [];
    const wordLimit = prompt.word_limit || 500;

    // Generic essay template that can be customized
    const isTransferStudent = profile.constraints?.isTransferStudent;
    const isFirstGen = profile.constraints?.isFirstGen;
    const isInternational = profile.citizenship !== 'United States';

    // Personalization elements
    const personalBackground = isInternational
        ? `As an international student from ${profile.citizenship}, I bring a unique global perspective to my academic pursuits.`
        : isFirstGen
            ? `As a first-generation college student, I understand the transformative power of education.`
            : `Throughout my academic journey, I have been driven by a passion for ${profile.major.toLowerCase()}.`;

    // Activities mention
    const activityMention = profile.activities && profile.activities.length > 0
        ? `My involvement in ${profile.activities[0].name} has taught me ${profile.activities[0].description.split('.')[0].toLowerCase()}.`
        : '[PLACEHOLDER: Mention a relevant activity or experience]';

    // Achievement mention
    const achievementMention = profile.achievements && profile.achievements.length > 0
        ? `I am proud to have achieved ${profile.achievements[0].title}, which demonstrates my commitment to excellence.`
        : '';

    let essay = `
${personalBackground}

As a ${profile.major} student at ${profile.school} with a ${profile.gpa} GPA, I am deeply committed to leveraging technology and innovation to solve real-world problems. The ${scholarship.scholarship_name} from ${scholarship.sponsor} aligns perfectly with my academic journey and career aspirations.

${activityMention}

My technical foundation in ${profile.skills.slice(0, 3).join(', ')} has prepared me to tackle complex challenges. At ${profile.school}, I've developed both theoretical knowledge and practical skills through rigorous coursework and hands-on projects.

${achievementMention}

${isTransferStudent
            ? `As a transfer student, I have demonstrated resilience and adaptability. My journey through the community college system has given me a unique appreciation for diverse learning environments and the importance of perseverance.`
            : ''}

This scholarship would directly support my goal of completing my degree and pursuing innovation in ${profile.major.toLowerCase()}. ${isInternational
            ? `As an international student, financial support is crucial to continuing my education in the United States.`
            : 'Financial support would allow me to focus fully on my studies and professional development.'}

I am eager to represent ${scholarship.sponsor} as a scholarship recipient and to contribute meaningfully to my field. Thank you for considering my application.
`.trim();

    // Respect word limit
    const words = essay.split(/\s+/);
    if (words.length > wordLimit) {
        essay = words.slice(0, wordLimit).join(' ') + '...';
        placeholders.push(`[NOTE: Essay truncated to ${wordLimit} words - please expand or refine]`);
    }

    // Track placeholders
    if (!profile.activities || profile.activities.length === 0) {
        placeholders.push('[PLACEHOLDER: Mention a relevant activity or experience]');
    }

    return { content: essay, claims, placeholders };
}

// ============================================
// RECOMMENDATION LETTER TEMPLATE
// ============================================

export function generateLORTemplate(
    opportunity: UnifiedOpportunity,
    recommenderType: 'professor' | 'employer' | 'mentor',
    profile: UserProfile = DEFAULT_PROFILE
): { content: string; claims: ClaimReference[]; placeholders: string[] } {
    const claims = extractClaimsFromProfile(profile);
    const placeholders: string[] = [];

    const recommenderIntro = {
        professor: `I am writing to enthusiastically recommend ${profile.fullName} for [SCHOLARSHIP/POSITION NAME]. As a professor at ${profile.school}, I have had the pleasure of teaching ${profile.firstName} in [COURSE NAME] during [SEMESTER].`,
        employer: `I am pleased to recommend ${profile.fullName} for [SCHOLARSHIP/POSITION NAME]. As ${profile.firstName}'s supervisor at [COMPANY NAME], I have observed their exceptional work ethic and technical abilities firsthand.`,
        mentor: `It is my privilege to recommend ${profile.fullName} for [SCHOLARSHIP/POSITION NAME]. I have had the opportunity to mentor ${profile.firstName} through [PROGRAM/ACTIVITY], and I have been consistently impressed by their dedication and growth.`,
    };

    const template = `
[RECOMMENDER NAME]
[TITLE/POSITION]
[INSTITUTION/COMPANY]
[EMAIL]
[DATE]

To Whom It May Concern,

${recommenderIntro[recommenderType]}

${profile.firstName} has demonstrated exceptional aptitude in ${profile.major}, maintaining a ${profile.gpa} GPA while actively engaging in coursework and extracurricular activities. What sets ${profile.firstName} apart is [SPECIFIC QUALITY OR ACHIEVEMENT - please personalize].

[SPECIFIC ANECDOTE OR EXAMPLE - please add a concrete story demonstrating the student's abilities]

${profile.firstName}'s technical skills in ${profile.skills.slice(0, 3).join(', ')} are complemented by strong communication abilities and a genuine curiosity for learning. They consistently [POSITIVE TRAIT - please specify].

I am confident that ${profile.fullName} will excel in ${opportunity.title} at ${opportunity.organization}. ${profile.firstName} has my highest recommendation, and I believe they will be an asset to any program or organization fortunate enough to have them.

Please do not hesitate to contact me if you require any additional information.

Sincerely,

[RECOMMENDER NAME]
[TITLE]
[CONTACT INFORMATION]
`.trim();

    placeholders.push('[SCHOLARSHIP/POSITION NAME]');
    placeholders.push('[RECOMMENDER NAME]');
    placeholders.push('[COURSE NAME] or [PROGRAM/ACTIVITY]');
    placeholders.push('[SPECIFIC QUALITY OR ACHIEVEMENT]');
    placeholders.push('[SPECIFIC ANECDOTE OR EXAMPLE]');

    return { content: template, claims, placeholders };
}

// ============================================
// MAIN GENERATION FUNCTION
// ============================================

export function generateDocumentsForOpportunity(
    opportunity: UnifiedOpportunity,
    profile: UserProfile = DEFAULT_PROFILE,
    documentsToGenerate?: ApplicationDocument[]
): GeneratedDocumentResult {
    const result: GeneratedDocumentResult = {
        opportunity_id: opportunity.id,
        documents: [],
    };

    const docsToGen = documentsToGenerate || opportunity.required_documents;

    // Generate CV/Resume
    if (docsToGen.includes('resume')) {
        const cv = generateEnhancedCV(opportunity, profile);
        result.documents.push({
            type: 'resume',
            id: `cv_${opportunity.id}_${Date.now()}`,
            content: cv.content,
            claims_used: cv.claims,
            placeholders: cv.placeholders,
            version: 1,
            created_at: new Date().toISOString(),
        });
    }

    // Generate Cover Letter (jobs only)
    if (docsToGen.includes('cover_letter') && opportunity.type === 'job') {
        const coverLetter = generateEnhancedCoverLetter(opportunity, profile);
        result.documents.push({
            type: 'cover_letter',
            id: `cover_${opportunity.id}_${Date.now()}`,
            content: coverLetter.content,
            claims_used: coverLetter.claims,
            placeholders: coverLetter.placeholders,
            version: 1,
            created_at: new Date().toISOString(),
        });
    }

    // Generate Essays (scholarships only)
    if (docsToGen.includes('essay') && opportunity.type === 'scholarship' && opportunity.scholarship_data) {
        const scholarship = opportunity.scholarship_data;
        const prompts = scholarship.essay_prompts || [{
            id: 'default',
            prompt: 'Why do you deserve this scholarship?',
            word_limit: 500,
            required: true,
        }];

        prompts.forEach((prompt, index) => {
            const essay = generateScholarshipEssay(scholarship, prompt, profile);
            result.documents.push({
                type: 'essay',
                id: `essay_${opportunity.id}_${index}_${Date.now()}`,
                content: `## Prompt: ${prompt.prompt}\n\n${essay.content}`,
                claims_used: essay.claims,
                placeholders: essay.placeholders,
                version: 1,
                created_at: new Date().toISOString(),
            });
        });
    }

    // Generate LOR templates if needed
    if (docsToGen.includes('lor')) {
        const lorTemplate = generateLORTemplate(opportunity, 'professor', profile);
        result.documents.push({
            type: 'lor',
            id: `lor_template_${opportunity.id}_${Date.now()}`,
            content: lorTemplate.content,
            claims_used: lorTemplate.claims,
            placeholders: lorTemplate.placeholders,
            version: 1,
            created_at: new Date().toISOString(),
        });
    }

    return result;
}

// ============================================
// VERSION MANAGEMENT
// ============================================

export function saveDocumentVersion(
    docId: string,
    content: string,
    opportunityId: string,
    type: ApplicationDocument,
    claims: ClaimReference[],
    placeholders: string[]
): StoredGeneratedDocument {
    const existing = documentVersionStore.get(docId);
    const newVersion: DocumentVersion = {
        version: existing ? existing.current_version + 1 : 1,
        content,
        created_at: new Date().toISOString(),
        diff_summary: existing ? 'Content updated' : 'Initial version',
    };

    if (existing) {
        existing.versions.push(newVersion);
        existing.current_version = newVersion.version;
        existing.claims_used = claims;
        existing.placeholders = placeholders;
        return existing;
    }

    const newDoc: StoredGeneratedDocument = {
        id: docId,
        opportunity_id: opportunityId,
        type,
        versions: [newVersion],
        claims_used: claims,
        placeholders,
        current_version: 1,
    };

    documentVersionStore.set(docId, newDoc);
    return newDoc;
}

export function getDocumentVersions(docId: string): DocumentVersion[] | null {
    return documentVersionStore.get(docId)?.versions || null;
}

export function getDocumentVersion(docId: string, version?: number): string | null {
    const doc = documentVersionStore.get(docId);
    if (!doc) return null;

    const targetVersion = version || doc.current_version;
    const versionData = doc.versions.find(v => v.version === targetVersion);
    return versionData?.content || null;
}
