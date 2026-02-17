import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { GmailMessage } from '@/types/comms';
import { ExternalServiceError } from '@/lib/errors';
import { logger } from '@/lib/logger';

interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

interface GmailTokens {
  accessToken: string;
  refreshToken: string;
}

export class GmailClient {
  private oauth2Client: OAuth2Client;
  private gmail: gmail_v1.Gmail | null = null;

  constructor(credentials: GmailCredentials) {
    this.oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );
  }

  // ============================================================================
  // AUTH FLOW
  // ============================================================================

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent', // Force consent screen to ensure we get refresh token
    });
  }

  async handleCallback(code: string): Promise<GmailTokens> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new ExternalServiceError(
          'Failed to obtain tokens from Gmail OAuth callback'
        );
      }

      return {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
      };
    } catch (error) {
      logger.error({ error }, 'Gmail OAuth callback failed');
      throw new ExternalServiceError('Gmail OAuth callback failed');
    }
  }

  setCredentials(refreshToken: string): void {
    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  // ============================================================================
  // EMAIL OPERATIONS
  // ============================================================================

  async listMessages(query?: string, maxResults = 50): Promise<GmailMessage[]> {
    if (!this.gmail) {
      throw new ExternalServiceError('Gmail client not initialized. Call setCredentials first.');
    }

    try {
      const defaultQuery = 'category:primary -category:promotions -category:social';
      const finalQuery = query || defaultQuery;

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: finalQuery,
        maxResults,
      });

      const messageIds = response.data.messages || [];

      if (messageIds.length === 0) {
        return [];
      }

      // Fetch full message details for each message
      const messages = await Promise.all(
        messageIds.map((msg) => this.getMessage(msg.id!))
      );

      return messages;
    } catch (error: any) {
      // Handle token expiration or other auth errors
      if (error.code === 401 || error.code === 403) {
        logger.error({ error }, 'Gmail API auth error - token may be expired');
        throw new ExternalServiceError('Gmail authentication failed. Please reconnect your account.');
      }

      logger.error({ error }, 'Failed to list Gmail messages');
      throw new ExternalServiceError('Failed to fetch emails from Gmail');
    }
  }

  async getMessage(messageId: string): Promise<GmailMessage> {
    if (!this.gmail) {
      throw new ExternalServiceError('Gmail client not initialized. Call setCredentials first.');
    }

    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;

      // Extract headers
      const headers = message.payload?.headers || [];
      const from = this.getHeader(headers, 'From') || '';
      const to = this.getHeader(headers, 'To') || '';
      const subject = this.getHeader(headers, 'Subject') || '(No Subject)';
      const date = this.getHeader(headers, 'Date') || new Date().toISOString();

      // Parse body
      const { body, bodyHtml } = this.parseBody(message.payload!);

      return {
        id: messageId,
        externalId: message.id!,
        threadId: message.threadId!,
        from,
        to,
        subject,
        body,
        bodyHtml,
        snippet: message.snippet || '',
        receivedAt: new Date(parseInt(message.internalDate || '0')).toISOString(),
        isRead: !message.labelIds?.includes('UNREAD'),
      };
    } catch (error: any) {
      if (error.code === 401 || error.code === 403) {
        throw new ExternalServiceError('Gmail authentication failed. Please reconnect your account.');
      }

      logger.error({ messageId, error }, 'Failed to get Gmail message');
      throw new ExternalServiceError('Failed to fetch email from Gmail');
    }
  }

  async sendMessage(
    to: string,
    subject: string,
    body: string,
    options?: { threadId?: string; inReplyTo?: string }
  ): Promise<string> {
    if (!this.gmail) {
      throw new ExternalServiceError('Gmail client not initialized. Call setCredentials first.');
    }

    try {
      // Build RFC 2822 formatted email
      const messageParts = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
      ];

      // If this is a reply, add threading headers
      if (options?.inReplyTo) {
        messageParts.push(`In-Reply-To: ${options.inReplyTo}`);
        messageParts.push(`References: ${options.inReplyTo}`);
      }

      messageParts.push('');
      messageParts.push(body);

      const rawMessage = messageParts.join('\r\n');

      // Base64url encode (RFC 4648)
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      const response = await this.gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: encodedMessage,
          threadId: options?.threadId,
        },
      });

      logger.info({ messageId: response.data.id, to, subject }, 'Email sent successfully');

      return response.data.id!;
    } catch (error: any) {
      if (error.code === 401 || error.code === 403) {
        throw new ExternalServiceError('Gmail authentication failed. Please reconnect your account.');
      }

      logger.error({ to, subject, error }, 'Failed to send Gmail message');
      throw new ExternalServiceError('Failed to send email via Gmail');
    }
  }

  async getNewMessagesSince(timestamp: string): Promise<GmailMessage[]> {
    // Convert ISO timestamp to Unix epoch seconds
    const epochSeconds = Math.floor(new Date(timestamp).getTime() / 1000);

    const query = `after:${epochSeconds} category:primary -category:promotions -category:social`;

    return this.listMessages(query);
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private getHeader(headers: gmail_v1.Schema$MessagePartHeader[], name: string): string | null {
    const header = headers.find((h) => h.name?.toLowerCase() === name.toLowerCase());
    return header?.value || null;
  }

  private parseBody(payload: gmail_v1.Schema$MessagePart): { body: string; bodyHtml: string } {
    let body = '';
    let bodyHtml = '';

    // Check if payload has body data directly
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8');

      if (payload.mimeType === 'text/plain') {
        body = decoded;
      } else if (payload.mimeType === 'text/html') {
        bodyHtml = decoded;
        body = this.stripHtml(decoded);
      }
    }

    // Check parts for multipart messages
    if (payload.parts && payload.parts.length > 0) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body = Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          bodyHtml = Buffer.from(part.body.data, 'base64').toString('utf-8');
        }

        // Recursively check nested parts
        if (part.parts) {
          const nested = this.parseBody(part);
          if (nested.body) body = nested.body;
          if (nested.bodyHtml) bodyHtml = nested.bodyHtml;
        }
      }
    }

    // If we have HTML but no plain text, strip HTML to get plain text
    if (!body && bodyHtml) {
      body = this.stripHtml(bodyHtml);
    }

    return { body, bodyHtml };
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }
}
