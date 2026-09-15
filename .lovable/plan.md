# Liberar o painel de administração da Zion

## O que está acontecendo

O painel da operação já existe e funciona (capital disponível, aprovações, cobrança de parcelas, histórico). Ele só não aparece porque a única conta cadastrada hoje — `edutech.international.br@gmail.com` — está marcada como cliente, e não como administradora. Sem essa marcação, o botão "Operação" fica escondido e a página mostra "Sua conta não tem permissão de administrador".

## O que será feito

1. Marcar a conta `edutech.international.br@gmail.com` como administradora da fintech (mantendo também o acesso de cliente).
2. Deixar o acesso ao painel da operação mais evidente para quem é administrador: botão "Operação" destacado no topo e um atalho no painel pessoal.
3. Conferir na prática, já logado, que o painel abre e mostra capital, solicitações pendentes, carteira e histórico.

## Detalhes técnicos

- Migração adicionando `('admin')` em `public.user_roles` para o usuário indicado (a tabela já tem `unique (user_id, role)`, então a inserção é idempotente com `on conflict do nothing`).
- Nenhuma alteração de RLS, políticas ou grants: as políticas já usam `private.has_role(auth.uid(), 'admin')`.
- Ajuste visual em `src/components/AppHeader.tsx` (variante do botão "Operação") e um card/atalho condicional em `src/routes/_authenticated/painel.tsx`.
- Verificação com Playwright em `/admin` usando sessão autenticada.

## Fora do escopo

Nada de novas telas de administração nem mudanças nas regras de negócio (juros, limites, aprovação).
