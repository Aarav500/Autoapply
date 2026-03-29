import { randomUUID } from 'crypto';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { GmailClient } from './gmail-client';
import { NotificationManager } from './notification-manager';
import { decrypt } from '@/lib/encryption';
import { logger } from '@/lib/logger';
import {
  GmailMessage,
  EmailAnalysis,
  ProcessedEmail,
  EmailIndexEntry,
  EmailThread,
  EmailProcessingStats,
  AutoReplyRule,
  EmailSettings,
  EmailAnalysisSchema,
} from '@/types/comms';
import { AppError } from '@/lib/errors';
import { emailAnalyzerPrompt } from '@/prompts/email-analyzer';
import { autoResponderPrompt } from '@/prompts/auto-responder';

// Application status detection patterns
const APPLICATION_RECEIVED_PATTERNS = [
  'thank you for applying',
  'application received',
  'we received your application',
  'application has been submitted',
  'successfully applied',
  'your application for',
];

const SCREENING_PATTERNS = [
  'move forward',
  'next steps',
  'schedule a call',
  'screening call',
  'phone interview',
  'preliminary interview',
  'recruiter call',
];

const REJECTION_PATTERNS = [
  'not moving forward',
  'we will not',
  'other candidates',
  'position has been filled',
  'unfortunately',
  'not a fit',
  'decided not to move',
];

const OFFER_PATTERNS = [
  'offer letter',
  'pleased to offer',
  'job offer',
  'compensation package',
  'we would like to offer',
  'offer of employment',
];

// Known job-related email domains
const JOB_DOMAINS = [
  'greenhouse.io',
  'lever.co',
  'linkedin.com',
  'indeed.com',
  'workday.com',
  'jobvite.com',
  'myworkdayjobs.com',
  'icims.com',
  'smartrecruiters.com',
  'ashbyhq.com',
  'breezy.hr',
  'recruitee.com',
];

// Job-related keywords — deliberately narrow to reduce false positives.
// Words like "meeting", "schedule", "opportunity", "position" are too generic
// and match non-job emails (marketing, internal HR newsletters, etc.)
const JOB_KEYWORDS = [
  'interview',
  'job application',
  'your application',
  'we received your application',
  'thank you for applying',
  'application status',
  'resume review',
  'offer letter',
  'job offer',
  'offer of employment',
  'hiring decision',
  'recruiter outreach',
  'recruitment team',
  'moving forward with your application',
  'next steps in your application',
  'phone screen',
  'technical screen',
  'coding challenge',
  'take-home assignment',
  'onsite interview',
  'virtual interview',
  'background check',
  'reference check',
  'compensation package',
  'start date',
];

export class EmailProcessor {
  /**
   * Process new emails: fetch, analyze with AI, auto-reply if configured
   */
  async processNewEmails(userId: string): Promise<EmailProcessingStats> {
    const stats: EmailProcessingStats = {
      processed: 0,
      jobRelated: 0,
      interviewsDetected: 0,
      autoReplied: 0,
    };

    try {
      // 1. Load user settings
      const settingsKey = `users/${userId}/settings.json`;
      const settings = await storage.getJSON<any>(settingsKey);

      if (!settings?.googleRefreshToken) {
        throw new AppError('Gmail not connected. Please connect your Gmail account first.', 400);
      }

      const emailSettings: EmailSettings = {
        googleRefreshToken: settings.googleRefreshToken,
        autoReplyEnabled: settings.autoReplyEnabled || false,
        autoReplyRules: settings.autoReplyRules || [],
        lastEmailSync: settings.lastEmailSync,
      };

      // 2. Initialize Gmail client
      const gmailClient = new GmailClient({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        redirectUri: process.env.GOOGLE_REDIRECT_URI!,
      });

      // Decrypt refresh token (already checked above, so it exists)
      const refreshToken = decrypt(emailSettings.googleRefreshToken!);
      gmailClient.setCredentials(refreshToken);

      // 3. Fetch new emails
      const lastSync = emailSettings.lastEmailSync || new Date(0).toISOString();
      const newMessages = await gmailClient.getNewMessagesSince(lastSync);

      logger.info({ userId, count: newMessages.length, lastSync }, 'Fetched new emails from Gmail');

      if (newMessages.length === 0) {
        // Update lastEmailSync even if no new messages
        await this.updateLastSync(userId, settings);
        return stats;
      }

      // 4. Load existing emails index
      const emailsIndexKey = `users/${userId}/emails/index.json`;
      let existingEmails: EmailIndexEntry[] = [];

      try {
        const result = await storage.getJSON<EmailIndexEntry[]>(emailsIndexKey);
        existingEmails = result || [];
      } catch (error) {
        // Index doesn't exist yet - first sync
        logger.info({ userId }, 'Creating new emails index');
      }

      const existingExternalIds = new Set(existingEmails.map((e) => e.externalId));

      // Load user's job applications to identify job-related emails
      const jobsIndexKey = `users/${userId}/jobs/index.json`;
      let appliedCompanies: string[] = [];

      try {
        const jobsIndex = await storage.getJSON<any[]>(jobsIndexKey);
        if (jobsIndex) {
          appliedCompanies = jobsIndex
            .filter((job) => job.status !== 'discovered')
            .map((job) => job.company.toLowerCase());
        }
      } catch (error) {
        // No jobs yet
      }

      // 5. Process each new email
      for (const message of newMessages) {
        // Skip if already processed
        if (existingExternalIds.has(message.externalId)) {
          continue;
        }

        stats.processed++;

        const emailId = randomUUID();

        // 6. Quick job-related check
        const isJobRelated = this.isJobRelated(message, appliedCompanies);

        let analysis: EmailAnalysis | null = null;
        let suggestedReply: string | null = null;

        // 7. If job-related, run AI analysis
        if (isJobRelated) {
          stats.jobRelated++;

          try {
            analysis = await this.analyzeEmail(message, userId);

            // If interview invite detected, track it
            if (analysis.category === 'interview_invite') {
              stats.interviewsDetected++;
              await this.createInterviewRecord(userId, message, analysis);
            }
          } catch (error) {
            logger.error({ emailId, error }, 'Failed to analyze email with AI');
            // Continue processing even if AI fails
          }

          // Auto-detect and update job pipeline status from email content
          try {
            const statusUpdate = await this.detectJobStatusUpdate(message, userId);
            if (statusUpdate) {
              logger.info(
                { userId, jobId: statusUpdate.jobId, status: statusUpdate.status, company: statusUpdate.company },
                'Auto-updating job status from email'
              );
            }
          } catch (error) {
            logger.error({ emailId, error }, 'Failed to detect job status update from email');
          }
        }

        // 8. Auto-reply if configured
        if (
          analysis &&
          emailSettings.autoReplyEnabled &&
          this.shouldAutoReply(analysis, emailSettings.autoReplyRules)
        ) {
          try {
            const reply = await this.generateAutoReply(message, analysis, userId);

            await gmailClient.sendMessage(
              message.from,
              `Re: ${message.subject}`,
              reply,
              {
                threadId: message.threadId,
                inReplyTo: message.externalId,
              }
            );

            suggestedReply = reply;
            stats.autoReplied++;

            logger.info({ emailId, category: analysis.category }, 'Auto-reply sent');
          } catch (error) {
            logger.error({ emailId, error }, 'Failed to send auto-reply');
          }
        }

        // 8b. Send urgency-aware in-app notification for job-related emails
        if (analysis && isJobRelated) {
          try {
            const notificationManager = new NotificationManager();
            const company = analysis.extractedData?.company || 'a company';
            const deadline = analysis.extractedData?.dates?.[0] || null;
            const deadlineClause = deadline ? ` by ${deadline}` : '';

            let notifTitle = 'Job Email Received';
            let notifMessage = `New job-related email from ${company}`;
            let notifPriority: 'critical' | 'high' | 'medium' | 'low' = 'medium';

            switch (analysis.category) {
              case 'interview_invite':
                notifTitle = 'Interview Invitation';
                notifMessage = `Interview invitation from ${company} — respond within 24h to secure your slot`;
                notifPriority = 'high';
                break;
              case 'offer':
                notifTitle = 'Job Offer Received!';
                notifMessage = `JOB OFFER received from ${company} — review and respond${deadlineClause}`;
                notifPriority = 'critical';
                break;
              case 'rejection':
                notifTitle = 'Application Update';
                notifMessage = `Application update from ${company} — keep momentum, 3 more applications queued`;
                notifPriority = 'low';
                break;
              case 'action_required':
                notifTitle = 'Assessment Request';
                notifMessage = `Assessment request from ${company} — complete before${deadlineClause || ' the deadline'}`;
                notifPriority = 'high';
                break;
              default:
                notifTitle = 'Job Email';
                notifMessage = `New email from ${company} regarding your application`;
                notifPriority = 'medium';
                break;
            }

            await notificationManager.send(userId, {
              type: 'email_response',
              priority: notifPriority,
              title: notifTitle,
              message: notifMessage,
              data: {
                emailId,
                company,
                category: analysis.category,
              },
            });
          } catch (notifError) {
            logger.error({ emailId, notifError }, 'Failed to send email notification');
            // Non-critical — do not block email processing
          }
        }

        // 9. Save full email to S3
        const processedEmail: ProcessedEmail = {
          ...message,
          id: emailId,
          aiAnalysis: analysis || {
            category: 'other',
            isJobRelated,
            urgency: 'low',
            extractedData: {},
            summary: message.snippet,
            suggestedResponse: null,
            confidence: 0,
          },
          suggestedReply,
          autoReplied: suggestedReply !== null,
        };

        const emailKey = `users/${userId}/emails/${emailId}.json`;
        await storage.putJSON(emailKey, processedEmail);

        // 10. Add to index
        const indexEntry: EmailIndexEntry = {
          id: emailId,
          externalId: message.externalId,
          threadId: message.threadId,
          from: message.from,
          to: message.to,
          subject: message.subject,
          snippet: message.snippet,
          category: analysis?.category,
          isRead: message.isRead,
          isJobRelated,
          urgency: analysis?.urgency,
          receivedAt: message.receivedAt,
        };

        existingEmails.push(indexEntry);
      }

      // 11. Save updated index
      await storage.putJSON(emailsIndexKey, existingEmails);

      // 12. Update lastEmailSync
      await this.updateLastSync(userId, settings);

      logger.info({ userId, stats }, 'Email processing complete');

      return stats;
    } catch (error) {
      logger.error({ userId, error }, 'Email processing failed');
      throw error;
    }
  }

  /**
   * Get emails organized by thread
   */
  async getThreads(userId: string): Promise<EmailThread[]> {
    try {
      // Load all emails
      const emailsIndexKey = `users/${userId}/emails/index.json`;
      const emailsIndex = await storage.getJSON<EmailIndexEntry[]>(emailsIndexKey);

      if (!emailsIndex || emailsIndex.length === 0) {
        return [];
      }

      // Group by threadId
      const threadMap = new Map<string, EmailIndexEntry[]>();

      for (const email of emailsIndex) {
        if (!threadMap.has(email.threadId)) {
          threadMap.set(email.threadId, []);
        }
        threadMap.get(email.threadId)!.push(email);
      }

      // Build threads
      const threads: EmailThread[] = [];

      for (const [threadId, emails] of threadMap) {
        // Load full email details for each message in thread
        const messages: ProcessedEmail[] = [];

        for (const email of emails) {
          const emailKey = `users/${userId}/emails/${email.id}.json`;
          try {
            const fullEmail = await storage.getJSON<ProcessedEmail>(emailKey);
            if (fullEmail) {
              messages.push(fullEmail);
            }
          } catch (error) {
            logger.warn({ emailId: email.id, threadId }, 'Failed to load email for thread');
          }
        }

        if (messages.length === 0) continue;

        // Sort messages by date
        messages.sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

        const latestMessage = messages[messages.length - 1];

        // Determine company from AI analysis or email domain
        let company = latestMessage.aiAnalysis?.extractedData?.company || '';
        if (!company) {
          const domain = latestMessage.from.split('@')[1] || '';
          company = domain.split('.')[0];
        }

        // Determine role
        const role = latestMessage.aiAnalysis?.extractedData?.role || '';

        // Determine status
        const hasUnread = messages.some((m) => !m.isRead);
        const latestCategory = latestMessage.aiAnalysis?.category;
        let status: EmailThread['status'] = 'active';

        if (latestCategory === 'rejection' || latestCategory === 'offer') {
          status = 'closed';
        } else if (!hasUnread) {
          status = 'waiting';
        }

        threads.push({
          threadId,
          company,
          role,
          latestSubject: latestMessage.subject,
          messageCount: messages.length,
          latestDate: latestMessage.receivedAt,
          status,
          messages,
        });
      }

      // Sort threads by latest date
      threads.sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

      return threads;
    } catch (error) {
      logger.error({ userId, error }, 'Failed to get email threads');
      throw new AppError('Failed to load email threads', 500);
    }
  }

  /**
   * Generate a reply suggestion (without sending)
   */
  async generateReply(userId: string, emailId: string): Promise<string> {
    try {
      // Load email
      const emailKey = `users/${userId}/emails/${emailId}.json`;
      const email = await storage.getJSON<ProcessedEmail>(emailKey);

      if (!email) {
        throw new AppError('Email not found', 404);
      }

      // Load user profile for personalization
      const profileKey = `users/${userId}/profile.json`;
      const profile = await storage.getJSON<any>(profileKey);

      const userName = profile?.name || 'the candidate';

      // Generate reply using auto-responder prompt
      const prompt = autoResponderPrompt({
        originalEmail: {
          subject: email.subject,
          body: email.body,
          sender: {
            email: email.from,
          },
        },
        category: email.aiAnalysis.category,
        extractedData: email.aiAnalysis.extractedData,
        userPreferences: {
          name: userName,
        },
      });

      const reply = await aiClient.complete(prompt.system, prompt.user, { model: 'balanced' });

      return reply;
    } catch (error) {
      logger.error({ userId, emailId, error }, 'Failed to generate reply');
      throw new AppError('Failed to generate reply suggestion', 500);
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private isJobRelated(message: GmailMessage, appliedCompanies: string[]): boolean {
    const fromEmail = message.from.toLowerCase();
    const subject = message.subject.toLowerCase();
    const body = (message.snippet || message.body).toLowerCase();

    // Exclusion patterns — marketing, newsletters, receipts: skip these
    const NON_JOB_EXCLUSIONS = [
      'unsubscribe',
      'newsletter',
      'marketing@',
      'noreply@mailchimp',
      'no-reply@mailchimp',
      'promo@',
      'deals@',
      'updates@',
      'news@',
      'digest@',
      'weekly@',
      'monthly@',
      'notification@',
      'billing@',
      'invoice@',
      'receipt@',
      'payment@',
      'policy@',
      'legal@',
      'compliance@',
      'security@',
      'alert@',
      'system@',
    ];
    const senderAndSubject = `${fromEmail} ${subject}`;
    if (NON_JOB_EXCLUSIONS.some((excl) => senderAndSubject.includes(excl))) {
      return false;
    }

    // Check domain
    if (JOB_DOMAINS.some((domain) => fromEmail.includes(domain))) {
      return true;
    }

    // Check keywords in subject or body
    if (JOB_KEYWORDS.some((kw) => subject.includes(kw) || body.includes(kw))) {
      return true;
    }

    // Check if from a company user applied to
    if (appliedCompanies.some((company) => fromEmail.includes(company))) {
      return true;
    }

    return false;
  }

  private async analyzeEmail(message: GmailMessage, _userId: string): Promise<EmailAnalysis> {
    const prompt = emailAnalyzerPrompt({
      subject: message.subject,
      body: message.body,
      sender: {
        email: message.from,
      },
    });

    try {
      const analysis = await aiClient.completeJSON<EmailAnalysis>(
        prompt.system,
        prompt.user,
        EmailAnalysisSchema,
        { model: 'balanced' }
      );

      return analysis;
    } catch (error) {
      logger.error({ error }, 'AI email analysis failed');

      // Return basic analysis as fallback
      return {
        category: 'other',
        isJobRelated: true,
        urgency: 'medium',
        extractedData: {},
        summary: message.snippet,
        suggestedResponse: null,
        confidence: 0,
      };
    }
  }

  private shouldAutoReply(analysis: EmailAnalysis, rules: AutoReplyRule[]): boolean {
    const rule = rules.find((r) => r.category === analysis.category && r.enabled);

    if (!rule) return false;

    return analysis.confidence >= rule.minConfidence;
  }

  private async generateAutoReply(
    message: GmailMessage,
    analysis: EmailAnalysis,
    userId: string
  ): Promise<string> {
    // Load user profile
    const profileKey = `users/${userId}/profile.json`;
    const profile = await storage.getJSON<any>(profileKey);

    const userName = profile?.name || 'the candidate';

    const prompt = autoResponderPrompt({
      originalEmail: {
        subject: message.subject,
        body: message.body,
        sender: {
          email: message.from,
        },
      },
      category: analysis.category,
      extractedData: analysis.extractedData,
      userPreferences: {
        name: userName,
      },
    });

    const reply = await aiClient.complete(prompt.system, prompt.user, { model: 'fast' });

    return reply;
  }

  private async createInterviewRecord(
    userId: string,
    message: GmailMessage,
    analysis: EmailAnalysis
  ): Promise<void> {
    try {
      const interviewsIndexKey = `users/${userId}/interviews/index.json`;
      let interviews: any[] = [];

      try {
        const result = await storage.getJSON<any[]>(interviewsIndexKey);
        interviews = result || [];
      } catch (error) {
        // Index doesn't exist yet
      }

      const interviewId = randomUUID();

      const interview = {
        id: interviewId,
        company: analysis.extractedData.company || 'Unknown',
        role: analysis.extractedData.role || 'Unknown',
        emailId: message.id,
        status: 'scheduled',
        dates: analysis.extractedData.dates || [],
        times: analysis.extractedData.times || [],
        location: analysis.extractedData.location,
        meetingLink: analysis.extractedData.meetingLink,
        interviewerName: analysis.extractedData.interviewerName,
        createdAt: new Date().toISOString(),
      };

      interviews.push(interview);

      await storage.putJSON(interviewsIndexKey, interviews);

      logger.info({ userId, interviewId, company: interview.company }, 'Created interview record');
    } catch (error) {
      logger.error({ userId, error }, 'Failed to create interview record');
      // Don't throw - this is not critical
    }
  }

  /**
   * Detect whether an email signals a job application status change.
   * Returns the detected status and the matching job id if found.
   */
  async detectJobStatusUpdate(
    message: GmailMessage,
    userId: string
  ): Promise<{ status: string; company: string; jobId: string } | null> {
    const subject = message.subject.toLowerCase();
    const body = (message.body || message.snippet || '').toLowerCase();
    const combined = `${subject} ${body}`;

    // Determine new status from pattern matching
    let detectedStatus: string | null = null;

    if (OFFER_PATTERNS.some((p) => combined.includes(p))) {
      detectedStatus = 'offer';
    } else if (REJECTION_PATTERNS.some((p) => combined.includes(p))) {
      detectedStatus = 'rejected';
    } else if (SCREENING_PATTERNS.some((p) => combined.includes(p))) {
      detectedStatus = 'screening';
    } else if (APPLICATION_RECEIVED_PATTERNS.some((p) => combined.includes(p))) {
      detectedStatus = 'applied';
    }

    if (!detectedStatus) return null;

    // Extract company name: prefer AI-extracted data, then fall back to email domain
    let company = '';
    const fromDomain = message.from.split('@')[1] || '';
    const domainParts = fromDomain.split('.');
    // Use second-to-last part as company slug (e.g., "stripe" from "no-reply@stripe.com")
    company = domainParts.length >= 2 ? domainParts[domainParts.length - 2] : domainParts[0] || '';

    if (!company) return null;

    // Find a matching job in the user's jobs index
    try {
      const jobsRaw = await storage.getJSON<unknown>(`users/${userId}/jobs/index.json`);
      const jobsArr: Array<{ id: string; company: string; status: string }> = Array.isArray(jobsRaw)
        ? (jobsRaw as Array<{ id: string; company: string; status: string }>)
        : ((jobsRaw as { jobs?: Array<{ id: string; company: string; status: string }> })?.jobs || []);

      const match = jobsArr.find((j) =>
        j.company.toLowerCase().includes(company.toLowerCase()) ||
        company.toLowerCase().includes(j.company.toLowerCase().split(' ')[0])
      );

      if (!match) return null;

      // Only advance status — never move backwards
      const STATUS_ORDER: string[] = ['discovered', 'saved', 'applying', 'applied', 'screening', 'interview', 'offer', 'rejected'];
      const currentIdx = STATUS_ORDER.indexOf(match.status);
      const detectedIdx = STATUS_ORDER.indexOf(detectedStatus);

      // Allow rejected at any point, but otherwise only advance
      if (detectedStatus !== 'rejected' && detectedIdx <= currentIdx) {
        return null;
      }

      // Update the job status in S3
      await storage.updateJSON<unknown>(`users/${userId}/jobs/index.json`, (raw) => {
        const arr: Array<{ id: string; company: string; status: string; updatedAt: string }> = Array.isArray(raw)
          ? (raw as Array<{ id: string; company: string; status: string; updatedAt: string }>)
          : ((raw as { jobs?: Array<{ id: string; company: string; status: string; updatedAt: string }> })?.jobs || []);
        return arr.map((j) =>
          j.id === match.id ? { ...j, status: detectedStatus as string, updatedAt: new Date().toISOString() } : j
        );
      });

      // Also update the full job record if it exists
      try {
        await storage.updateJSON<unknown>(`users/${userId}/jobs/${match.id}.json`, (raw) => {
          return { ...(raw as object), status: detectedStatus, updatedAt: new Date().toISOString() };
        });
      } catch {
        // Full record may not exist — index update is sufficient
      }

      logger.info(
        { userId, jobId: match.id, company: match.company, oldStatus: match.status, newStatus: detectedStatus },
        'Job status auto-updated from email'
      );

      return { status: detectedStatus, company: match.company, jobId: match.id };
    } catch (error) {
      logger.error({ userId, error }, 'Error looking up jobs for status update');
      return null;
    }
  }

  private async updateLastSync(userId: string, currentSettings: any): Promise<void> {
    const settingsKey = `users/${userId}/settings.json`;
    const updatedSettings = {
      ...currentSettings,
      lastEmailSync: new Date().toISOString(),
    };

    await storage.putJSON(settingsKey, updatedSettings);
  }
}
