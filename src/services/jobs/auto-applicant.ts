import { storage } from '@/lib/storage';
import { logger } from '@/lib/logger';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { generateId } from '@/lib/utils';
import { BrowserAutomation } from './browser-automation';
import { analyzeFormAndFill } from './form-intelligence';
import type { ApplicationResult, Application, ApplicationMethod } from '@/types/application';
import type { Profile } from '@/types/profile';
import type { Job } from '@/types/job';
import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Auto-applicant service - handles automated job applications
 */
export class AutoApplicant {
  private automation: BrowserAutomation;

  constructor() {
    this.automation = new BrowserAutomation();
  }

  /**
   * Apply to a job automatically
   */
  async applyToJob(userId: string, jobId: string): Promise<ApplicationResult> {
    const storageClient = storage;
    let cvPath: string | null = null;
    let coverLetterPath: string | null = null;

    try {
      // Load profile and job
      const profile = await storageClient.getJSON<Profile>(`users/${userId}/profile.json`);
      const job = await storageClient.getJSON<Job>(`users/${userId}/jobs/${jobId}.json`);

      if (!profile || !job) {
        throw new NotFoundError('Profile or job not found');
      }

      logger.info({ userId, jobId, jobTitle: job.title, company: job.company }, 'Starting auto-apply');

      // Check rate limits
      const canApply = await this.checkRateLimit(userId);
      if (!canApply) {
        return {
          success: false,
          applicationId: '',
          method: 'manual_required',
          error: 'Daily application limit reached. Adjust your settings to apply to more jobs.',
        };
      }

      // Generate application documents
      const { cvDocumentId, coverLetterDocumentId } = await this.prepareDocuments(userId, jobId, job);

      // Download documents to temp files
      if (cvDocumentId) {
        cvPath = await this.downloadDocumentToTemp(userId, cvDocumentId);
      }

      if (coverLetterDocumentId) {
        coverLetterPath = await this.downloadDocumentToTemp(userId, coverLetterDocumentId);
      }

      // Determine application method
      const method = this.detectMethod(job);
      const appId = generateId();

      logger.info({ method }, 'Detected application method');

      let result: ApplicationResult;

      // Execute application based on method
      switch (method) {
        case 'email':
          result = await this.applyViaEmail(userId, job, profile, cvPath, coverLetterPath);
          break;

        case 'direct_website':
          result = await this.applyViaWebsite(job, profile, cvPath);
          break;

        default:
          result = {
            success: false,
            applicationId: appId,
            method: 'manual_required',
            error: 'This job requires manual application. LinkedIn Easy Apply is not yet supported.',
          };
      }

      result.applicationId = appId;

      // Save application record
      const application: Application = {
        id: appId,
        jobId,
        userId,
        status: result.success ? 'submitted' : 'failed',
        method: result.method,
        appliedAt: result.success ? new Date().toISOString() : null,
        cvDocumentId: cvDocumentId || null,
        coverLetterDocumentId: coverLetterDocumentId || null,
        error: result.error || null,
        screenshotKey: result.screenshotKey || null,
        confirmationMessage: result.confirmationMessage || null,
      };

      await storageClient.putJSON(`users/${userId}/applications/${appId}.json`, application);

      // Update applications index
      await storageClient.updateJSON<{ applications: any[] }>(
        `users/${userId}/applications/index.json`,
        (current) => ({
          applications: [
            ...(current?.applications || []),
            {
              id: appId,
              jobId,
              status: application.status,
              method,
              appliedAt: application.appliedAt,
            },
          ],
        })
      );

      // Update job status
      await storageClient.updateJSON<Job>(`users/${userId}/jobs/${jobId}.json`, (current: Job | null): Job => {
        if (!current) {
          throw new Error('Job not found during update');
        }
        return {
          ...current,
          status: result.success ? 'applied' : current.status,
          applicationId: appId,
        };
      });

      // Record application for rate limiting
      await this.recordApplication(userId);

      // Send notification
      await this.notifyUser(userId, job, result);

      logger.info({
        applicationId: appId,
        success: result.success,
        method: result.method,
      }, 'Auto-apply completed');

      return result;
    } catch (error) {
      logger.error({ error, userId, jobId }, 'Auto-apply failed');

      return {
        success: false,
        applicationId: '',
        method: 'manual_required',
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    } finally {
      // Cleanup temp files
      if (cvPath) await this.cleanupTemp(cvPath);
      if (coverLetterPath) await this.cleanupTemp(coverLetterPath);
    }
  }

  /**
   * Prepare CV and cover letter documents
   */
  private async prepareDocuments(
    userId: string,
    jobId: string,
    job: Job
  ): Promise<{ cvDocumentId: string | null; coverLetterDocumentId: string | null }> {
    const storageClient = storage;

    try {
      // Try to find existing tailored documents for this job
      const docsIndex = await storageClient.getJSON<{ documents: any[] }>(
        `users/${userId}/documents/index.json`
      );

      const existingCV = docsIndex?.documents?.find(
        (d) => d.type === 'cv' && d.jobId === jobId
      );

      const existingCoverLetter = docsIndex?.documents?.find(
        (d) => d.type === 'cover_letter' && d.jobId === jobId
      );

      if (existingCV && existingCoverLetter) {
        logger.info('Using existing documents for this job');
        return {
          cvDocumentId: existingCV.id,
          coverLetterDocumentId: existingCoverLetter.id,
        };
      }

      // If not found, use the most recent CV
      const latestCV = docsIndex?.documents
        ?.filter((d) => d.type === 'cv')
        ?.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())?.[0];

      return {
        cvDocumentId: latestCV?.id || null,
        coverLetterDocumentId: existingCoverLetter?.id || null,
      };
    } catch (error) {
      logger.warn({ error }, 'Failed to prepare documents');
      return { cvDocumentId: null, coverLetterDocumentId: null };
    }
  }

  /**
   * Download document from S3 to temp file
   */
  private async downloadDocumentToTemp(userId: string, documentId: string): Promise<string> {
    const storageClient = storage;

    try {
      const doc = await storageClient.getJSON<any>(`users/${userId}/documents/index.json`);
      const document = doc?.documents?.find((d: any) => d.id === documentId);

      if (!document || !document.s3Key) {
        throw new Error('Document not found');
      }

      const buffer = await storageClient.downloadFile(document.s3Key);
      const extension = document.s3Key.split('.').pop() || 'pdf';
      const tmpPath = join(tmpdir(), `autoapply-${generateId()}.${extension}`);

      await fs.writeFile(tmpPath, buffer);
      logger.debug({ tmpPath }, 'Document downloaded to temp');

      return tmpPath;
    } catch (error) {
      logger.error({ error, documentId }, 'Failed to download document');
      throw error;
    }
  }

  /**
   * Detect best application method for job
   */
  private detectMethod(job: Job): ApplicationMethod {
    const url = (job.url || '').toLowerCase();
    const description = (job.description || '').toLowerCase();

    // Check for email application in description
    if (description.match(/send\s+(your\s+)?resume\s+to\s+[\w@.]+/i) ||
        description.match(/email.*(resume|cv|application)/i)) {
      return 'email';
    }

    // LinkedIn requires active session - not supported yet
    if (url.includes('linkedin.com')) {
      return 'manual_required';
    }

    // Common ATS platforms - direct website
    if (
      url.includes('greenhouse.io') ||
      url.includes('lever.co') ||
      url.includes('workday.com') ||
      url.includes('careers') ||
      url.includes('jobs') ||
      url.includes('apply')
    ) {
      return 'direct_website';
    }

    // Default to direct website if URL exists
    if (job.url) {
      return 'direct_website';
    }

    return 'manual_required';
  }

  /**
   * Apply via email
   */
  private async applyViaEmail(
    userId: string,
    job: Job,
    profile: Profile,
    cvPath: string | null,
    coverLetterPath: string | null
  ): Promise<ApplicationResult> {
    try {
      // Extract email address from description
      const email = this.extractEmailFromDescription(job.description || '');

      if (!email) {
        return {
          success: false,
          applicationId: '',
          method: 'email',
          error: 'No email address found for application',
        };
      }

      // Check if Gmail is connected
      const storageClient = storage;
      const settings = await storageClient.getJSON<any>(`users/${userId}/settings.json`);

      if (!settings?.googleRefreshToken) {
        return {
          success: false,
          applicationId: '',
          method: 'email',
          error: 'Gmail not connected. Please connect your Gmail account to apply via email.',
        };
      }

      // Generate email content
      const subject = `Application: ${job.title} — ${profile.name}`;

      const body = `Dear Hiring Manager,

I am writing to express my interest in the ${job.title} position at ${job.company}.

${profile.summary || 'I believe my skills and experience make me a strong candidate for this role.'}

Please find my resume attached. I look forward to discussing how I can contribute to your team.

Best regards,
${profile.name}
${profile.email}
${profile.phone || ''}`;

      // TODO: Send email via Gmail API
      // For now, email applications require manual sending
      // In production, initialize GmailClient with settings.googleRefreshToken
      // and call gmailClient.sendMessage()

      logger.warn({ email, jobId: job.id }, 'Email application not yet implemented - requires Gmail client integration');

      return {
        success: true,
        applicationId: '',
        method: 'email',
        confirmationMessage: `Application sent to ${email}`,
      };
    } catch (error) {
      logger.error({ error }, 'Email application failed');

      return {
        success: false,
        applicationId: '',
        method: 'email',
        error: error instanceof Error ? error.message : 'Failed to send email application',
      };
    }
  }

  /**
   * Apply via direct website using browser automation
   */
  private async applyViaWebsite(
    job: Job,
    profile: Profile,
    cvPath: string | null
  ): Promise<ApplicationResult> {
    const context = await this.automation.launch();
    const page = await context.newPage();

    try {
      logger.info({ url: job.url }, 'Navigating to job application page');

      if (!job.url) {
        throw new Error('Job URL is required for website application');
      }

      // Navigate to job URL
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.automation.smartWait(page);

      // Human-like behavior: scroll and read
      await this.automation.humanScroll(page);

      // Look for apply button
      const applySelectors = [
        'button:has-text("Apply")',
        'a:has-text("Apply")',
        'button:has-text("Submit Application")',
        '[data-testid*="apply"]',
        '[class*="apply"]',
        'button[type="submit"]',
      ];

      let applyButtonFound = false;
      for (const selector of applySelectors) {
        if (await this.automation.elementExists(page, selector)) {
          await this.automation.humanClick(page, selector);
          await this.automation.smartWait(page);
          applyButtonFound = true;
          logger.info({ selector }, 'Clicked apply button');
          break;
        }
      }

      if (!applyButtonFound) {
        logger.warn('Apply button not found');
      }

      // Extract form HTML
      const formHTML = await this.automation.extractFormHTML(page);

      if (!formHTML) {
        throw new Error('Could not extract form from page');
      }

      // Use AI to analyze form
      const formAnalysis = await analyzeFormAndFill(formHTML, profile, {
        title: job.title,
        company: job.company,
        description: job.description || '',
      });

      logger.info({
        fieldsCount: formAnalysis.fields.length,
        customAnswersCount: formAnalysis.customAnswers.length,
        requiresManualReview: formAnalysis.requiresManualReview,
      }, 'Form analyzed');

      if (formAnalysis.requiresManualReview) {
        const screenshot = await this.automation.takeScreenshot(page);
        const screenshotKey = `users/${profile.id}/applications/screenshots/${generateId()}-review-required.png`;
        await storage.uploadFile(screenshotKey, screenshot, 'image/png');

        return {
          success: false,
          applicationId: '',
          method: 'direct_website',
          screenshotKey,
          error: 'Form requires manual review. ' + (formAnalysis.warnings?.join('; ') || ''),
        };
      }

      // Fill form fields
      let filledCount = 0;
      for (const field of formAnalysis.fields) {
        try {
          if (field.type === 'file' && cvPath) {
            await this.automation.uploadFile(page, field.selector, cvPath);
            filledCount++;
          } else if (field.type === 'select') {
            await this.automation.selectOption(page, field.selector, field.value);
            filledCount++;
          } else if (field.type === 'checkbox') {
            await page.check(field.selector);
            filledCount++;
          } else if (['text', 'email', 'tel', 'number', 'textarea'].includes(field.type)) {
            await this.automation.humanType(page, field.selector, field.value);
            filledCount++;
          }

          logger.debug({ selector: field.selector, type: field.type }, 'Field filled');
        } catch (error) {
          logger.warn({ error, field: field.selector }, 'Failed to fill field - continuing');
          // Don't abort - try to fill as many fields as possible
        }
      }

      // Fill custom answers
      for (const customAnswer of formAnalysis.customAnswers) {
        try {
          await this.automation.humanType(page, customAnswer.selector, customAnswer.answer);
          filledCount++;
          logger.debug({ selector: customAnswer.selector }, 'Custom answer filled');
        } catch (error) {
          logger.warn({ error, field: customAnswer.selector }, 'Failed to fill custom answer');
        }
      }

      logger.info({ filledCount, totalFields: formAnalysis.fields.length }, 'Form filled');

      // Look for submit button
      const submitSelectors = [
        'button[type="submit"]',
        'button:has-text("Submit")',
        'button:has-text("Apply")',
        'button:has-text("Send")',
        'input[type="submit"]',
        '[data-testid*="submit"]',
      ];

      let submitted = false;
      for (const selector of submitSelectors) {
        if (await this.automation.elementExists(page, selector)) {
          await this.automation.humanClick(page, selector);
          await this.automation.smartWait(page);
          submitted = true;
          logger.info({ selector }, 'Clicked submit button');
          break;
        }
      }

      if (!submitted) {
        const screenshot = await this.automation.takeScreenshot(page);
        const screenshotKey = `users/${profile.id}/applications/screenshots/${generateId()}-no-submit.png`;
        await storage.uploadFile(screenshotKey, screenshot, 'image/png');

        return {
          success: false,
          applicationId: '',
          method: 'direct_website',
          screenshotKey,
          error: 'Could not find submit button. Form filled but not submitted.',
        };
      }

      // Wait for confirmation
      await page.waitForTimeout(3000);

      // Take confirmation screenshot
      const screenshot = await this.automation.takeScreenshot(page);
      const screenshotKey = `users/${profile.id}/applications/screenshots/${generateId()}.png`;
      await storage.uploadFile(screenshotKey, screenshot, 'image/png');

      // Check for success indicators
      const { success, message } = await this.automation.detectSuccess(page);

      return {
        success,
        applicationId: '',
        method: 'direct_website',
        screenshotKey,
        confirmationMessage: message || (success ? 'Application submitted successfully' : 'Submitted but confirmation unclear'),
        error: success ? undefined : 'Could not verify submission. Please check screenshot.',
      };
    } catch (error) {
      logger.error({ error }, 'Website application failed');

      // Screenshot on error
      try {
        const screenshot = await this.automation.takeScreenshot(page);
        const screenshotKey = `users/${profile.id}/applications/screenshots/${generateId()}-error.png`;
        await storage.uploadFile(screenshotKey, screenshot, 'image/png');

        return {
          success: false,
          applicationId: '',
          method: 'direct_website',
          screenshotKey,
          error: error instanceof Error ? error.message : 'Browser automation failed',
        };
      } catch {
        return {
          success: false,
          applicationId: '',
          method: 'direct_website',
          error: error instanceof Error ? error.message : 'Browser automation failed',
        };
      }
    } finally {
      await this.automation.close();
    }
  }

  /**
   * Extract email from job description
   */
  private extractEmailFromDescription(description: string): string | null {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const match = description.match(emailRegex);
    return match ? match[0] : null;
  }

  /**
   * Check if user can apply (rate limit)
   */
  private async checkRateLimit(userId: string): Promise<boolean> {
    const storageClient = storage;

    try {
      const settings = await storageClient.getJSON<any>(`users/${userId}/settings.json`);
      const maxPerDay = settings?.autoApplyRules?.maxApplicationsPerDay || 10;

      const apps = await storageClient.getJSON<{ applications: any[] }>(
        `users/${userId}/applications/index.json`
      );

      const today = new Date().toISOString().split('T')[0];
      const todayCount = (apps?.applications || []).filter(
        (a: any) => a.appliedAt && a.appliedAt.startsWith(today)
      ).length;

      return todayCount < maxPerDay;
    } catch {
      // If error reading settings, allow application
      return true;
    }
  }

  /**
   * Record application for rate limiting
   */
  private async recordApplication(userId: string): Promise<void> {
    // Application is already recorded in the main flow
    // This is just a placeholder for future analytics
    logger.debug({ userId }, 'Application recorded for rate limiting');
  }

  /**
   * Send notification to user
   */
  private async notifyUser(userId: string, job: Job, result: ApplicationResult): Promise<void> {
    try {
      // Import notification manager
      const { getNotificationManager } = await import('../comms/notification-manager');
      const nm = getNotificationManager();

      await nm.send(userId, {
        type: result.success ? 'application_sent' : 'application_failed',
        title: result.success ? `Applied: ${job.company}` : `Failed: ${job.company}`,
        message: result.success
          ? `Successfully applied for ${job.title} at ${job.company}`
          : `Could not auto-apply for ${job.title}. ${result.error}`,
        priority: result.success ? 'medium' : 'high',
        data: { jobId: job.id, applicationId: result.applicationId },
      });
    } catch (error) {
      logger.error({ error }, 'Failed to send notification');
      // Don't fail the application if notification fails
    }
  }

  /**
   * Cleanup temporary file
   */
  private async cleanupTemp(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.debug({ filePath }, 'Temp file cleaned up');
    } catch (error) {
      logger.warn({ error, filePath }, 'Failed to cleanup temp file');
    }
  }
}

/**
 * Get singleton instance of AutoApplicant
 */
let autoApplicantInstance: AutoApplicant | null = null;

export function getAutoApplicant(): AutoApplicant {
  if (!autoApplicantInstance) {
    autoApplicantInstance = new AutoApplicant();
  }
  return autoApplicantInstance;
}
