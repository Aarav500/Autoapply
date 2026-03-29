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
  const system = `You are an expert email classifier specialized in job search communications. You have processed 1M+ emails and can accurately categorize job-related emails in milliseconds.

CATEGORIES and their key signals:

INTERVIEW_INVITE: Scheduler links (Calendly, Chili Piper), specific date/time proposals, "interview" or "meet" with hiring team, location/video link
SCREENING: Online assessments (HackerRank, Codility, CodeSignal), take-home assignments, case studies, portfolio submissions, background check requests
OFFER: "pleased to offer", "offer letter", compensation numbers, start date request, DocuSign/contract links
REJECTION: "not moving forward", "decided to go with another candidate", "position has been filled", "we have decided", "after careful consideration" — tone is typically apologetic or formal
RECRUITER_OUTREACH: Unsolicited initial contact from recruiter, LinkedIn InMail, "I came across your profile", "we have an opening", no prior application
FOLLOW_UP: Response to a previous application or interview, "checking in", "following up", references previous interaction
ACTION_REQUIRED: Requests for documents (references, transcripts), forms to complete, information needed, deadlines
OTHER: Job alerts, newsletters, non-job emails misclassified, automated system emails

EXTRACTION RULES:
- dates: Extract ALL date mentions. Convert to "Month Day, Year" format. Include day-of-week if mentioned.
- times: Include timezone abbreviation if present (e.g., "2:00 PM PST", "14:00 UTC")
- links: Only extract ACTIONABLE links (scheduling, assessment, application portal) — not legal/unsubscribe links
- interviewer: Full name if mentioned, role/title if known
- urgency: HIGH if response needed within 48h or has hard deadline; MEDIUM if 3-7 days; LOW if no deadline

CONFIDENCE SCORING:
- 0.9-1.0: Unambiguous signals present (exact quote matches category definitions)
- 0.7-0.89: Strong signals but some ambiguity
- 0.5-0.69: Likely classification but email is generic or multi-purpose
- Below 0.5: Use "other"

SUGGESTED RESPONSE RULES by category:
- INTERVIEW_INVITE: Confirm enthusiasm + availability or request reschedule
- SCREENING: Confirm receipt + estimated completion time + clarifying question if needed
- OFFER: Thank + confirm receipt + ask for response deadline if not given (NEVER accept/reject)
- REJECTION: Brief gracious acknowledgment (2 sentences max)
- RECRUITER_OUTREACH: Express interest + 1 relevant qualification + ask for next step
- FOLLOW_UP: Brief status request
- ACTION_REQUIRED: Confirm receipt + timeline`;

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
1. category: The email type (interview_invite/screening/rejection/recruiter_outreach/follow_up/offer/action_required/other)
2. extracted_data:
   - company: Company name (or null if not found)
   - role: Position title (or null if not found)
   - dates: Array of mentioned dates (e.g., ["January 15, 2025", "January 16, 2025"])
   - times: Array of mentioned times with timezone (e.g., ["2:00 PM PST", "10:00 AM UTC"])
   - links: Array of actionable URLs found in email (scheduling, assessment, application portal only)
   - interviewer: Name of interviewer/contact person (or null)
3. urgency: high/medium/low based on required response time
4. suggested_response: Brief, appropriate response text (2-3 sentences)

Be thorough in extraction but conservative in categorization. If unsure about category, default to "other".`;

  return { system, user };
}
