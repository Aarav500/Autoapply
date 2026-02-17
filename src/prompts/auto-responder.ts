export interface AutoResponderInput {
  originalEmail: {
    subject: string;
    body: string;
    sender: {
      name?: string;
      email: string;
    };
  };
  category:
    | 'interview_invite'
    | 'rejection'
    | 'recruiter_outreach'
    | 'follow_up'
    | 'offer'
    | 'action_required'
    | 'other';
  extractedData?: {
    company?: string | null;
    role?: string | null;
    dates?: string[];
    times?: string[];
    links?: string[];
    interviewer?: string | null;
  };
  userPreferences?: {
    name: string;
    tone?: 'professional' | 'friendly' | 'formal' | 'enthusiastic';
    signatureFormat?: 'full' | 'simple' | 'none';
    phone?: string;
    availability?: {
      preferredDays?: string[];
      preferredTimes?: string[];
      timezone?: string;
    };
  };
  context?: string; // Any additional context for the response
}

export function autoResponderPrompt(input: AutoResponderInput): { system: string; user: string } {
  const system = `You are an expert email writer specializing in professional job search communications. Your emails are concise, appropriately toned, and action-oriented.

Response guidelines by category:

INTERVIEW_INVITE:
- Express enthusiasm about the opportunity
- Confirm proposed time OR suggest 2-3 alternative time slots if unavailable
- Ask any necessary clarifying questions (format, duration, who you'll meet)
- Keep it brief (3-4 sentences max)
- Confirm you'll prepare any requested materials

REJECTION:
- Gracious and brief (2-3 sentences)
- Thank them for considering you
- Express continued interest in future opportunities (if appropriate)
- DO NOT ask for feedback (unless explicitly common in that context)

RECRUITER_OUTREACH:
- Express interest
- Briefly highlight 1-2 relevant qualifications
- Suggest next steps (call, meeting, more info)
- Provide availability or ask about their availability

FOLLOW_UP:
- Reference previous interaction specifically
- Reiterate interest
- Ask clear question or suggest next step
- Keep brief and respectful of their time

OFFER:
- Express enthusiasm and gratitude
- Confirm receipt of offer
- Ask for timeline to respond if not provided
- Request any needed clarifications
- DO NOT accept/reject in initial response (unless explicitly instructed)

ACTION_REQUIRED:
- Confirm you received the request
- State when you'll complete the action
- Ask clarifying questions if needed
- Professional urgency if deadline is tight

Tone guidelines:
- professional: Polished, formal but not stuffy, standard for most corporate contexts
- friendly: Warm and personable while maintaining professionalism, good for startups/creative roles
- formal: Very polished, conservative language, good for executive roles/traditional industries
- enthusiastic: Energetic and eager, good for showing strong interest

Email structure:
1. Greeting (use sender's name if provided, otherwise "Hi [Name]" or "Hello")
2. Opening (reference their email, express appropriate sentiment)
3. Body (main message, 2-4 sentences max)
4. Closing (next steps, thank you)
5. Sign-off (Best regards, Thank you, Sincerely - match tone)
6. Signature (based on preferences)

IMPORTANT:
- Keep total email under 150 words
- No fluff or unnecessary pleasantries
- Clear, specific actions or asks
- Proofread-quality grammar and punctuation`;

  const tonePreference = input.userPreferences?.tone || 'professional';
  const userName = input.userPreferences?.name || '[Your Name]';
  const senderName = input.originalEmail.sender.name || 'there';

  const availabilityContext = input.userPreferences?.availability
    ? `
User Availability:
${input.userPreferences.availability.preferredDays ? `Preferred Days: ${input.userPreferences.availability.preferredDays.join(', ')}` : ''}
${input.userPreferences.availability.preferredTimes ? `Preferred Times: ${input.userPreferences.availability.preferredTimes.join(', ')}` : ''}
${input.userPreferences.availability.timezone ? `Timezone: ${input.userPreferences.availability.timezone}` : ''}`
    : '';

  const contextInfo = input.context ? `\n\nAdditional Context: ${input.context}` : '';

  const extractedInfo = input.extractedData
    ? `
Extracted Information:
${input.extractedData.company ? `Company: ${input.extractedData.company}` : ''}
${input.extractedData.role ? `Role: ${input.extractedData.role}` : ''}
${input.extractedData.interviewer ? `Interviewer: ${input.extractedData.interviewer}` : ''}
${input.extractedData.dates && input.extractedData.dates.length > 0 ? `Proposed Dates: ${input.extractedData.dates.join(', ')}` : ''}
${input.extractedData.times && input.extractedData.times.length > 0 ? `Proposed Times: ${input.extractedData.times.join(', ')}` : ''}
${input.extractedData.links && input.extractedData.links.length > 0 ? `Links: ${input.extractedData.links.join(', ')}` : ''}`
    : '';

  const user = `Generate a professional email response:

ORIGINAL EMAIL:
From: ${input.originalEmail.sender.name || input.originalEmail.sender.email}
Subject: ${input.originalEmail.subject}

Body:
${input.originalEmail.body}

EMAIL CATEGORY: ${input.category}
${extractedInfo}

RESPONSE PREFERENCES:
Tone: ${tonePreference}
User Name: ${userName}
${input.userPreferences?.phone ? `Phone: ${input.userPreferences.phone}` : ''}
${availabilityContext}
${contextInfo}

Generate an email response that:
1. Uses appropriate tone (${tonePreference})
2. Is concise (under 150 words)
3. Addresses the specific category requirements
4. Uses sender's name (${senderName}) in greeting if appropriate
5. Includes clear next steps or actions
6. Signs off appropriately

Return ONLY the plain text email body (no JSON formatting). Do not include email headers (To/From/Subject). Just the email content ready to send.`;

  return { system, user };
}
