// ============================================
// CONTENT TAILORING APIs
// Generate CV, essays, cover letters for opportunities
// ============================================

import { Opportunity } from './opportunity-store';
import { UserProfile, DEFAULT_PROFILE } from './user-profile';

export interface TailoredContent {
    cv: string;
    essay?: string;
    coverLetter?: string;
}

// Generate tailored CV for an opportunity
export function generateTailoredCV(opportunity: Opportunity, profile: UserProfile = DEFAULT_PROFILE): string {
    const { type, title, organization, requirements } = opportunity;

    // Highlight relevant skills based on requirements
    const relevantSkills = profile.skills.filter(skill =>
        requirements.some(req => req.toLowerCase().includes(skill.toLowerCase()))
    );

    // Get relevant activities
    const relevantActivities = profile.activities?.slice(0, 3) || [];

    const cv = `
# ${profile.fullName}
${profile.email} | ${profile.phone} | ${profile.linkedIn}

## Objective
${type === 'job'
            ? `Seeking ${title} position at ${organization} to leverage my expertise in ${relevantSkills.slice(0, 3).join(', ')}.`
            : `Passionate ${profile.major} student at ${profile.school} applying for the ${title}.`
        }

## Education
**${profile.school}**
${profile.degree} in ${profile.major} | Expected ${profile.graduationMonth} ${profile.graduationYear}
GPA: ${profile.gpa}/4.0

## Technical Skills
${profile.skills.join(' • ')}

## Relevant Experience
${(profile.workExperience && profile.workExperience.length > 0)
            ? profile.workExperience.map(w => `**${w.role}** at ${w.company}\n${w.description}`).join('\n\n')
            : (relevantActivities.length > 0)
                ? relevantActivities.map(a => `**${a.role || 'Member'}** | ${a.name}\n${a.description}`).join('\n\n')
                : '• Academic projects in ' + relevantSkills.slice(0, 3).join(', ')
        }

## Languages
${profile.languages.join(', ')}
`.trim();

    return cv;
}

// Generate tailored essay for an opportunity
export function generateTailoredEssay(
    opportunity: Opportunity,
    prompt: string = 'Why do you deserve this opportunity?',
    profile: UserProfile = DEFAULT_PROFILE
): string {
    const { title, organization, type, description } = opportunity;

    // Find most impactful activity
    const impactfulActivity = profile.activities && profile.activities.length > 0
        ? profile.activities[0]
        : null;

    const essay = `
As a ${profile.major} student at ${profile.school} with a ${profile.gpa} GPA, I am deeply passionate about leveraging technology to solve real-world problems. ${type === 'scholarship'
            ? `The ${title} from ${organization} aligns perfectly with my academic journey and career aspirations.`
            : `The ${title} role at ${organization} represents an exciting opportunity to contribute to ${description.toLowerCase()}.`
        }

My technical foundation in ${profile.skills.slice(0, 3).join(', ')} has prepared me to tackle complex challenges. ${impactfulActivity
            ? `Through my involvement in ${impactfulActivity.name}, I ${impactfulActivity.description.toLowerCase().split('.')[0]}. This experience ran parallel to my coursework at ${profile.school}, where I've developed`
            : `At ${profile.school}, I've developed`
        } both theoretical knowledge and practical skills through rigorous coursework and hands-on projects.

${type === 'scholarship'
            ? `This scholarship would directly support my goal of completing my degree and pursuing innovation in the tech industry. As a ${profile.citizenship} student in the United States, I am committed to making the most of every educational opportunity.`
            : `I am particularly excited about ${organization}'s commitment to ${description.split('.')[0].toLowerCase()}. My background in ${profile.skills.slice(0, 2).join(' and ')} makes me well-suited to contribute from day one.`
        }

I am eager to bring my dedication, technical skills, and fresh perspective to ${organization}. Thank you for considering my application.
`.trim();

    return essay;
}

// Generate tailored cover letter for a job
export function generateTailoredCoverLetter(
    opportunity: Opportunity,
    profile: UserProfile = DEFAULT_PROFILE
): string {
    const { title, organization, requirements, description } = opportunity;

    const relevantSkills = profile.skills.filter(skill =>
        requirements.some(req => req.toLowerCase().includes(skill.toLowerCase()))
    );

    const letter = `
Dear Hiring Manager,

I am writing to express my strong interest in the ${title} position at ${organization}. As a ${profile.major} student at ${profile.school} with expertise in ${relevantSkills.slice(0, 3).join(', ')}, I am excited about the opportunity to contribute to your team.

${description} — this mission resonates deeply with me. My academic background has equipped me with strong foundations in ${profile.skills.slice(0, 2).join(' and ')}, and I am eager to apply these skills in a professional setting.

Key qualifications I bring:
${requirements.slice(0, 3).map(req => `• Experience with ${req}`).join('\n')}

I am confident that my technical skills, combined with my passion for continuous learning, make me a strong candidate for this role. I would welcome the opportunity to discuss how I can contribute to ${organization}'s success.

Thank you for considering my application.

Sincerely,
${profile.fullName}
${profile.email}
${profile.phone}
`.trim();

    return letter;
}

// Generate all tailored content for an opportunity
export function generateAllContent(
    opportunity: Opportunity,
    profile: UserProfile = DEFAULT_PROFILE
): TailoredContent {
    return {
        cv: generateTailoredCV(opportunity, profile),
        essay: opportunity.type === 'scholarship'
            ? generateTailoredEssay(opportunity, undefined, profile)
            : undefined,
        coverLetter: opportunity.type === 'job'
            ? generateTailoredCoverLetter(opportunity, profile)
            : undefined,
    };
}
