/**
 * POST /api/interview/[id]/follow-up - Generate follow-up email
 * PUT /api/interview/[id]/follow-up - Send the follow-up email via Gmail
 */

import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/api-utils';
import { apiResponse, apiError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { generateFollowUpEmail } from '@/services/interview/post-interview';
import { GmailClient } from '@/services/comms/gmail-client';
import { decrypt } from '@/lib/encryption';
import { Interview } from '@/types/interview';
import { UserSettings } from '@/types/notifications';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    // Generate follow-up email
    const draft = await generateFollowUpEmail(userId, id);

    // Save draft
    await storage.updateJSON<Interview>(`users/${userId}/interviews/${id}.json`, (current) => {
      if (!current) throw new Error('Interview not found');
      return {
        ...current,
        prepData: {
          ...(current.prepData || {}),
          followUpDraft: draft,
          followUpGeneratedAt: new Date().toISOString(),
        },
      };
    });

    return apiResponse({
      draft,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId } = await authenticate(req);
    const { id } = await params;

    // Load interview
    const interview = await storage.getJSON<Interview>(`users/${userId}/interviews/${id}.json`);

    if (!interview) {
      return apiError(new Error('Interview not found'), 404);
    }

    const draft = (interview.prepData as any)?.followUpDraft;
    if (!draft) {
      return apiError(new Error('No follow-up draft found. Generate one first via POST.'), 400);
    }

    // Check Gmail connection
    const settings = await storage.getJSON<UserSettings>(`users/${userId}/settings.json`);
    if (!settings?.googleRefreshToken) {
      return apiError(new Error('Gmail not connected'), 400);
    }

    // Send email
    const gmailClient = new GmailClient({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${process.env.APP_URL}/api/comms/email/callback`,
    });
    gmailClient.setCredentials(decrypt(settings.googleRefreshToken));

    const to = interview.interviewerEmail || '';
    if (!to) {
      return apiError(new Error('No interviewer email found'), 400);
    }

    await gmailClient.sendMessage(to, `Following up - ${interview.role} Interview`, draft);

    // Mark as sent
    await storage.updateJSON<Interview>(`users/${userId}/interviews/${id}.json`, (current) => {
      if (!current) throw new Error('Interview not found');
      return {
        ...current,
        followUpSent: true,
        prepData: {
          ...(current.prepData || {}),
          followUpSentAt: new Date().toISOString(),
        },
      };
    });

    return apiResponse({ success: true });
  } catch (error) {
    return apiError(error);
  }
}
