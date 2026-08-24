import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  INSTALLMENT_STATUS_LABEL,
  LOAN_STATUS_LABEL,
  brl,
  buildSchedule,
  formatDate,
  type Installment,
} from "@/lib/loan-math";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Meu painel | Zion" },
      {
        name: "description",
        content: "Acompanhe seus empréstimos, parcelas, extrato de pagamentos e dados na Zion.",
      },
      { property: "og:title", content: "Meu painel | Zion" },
      {
        property: "og:description",
        content: "Parcelas, vencimentos e extrato de pagamentos do seu crédito no Monte Sião.",
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

type Payment = {
  id: string;
  loan_id: string;
  amount_cents: number;
  method: string;
  paid_at: string;
};

type Profile = {
  full_name: string;
  cpf: string | null;
  phone: string | null;
  street: string | null;
  cep: string | null;
  address_status: string;
};

const PIX_KEY = "pix@zion.cred";

function statusVariant(status: string) {
  if (status === "quitado") return "secondary" as const;
  if (status === "atrasado" || status === "reprovado") return "destructive" as const;
  return "default" as const;
}

function installmentVariant(status: Installment["status"]) {
  if (status === "quitada") return "secondary" as const;
  if (status === "atrasada") return "destructive" as const;
  return "outline" as const;
}

function Painel() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [perfil, setPerfil] = useState<Profile | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return;

    const [{ data: p }, { data: l }, { data: pay }] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name, cpf, phone, street, cep, address_status")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("loans")
        .select(
          "id, principal_cents, term_months, installment_cents, total_due_cents, paid_cents, status, purpose, first_due_date, decision_note, created_at",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("id, loan_id, amount_cents, method, paid_at")
        .order("paid_at", { ascending: false }),
    ]);

    if (p) {
      setPerfil(p as Profile);
    } else {
      // Sem linha de perfil ainda (cadastro antigo ou trigger não aplicada): cria na hora.
      const base: Profile = {
        full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
        cpf: null,
        phone: null,
        street: null,
        cep: null,
        address_status: "pendente",
      };
      await supabase.from("profiles").insert({ id: user.id, full_name: base.full_name });
      setPerfil(base);
    }

    setLoans((l ?? []) as Loan[]);
    setPayments((pay ?? []) as Payment[]);
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

  const ativo = useMemo(
    () => loans.find((l) => l.status === "aprovado" || l.status === "atrasado") ?? null,
    [loans],
  );
  const pendente = useMemo(() => loans.find((l) => l.status === "pendente") ?? null, [loans]);
  const parcelas = useMemo(() => (ativo ? buildSchedule(ativo) : []), [ativo]);
  const proxima = parcelas.find((p) => p.status !== "quitada") ?? null;
  const saldo = ativo ? ativo.total_due_cents - ativo.paid_cents : 0;
  const totalPago = payments.reduce((acc, p) => acc + p.amount_cents, 0);

  const primeiroNome = (perfil?.full_name || "").trim().split(" ")[0];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h1 className="font-display text-3xl font-semibold">
              Olá, {primeiroNome || "morador"}
            </h1>
            <p className="text-sm text-muted-foreground">
              Seu crédito no Monte Sião, sempre transparente — 2% ao mês, sem taxa escondida.
            </p>
          </div>
          <Button asChild>
            <Link to="/solicitar">{ativo ? "Nova solicitação" : "Pedir empréstimo"}</Link>
          </Button>
        </header>

        {carregando ? (
          <div className="space-y-4">
            <Skeleton className="h-40 w-full rounded-xl" />
            <Skeleton className="h-10 w-64 rounded-lg" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : (
          <>
            {ativo ? (
              <Card className="border-primary/30 shadow-soft">
                <CardHeader className="gap-1">
                  <CardDescription className="flex items-center gap-2">
                    Empréstimo em andamento
                    <Badge variant={statusVariant(ativo.status)}>
                      {LOAN_STATUS_LABEL[ativo.status] ?? ativo.status}
                    </Badge>
                  </CardDescription>
                  <CardTitle className="text-3xl">{brl(saldo)} em aberto</CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Progress value={(ativo.paid_cents / ativo.total_due_cents) * 100} />
                    <p className="text-xs text-muted-foreground">
                      {brl(ativo.paid_cents)} pagos de {brl(ativo.total_due_cents)} ·{" "}
                      {parcelas.filter((p) => p.status === "quitada").length} de {ativo.term_months}{" "}
                      parcelas quitadas
                    </p>
                  </div>
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
                      <dd className="font-medium">{formatDate(proxima?.dueDate)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">A pagar agora</dt>
                      <dd className="font-medium">
                        {proxima ? brl(proxima.amountCents - proxima.paidCents) : "—"}
                      </dd>
                    </div>
                  </dl>
                  <div className="rounded-lg bg-secondary/70 p-4 text-sm">
                    <p className="font-medium">Como pagar</p>
                    <p className="text-muted-foreground">
                      Pix para <span className="font-medium text-foreground">{PIX_KEY}</span> e envie
                      o comprovante no WhatsApp da operação. A baixa aparece aqui no mesmo dia.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : pendente ? (
              <Card className="border-primary/30">
                <CardHeader className="gap-1">
                  <CardDescription>Solicitação em análise</CardDescription>
                  <CardTitle className="text-2xl">
                    {brl(pendente.principal_cents)} em {pendente.term_months}x de{" "}
                    {brl(pendente.installment_cents)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Pedido em {formatDate(pendente.created_at)}. A operação analisa o capital livre e o
                  endereço no Monte Sião — você recebe a resposta por aqui.
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div className="space-y-1">
                    <p className="font-medium">Você ainda não tem crédito ativo</p>
                    <p className="text-sm text-muted-foreground">
                      Empréstimos de R$ 100 a R$ 1.000, juros de 2% ao mês, parcelas fixas de 1 a 6
                      meses. A resposta sai em até 24h.
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/solicitar">Simular e pedir</Link>
                  </Button>
                </CardContent>
              </Card>
            )}

            <Tabs defaultValue="parcelas">
              <TabsList>
                <TabsTrigger value="parcelas">Parcelas</TabsTrigger>
                <TabsTrigger value="extrato">Extrato</TabsTrigger>
                <TabsTrigger value="historico">Histórico</TabsTrigger>
                <TabsTrigger value="dados">Meus dados</TabsTrigger>
              </TabsList>

              <TabsContent value="parcelas" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cronograma de parcelas</CardTitle>
                    <CardDescription>
                      Parcelas fixas calculadas na Tabela Price, com juros de 2% ao mês.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {parcelas.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        O cronograma aparece aqui quando um empréstimo é aprovado.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                            <TableHead className="text-right">Pago</TableHead>
                            <TableHead className="text-right">Situação</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {parcelas.map((p) => (
                            <TableRow key={p.number}>
                              <TableCell className="font-medium">{p.number}</TableCell>
                              <TableCell>{formatDate(p.dueDate)}</TableCell>
                              <TableCell className="text-right">{brl(p.amountCents)}</TableCell>
                              <TableCell className="text-right">{brl(p.paidCents)}</TableCell>
                              <TableCell className="text-right">
                                <Badge variant={installmentVariant(p.status)}>
                                  {INSTALLMENT_STATUS_LABEL[p.status]}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="extrato" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Extrato de pagamentos</CardTitle>
                    <CardDescription>
                      Total recebido pela operação: {brl(totalPago)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {payments.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum pagamento registrado ainda. Cada Pix confirmado pela operação aparece
                        aqui com data e valor.
                      </p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data</TableHead>
                            <TableHead>Forma</TableHead>
                            <TableHead className="text-right">Valor</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {payments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell>{formatDate(p.paid_at)}</TableCell>
                              <TableCell className="uppercase">{p.method}</TableCell>
                              <TableCell className="text-right font-medium">
                                {brl(p.amount_cents)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="historico" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Histórico de solicitações</CardTitle>
                    <CardDescription>Todos os pedidos e suas decisões.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {loans.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhuma solicitação ainda. Quando você pedir um empréstimo, ele aparece aqui
                        com o status da análise.
                      </p>
                    ) : (
                      loans.map((l, i) => (
                        <div key={l.id} className="space-y-3">
                          {i > 0 ? <Separator /> : null}
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="font-medium">
                                {brl(l.principal_cents)} em {l.term_months}x de{" "}
                                {brl(l.installment_cents)}
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
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dados" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Meus dados</CardTitle>
                    <CardDescription>
                      O endereço no Monte Sião é conferido pela operação antes da primeira aprovação.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
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
                          <Badge
                            variant={perfil.address_status === "verificado" ? "default" : "secondary"}
                          >
                            Endereço: {perfil.address_status}
                          </Badge>
                          <Button type="submit" disabled={salvando}>
                            Salvar dados
                          </Button>
                        </div>
                      </form>
                    ) : (
                      <Skeleton className="h-40 w-full rounded-lg" />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </main>
    </div>
  );
}
