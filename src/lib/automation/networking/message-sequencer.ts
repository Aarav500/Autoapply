
export interface OutreachCampaign {
    connectionRequest: string;
    followUp1: string; // 3-5 days later
    followUp2: string; // 7-10 days later
}

// Templates
const TEMPLATES = {
    recruiter: {
        intro: "Hi {firstName}, I saw you're hiring for {role} roles. I've been building apps with Next.js and would love to share my portfolio. Open to connecting?",
        followUp1: "Hi {firstName}, just bubbling this up. I recently shipped a project using {skill} that might be relevant to your team.",
        followUp2: "Hi {firstName}, last attempt here - if you're not the right person, could you point me to who handles engineering hiring?"
    },
    peer: {
        intro: "Hi {firstName}, I saw your work at {company} and I'm also exploring {industry}. Would love to connect and follow your journey!",
        followUp1: "Hi {firstName}, hope you're having a great week. I'm curious how you handled {challenge} at {company}?",
        followUp2: "" // Usually don't double pester peers
    },
    alumni: {
        intro: "Hi {firstName}, I'm a fellow UCR student majoring in CS. I see you're working at {company} - would love to connect and learn from your path!",
        followUp1: "Hi {firstName}, wanted to share a quick update - I just finished a project relevant to what {company} does.",
        followUp2: "Hi {firstName}, no pressure to reply, but if you ever have 5 mins for a fellow Highlander, I'd appreciate any advice."
    }
};

export class MessageSequencer {

    static generateSequence(lead: { name: string, headline?: string, company?: string }): OutreachCampaign {
        const firstName = lead.name.split(' ')[0];
        const isRecruiter = lead.headline?.toLowerCase().includes('recruiter') || lead.headline?.toLowerCase().includes('talent');
        const isAlumni = false; // Need logic to check school match

        let template = TEMPLATES.peer;
        if (isRecruiter) template = TEMPLATES.recruiter;
        else if (isAlumni) template = TEMPLATES.alumni;

        return {
            connectionRequest: this.fill(template.intro, lead, firstName),
            followUp1: this.fill(template.followUp1, lead, firstName),
            followUp2: this.fill(template.followUp2, lead, firstName)
        };
    }

    private static fill(text: string, lead: any, firstName: string): string {
        if (!text) return '';
        return text
            .replace('{firstName}', firstName)
            .replace('{company}', lead.company || 'your company')
            .replace('{role}', 'Software Engineer') // heuristic
            .replace('{skill}', 'React/Next.js') // heuristic
            .replace('{industry}', 'Tech') // heuristic
            .replace('{challenge}', 'scaling'); // heuristic
    }
}
