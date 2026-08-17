import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { LOAN_STATUS_LABEL, brl, formatDate } from "@/lib/loan-math";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Operação Zion | Capital e aprovações" },
      {
        name: "description",
        content:
          "Painel da operação Zion: capital disponível, aprovação de solicitações, cobrança e relatórios da carteira.",
      },
      { property: "og:title", content: "Operação Zion" },
      {
        property: "og:description",
        content: "Capital disponível, aprovações e carteira de microcrédito do Monte Sião.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Admin,
});

type Loan = {
  id: string;
  user_id: string;
  principal_cents: number;
  term_months: number;
  installment_cents: number;
  total_due_cents: number;
  paid_cents: number;
  status: string;
  purpose: string | null;
  first_due_date: string | null;
  created_at: string;
};

type Capital = {
  total_cents: number;
  emprestado_cents: number;
  recebido_cents: number;
  disponivel_cents: number;
};

function Admin() {
  const { isAdmin, loading } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [nomes, setNomes] = useState<Record<string, string>>({});
  const [capital, setCapital] = useState<Capital | null>(null);
  const [valorPagamento, setValorPagamento] = useState<Record<string, string>>({});
  const [ocupado, setOcupado] = useState(false);

  const carregar = useCallback(async () => {
    const [{ data: l }, { data: c }, { data: p }] = await Promise.all([
      supabase
        .from("loans")
        .select(
          "id, user_id, principal_cents, term_months, installment_cents, total_due_cents, paid_cents, status, purpose, first_due_date, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase.rpc("capital_summary"),
      supabase.from("profiles").select("id, full_name, phone, address_status"),
    ]);
    setLoans((l ?? []) as Loan[]);
    const resumo = Array.isArray(c) ? (c[0] as Capital | undefined) : (c as Capital | null);
    setCapital(resumo ?? null);
    const map: Record<string, string> = {};
    for (const row of p ?? []) map[row.id] = row.full_name || "Sem nome";
    setNomes(map);
  }, []);

  useEffect(() => {
    if (isAdmin) void carregar();
  }, [isAdmin, carregar]);

  async function decidir(id: string, aprovar: boolean) {
    setOcupado(true);
    const { error } = await supabase.rpc("decide_loan", { _loan_id: id, _approve: aprovar });
    setOcupado(false);
    if (error) {
      toast.error("Ação não concluída", { description: error.message });
      return;
    }
    toast.success(aprovar ? "Empréstimo aprovado" : "Solicitação reprovada");
    void carregar();
  }

  async function pagar(id: string) {
    const raw = valorPagamento[id]?.replace(",", ".") ?? "";
    const reais = Number(raw);
    if (!Number.isFinite(reais) || reais <= 0) {
      toast.error("Informe um valor válido");
      return;
    }
    setOcupado(true);
    const { error } = await supabase.rpc("register_payment", {
      _loan_id: id,
      _amount_cents: Math.round(reais * 100),
      _method: "pix",
    });
    setOcupado(false);
    if (error) {
      toast.error("Pagamento não registrado", { description: error.message });
      return;
    }
    setValorPagamento({ ...valorPagamento, [id]: "" });
    toast.success("Pagamento registrado");
    void carregar();
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <p className="p-10 text-sm text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="mx-auto max-w-xl px-4 py-20 text-center">
          <h1 className="text-2xl font-semibold">Área da operação</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sua conta não tem permissão de administrador.
          </p>
        </main>
      </div>
    );
  }

  const pendentes = loans.filter((l) => l.status === "pendente");
  const ativos = loans.filter((l) => l.status === "aprovado" || l.status === "atrasado");
  const quitados = loans.filter((l) => l.status === "quitado");
  const jurosRecebidos = quitados.reduce(
    (acc, l) => acc + (l.total_due_cents - l.principal_cents),
    0,
  );
  const emAtraso = loans.filter((l) => l.status === "atrasado");
  const inadimplencia = ativos.length ? (emAtraso.length / ativos.length) * 100 : 0;
  const usoCapital = capital
    ? (capital.emprestado_cents / Math.max(capital.total_cents, 1)) * 100
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl space-y-8 px-4 py-10">
        <div>
          <h1 className="text-3xl font-semibold">Operação Zion</h1>
          <p className="text-sm text-muted-foreground">
            Monte Sião, Manaus/AM · capital de origem £1.000 convertido em reais.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="surface-panel">
            <CardHeader className="pb-2">
              <CardDescription>Capital disponível</CardDescription>
              <CardTitle className="text-2xl text-primary">
                {capital ? brl(capital.disponivel_cents) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={usoCapital} />
              <p className="mt-2 text-xs text-muted-foreground">
                {usoCapital.toFixed(0)}% do capital está emprestado
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Emprestado (carteira ativa)</CardDescription>
              <CardTitle className="text-2xl">
                {capital ? brl(capital.emprestado_cents) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {ativos.length} empréstimo(s) ativo(s)
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Recebido em pagamentos</CardDescription>
              <CardTitle className="text-2xl">
                {capital ? brl(capital.recebido_cents) : "—"}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              Juros ganhos em quitados: {brl(jurosRecebidos)}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Inadimplência</CardDescription>
              <CardTitle className="text-2xl">{inadimplencia.toFixed(0)}%</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground">
              {emAtraso.length} em atraso de {ativos.length} ativos
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="pendentes">
          <TabsList>
            <TabsTrigger value="pendentes">Solicitações ({pendentes.length})</TabsTrigger>
            <TabsTrigger value="ativos">Carteira ({ativos.length})</TabsTrigger>
            <TabsTrigger value="todos">Histórico ({loans.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-3 pt-4">
            {pendentes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
            ) : (
              pendentes.map((l) => (
                <Card key={l.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">
                        {nomes[l.user_id] ?? "Cliente"} · {brl(l.principal_cents)} em{" "}
                        {l.term_months}x
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Parcela {brl(l.installment_cents)} · total {brl(l.total_due_cents)} ·{" "}
                        {l.purpose ?? "sem finalidade informada"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={ocupado}
                        onClick={() => decidir(l.id, false)}
                      >
                        Reprovar
                      </Button>
                      <Button size="sm" disabled={ocupado} onClick={() => decidir(l.id, true)}>
                        Aprovar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="ativos" className="space-y-3 pt-4">
            {ativos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Carteira vazia.</p>
            ) : (
              ativos.map((l) => (
                <Card key={l.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                    <div>
                      <p className="font-medium">
                        {nomes[l.user_id] ?? "Cliente"} ·{" "}
                        {brl(l.total_due_cents - l.paid_cents)} em aberto
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Parcela {brl(l.installment_cents)} · vence {formatDate(l.first_due_date)} ·{" "}
                        {LOAN_STATUS_LABEL[l.status]}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        className="w-32"
                        inputMode="decimal"
                        placeholder="Valor R$"
                        value={valorPagamento[l.id] ?? ""}
                        onChange={(e) =>
                          setValorPagamento({ ...valorPagamento, [l.id]: e.target.value })
                        }
                      />
                      <Button size="sm" disabled={ocupado} onClick={() => pagar(l.id)}>
                        Registrar Pix
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="todos" className="space-y-3 pt-4">
            {loans.map((l) => (
              <Card key={l.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-medium">
                      {nomes[l.user_id] ?? "Cliente"} · {brl(l.principal_cents)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pedido em {formatDate(l.created_at)} · pago {brl(l.paid_cents)} de{" "}
                      {brl(l.total_due_cents)}
                    </p>
                  </div>
                  <Badge
                    variant={
                      l.status === "atrasado" || l.status === "reprovado"
                        ? "destructive"
                        : l.status === "quitado"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {LOAN_STATUS_LABEL[l.status] ?? l.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
