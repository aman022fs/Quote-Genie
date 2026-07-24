import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Quotient" },
      {
        name: "description",
        content: "Sign in or create an account to build your quotation system.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: name },
          },
        });
        if (error) throw error;
        toast.success("Account created — welcome!");
        navigate({ to: "/dashboard" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/dashboard" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function signInGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      toast.error(error.message || "Google sign-in failed");
    }
    // On success Supabase navigates the browser to Google's consent screen
    // itself, so there's nothing further to do here.
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-[520px] px-6 pt-safe">
        <div className="pt-5">
          <Link
            to="/"
            aria-label="Back"
            className="inline-grid size-10 place-items-center rounded-full bg-secondary text-foreground/70"
          >
            <ChevronLeft className="size-5" />
          </Link>
        </div>

        <div className="mt-8">
          <h1 className="text-[32px] font-semibold leading-[1.1] tracking-tight">
            {mode === "signin" ? "Welcome back." : "Let's begin."}
          </h1>
          <p className="mt-3 text-[15px] text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue building beautiful quotations."
              : "Create your account. It takes less than a minute."}
          </p>
        </div>

        <button
          onClick={signInGoogle}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-card px-5 py-4 text-[15px] font-medium ring-1 ring-border active:scale-[0.99]"
        >
          <GoogleGlyph /> Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          <div className="h-px flex-1 bg-border" /> or email{" "}
          <div className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === "signup" && (
            <Input
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-14 rounded-2xl bg-card px-5 text-base"
            />
          )}
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-14 rounded-2xl bg-card px-5 text-base"
          />
          <Input
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            placeholder="Password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 rounded-2xl bg-card px-5 text-base"
          />
          <Button
            type="submit"
            disabled={loading}
            className="mt-2 h-14 w-full rounded-2xl bg-foreground text-[15px] font-semibold text-background hover:bg-foreground/90"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="font-medium text-foreground underline underline-offset-4"
          >
            {mode === "signin" ? "Create an account" : "Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.5-1.7 4.4-5.5 4.4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.9 1.5l2.6-2.5C16.9 3.7 14.7 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12s4.1 9.3 9.2 9.3c5.3 0 8.9-3.7 8.9-9 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  );
}
