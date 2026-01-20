import { ProfileGraph, ValidatedEducation, ActivitySchema } from '../profile-schema';

type Activity = ProfileGraph['workExperience'][0];

export class ProfileGenerator {

    /**
     * Generates a strong LinkedIn headline:
     * "{Role} | {Key Skills} | {Mission/Value Prop}"
     */
    static generateHeadline(graph: ProfileGraph, targetRole: string = 'Software Engineer'): string {
        const topSkills = graph.skills
            .filter(s => s.proficiency === 'advanced' || s.proficiency === 'expert')
            .map(s => s.skillName)
            .slice(0, 3)
            .join(' • ');

        const school = graph.education[0]?.school ? `Student at ${graph.education[0].school}` : '';

        return `${targetRole} | ${topSkills} | ${school}`;
    }

    /**
     * Generates an About section using the "Hook -> Story -> Skills -> Call to Action" formula
     */
    static generateAbout(graph: ProfileGraph): string {
        const skillsBlock = graph.skills
            .map(s => s.skillName)
            .join(', ');

        return `
I am a ${graph.education[0]?.major || 'student'} passionate about building software that solves real problems.

CURRENTLY:
Student at ${graph.education[0]?.school}, focusing on ${graph.skills.slice(0, 2).map(s => s.skillName).join(' and ')}.

SKILLS:
${skillsBlock}

Open to new opportunities in software engineering. Connect with me!
        `.trim();
    }

    /**
     * Generates a bulleted experience block for an activity.
     * Uses strict "Action Verb + Task + Result" formatting if data allows.
     */
    static generateExperienceBlock(activity: Activity): string {
        const startDate = activity.startDate instanceof Date ? activity.startDate.toISOString() : activity.startDate;
        const endDate = activity.endDate instanceof Date ? activity.endDate.toISOString() : activity.endDate;
        const dateRange = `${startDate.split('T')[0]} - ${endDate ? endDate.split('T')[0] : 'Present'}`;

        // Simple template for now - can be enhanced with LLM later
        let content = `${activity.role} | ${activity.organization}\n${dateRange}\n\n`;

        if (activity.description) {
            content += activity.description;
        } else {
            content += `• Contributed to ${activity.name} as a ${activity.role}.\n`;
            if (activity.skills && activity.skills.length > 0) {
                content += `• Utilized: ${activity.skills.join(', ')}`;
            }
        }

        return content;
    }

    /**
     * Analyzes keyword coverage against a target job description or role.
     * Returns a score (0-100) and missing keywords.
     */
    static analyzeKeywordCoverage(text: string, targetKeywords: string[]): { score: number, missing: string[] } {
        const lowerText = text.toLowerCase();
        const missing: string[] = [];
        let found = 0;

        for (const keyword of targetKeywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                found++;
            } else {
                missing.push(keyword);
            }
        }

        const score = Math.floor((found / targetKeywords.length) * 100);
        return { score, missing };
    }
}
