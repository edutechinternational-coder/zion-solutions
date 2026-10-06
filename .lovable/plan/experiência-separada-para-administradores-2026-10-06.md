# Experiência separada para administradores

## Problema
Hoje, ao entrar, todos (inclusive administradores) caem no painel de cliente ("Meu painel"). O painel da operação fica escondido atrás de um botão.

## O que será feito
1. **Entrada direta na Operação**: ao fazer login, administradores vão direto para o painel da operação; clientes continuam indo para "Meu painel".
2. **Painel de cliente redireciona**: se um administrador abrir "Meu painel", é levado automaticamente para a Operação (sem ver tela de cliente).
3. **Topo próprio para admins**: no lugar de "Meu painel", o menu mostra "Operação", "Solicitações", "Carteira" e "Histórico" (atalhos para as abas), além de "Sair". Selo "Administrador" ao lado do logo.
4. **Remover o atalho de admin dentro do painel de cliente** (fica desnecessário).
5. Conferir no navegador, logado como a conta da EduTech, que o login abre direto a Operação.

## Detalhes técnicos
- `src/routes/auth.tsx`: após sessão, consultar `user_roles` (admin) e navegar para `/admin` ou `/painel`.
- `src/routes/_authenticated/painel.tsx`: `useEffect` com `useAuth().isAdmin` → `navigate({ to: "/admin", replace: true })`; remover card de atalho.
- `src/routes/_authenticated/admin.tsx`: aba controlada por search param `?aba=pendentes|ativos|todos` (validateSearch) para os links do topo.
- `src/components/AppHeader.tsx`: navegação condicional por papel.
- Nenhuma mudança de banco ou regras de negócio.
