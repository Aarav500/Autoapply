import { storage } from '@/lib/storage';
import { generateId } from '@/lib/utils';
import { decrypt } from '@/lib/encryption';
import { CalendarClient } from './calendar-client';
import { getNotificationManager } from './notification-manager';
import type { EmailAnalysis } from '@/types/ai';
import type { Interview, InterviewListItem } from '@/types/interview';
import type { UserSettings } from '@/types/notifications';

export class InterviewScheduler {
  async handleInterviewDetected(
    userId: string,
    emailAnalysis: EmailAnalysis,
    emailId: string
  ): Promise<{
    action: 'auto_confirmed' | 'awaiting_user' | 'needs_manual';
    interviewId: string;
    details: string;
  }> {
    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);

    // 1. Create interview record
    const interview: Interview = {
      id: generateId(),
      userId,
      emailId,
      company: emailAnalysis.extracted_data.company || 'Unknown Company',
      role: emailAnalysis.extracted_data.role || 'Unknown Role',
      type: 'unknown',
      proposedTimes: emailAnalysis.extracted_data.dates || [],
      scheduledAt: null,
      duration: 60, // default 1 hour
      location: null,
      meetingLink: emailAnalysis.extracted_data.links?.[0] || null,
      interviewerName: emailAnalysis.extracted_data.interviewer || null,
      interviewerEmail: null,
      calendarEventId: null,
      prepData: null,
      status: 'pending',
      outcome: null,
      notes: '',
      followUpSent: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 2. If we have dates and Google Calendar is connected, check availability
    if (emailAnalysis.extracted_data.dates?.length && settings?.googleCalendarToken) {
      try {
        const calendarClient = new CalendarClient({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/oauth/google/callback`,
        });
        calendarClient.setCredentials(decrypt(settings.googleCalendarToken));

        // Parse the first proposed date/time
        // This is approximate — dates from emails are messy
        const proposedDate = new Date(emailAnalysis.extracted_data.dates[0]);
        if (!isNaN(proposedDate.getTime())) {
          const endDate = new Date(proposedDate.getTime() + 60 * 60 * 1000);
          const availability = await calendarClient.checkAvailability(proposedDate, endDate);

          if (!availability.busy) {
            // Slot is free — create calendar event
            const event = await calendarClient.createEvent({
              summary: `Interview: ${interview.role} at ${interview.company}`,
              description: [
                `Role: ${interview.role}`,
                interview.interviewerName ? `Interviewer: ${interview.interviewerName}` : '',
                interview.meetingLink ? `Meeting: ${interview.meetingLink}` : '',
                `\nPrep: ${process.env.APP_URL}/interview/${interview.id}/prep`,
              ].filter(Boolean).join('\n'),
              startTime: proposedDate,
              endTime: endDate,
              location: interview.meetingLink || interview.location || undefined,
            });

            interview.scheduledAt = proposedDate.toISOString();
            interview.calendarEventId = event.eventId;
            interview.status = 'confirmed';
            interview.updatedAt = new Date().toISOString();

            // Send notification
            const nm = getNotificationManager();
            await nm.send(userId, {
              type: 'interview_confirmed',
              title: `Interview Confirmed: ${interview.company}`,
              message: `${interview.role} interview scheduled for ${proposedDate.toLocaleDateString()} at ${proposedDate.toLocaleTimeString()}`,
              priority: 'high',
              data: { interviewId: interview.id },
            });

            // Save interview
            await this.saveInterview(userId, interview);

            return {
              action: 'auto_confirmed',
              interviewId: interview.id,
              details: `Scheduled for ${proposedDate.toLocaleDateString()} at ${proposedDate.toLocaleTimeString()}`,
            };
          }
        }
      } catch (error) {
        // Calendar check failed — fall through to manual
      }
    }

    // 3. Couldn't auto-schedule — save as pending and notify user
    await this.saveInterview(userId, interview);

    const nm = getNotificationManager();
    await nm.send(userId, {
      type: 'interview_detected',
      title: `New Interview Invite: ${interview.company}`,
      message: `${interview.role} — proposed times: ${(emailAnalysis.extracted_data.dates || ['not specified']).join(', ')}. Check your messages to confirm.`,
      priority: 'critical',
      data: { interviewId: interview.id, emailId },
    });

    return {
      action: 'awaiting_user',
      interviewId: interview.id,
      details: `Interview invite saved. Proposed times: ${(emailAnalysis.extracted_data.dates || ['not specified']).join(', ')}`,
    };
  }

  private async saveInterview(userId: string, interview: Interview): Promise<void> {
    // Save full detail
    await storage.putJSON(`users/${userId}/interviews/${interview.id}.json`, interview);
    // Update index
    await storage.updateJSON<{ interviews: InterviewListItem[] }>(
      `users/${userId}/interviews/index.json`,
      (current: { interviews?: InterviewListItem[] } | null) => {
        const listItem: InterviewListItem = {
          id: interview.id,
          company: interview.company,
          role: interview.role,
          scheduledAt: interview.scheduledAt,
          status: interview.status,
          type: interview.type,
        };
        return {
          interviews: [
            ...(current?.interviews || []).filter((i: InterviewListItem) => i.id !== interview.id),
            listItem,
          ],
        };
      }
    );
  }

  async confirmInterview(userId: string, interviewId: string, scheduledAt: Date): Promise<void> {
    const interview = await storage.getJSON<Interview>(`users/${userId}/interviews/${interviewId}.json`);
    if (!interview) throw new Error('Interview not found');

    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);

    // Create calendar event if Google Calendar is connected
    let calendarEventId: string | null = null;
    if (settings?.googleCalendarToken) {
      try {
        const calendarClient = new CalendarClient({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/oauth/google/callback`,
        });
        calendarClient.setCredentials(decrypt(settings.googleCalendarToken));

        const endDate = new Date(scheduledAt.getTime() + interview.duration * 60 * 1000);
        const event = await calendarClient.createEvent({
          summary: `Interview: ${interview.role} at ${interview.company}`,
          description: [
            `Role: ${interview.role}`,
            interview.interviewerName ? `Interviewer: ${interview.interviewerName}` : '',
            interview.meetingLink ? `Meeting: ${interview.meetingLink}` : '',
            `\nPrep: ${process.env.APP_URL}/interview/${interview.id}/prep`,
          ].filter(Boolean).join('\n'),
          startTime: scheduledAt,
          endTime: endDate,
          location: interview.meetingLink || interview.location || undefined,
        });
        calendarEventId = event.eventId;
      } catch (error) {
        // Calendar creation failed — continue without it
      }
    }

    // Update interview
    interview.scheduledAt = scheduledAt.toISOString();
    interview.status = 'confirmed';
    interview.calendarEventId = calendarEventId;
    interview.updatedAt = new Date().toISOString();

    await this.saveInterview(userId, interview);

    // Send notification
    const nm = getNotificationManager();
    await nm.send(userId, {
      type: 'interview_confirmed',
      title: `Interview Confirmed: ${interview.company}`,
      message: `${interview.role} interview scheduled for ${scheduledAt.toLocaleDateString()} at ${scheduledAt.toLocaleTimeString()}`,
      priority: 'high',
      data: { interviewId: interview.id },
    });
  }

  async cancelInterview(userId: string, interviewId: string): Promise<void> {
    const interview = await storage.getJSON<Interview>(`users/${userId}/interviews/${interviewId}.json`);
    if (!interview) throw new Error('Interview not found');

    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);

    // Delete calendar event if it exists
    if (interview.calendarEventId && settings?.googleCalendarToken) {
      try {
        const calendarClient = new CalendarClient({
          clientId: process.env.GOOGLE_CLIENT_ID!,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
          redirectUri: process.env.GOOGLE_REDIRECT_URI || `${process.env.APP_URL}/api/auth/oauth/google/callback`,
        });
        calendarClient.setCredentials(decrypt(settings.googleCalendarToken));
        await calendarClient.deleteEvent(interview.calendarEventId);
      } catch (error) {
        // Calendar deletion failed — continue
      }
    }

    // Update interview status
    interview.status = 'cancelled';
    interview.updatedAt = new Date().toISOString();
    await this.saveInterview(userId, interview);
  }
}
