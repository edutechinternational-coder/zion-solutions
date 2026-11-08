import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

export const telegramUpdateSchema = z.object({
  update_id: z.number().int().nonnegative(),
  message: z.object({
    message_id: z.number().int().nonnegative(),
    chat: z.object({ id: z.number().int().safe(), title: z.string().max(256).optional() }),
    from: z.object({ first_name: z.string().max(256), last_name: z.string().max(256).optional() }).optional(),
    text: z.string().max(4096).optional(),
    caption: z.string().max(4096).optional(),
  }).optional(),
});

export function webhookSecret(key: string) {
  return createHash('sha256').update(`telegram-webhook:${key}`).digest('base64url');
}

export function validWebhookSecret(actual: string, key: string) {
  const left = Buffer.from(actual);
  const right = Buffer.from(webhookSecret(key));
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function telegramCall(method: string, body: Record<string, unknown>) {
  const key = process.env['TELEGRAM_API_KEY'];
  const auth = process.env['LOVABLE_API_KEY'];
  if (!key || !auth) throw new Error('Telegram não está configurado');
  const response = await fetch(`https://connector-gateway.lovable.dev/telegram/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${auth}`, 'X-Connection-Api-Key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.text();
    console.error(`Telegram [${response.status}]: ${error}`);
    throw new Error(`Telegram [${response.status}]: ${error}`);
  }
  const result = await response.json() as { ok: boolean; description?: string; result: { message_id: number } };
  if (!result.ok) throw new Error(`Telegram: ${result.description ?? 'Envio não concluído'}`);
  return result.result;
}