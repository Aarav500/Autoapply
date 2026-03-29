/**
 * Shared helpers for storing chatId → userId mappings in S3.
 */
import crypto from 'crypto';
import { storage } from '@/lib/storage';

export async function createTelegramMapping(chatId: number, userId: string): Promise<void> {
  const hash = crypto.createHash('sha256').update(String(chatId)).digest('hex');
  await storage.putJSON(`comms/telegram-map/${hash}.json`, { userId, chatId: String(chatId) });
}
