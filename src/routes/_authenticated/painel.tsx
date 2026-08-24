import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const PHONE_COUNTRIES = [
  { code: "+55", country: "Brasil", flag: "🇧🇷" },
  { code: "+1", country: "Estados Unidos/Canadá", flag: "🇺🇸" },
  { code: "+351", country: "Portugal", flag: "🇵🇹" },
  { code: "+54", country: "Argentina", flag: "🇦🇷" },
  { code: "+56", country: "Chile", flag: "🇨🇱" },
  { code: "+57", country: "Colômbia", flag: "🇨🇴" },
  { code: "+598", country: "Uruguai", flag: "🇺🇾" },
  { code: "+595", country: "Paraguai", flag: "🇵🇾" },
];

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function maskCpf(value: string) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCep(value: string) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function maskPhone(value: string) {
  const trimmed = value.trim();
  const countryCode = trimmed.startsWith("+")
    ? `+${onlyDigits(trimmed.split(" ")[0]).slice(0, 3)}`
    : "+55";
  const localValue = trimmed.startsWith("+") ? trimmed.replace(/^\+\d{1,3}\s*/, "") : trimmed;
  const digits = onlyDigits(localValue).slice(0, 11);

  let localPhone = "";
  if (digits.length <= 2) {
    localPhone = digits ? `(${digits}` : "";
  } else if (digits.length <= 6) {
    localPhone = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  } else if (digits.length <= 10) {
    localPhone = `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  } else {
    localPhone = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return localPhone ? `${countryCode} ${localPhone}` : countryCode;
}

function getPhoneCountryCode(value: string | null) {
  const match = value?.trim().match(/^\+(\d{1,3})/);
  return match ? `+${match[1]}` : "+55";
}

function getPhoneLocalValue(value: string | null) {
  return value?.trim().replace(/^\+\d{1,3}\s*/, "") ?? "";
}

function buildPhoneValue(countryCode: string, localValue: string) {
  const codeDigits = onlyDigits(countryCode).slice(0, 3);
  const normalizedCode = codeDigits ? `+${codeDigits}` : "+55";
  const localPhone = maskPhone(localValue).replace(/^\+\d{1,3}\s*/, "");
  return localPhone ? `${normalizedCode} ${localPhone}` : normalizedCode;
}

function addressBadgeVariant(status: string) {
  if (status === "verificado") return "default" as const;
  if (status === "reprovado") return "destructive" as const;
  return "outline" as const;
}

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
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [mensagemSalvamento, setMensagemSalvamento] = useState<string | null>(null);
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
      setPerfil({
        ...(p as Profile),
        cpf: p.cpf ? maskCpf(p.cpf) : null,
        phone: p.phone ? maskPhone(p.phone) : null,
        cep: p.cep ? maskCep(p.cep) : null,
      });
    } else {
      // Sem linha de perfil ainda (cadastro antigo ou trigger não aplicada): cria na hora.
      const base: Profile = {
        full_name: (user.user_metadata?.["full_name"] as string | undefined) ?? "",
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
        phone: perfil.phone?.slice(0, 25) || null,
        street: perfil.street?.slice(0, 160) || null,
        cep: perfil.cep?.replace(/\D/g, "").slice(0, 8) || null,
      })
      .eq("id", user.user!.id);
    setSalvando(false);
    if (error) {
      toast.error("Não foi possível salvar", { description: error.message });
      return;
    }
    setMensagemSalvamento(
      "Dados salvos com sucesso. A operação vai conferir seu endereço em até 24h.",
    );
    toast.success("Dados salvos com sucesso");
  }

  async function buscarCep(cep: string) {
    const digits = onlyDigits(cep);
    if (digits.length !== 8 || !perfil) return;
    setBuscandoCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = (await response.json()) as {
        erro?: boolean;
        logradouro?: string;
        bairro?: string;
        localidade?: string;
        uf?: string;
      };
      if (data.erro) {
        toast.error("CEP não encontrado", {
          description: "Confira o número e digite o endereço manualmente.",
        });
        return;
      }
      const endereco = [data.logradouro, data.bairro, data.localidade, data.uf]
        .filter(Boolean)
        .join(", ");
      setPerfil((atual) => (atual ? { ...atual, street: atual.street || endereco } : atual));
      toast.success("Endereço preenchido pelo CEP");
    } catch {
      toast.error("Não foi possível consultar o CEP", {
        description: "Digite o endereço manualmente.",
      });
    } finally {
      setBuscandoCep(false);
    }
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
          <p className="rounded-full bg-secondary px-4 py-2 text-sm text-muted-foreground">
            Acompanhe tudo em um só lugar
          </p>
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
                      Pix para <span className="font-medium text-foreground">{PIX_KEY}</span> e
                      envie o comprovante no WhatsApp da operação. A baixa aparece aqui no mesmo
                      dia.
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
                  Pedido em {formatDate(pendente.created_at)}. A operação analisa o capital livre e
                  o endereço no Monte Sião. Sua análise leva até 24h após o envio dos dados.
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
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="text-lg">Meus dados</CardTitle>
                      <Badge
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-800"
                      >
                        Cadastro: etapa 2 de 3
                      </Badge>
                    </div>
                    <CardDescription>
                      Preencha seus dados. Depois, a operação confirma documento/selfie e endereço
                      no Monte Sião.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {perfil ? (
                      <form onSubmit={salvarPerfil} className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="nome" className="text-sm font-medium">
                            Nome completo *
                          </Label>
                          <Input
                            id="nome"
                            placeholder="Maria Silva"
                            required
                            maxLength={120}
                            value={perfil.full_name}
                            onChange={(e) => setPerfil({ ...perfil, full_name: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cpf" className="text-sm font-medium">
                            CPF *
                          </Label>
                          <Input
                            id="cpf"
                            inputMode="numeric"
                            placeholder="000.000.000-00"
                            required
                            maxLength={14}
                            value={perfil.cpf ?? ""}
                            onChange={(e) => setPerfil({ ...perfil, cpf: maskCpf(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone" className="text-sm font-medium">
                            Telefone / WhatsApp *
                          </Label>
                          <div className="flex gap-2">
                            <Select
                              value={getPhoneCountryCode(perfil.phone)}
                              onValueChange={(countryCode) =>
                                setPerfil({
                                  ...perfil,
                                  phone: buildPhoneValue(
                                    countryCode,
                                    getPhoneLocalValue(perfil.phone),
                                  ),
                                })
                              }
                            >
                              <SelectTrigger
                                aria-label="Selecionar país do telefone"
                                className="w-40 shrink-0"
                              >
                                <SelectValue placeholder="País" />
                              </SelectTrigger>
                              <SelectContent>
                                {PHONE_COUNTRIES.map((country) => (
                                  <SelectItem key={country.code} value={country.code}>
                                    {country.flag} {country.country} {country.code}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              id="phone"
                              inputMode="tel"
                              placeholder="(92) 9XXXX-XXXX"
                              required
                              maxLength={15}
                              value={getPhoneLocalValue(perfil.phone)}
                              onChange={(e) =>
                                setPerfil({
                                  ...perfil,
                                  phone: buildPhoneValue(
                                    getPhoneCountryCode(perfil.phone),
                                    e.target.value,
                                  ),
                                })
                              }
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cep" className="text-sm font-medium">
                            CEP
                          </Label>
                          <Input
                            id="cep"
                            inputMode="numeric"
                            placeholder="69000-000"
                            maxLength={9}
                            value={perfil.cep ?? ""}
                            onChange={(e) => {
                              const cep = maskCep(e.target.value);
                              setPerfil({ ...perfil, cep });
                              void buscarCep(cep);
                            }}
                          />
                        </div>
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="street" className="text-sm font-medium">
                            Endereço no Monte Sião *
                          </Label>
                          <Input
                            id="street"
                            placeholder="Rua, número, complemento e ponto de referência"
                            required
                            maxLength={160}
                            value={perfil.street ?? ""}
                            onChange={(e) => setPerfil({ ...perfil, street: e.target.value })}
                          />
                        </div>
                        <div className="space-y-3 rounded-lg border bg-secondary/40 p-4 sm:col-span-2">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="space-y-1">
                              <Badge
                                variant={addressBadgeVariant(perfil.address_status)}
                                className={
                                  perfil.address_status === "pendente"
                                    ? "border-amber-300 bg-amber-50 text-amber-800"
                                    : undefined
                                }
                              >
                                Endereço: {perfil.address_status}
                              </Badge>
                              <p className="text-sm text-muted-foreground">
                                Sua análise leva até 24h após o envio dos dados.{" "}
                                {buscandoCep ? "Buscando CEP..." : ""}
                              </p>
                              {mensagemSalvamento ? (
                                <p className="text-sm font-medium text-primary">
                                  {mensagemSalvamento}
                                </p>
                              ) : null}
                            </div>
                            <Button type="submit" disabled={salvando}>
                              {salvando ? "Salvando..." : "Salvar dados"}
                            </Button>
                          </div>
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
