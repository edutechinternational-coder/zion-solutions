import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { assertAdmin } from './admin.server';

export const sendTelegramReply = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ chatId: z.number().int().safe(), text: z.string().trim().min(1).max(4096) }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: conversation, error } = await context.supabase.from('telegram_messages').select('id').eq('chat_id', data.chatId).limit(1);
    if (error || !conversation?.length) throw new Error('Conversa não encontrada');
    const { telegramCall } = await import('./telegram.server');
    const message = await telegramCall('sendMessage', { chat_id: data.chatId, text: data.text });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { error: saveError } = await supabaseAdmin.from('telegram_messages').insert({
      chat_id: data.chatId, message_id: message.message_id, direction: 'outgoing', sender_name: 'Equipe Zion', text: data.text, sent_by: context.userId,
    });
    if (saveError) throw new Error('Mensagem enviada ao Telegram, mas não foi salva no histórico. Não reenvie.');
    return { ok: true };
  });