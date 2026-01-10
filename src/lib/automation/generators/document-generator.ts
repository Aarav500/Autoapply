import { ProfileGraph } from '../profile-schema';
import { ProfileGenerator } from './profile-generator';

export class DocumentGenerator {

    /**
     * Generates a tailored Cover Letter.
     */
    static generateCoverLetter(graph: ProfileGraph, jobTitle: string, company: string, jobDescription: string): string {
        // 1. Analyze Job to find top skills needed
        // Simulating extraction for now. In real app, run NLP on jobDescription.
        const relevantSkills = graph.skills
            .filter(s => jobDescription.toLowerCase().includes(s.skillName.toLowerCase()))
            .map(s => s.skillName);

        const topSkill = relevantSkills[0] || graph.skills[0]?.skillName || 'Software Engineering';

        return `
Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle} position at ${company}. As a student at ${graph.education[0]?.school} majoring in ${graph.education[0]?.major}, I have built a strong foundation in ${topSkill}.

${this.generateBodyParagraph(graph, relevantSkills)}

My experience at ${graph.workExperience[0]?.organization || 'my recent projects'} has taught me the value of shipping high-quality code. I am excited about ${company}'s mission and would love to bring my skills in ${relevantSkills.join(', ')} to your team.

Thank you for your time and consideration.

Sincerely,
${graph.fullName}
${graph.email}
        `.trim();
    }

    private static generateBodyParagraph(graph: ProfileGraph, relevantSkills: string[]): string {
        // Find the most relevant activity
        const bestActivity = [...graph.workExperience, ...graph.projects].find(a =>
            a.skills && a.skills.some(s => relevantSkills.includes(s))
        );

        if (bestActivity) {
            return `At ${bestActivity.organization}, I served as a ${bestActivity.role} where I ${bestActivity.description}. This experience honed my ability to deliver results using ${relevantSkills.slice(0, 3).join(', ')}.`;
        } else {
            return `Through my academic projects, I have demonstrated proficiency in ${relevantSkills.slice(0, 3).join(', ')}, consistently solving complex problems.`;
        }
    }

    /**
     * Generates a "Resume Object" that can be rendered to PDF.
     * Selects only relevant experience to keep it 1-page.
     */
    static generateTailoredResumeData(graph: ProfileGraph, jobDescription: string) {
        // Simple ranking: Count keyword matches in activity description
        const scoredActivities = [...graph.workExperience, ...graph.projects].map(act => {
            const score = ProfileGenerator.analyzeKeywordCoverage(act.description + ' ' + (act.skills?.join(' ') || ''), jobDescription.split(' ')).score;
            return { activity: act, score };
        });

        // Sort by score and take top 5
        const topActivities = scoredActivities
            .sort((a, b) => b.score - a.score)
            .slice(0, 5)
            .map(item => item.activity);

        return {
            header: {
                name: graph.fullName,
                contact: `${graph.email} | ${graph.education[0]?.school}`,
                links: [graph.leads?.[0]?.profileUrl].filter(Boolean)
            },
            education: graph.education,
            skills: graph.skills.map(s => s.skillName),
            experience: topActivities.map(act => ({
                title: act.role,
                company: act.organization,
                date: `${act.startDate.split('T')[0]}`,
                bullets: [
                    ProfileGenerator.generateExperienceBlock(act) // Use the "Action-Result" generator
                ]
            }))
        };
    }
}
