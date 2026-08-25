import { createFileRoute, Link } from "@tanstack/react-router";
import { AppHeader } from "@/components/AppHeader";
import { Simulador } from "@/components/Simulador";
import { ClientesCarrossel } from "@/components/ClientesCarrossel";
import { MapaAreaAtendimento } from "@/components/MapaAreaAtendimento";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import heroImg from "@/assets/monte-siao.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Zion — Microcrédito do Monte Sião, Manaus" },
      {
        name: "description",
        content:
          "Empréstimos de R$ 100 a R$ 1.000 com 2% ao mês para moradores e comerciantes do bairro Monte Sião, em Manaus. Simule agora, sem letra miúda.",
      },
      { property: "og:title", content: "Zion — Microcrédito do Monte Sião" },
      {
        property: "og:description",
        content:
          "Crédito de bairro com juros de 2% ao mês, pagamento por Pix e análise feita por gente daqui.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PASSOS = [
  {
    titulo: "Simule em 30 segundos",
    texto: "Escolha o valor e o prazo. Você vê a parcela e o total antes de pedir.",
  },
  {
    titulo: "Cadastro simples",
    texto: "Nome, CPF, telefone e endereço no Monte Sião. Sem papelada de banco.",
  },
  {
    titulo: "Análise de gente daqui",
    texto: "A equipe confere o cadastro e o endereço no bairro e responde rápido.",
  },
  {
    titulo: "Dinheiro e pagamento por Pix",
    texto: "Você recebe por Pix e paga por Pix. Cada baixa aparece no seu painel.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        <section className="surface-hero text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:py-24">
            <div className="space-y-6">
              <span className="inline-flex rounded-full border border-primary-foreground/25 px-3 py-1 text-xs font-medium tracking-wide uppercase">
                Só para o Monte Sião · Manaus/AM
              </span>
              <h1 className="text-4xl leading-tight font-bold sm:text-5xl">
                Crédito de bairro, com <span className="text-gradient-accent">2% ao mês</span> e
                conta fechada na sua frente.
              </h1>
              <p className="max-w-lg text-base text-primary-foreground/80">
                De R$ 100 a R$ 1.000 para capital de giro, emergência ou compra pontual. Sem
                agiota, sem taxa escondida, sem fila de banco.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" variant="secondary">
                  <Link to="/auth">Pedir meu empréstimo</Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                >
                  <a href="#simulador">Simular valor</a>
                </Button>
              </div>
              <dl className="grid max-w-md grid-cols-3 gap-4 pt-4 text-sm">
                <div>
                  <dt className="text-primary-foreground/70">Juros</dt>
                  <dd className="font-display text-xl font-semibold">2% a.m.</dd>
                </div>
                <div>
                  <dt className="text-primary-foreground/70">Valores</dt>
                  <dd className="font-display text-xl font-semibold">R$100–1.000</dd>
                </div>
                <div>
                  <dt className="text-primary-foreground/70">Prazos</dt>
                  <dd className="font-display text-xl font-semibold">1 a 6 meses</dd>
                </div>
              </dl>
            </div>

            <img
              src={heroImg}
              alt="Comerciante sorrindo na porta do seu pequeno mercado em um bairro ribeirinho de Manaus"
              width={1280}
              height={960}
              className="rounded-2xl object-cover shadow-lift"
            />
          </div>
        </section>

        <ClientesCarrossel />

        <section id="simulador" className="mx-auto max-w-6xl px-4 py-16">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div className="space-y-4">
              <h2 className="text-3xl font-semibold">Faça as contas antes de pedir</h2>
              <p className="text-muted-foreground">
                Trabalhamos com juros compostos de 2% ao mês sobre o saldo devedor, em parcelas
                fixas. O valor que aparece aqui é exatamente o valor do contrato: nada de tarifa de
                abertura, seguro embutido ou multa surpresa.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Operação 100% em reais — o câmbio é problema nosso, não seu.</li>
                <li>• Pagamento e recebimento por Pix.</li>
                <li>• Atraso? A gente conversa antes de qualquer cobrança pesada.</li>
              </ul>
            </div>
            <Simulador />
          </div>
        </section>

        <MapaAreaAtendimento />

        <section className="bg-secondary/50 py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-semibold">Como funciona</h2>            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {PASSOS.map((p, i) => (
                <Card key={p.titulo} className="border-border/70">
                  <CardContent className="space-y-2 p-5">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-sm font-bold text-primary-foreground">
                      {i + 1}
                    </span>
                    <h3 className="font-display text-base font-semibold">{p.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{p.texto}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-4 py-16 text-center">
          <h2 className="text-3xl font-semibold">Começamos pequeno, de propósito</h2>
          <p className="mt-4 text-muted-foreground">
            A Zion opera com um capital inicial limitado, dedicado exclusivamente ao Monte Sião.
            Isso significa que aprovamos poucos empréstimos por vez — cada pagamento em dia libera
            crédito para o próximo vizinho da fila.
          </p>
          <Button asChild size="lg" className="mt-8">
            <Link to="/auth">Criar minha conta</Link>
          </Button>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Zion · Microcrédito hiperlocal</p>
          <p className="mt-1">
            Atendimento exclusivo ao bairro Monte Sião, Manaus/AM. Operação em fase piloto; o
            enquadramento regulatório da atividade de crédito está em validação jurídica. Dados
            pessoais tratados conforme a LGPD.
          </p>
        </div>
      </footer>
    </div>
  );
}
