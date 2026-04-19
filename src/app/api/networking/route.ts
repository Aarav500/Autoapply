import { NextRequest } from 'next/server';
import { apiResponse, apiError, authenticate, errorResponse } from '@/lib/api-utils';
import { storage } from '@/lib/storage';
import { aiClient } from '@/lib/ai-client';
import { logger } from '@/lib/logger';
import { generateId } from '@/lib/utils';
import type { Profile } from '@/types/profile';

interface Contact {
  id: string;
  name: string;
  company: string;
  role: string;
  email?: string;
  linkedinUrl?: string;
  lastContactDate?: string;
  followUpDate?: string;
  notes: string;
  tags: string[];
  status: 'active' | 'responded' | 'cold' | 'converted';
  createdAt: string;
}

const CONTACTS_KEY = (userId: string) => `users/${userId}/networking/contacts.json`;

async function loadContacts(userId: string): Promise<Contact[]> {
  const raw = await storage.getJSON<Contact[]>(CONTACTS_KEY(userId));
  return Array.isArray(raw) ? raw : [];
}

async function saveContacts(userId: string, contacts: Contact[]): Promise<void> {
  await storage.putJSON(CONTACTS_KEY(userId), contacts);
}

function sortContacts(contacts: Contact[]): Contact[] {
  const now = new Date();
  return [...contacts].sort((a, b) => {
    const aOverdue = a.followUpDate && new Date(a.followUpDate) < now;
    const bOverdue = b.followUpDate && new Date(b.followUpDate) < now;

    // Overdue follow-ups first
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // Then by follow-up date ascending (soonest first)
    if (a.followUpDate && b.followUpDate) {
      return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
    }
    if (a.followUpDate && !b.followUpDate) return -1;
    if (!a.followUpDate && b.followUpDate) return 1;

    // Then by lastContactDate descending
    if (a.lastContactDate && b.lastContactDate) {
      return new Date(b.lastContactDate).getTime() - new Date(a.lastContactDate).getTime();
    }
    if (a.lastContactDate && !b.lastContactDate) return -1;
    if (!a.lastContactDate && b.lastContactDate) return 1;

    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/**
 * GET /api/networking
 * Returns all contacts sorted by follow-up date (overdue first), then last contact date desc.
 */
export async function GET(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const contacts = await loadContacts(userId);
    const sorted = sortContacts(contacts);

    logger.info({ userId, count: sorted.length }, 'Networking contacts listed');
    return apiResponse({ contacts: sorted, total: sorted.length });
  } catch (error) {
    logger.error({ error }, 'List networking contacts error');
    return apiError(error);
  }
}

/**
 * POST /api/networking
 * action=create: Create a new contact.
 * action=generate-message: Generate a personalized outreach message for a contact.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as Record<string, unknown>;
    const action = body.action as string;

    if (action === 'create') {
      const contacts = await loadContacts(userId);

      const contact: Contact = {
        id: generateId(),
        name: String(body.name ?? '').trim(),
        company: String(body.company ?? '').trim(),
        role: String(body.role ?? '').trim(),
        email: body.email ? String(body.email).trim() : undefined,
        linkedinUrl: body.linkedinUrl ? String(body.linkedinUrl).trim() : undefined,
        lastContactDate: body.lastContactDate ? String(body.lastContactDate) : undefined,
        followUpDate: body.followUpDate ? String(body.followUpDate) : undefined,
        notes: String(body.notes ?? '').trim(),
        tags: Array.isArray(body.tags) ? (body.tags as string[]).map(String) : [],
        status: (['active', 'responded', 'cold', 'converted'].includes(body.status as string)
          ? body.status
          : 'active') as Contact['status'],
        createdAt: new Date().toISOString(),
      };

      contacts.push(contact);
      await saveContacts(userId, contacts);

      logger.info({ userId, contactId: contact.id }, 'Networking contact created');
      return apiResponse({ contact });
    }

    if (action === 'generate-message') {
      const contactId = String(body.contactId ?? '');
      const messageType = String(body.messageType ?? 'follow-up') as
        | 'follow-up'
        | 'cold-outreach'
        | 'thank-you'
        | 'referral-ask';

      const contacts = await loadContacts(userId);
      const contact = contacts.find((c) => c.id === contactId);

      if (!contact) {
        return errorResponse('Contact not found', 404);
      }

      const profileData = await storage.getJSON<Profile>(`users/${userId}/profile.json`);
      const senderName = profileData?.name ?? 'a professional';
      const senderHeadline = profileData?.headline ?? '';

      const messageTypeDescriptions: Record<typeof messageType, string> = {
        'follow-up': 'a thoughtful follow-up message after a previous interaction',
        'cold-outreach': 'a compelling cold outreach message introducing yourself',
        'thank-you': 'a warm thank-you message after a conversation or help received',
        'referral-ask': 'a polite request for a referral or introduction',
      };

      const contextParts: string[] = [
        `Contact name: ${contact.name}`,
        `Contact role: ${contact.role} at ${contact.company}`,
      ];
      if (contact.email) contextParts.push(`Contact email: ${contact.email}`);
      if (contact.tags.length > 0) contextParts.push(`Relationship tags: ${contact.tags.join(', ')}`);
      if (contact.lastContactDate)
        contextParts.push(`Last contacted: ${contact.lastContactDate}`);
      if (contact.notes) contextParts.push(`Notes/context: ${contact.notes}`);

      const system =
        'You are a professional networking coach. Write natural, personalized outreach messages that don\'t sound templated.';

      const user = [
        `Write ${messageTypeDescriptions[messageType]} from ${senderName}${senderHeadline ? ` (${senderHeadline})` : ''} to ${contact.name}.`,
        '',
        'Context about the contact:',
        ...contextParts,
        '',
        'Requirements:',
        '- 2–3 short paragraphs, conversational and genuine',
        '- Reference specific details about their role or company',
        '- Avoid generic openers like "I hope this finds you well"',
        '- End with a clear, low-pressure call to action',
        '- Do not include a subject line — just the message body',
      ].join('\n');

      const message = await aiClient.complete(system, user, {
        model: 'balanced',
        maxTokens: 1024,
      });

      logger.info({ userId, contactId, messageType }, 'Networking message generated');
      return apiResponse({ message });
    }

    return errorResponse('Invalid action', 400);
  } catch (error) {
    logger.error({ error }, 'POST networking error');
    return apiError(error);
  }
}

/**
 * PATCH /api/networking
 * Update an existing contact by id.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);
    const body = await req.json() as Record<string, unknown>;
    const id = String(body.id ?? '');

    if (!id) {
      return errorResponse('Contact id is required', 400);
    }

    const contacts = await loadContacts(userId);
    const index = contacts.findIndex((c) => c.id === id);

    if (index === -1) {
      return errorResponse('Contact not found', 404);
    }

    const existing = contacts[index];
    const allowedUpdates: Partial<Contact> = {};

    if (body.name !== undefined) allowedUpdates.name = String(body.name).trim();
    if (body.company !== undefined) allowedUpdates.company = String(body.company).trim();
    if (body.role !== undefined) allowedUpdates.role = String(body.role).trim();
    if (body.email !== undefined)
      allowedUpdates.email = body.email ? String(body.email).trim() : undefined;
    if (body.linkedinUrl !== undefined)
      allowedUpdates.linkedinUrl = body.linkedinUrl ? String(body.linkedinUrl).trim() : undefined;
    if (body.lastContactDate !== undefined)
      allowedUpdates.lastContactDate = body.lastContactDate
        ? String(body.lastContactDate)
        : undefined;
    if (body.followUpDate !== undefined)
      allowedUpdates.followUpDate = body.followUpDate ? String(body.followUpDate) : undefined;
    if (body.notes !== undefined) allowedUpdates.notes = String(body.notes).trim();
    if (Array.isArray(body.tags))
      allowedUpdates.tags = (body.tags as string[]).map(String);
    if (
      body.status !== undefined &&
      ['active', 'responded', 'cold', 'converted'].includes(body.status as string)
    ) {
      allowedUpdates.status = body.status as Contact['status'];
    }

    const updated: Contact = { ...existing, ...allowedUpdates };
    contacts[index] = updated;
    await saveContacts(userId, contacts);

    logger.info({ userId, contactId: id }, 'Networking contact updated');
    return apiResponse({ contact: updated });
  } catch (error) {
    logger.error({ error }, 'PATCH networking error');
    return apiError(error);
  }
}

/**
 * DELETE /api/networking
 * Remove a contact by id (from request body or query param).
 */
export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await authenticate(req);

    let id: string;
    const queryId = req.nextUrl.searchParams.get('id');

    if (queryId) {
      id = queryId;
    } else {
      const body = await req.json() as Record<string, unknown>;
      id = String(body.id ?? '');
    }

    if (!id) {
      return errorResponse('Contact id is required', 400);
    }

    const contacts = await loadContacts(userId);
    const filtered = contacts.filter((c) => c.id !== id);

    if (filtered.length === contacts.length) {
      return errorResponse('Contact not found', 404);
    }

    await saveContacts(userId, filtered);

    logger.info({ userId, contactId: id }, 'Networking contact deleted');
    return apiResponse({ success: true });
  } catch (error) {
    logger.error({ error }, 'DELETE networking error');
    return apiError(error);
  }
}
