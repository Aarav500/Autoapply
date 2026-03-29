import { NextRequest } from 'next/server';
import { successResponse, authenticate, handleError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import { EmailIndexEntry } from '@/types/comms';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  company: string;
  type: 'interview' | 'screening' | 'offer-deadline';
  emailId?: string;
}

interface GoogleCalendarEvent {
  id?: string | null;
  summary?: string | null;
  start?: { dateTime?: string | null; date?: string | null } | null;
}

interface GoogleCalendarListResponse {
  items?: GoogleCalendarEvent[];
}

interface UserSettings {
  googleRefreshToken?: string;
  googleCalendarRefreshToken?: string;
  googleCalendarConnected?: boolean;
}

// ─── Date extraction ──────────────────────────────────────────────────────────

// Regex patterns for extracting dates from email subjects/bodies
const DATE_PATTERNS = [
  // "March 15, 2026", "Mar 15, 2026"
  /\b(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{1,2}),?\s+(\d{4})\b/i,
  // "15 March 2026", "15 Mar 2026"
  /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i,
  // "2026-03-15"
  /\b(\d{4})-(\d{2})-(\d{2})\b/,
  // "03/15/2026" or "15/03/2026"
  /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,
];

function extractDateFromText(text: string): string | null {
  for (const pattern of DATE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      try {
        const dateStr = match[0];
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed.toISOString();
        }
      } catch {
        // Skip unparseable matches
      }
    }
  }
  return null;
}

function extractCompanyFromEmail(email: EmailIndexEntry): string {
  // Try to extract from the "from" field: "Recruiter Name <recruiter@company.com>"
  const fromMatch = email.from.match(/@([^.>]+)/);
  if (fromMatch) {
    const domain = fromMatch[1];
    // Capitalize first letter
    return domain.charAt(0).toUpperCase() + domain.slice(1);
  }
  return 'Unknown Company';
}

function categorizeEmail(category: string): 'interview' | 'screening' | 'offer-deadline' | null {
  if (category === 'interview_invite') return 'interview';
  if (category === 'screening') return 'screening';
  if (category === 'offer') return 'offer-deadline';
  return null;
}

// ─── Google Calendar fetcher ──────────────────────────────────────────────────

async function fetchGoogleCalendarEvents(refreshToken: string): Promise<CalendarEvent[]> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return [];
  }

  try {
    // Exchange refresh token for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenRes.ok) {
      logger.warn('Failed to refresh Google Calendar token');
      return [];
    }

    const tokenData = (await tokenRes.json()) as { access_token?: string };
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return [];
    }

    // Fetch upcoming events from Google Calendar (next 30 days)
    const now = new Date();
    const thirtyDaysOut = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const calUrl = new URL(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events'
    );
    calUrl.searchParams.set('timeMin', now.toISOString());
    calUrl.searchParams.set('timeMax', thirtyDaysOut.toISOString());
    calUrl.searchParams.set('maxResults', '20');
    calUrl.searchParams.set('orderBy', 'startTime');
    calUrl.searchParams.set('singleEvents', 'true');
    // Filter for job-related keywords
    calUrl.searchParams.set('q', 'interview OR screening OR phone call OR technical');

    const calRes = await fetch(calUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!calRes.ok) {
      logger.warn('Failed to fetch Google Calendar events');
      return [];
    }

    const calData = (await calRes.json()) as GoogleCalendarListResponse;
    const items = calData.items || [];

    return items.map((item): CalendarEvent => {
      const dateStr = item.start?.dateTime || item.start?.date || now.toISOString();
      const summary = item.summary || 'Calendar Event';

      let eventType: 'interview' | 'screening' | 'offer-deadline' = 'interview';
      const lowerSummary = summary.toLowerCase();
      if (lowerSummary.includes('screen') || lowerSummary.includes('phone')) {
        eventType = 'screening';
      } else if (lowerSummary.includes('deadline') || lowerSummary.includes('offer')) {
        eventType = 'offer-deadline';
      }

      // Extract company name from event summary (e.g., "Interview with Google")
      const companyMatch = summary.match(/(?:with|at|@)\s+([A-Z][^\s]+)/);
      const company = companyMatch ? companyMatch[1] : 'Unknown';

      return {
        id: item.id || `cal-${Date.now()}`,
        title: summary,
        date: new Date(dateStr).toISOString(),
        company,
        type: eventType,
      };
    });
  } catch (error) {
    logger.error({ error }, 'Error fetching Google Calendar events');
    return [];
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

/**
 * GET /api/comms/calendar
 * Returns upcoming interview-related calendar events.
 * Sources:
 *   1. Google Calendar API (if connected via same googleRefreshToken)
 *   2. Emails in index that are interview_invite / screening / offer with future dates
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await authenticate(request);

    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);

    const events: CalendarEvent[] = [];
    const now = new Date();

    // ── Source 1: Google Calendar ────────────────────────────────────────────
    // The gmail refresh token also has calendar scope in the OAuth flow
    if (settings?.googleRefreshToken) {
      try {
        const calendarToken = decrypt(settings.googleRefreshToken);
        const calEvents = await fetchGoogleCalendarEvents(calendarToken);
        events.push(...calEvents);
      } catch (err) {
        // Decryption or Calendar API failure — not fatal
        logger.warn({ err }, 'Could not fetch Google Calendar events');
      }
    }

    // ── Source 2: Email index — extract dates from interview/screening emails ─
    const rawIndex = await storage.getJSON<EmailIndexEntry[] | { emails: EmailIndexEntry[] }>(
      `users/${userId}/emails/index.json`
    );

    const emailList: EmailIndexEntry[] = Array.isArray(rawIndex)
      ? rawIndex
      : (rawIndex as { emails?: EmailIndexEntry[] })?.emails || [];

    for (const email of emailList) {
      const eventType = categorizeEmail(email.category || '');
      if (!eventType) continue;

      // Try to extract a future date from subject
      const dateFromSubject = extractDateFromText(email.subject);
      const dateStr = dateFromSubject || email.receivedAt;
      const eventDate = new Date(dateStr);

      // Only include future events (or within the last day for "today" label)
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      if (eventDate < oneDayAgo) continue;

      const company = extractCompanyFromEmail(email);

      // Deduplicate against calendar events by approximate date+company
      const alreadyExists = events.some(
        (e) =>
          e.company.toLowerCase() === company.toLowerCase() &&
          Math.abs(new Date(e.date).getTime() - eventDate.getTime()) < 24 * 60 * 60 * 1000
      );
      if (alreadyExists) continue;

      events.push({
        id: email.id,
        title: email.subject,
        date: eventDate.toISOString(),
        company,
        type: eventType,
        emailId: email.id,
      });
    }

    // Sort by date ascending, take first 5
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const upcomingEvents = events.slice(0, 5);

    return successResponse({ events: upcomingEvents });
  } catch (error) {
    logger.error({ error }, 'Failed to fetch calendar events');
    return handleError(error);
  }
}
