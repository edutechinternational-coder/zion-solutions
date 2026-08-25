import * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Quote } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type Cliente = {
  nome: string;
  papel: string;
  bairro: string;
  citacao: string;
  avatar?: string;
  initials: string;
  color: string;
};

const CLIENTES: Cliente[] = [
  {
    nome: "Maria das Dores",
    papel: "Comerciante",
    bairro: "Monte Sião",
    citacao: "Consegui abrir meu pequeno mercado com o crédito da Zion. O pagamento por Pix facilita muito a vida.",
    initials: "MD",
    color: "bg-emerald-500",
  },
  {
    nome: "João Batista",
    papel: "Pescador",
    bairro: "Monte Sião",
    citacao: "Já peguei três empréstimos com eles. Sempre claros, sem surpresas. A comunidade confia.",
    initials: "JB",
    color: "bg-sky-500",
  },
  {
    nome: "Ana Paula",
    papel: "Costureira",
    bairro: "Monte Sião",
    citacao: "Precisava de material para aumentar a produção. Em dois dias o dinheiro estava na minha conta.",
    initials: "AP",
    color: "bg-violet-500",
  },
  {
    nome: "Sebastião",
    papel: "Mototaxista",
    bairro: "Monte Sião",
    citacao: "O simulador já mostra o valor real da parcela. É assim que deve ser, sem letra miúda.",
    initials: "S",
    color: "bg-amber-600",
  },
  {
    nome: "Lucimar",
    papel: "Dona de casa",
    bairro: "Monte Sião",
    citacao: "Quando precisei para emergência, a equipe me atendeu rápido e com respeito.",
    initials: "L",
    color: "bg-rose-500",
  },
  {
    nome: "Carlos André",
    papel: "Lancheira",
    bairro: "Monte Sião",
    citacao: "Renovei o meu ponto de venda. Agora atendo mais clientes e pago tudo em dia.",
    initials: "CA",
    color: "bg-indigo-500",
  },
];

const AUTOPLAY_INTERVAL = 5000;

function CarrosselIndicators({
  total,
  current,
  onSelect,
}: {
  total: number;
  current: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex justify-center gap-2 pt-4" aria-label="Slide indicators">
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          aria-label={`Go to slide ${i + 1}`}
          aria-current={i === current}
          onClick={() => onSelect(i)}
          className={cn(
            "h-2 rounded-full transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            i === current ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground/70",
          )}
        />
      ))}
    </div>
  );
}

export function ClientesCarrossel() {
  const [api, setApi] = useState<ReturnType<typeof useEmblaCarousel>[1] | null>(null);
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const prefersReducedMotion = useRef(
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const startAutoplay = useCallback(() => {
    if (prefersReducedMotion.current) return;
    stopAutoplay();
    timerRef.current = setInterval(() => {
      api?.scrollNext();
    }, AUTOPLAY_INTERVAL);
  }, [api]);

  const stopAutoplay = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!api) return;

    const onSelect = () => setCurrent(api.selectedScrollSnap());
    setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);

    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api) return;

    if (isHovered) {
      stopAutoplay();
    } else {
      startAutoplay();
    }

    return stopAutoplay;
  }, [api, isHovered, startAutoplay, stopAutoplay]);

  useEffect(() => {
    const handleMotionPreference = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
      if (e.matches) {
        stopAutoplay();
      } else if (!isHovered) {
        startAutoplay();
      }
    };

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    mediaQuery.addEventListener("change", handleMotionPreference);

    return () => {
      mediaQuery.removeEventListener("change", handleMotionPreference);
      stopAutoplay();
    };
  }, [isHovered, startAutoplay, stopAutoplay]);

  return (
    <section
      aria-label="Clientes"
      className="mx-auto max-w-6xl px-4 py-16"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      ref={containerRef}
    >
      <div className="text-center">
        <h2 className="text-3xl font-semibold">Quem já confia na Zion</h2>
        <p className="mt-4 text-muted-foreground">
          Histórias reais de quem usa o crédito do Monte Sião no dia a dia.
        </p>
      </div>

      <Carousel
        opts={{ loop: true, align: "start" }}
        setApi={setApi}
        className="mt-10"
        aria-roledescription="client carousel"
      >
        <CarouselContent>
          {CLIENTES.map((cliente) => (
            <CarouselItem key={cliente.nome} className="md:basis-1/2 lg:basis-1/3">
              <Card className="h-full border-border/70">
                <CardContent className="flex h-full flex-col items-center gap-4 p-6 text-center">
                  <Avatar className="h-16 w-16">
                    {cliente.avatar && <AvatarImage src={cliente.avatar} alt={cliente.nome} />}
                    <AvatarFallback className={cn("text-primary-foreground", cliente.color)}>
                      {cliente.initials}
                    </AvatarFallback>
                  </Avatar>

                  <div className="space-y-1">
                    <p className="font-display text-base font-semibold">{cliente.nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {cliente.papel} · {cliente.bairro}
                    </p>
                  </div>

                  <div className="relative">
                    <Quote className="absolute -top-2 -left-3 h-5 w-5 -rotate-12 text-primary/20" aria-hidden="true" />
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {cliente.citacao}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex w-full flex-col items-center gap-4">
            <CarrosselIndicators total={CLIENTES.length} current={current} onSelect={(index) => api?.scrollTo(index)} />
            <div className="flex gap-3">
              <CarouselPrevious aria-label="Previous client" />
              <CarouselNext aria-label="Next client" />
            </div>
          </div>
        </div>
      </Carousel>
    </section>
  );
}
