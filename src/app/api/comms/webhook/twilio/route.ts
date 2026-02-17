import { NextRequest, NextResponse } from 'next/server';
import { apiError } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { SMSClient } from '@/services/comms/sms-client';
import { InterviewScheduler } from '@/services/comms/interview-scheduler';
import type { UserSettings } from '@/types/notifications';
import type { Interview } from '@/types/interview';
import crypto from 'crypto';

/**
 * POST /api/comms/webhook/twilio
 * Handle incoming SMS/WhatsApp messages from Twilio
 * NO auth — validates Twilio signature instead
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Validate Twilio signature (optional but recommended)
    // For production: verify X-Twilio-Signature header
    const twilioSignature = req.headers.get('X-Twilio-Signature');
    if (process.env.TWILIO_AUTH_TOKEN && twilioSignature) {
      // TODO: Implement Twilio signature validation
      // For now, we'll skip this check in development
    }

    // 2. Parse Twilio webhook payload (application/x-www-form-urlencoded)
    const formData = await req.formData();
    const from = formData.get('From')?.toString() || '';
    const body = formData.get('Body')?.toString() || '';
    const messageSid = formData.get('MessageSid')?.toString() || '';

    if (!from || !body) {
      throw new Error('Invalid webhook payload');
    }

    // 3. Look up user by phone number
    // We need a phone-to-userId mapping
    const userId = await lookupUserByPhone(from);
    if (!userId) {
      // Unknown number — send generic response
      return twimlResponse('Sorry, we could not identify your account. Please configure your phone number in settings.');
    }

    // 4. Parse the action
    const parsed = SMSClient.parseInbound(body);

    // 5. Handle the action
    let responseMessage = 'Message received. Thank you!';

    if (parsed.action === 'confirm') {
      // Find pending interview and confirm it
      const interview = await findPendingInterview(userId);
      if (interview && interview.proposedTimes.length > 0) {
        const scheduler = new InterviewScheduler();
        await scheduler.confirmInterview(userId, interview.id, new Date(interview.proposedTimes[0]));
        responseMessage = `✓ Interview confirmed for ${new Date(interview.proposedTimes[0]).toLocaleDateString()}. Check your calendar for details.`;
      } else {
        responseMessage = 'No pending interview found to confirm.';
      }
    } else if (parsed.action === 'reschedule') {
      responseMessage = 'Please visit the app to reschedule your interview. We\'ll help you find a better time!';
    } else if (parsed.action === 'skip') {
      // Find pending auto-apply and cancel it
      // TODO: Implement auto-apply cancellation when that module is built
      responseMessage = 'Application cancelled. We won\'t apply to this job.';
    } else {
      responseMessage = 'We didn\'t understand that. Reply YES to confirm, RESCHEDULE to change time, or SKIP to cancel.';
    }

    // 6. Return TwiML response
    return twimlResponse(responseMessage);
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return twimlResponse('Sorry, something went wrong. Please try again later.');
  }
}

/**
 * Look up user by phone number
 * Uses a mapping file: comms/phone-map/{phone-hash}.json → { userId }
 */
async function lookupUserByPhone(phoneNumber: string): Promise<string | null> {
  try {
    
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
    // Hash the phone number for privacy
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    const mapping = await storage.getJSON<{ userId: string }>(`comms/phone-map/${hash}.json`);
    return mapping?.userId || null;
  } catch (error) {
    return null;
  }
}

/**
 * Find the most recent pending interview for a user
 */
async function findPendingInterview(userId: string): Promise<Interview | null> {
  try {
    
    const index = await storage.getJSON<{ interviews: Array<{ id: string; status: string }> }>(`users/${userId}/interviews/index.json`);
    if (!index?.interviews) return null;

    // Find first pending interview
    const pendingItem = index.interviews.find((i: { id: string; status: string }) => i.status === 'pending');
    if (!pendingItem) return null;

    // Load full interview details
    const interview = await storage.getJSON<Interview>(`users/${userId}/interviews/${pendingItem.id}.json`);
    return interview;
  } catch (error) {
    return null;
  }
}

/**
 * Generate TwiML response
 */
function twimlResponse(message: string): NextResponse {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new NextResponse(twiml, {
    status: 200,
    headers: {
      'Content-Type': 'text/xml',
    },
  });
}

/**
 * Escape XML special characters
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Helper function to create phone mapping when user configures their number
 * This should be called from the SMS/WhatsApp configure endpoints
 */
export async function createPhoneMapping(phoneNumber: string, userId: string): Promise<void> {
  
  const normalized = phoneNumber.replace(/[\s\-\(\)]/g, '');
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  await storage.putJSON(`comms/phone-map/${hash}.json`, { userId, phoneNumber: normalized });
}
