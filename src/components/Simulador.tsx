import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import {
  MAX_PRINCIPAL_CENTS,
  MIN_PRINCIPAL_CENTS,
  TERMS,
  brl,
  simulate,
} from "@/lib/loan-math";
import { cn } from "@/lib/utils";

export function Simulador({
  onChange,
  compact = false,
}: {
  onChange?: (principalCents: number, termMonths: number) => void;
  compact?: boolean;
}) {
  const [principal, setPrincipal] = useState(50000);
  const [term, setTerm] = useState<number>(3);
  const sim = useMemo(() => simulate(principal, term), [principal, term]);

  function update(next: number, nextTerm: number) {
    setPrincipal(next);
    setTerm(nextTerm);
    onChange?.(next, nextTerm);
  }

  return (
    <Card className={cn("border-border/80 shadow-soft", compact && "shadow-none")}>
      <CardContent className="space-y-6 p-6">
        <div className="space-y-3">
          <div className="flex items-end justify-between">
            <span className="text-sm text-muted-foreground">Quanto você precisa?</span>
            <span className="font-display text-2xl font-semibold">{brl(principal)}</span>
          </div>
          <Slider
            value={[principal]}
            min={MIN_PRINCIPAL_CENTS}
            max={MAX_PRINCIPAL_CENTS}
            step={5000}
            onValueChange={(v) => update(v[0] ?? principal, term)}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{brl(MIN_PRINCIPAL_CENTS)}</span>
            <span>{brl(MAX_PRINCIPAL_CENTS)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <span className="text-sm text-muted-foreground">Em quantos meses quer pagar?</span>
          <div className="flex flex-wrap gap-2">
            {TERMS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => update(principal, t)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-sm font-medium transition-colors",
                  t === term
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card hover:bg-secondary",
                )}
              >
                {t}x
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-secondary/70 p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-secondary-foreground">Você paga por mês</span>
            <span className="font-display text-3xl font-bold text-primary">
              {brl(sim.installmentCents)}
            </span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Juros (2% a.m.)</dt>
              <dd className="font-medium">{brl(sim.interestCents)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total a pagar</dt>
              <dd className="font-medium">{brl(sim.totalCents)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            Juros compostos de 2% ao mês sobre o saldo devedor, com parcelas fixas. Sem taxa de
            cadastro, sem seguro, sem letra miúda.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
