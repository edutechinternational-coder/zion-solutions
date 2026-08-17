import { Link, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export function AppHeader() {
  const { session, isAdmin } = useAuth();
  const navigate = useNavigate();

  async function sair() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-bold text-primary-foreground">
            Z
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Zion</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          {session ? (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link to="/painel">Meu painel</Link>
              </Button>
              {isAdmin ? (
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin">Operação</Link>
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={sair}>
                Sair
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
