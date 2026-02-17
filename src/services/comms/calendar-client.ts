import { google } from 'googleapis';

export class CalendarClient {
  private oauth2Client;

  constructor(credentials: { clientId: string; clientSecret: string; redirectUri: string }) {
    this.oauth2Client = new google.auth.OAuth2(credentials.clientId, credentials.clientSecret, credentials.redirectUri);
  }

  setCredentials(refreshToken: string): void {
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });
  }

  async createEvent(event: {
    summary: string;
    description: string;
    startTime: Date;
    endTime: Date;
    location?: string;
    reminders?: { method: 'popup' | 'email'; minutes: number }[];
  }): Promise<{ eventId: string; htmlLink: string }> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const result = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: event.summary,
        description: event.description,
        start: { dateTime: event.startTime.toISOString(), timeZone: 'UTC' },
        end: { dateTime: event.endTime.toISOString(), timeZone: 'UTC' },
        location: event.location,
        reminders: {
          useDefault: false,
          overrides: event.reminders || [
            { method: 'popup', minutes: 60 },
            { method: 'popup', minutes: 30 },
            { method: 'email', minutes: 1440 }, // 24 hours
          ],
        },
      },
    });
    return { eventId: result.data.id!, htmlLink: result.data.htmlLink! };
  }

  async checkAvailability(start: Date, end: Date): Promise<{ busy: boolean; conflicts: { start: string; end: string; summary: string }[] }> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    // Use freebusy API
    const result = await calendar.freebusy.query({
      requestBody: {
        timeMin: start.toISOString(),
        timeMax: end.toISOString(),
        items: [{ id: 'primary' }],
      },
    });
    const busySlots = result.data.calendars?.primary?.busy || [];
    // Also get event details for the conflicts
    const events = await calendar.events.list({
      calendarId: 'primary',
      timeMin: start.toISOString(),
      timeMax: end.toISOString(),
      singleEvents: true,
    });
    const conflicts = (events.data.items || []).map((e: any) => ({
      start: e.start?.dateTime || e.start?.date || '',
      end: e.end?.dateTime || e.end?.date || '',
      summary: e.summary || 'Busy',
    }));
    return { busy: busySlots.length > 0, conflicts };
  }

  async deleteEvent(eventId: string): Promise<void> {
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    await calendar.events.delete({ calendarId: 'primary', eventId });
  }
}
