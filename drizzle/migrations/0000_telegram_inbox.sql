CREATE TABLE public.telegram_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 update_id bigint UNIQUE,
 chat_id bigint NOT NULL,
 message_id bigint NOT NULL,
 direction text NOT NULL CHECK (direction IN ('incoming','outgoing')),
 sender_name text NOT NULL,
 text text NOT NULL CHECK (length(text) <= 4096),
 sent_by uuid,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(chat_id, message_id, direction)
);
GRANT SELECT ON public.telegram_messages TO authenticated;
GRANT ALL ON public.telegram_messages TO service_role;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "telegram admin read" ON public.telegram_messages FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'::public.app_role));
CREATE INDEX telegram_messages_chat_date ON public.telegram_messages(chat_id, created_at DESC);