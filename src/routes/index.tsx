import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, FileText, Sparkles, Send } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quotient — Beautiful quotations, effortlessly" },
      {
        name: "description",
        content:
          "Turn one quotation you already send into a reusable template. Create new client quotes in minutes on your phone.",
      },
      { property: "og:title", content: "Quotient — Beautiful quotations, effortlessly" },
      {
        property: "og:description",
        content:
          "Turn one quotation into a reusable template and create new client quotes in minutes.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto max-w-[520px] px-6 pt-safe">
        <header className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-xl bg-hero-warm ring-1 ring-border" />
            <span className="text-sm font-semibold tracking-tight">Quotient</span>
          </div>
          <Link
            to="/auth"
            className="rounded-full bg-secondary px-4 py-2 text-sm font-medium text-foreground/80"
          >
            Log in
          </Link>
        </header>

        <section className="mt-10 rounded-[36px] bg-hero-warm p-8 ring-1 ring-border ring-soft">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-card/70 px-3 py-1 text-[11px] font-medium text-foreground/70 backdrop-blur">
            <Sparkles className="size-3" /> Now on your phone
          </div>
          <h1 className="mt-6 text-balance text-[38px] font-semibold leading-[1.05] tracking-tight text-foreground">
            Beautiful quotations,
            <br />
            effortlessly.
          </h1>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
            Upload one quotation you already send. We turn it into a reusable template you can
            answer in minutes.
          </p>
          <Link
            to="/auth"
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-6 py-4 text-[15px] font-semibold text-background active:scale-[0.99]"
          >
            Get started <ArrowRight className="size-4" />
          </Link>
        </section>

        <section className="mt-10 space-y-3">
          {[
            {
              icon: FileText,
              title: "Upload one quotation",
              body: "Any PDF you already send to clients.",
            },
            {
              icon: Sparkles,
              title: "We learn how it works",
              body: "Fixed content, variable fields, calculations.",
            },
            {
              icon: Send,
              title: "Answer a few questions",
              body: "New quotation, ready to share, in minutes.",
            },
          ].map((s, i) => (
            <div
              key={s.title}
              className="flex items-start gap-4 rounded-3xl bg-card p-5 ring-1 ring-border"
            >
              <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-mist">
                <s.icon className="size-5 text-foreground/80" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-mono text-muted-foreground">0{i + 1}</div>
                <div className="mt-0.5 font-semibold">{s.title}</div>
                <div className="mt-1 text-[13px] text-muted-foreground">{s.body}</div>
              </div>
            </div>
          ))}
        </section>

        <footer className="mt-14 pb-10 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Quotient
        </footer>
      </div>
    </div>
  );
}
