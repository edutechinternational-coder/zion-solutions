import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/telegram/webhook')({
  server: { handlers: { POST: async ({ request }) => {
    const key = process.env['TELEGRAM_API_KEY'];
    if (!key) return new Response('Unavailable', { status: 503 });
    const { validWebhookSecret, telegramUpdateSchema } = await import('@/lib/telegram.server');
    if (!validWebhookSecret(request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '', key)) return new Response('Unauthorized', { status: 401 });
    const raw = await request.text();
    if (raw.length > 65536) return new Response('Too large', { status: 413 });
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return new Response('Invalid JSON', { status: 400 }); }
    const update = telegramUpdateSchema.safeParse(parsed);
    if (!update.success) return new Response('Invalid update', { status: 400 });
    const message = update.data.message;
    if (!message) return Response.json({ ok: true, ignored: true });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error } = await supabaseAdmin.from('telegram_messages').upsert({
      update_id: update.data.update_id, chat_id: message.chat.id, message_id: message.message_id,
      direction: 'incoming', sender_name: message.chat.title ?? ([message.from?.first_name, message.from?.last_name].filter(Boolean).join(' ') || 'Telegram'),
      text: message.text ?? message.caption ?? '[Mensagem sem texto]',
    }, { onConflict: 'update_id', ignoreDuplicates: true });
    if (error) { console.error('Telegram storage failed', error.code); return new Response('Storage error', { status: 500 }); }
    return Response.json({ ok: true });
  } } },
});