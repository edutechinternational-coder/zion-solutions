import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { telegramUpdateSchema, webhookSecret, validWebhookSecret } from './telegram.server';

describe('Telegram webhook security', () => {
  it('accepts only the secret derived from this connection', () => {
    assert.equal(validWebhookSecret(webhookSecret('test-key'), 'test-key'), true);
    assert.equal(validWebhookSecret(webhookSecret('other-key'), 'test-key'), false);
    assert.equal(validWebhookSecret('', 'test-key'), false);
  });
  it('accepts incoming text and rejects malformed update IDs', () => {
    const message = { message_id: 1, chat: { id: 123 }, text: 'Olá Zion' };
    assert.equal(telegramUpdateSchema.safeParse({ update_id: 42, message }).success, true);
    assert.equal(telegramUpdateSchema.safeParse({ update_id: -1, message }).success, false);
    assert.equal(telegramUpdateSchema.safeParse({ update_id: 42, message: { ...message, text: 'x'.repeat(4097) } }).success, false);
  });
});