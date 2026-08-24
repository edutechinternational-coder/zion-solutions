import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppHeader } from "@/components/AppHeader";
import { Simulador } from "@/components/Simulador";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createLoanRequest } from "@/lib/loan.functions";
import { brl, simulate } from "@/lib/loan-math";

export const Route = createFileRoute("/_authenticated/solicitar")({
  head: () => ({
    meta: [
      { title: "Solicitar empréstimo | Zion" },
      {
        name: "description",
        content:
          "Simule e solicite seu microcrédito Zion com juros de 2% ao mês, exclusivo para moradores do Monte Sião.",
      },
      { property: "og:title", content: "Solicitar empréstimo | Zion" },
      {
        property: "og:description",
        content: "Microcrédito com 2% ao mês para moradores do Monte Sião, Manaus.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Solicitar,
});

function Solicitar() {
  const navigate = useNavigate();
  const [principal, setPrincipal] = useState(50000);
  const [term, setTerm] = useState(3);
  const [finalidade, setFinalidade] = useState("");
  const [enviando, setEnviando] = useState(false);
  const solicitarEmprestimo = useServerFn(createLoanRequest);

  async function enviar() {
    if (finalidade.trim().length < 5) {
      toast.error("Conte pra que você precisa do dinheiro (mínimo 5 caracteres)");
      return;
    }
    setEnviando(true);
    try {
      await solicitarEmprestimo({
        data: {
          principalCents: principal,
          termMonths: term,
          purpose: finalidade.trim().slice(0, 200),
        },
      });
      toast.success("Solicitação enviada!", {
        description: "A equipe da Zion vai analisar e responder em breve.",
      });
      navigate({ to: "/painel" });
    } catch (e) {
      toast.error("Não foi possível enviar a solicitação", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setEnviando(false);
    }
  }

  const sim = simulate(principal, term);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10">
        <div>
          <h1 className="text-3xl font-semibold">Solicitar empréstimo</h1>
          <p className="text-sm text-muted-foreground">
            Simule, confira o valor total e envie. A análise é feita por pessoas do bairro.
          </p>
        </div>

        <Simulador
          onChange={(p, t) => {
            setPrincipal(p);
            setTerm(t);
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Finalize seu pedido</CardTitle>
            <CardDescription>
              Você está pedindo {brl(sim.principalCents)} para pagar em {sim.termMonths}x de{" "}
              {brl(sim.installmentCents)} (total {brl(sim.totalCents)}).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="finalidade">Para que você precisa?</Label>
              <Input
                id="finalidade"
                maxLength={200}
                placeholder="Ex.: comprar mercadoria para a banca"
                value={finalidade}
                onChange={(e) => setFinalidade(e.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Ao enviar, você confirma que mora no bairro Monte Sião (Manaus/AM) e que os dados do
              seu cadastro são verdadeiros. A aprovação depende do capital disponível da operação.
            </p>
            <Button className="w-full" onClick={enviar} disabled={enviando}>
              Enviar solicitação
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
