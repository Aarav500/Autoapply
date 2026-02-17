export interface EmailAnalyzerInput {
  subject: string;
  body: string;
  sender: {
    email: string;
    name?: string;
  };
  context?: {
    appliedJobs?: Array<{
      company: string;
      role: string;
      appliedDate: string;
    }>;
    activeInterviews?: Array<{
      company: string;
      role: string;
      stage: string;
    }>;
  };
}

export function emailAnalyzerPrompt(input: EmailAnalyzerInput): { system: string; user: string } {
  const system = `You are an expert email analyst specializing in job search communications. Your role is to quickly categorize emails, extract actionable information, and assess urgency for job seekers.

Email categories:
1. interview_invite: Email scheduling or inviting to interview (phone screen, technical, onsite, etc.)
2. rejection: Application declined, not moving forward
3. recruiter_outreach: Initial contact from recruiter about opportunities
4. follow_up: Follow-up on previous application or interview
5. offer: Job offer or offer-related communication
6. action_required: Needs response or action (complete assessment, provide documents, etc.)
7. other: General correspondence, confirmations, updates

Extraction priorities:
- Company name (look in signature, domain, email body)
- Role/position title
- Interview dates/times (convert to ISO format if possible)
- Interview type (phone, video, onsite, technical)
- Interviewer names and titles
- Links (video call links, calendly, application portals, assessments)
- Deadlines for responses or actions
- Next steps mentioned

Urgency assessment:
- HIGH: Interview invite, offer, urgent action needed (deadline within 48h)
- MEDIUM: Follow-up, assessment request, action needed (deadline 3+ days)
- LOW: General updates, confirmations, informational

For suggested_response:
- Keep it brief (2-3 sentences max)
- Professional but warm tone
- For interview invites: express enthusiasm, confirm availability or suggest alternatives
- For rejections: gracious, brief acknowledgment
- For recruiter outreach: express interest, highlight relevant experience
- For action_required: confirm you'll complete by deadline`;

  const contextInfo = input.context
    ? `
CONTEXT (Recent Applications & Interviews):
${input.context.appliedJobs && input.context.appliedJobs.length > 0 ? `Recent Applications:\n${input.context.appliedJobs.map(job => `- ${job.role} at ${job.company} (applied ${job.appliedDate})`).join('\n')}` : ''}

${input.context.activeInterviews && input.context.activeInterviews.length > 0 ? `Active Interviews:\n${input.context.activeInterviews.map(interview => `- ${interview.role} at ${interview.company} (${interview.stage})`).join('\n')}` : ''}`
    : '';

  const user = `Analyze this job-related email and extract key information:

FROM: ${input.sender.name || input.sender.email} <${input.sender.email}>
SUBJECT: ${input.subject}

BODY:
${input.body}
${contextInfo}

Provide:
1. category: The email type (interview_invite/rejection/recruiter_outreach/follow_up/offer/action_required/other)
2. extracted_data:
   - company: Company name (or null if not found)
   - role: Position title (or null if not found)
   - dates: Array of mentioned dates (e.g., ["2025-01-15", "2025-01-16"])
   - times: Array of mentioned times (e.g., ["2:00 PM EST", "10:00 AM PST"])
   - links: Array of URLs found in email
   - interviewer: Name of interviewer/contact person (or null)
3. urgency: high/medium/low based on required response time
4. suggested_response: Brief, appropriate response text (2-3 sentences)

Be thorough in extraction but conservative in categorization. If unsure about category, default to "other".`;

  return { system, user };
}
