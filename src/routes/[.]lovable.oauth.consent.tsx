import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type OAuthDetails = {
  client?: { name?: string } | null;
  redirect_url?: string;
  redirect_to?: string;
};
type OAuthResult = { data: OAuthDetails | null; error: { message: string } | null };
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const oauth = () => (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export const Route = createFileRoute("/.lovable/oauth/consent")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>) => ({
    authorization_id: typeof s["authorization_id"] === "string" ? s["authorization_id"] : "",
  }),
  head: () => ({
    meta: [
      { title: "Autorizar acesso | Zion" },
      { name: "description", content: "Autorize um assistente a acessar sua conta Zion." },
      { property: "og:title", content: "Autorizar acesso | Zion" },
      { property: "og:description", content: "Autorize um assistente a acessar sua conta Zion." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async ({ search, location }) => {
    if (!search.authorization_id) throw new Error("Pedido de autorização inválido");
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      throw redirect({ to: "/auth", search: { next: location.pathname + location.searchStr } });
    }
  },
  loaderDeps: ({ search }) => ({ id: search.authorization_id }),
  loader: async ({ deps }) => {
    const { data, error } = await oauth().getAuthorizationDetails(deps.id);
    if (error) throw new Error(error.message);
    const immediate = data?.redirect_url ?? data?.redirect_to;
    if (immediate && !data?.client) throw redirect({ href: immediate });
    return data;
  },
  component: Consent,
  errorComponent: ({ error }) => (
    <main className="mx-auto max-w-md p-10 text-center text-sm text-muted-foreground">
      Não foi possível carregar este pedido: {error.message}
    </main>
  ),
});

function Consent() {
  const details = Route.useLoaderData();
  const { authorization_id } = Route.useSearch();
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const nome = details?.client?.name ?? "um aplicativo";

  async function decidir(aprovar: boolean) {
    setBusy(true);
    const { data, error } = aprovar
      ? await oauth().approveAuthorization(authorization_id)
      : await oauth().denyAuthorization(authorization_id);
    const alvo = data?.redirect_url ?? data?.redirect_to;
    if (error || !alvo) {
      setBusy(false);
      setErro(error?.message ?? "Nenhum retorno do servidor de autorização.");
      return;
    }
    window.location.href = alvo;
  }

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Conectar {nome} à sua conta Zion</CardTitle>
          <CardDescription>
            {nome} poderá consultar seus empréstimos e pagamentos e simular valores em seu nome.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {erro ? (
            <p role="alert" className="text-sm text-destructive">
              {erro}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => decidir(false)}>
              Negar
            </Button>
            <Button disabled={busy} onClick={() => decidir(true)}>
              Autorizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
