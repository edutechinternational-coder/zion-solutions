import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useServerFn } from '@tanstack/react-start';
import { Send, RefreshCw, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sendTelegramReply } from '@/lib/telegram.functions';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function TelegramInbox() {
  const client = useQueryClient();
  const reply = useServerFn(sendTelegramReply);
  const [selected, setSelected] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const messages = useQuery({ queryKey: ['telegram-messages'], queryFn: async () => {
    const { data, error } = await supabase.from('telegram_messages').select('*').order('created_at', { ascending: false }).limit(500);
    if (error) throw new Error('Não foi possível carregar as mensagens');
    return data;
  }, refetchInterval: 10000 });
  const rows = messages.data ?? [];
  const chats = [...new Map(rows.filter(row => row.direction === 'incoming').map(row => [row.chat_id, row])).values()];
  const chatId = selected ?? chats[0]?.chat_id;
  useEffect(() => { setText(''); }, [chatId]);
  async function send() {
    if (chatId === undefined || !text.trim()) return;
    setSending(true);
    try {
      await reply({ data: { chatId, text } });
      setText('');
      await client.invalidateQueries({ queryKey: ['telegram-messages'] });
      toast.success('Mensagem enviada');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Envio não concluído'); }
    finally { setSending(false); }
  }
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><h2 className="flex items-center gap-2 text-xl font-semibold"><MessageCircle className="size-5" />Telegram</h2><Button variant="outline" size="icon" aria-label="Atualizar mensagens" title="Atualizar mensagens" onClick={() => void messages.refetch()}><RefreshCw className="size-4" /></Button></div>
    {messages.isPending ? <p className="text-muted-foreground">Carregando mensagens…</p> : messages.isError ? <p role="alert" className="text-destructive">{messages.error.message}</p> : !chats.length ? <p className="text-muted-foreground">Nenhuma conversa recebida. <a className="text-primary underline" href="https://t.me/Eduardo_TechBot" target="_blank" rel="noreferrer">Abrir @Eduardo_TechBot</a></p> : <div className="grid gap-6 md:grid-cols-[220px_1fr]">
      <nav aria-label="Conversas Telegram" className="flex gap-2 overflow-x-auto md:flex-col">{chats.map(chat => <Button className="shrink-0 justify-start truncate" key={chat.chat_id} variant={chatId === chat.chat_id ? 'secondary' : 'ghost'} onClick={() => setSelected(chat.chat_id)}>{chat.sender_name}</Button>)}</nav>
      <div className="min-w-0 space-y-4"><div className="h-80 space-y-3 overflow-y-auto border-b border-border pb-4" aria-label="Histórico de mensagens">{rows.filter(row => row.chat_id === chatId).reverse().map(row => <div key={row.id} className={`max-w-[90%] rounded-lg p-3 ${row.direction === 'outgoing' ? 'ml-auto bg-secondary text-secondary-foreground' : 'bg-muted text-foreground'}`}><p className="text-xs text-muted-foreground">{row.sender_name} · {new Date(row.created_at).toLocaleString('pt-BR')}</p><p className="mt-1 whitespace-pre-wrap break-words">{row.text}</p></div>)}</div>
        <form className="flex items-end gap-2" onSubmit={event => { event.preventDefault(); void send(); }}><Textarea aria-label="Resposta Telegram" placeholder="Escreva sua resposta" maxLength={4096} value={text} onChange={event => setText(event.target.value)} disabled={sending} /><Button type="submit" size="icon" title="Enviar resposta" aria-label="Enviar resposta" disabled={sending || !text.trim()}><Send className="size-4" /></Button></form>
      </div></div>}
  </section>;
}