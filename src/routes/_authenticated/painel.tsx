import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LOAN_STATUS_LABEL, brl, formatDate } from "@/lib/loan-math";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Meu painel | Zion" },
      {
        name: "description",
        content: "Acompanhe seus empréstimos, saldo devedor, vencimentos e pagamentos na Zion.",
      },
      { property: "og:title", content: "Meu painel | Zion" },
      {
        property: "og:description",
        content: "Acompanhe seus empréstimos, saldo devedor e pagamentos na Zion.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Painel,
});

type Loan = {
  id: string;
  principal_cents: number;
  term_months: number;
  installment_cents: number;
  total_due_cents: number;
  paid_cents: number;
  status: string;
  purpose: string | null;
  first_due_date: string | null;
  decision_note: string | null;
  created_at: string;
};

type Profile = {
  full_name: string;
  cpf: string | null;
  phone: string | null;
  street: string | null;
  cep: string | null;
  address_status: string;
};

function statusVariant(status: string) {
  if (status === "quitado") return "secondary" as const;
  if (status === "atrasado" || status === "reprovado") return "destructive" as const;
  return "default" as const;
}

function Painel() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [perfil, setPerfil] = useState<Profile | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const [{ data: p }, { data: l }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, cpf, phone, street, cep, address_status")
        .eq("id", user.user.id)
        .maybeSingle(),
      supabase
        .from("loans")
        .select(
          "id, principal_cents, term_months, installment_cents, total_due_cents, paid_cents, status, purpose, first_due_date, decision_note, created_at",
        )
        .order("created_at", { ascending: false }),
    ]);
    setPerfil(p as Profile | null);
    setLoans((l ?? []) as Loan[]);
    setCarregando(false);
  }

  useEffect(() => {
    void carregar();
  }, []);

  async function salvarPerfil(e: React.FormEvent) {
    e.preventDefault();
    if (!perfil) return;
    setSalvando(true);
    const { data: user } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: perfil.full_name.trim().slice(0, 120),
        cpf: perfil.cpf?.replace(/\D/g, "").slice(0, 11) || null,
        phone: perfil.phone?.slice(0, 20) || null,
        street: perfil.street?.slice(0, 160) || null,
        cep: perfil.cep?.replace(/\D/g, "").slice(0, 8) || null,
      })
      .eq("id", user.user!.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    toast.success("Dados atualizados");
  }

  const ativo = loans.find((l) => l.status === "aprovado" || l.status === "atrasado");
  const saldo = ativo ? ativo.total_due_cents - ativo.paid_cents : 0;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Olá, {perfil?.full_name || "morador"}</h1>
            <p className="text-sm text-muted-foreground">
              Seu crédito no Monte Sião, sempre transparente.
            </p>
          </div>
          <Button asChild>
            <Link to="/solicitar">Pedir empréstimo</Link>
          </Button>
        </div>

        {ativo ? (
          <Card className="border-primary/30 shadow-soft">
            <CardHeader>
              <CardDescription>Empréstimo em andamento</CardDescription>
              <CardTitle className="text-3xl">{brl(saldo)} em aberto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={(ativo.paid_cents / ativo.total_due_cents) * 100} />
              <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Parcela</dt>
                  <dd className="font-medium">{brl(ativo.installment_cents)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Prazo</dt>
                  <dd className="font-medium">{ativo.term_months}x</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Próximo vencimento</dt>
                  <dd className="font-medium">{formatDate(ativo.first_due_date)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Já pago</dt>
                  <dd className="font-medium">{brl(ativo.paid_cents)}</dd>
                </div>
              </dl>
              <div className="rounded-lg bg-secondary/70 p-4 text-sm">
                <p className="font-medium">Pagamento por Pix</p>
                <p className="text-muted-foreground">
                  Chave Pix da operação: <span className="font-medium">pix@zion.cred</span>. Após
                  pagar, envie o comprovante no WhatsApp da operação — a baixa é registrada no
                  mesmo dia.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              {carregando
                ? "Carregando seus dados..."
                : "Você não tem empréstimo ativo no momento."}
            </CardContent>
          </Card>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Histórico</h2>
          {loans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma solicitação ainda.</p>
          ) : (
            <div className="space-y-3">
              {loans.map((l) => (
                <Card key={l.id}>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="font-medium">
                        {brl(l.principal_cents)} em {l.term_months}x de {brl(l.installment_cents)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Pedido em {formatDate(l.created_at)}
                        {l.purpose ? ` · ${l.purpose}` : ""}
                        {l.decision_note ? ` · ${l.decision_note}` : ""}
                      </p>
                    </div>
                    <Badge variant={statusVariant(l.status)}>
                      {LOAN_STATUS_LABEL[l.status] ?? l.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Meus dados</h2>
          <Card>
            <CardContent className="p-6">
              {perfil ? (
                <form onSubmit={salvarPerfil} className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome completo</Label>
                    <Input
                      id="nome"
                      maxLength={120}
                      value={perfil.full_name}
                      onChange={(e) => setPerfil({ ...perfil, full_name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                      id="cpf"
                      inputMode="numeric"
                      maxLength={14}
                      value={perfil.cpf ?? ""}
                      onChange={(e) => setPerfil({ ...perfil, cpf: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone / WhatsApp</Label>
                    <Input
                      id="phone"
                      maxLength={20}
                      value={perfil.phone ?? ""}
                      onChange={(e) => setPerfil({ ...perfil, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      inputMode="numeric"
                      maxLength={9}
                      value={perfil.cep ?? ""}
                      onChange={(e) => setPerfil({ ...perfil, cep: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="street">Endereço no Monte Sião</Label>
                    <Input
                      id="street"
                      maxLength={160}
                      value={perfil.street ?? ""}
                      onChange={(e) => setPerfil({ ...perfil, street: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:col-span-2">
                    <Badge variant={perfil.address_status === "verificado" ? "default" : "secondary"}>
                      Endereço: {perfil.address_status}
                    </Badge>
                    <Button type="submit" disabled={salvando}>
                      Salvar dados
                    </Button>
                  </div>
                </form>
              ) : (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
