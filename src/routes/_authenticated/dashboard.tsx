import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { getMyBusiness, getMyTemplates, getMyQuotations } from "@/lib/queries";
import { formatCurrency } from "@/lib/calc";
import { ArrowRight, ChevronRight, Sparkles, FileText } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Home — Quotient" },
      { name: "description", content: "Your quotation workspace." },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const { data: business, isLoading: bLoading } = useQuery({
    queryKey: ["business"],
    queryFn: getMyBusiness,
  });
  const { data: templates, isLoading: tLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: getMyTemplates,
  });
  const { data: quotations } = useQuery({
    queryKey: ["quotations"],
    queryFn: getMyQuotations,
  });

  const activeTemplates = (templates ?? []).filter((t) => t.status === "active");
  const hasCompleted = business && activeTemplates.length > 0;

  useEffect(() => {
    if (!bLoading && !tLoading && !hasCompleted) {
      navigate({ to: "/onboarding" });
    }
  }, [bLoading, tLoading, hasCompleted, navigate]);

  const currency = business?.currency ?? "USD";
  const recent = (quotations ?? []).slice(0, 6);
  const awaiting = (quotations ?? []).filter(
    (q) => q.status === "sent" || q.status === "finalised",
  ).length;
  const firstName = (business?.contact_name || business?.name || "there").split(" ")[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 5
      ? "Working late"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Good afternoon"
          : "Good evening";

  return (
    <div className="min-h-dvh">
      {/* Greeting header */}
      <div className="bg-hero-warm pt-safe">
        <div className="px-6 pb-8 pt-8">
          <div className="text-sm font-medium text-foreground/60">{greeting},</div>
          <h1 className="mt-1 text-[30px] font-semibold leading-[1.1] tracking-tight text-foreground">
            {firstName}.
          </h1>

          {awaiting > 0 && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-card/80 px-3.5 py-1.5 text-[12px] font-medium text-foreground/80 backdrop-blur">
              <span className="size-1.5 rounded-full bg-brand" />
              {awaiting} {awaiting === 1 ? "quotation is" : "quotations are"} awaiting a response
            </div>
          )}

          {/* Primary action */}
          <Link
            to="/quotations/new"
            className="mt-6 flex items-center justify-between rounded-3xl bg-foreground p-5 text-background active:scale-[0.99]"
          >
            <div>
              <div className="text-[12px] font-medium uppercase tracking-wider opacity-60">
                Start here
              </div>
              <div className="mt-1 text-[20px] font-semibold tracking-tight">
                Create a new quotation
              </div>
              <div className="mt-1 text-[13px] opacity-70">
                Answer a few questions, share in minutes.
              </div>
            </div>
            <div className="grid size-11 place-items-center rounded-2xl bg-background/15">
              <ArrowRight className="size-5" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent quotations */}
      <section className="mt-8 px-6">
        <SectionHeader title="Recent quotations" href="/quotations" />
        {recent.length === 0 ? (
          <EmptyCard
            icon={FileText}
            title="No quotations yet"
            body="Your first quotation only takes a minute."
          />
        ) : (
          <div className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-3 overflow-x-auto px-6 pb-2">
            {recent.map((q) => (
              <Link
                key={q.id}
                to="/quotations/$id"
                params={{ id: q.id }}
                className="group w-[74%] max-w-[280px] shrink-0 snap-start rounded-3xl bg-card p-5 ring-1 ring-border transition active:scale-[0.99]"
              >
                <div className="flex items-center justify-between">
                  <StatusBadge status={q.status} />
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {q.quotation_number}
                  </div>
                </div>
                <div className="mt-4 truncate text-[15px] font-semibold">
                  {q.clients?.company || q.clients?.name || "Untitled"}
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  {new Date(q.created_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="mt-6 text-[22px] font-semibold tracking-tight">
                  {formatCurrency(Number(q.total || 0), q.currency)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Templates */}
      <section className="mt-10 px-6">
        <SectionHeader title="Your templates" href="/templates" />
        <div className="space-y-3">
          {(templates ?? []).slice(0, 3).map((t, i) => (
            <Link
              key={t.id}
              to="/templates/$id"
              params={{ id: t.id }}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 ring-1 ring-border active:scale-[0.99]"
            >
              <div
                className={[
                  "grid size-12 shrink-0 place-items-center rounded-2xl text-foreground/70",
                  ["bg-mist", "bg-mint", "bg-lavender", "bg-peach", "bg-butter"][i % 5],
                ].join(" ")}
              >
                <Sparkles className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{t.name}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  Updated{" "}
                  {new Date(t.updated_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* Snapshot */}
      <section className="mt-10 px-6">
        <SectionHeader title="This month" />
        <div className="rounded-3xl bg-hero-cool p-5 ring-1 ring-border">
          <div className="text-[12px] font-medium uppercase tracking-wider text-foreground/60">
            Quoted value
          </div>
          <div className="mt-1 text-[32px] font-semibold tracking-tight">
            {formatCurrency(monthTotal(quotations ?? []), currency)}
          </div>
          <div className="mt-1 text-[13px] text-muted-foreground">
            Across {monthCount(quotations ?? [])} quotations
          </div>
        </div>
      </section>

      <div className="h-8" />
    </div>
  );
}

function monthTotal(qs: Array<{ created_at: string; total: number | string | null }>) {
  const now = new Date();
  return qs
    .filter((q) => {
      const d = new Date(q.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((s, q) => s + Number(q.total || 0), 0);
}
function monthCount(qs: Array<{ created_at: string }>) {
  const now = new Date();
  return qs.filter((q) => {
    const d = new Date(q.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;
}

function SectionHeader({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-[13px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h2>
      {href && (
        <Link to={href} className="text-[12px] font-medium text-foreground/70">
          See all
        </Link>
      )}
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof FileText;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-3xl bg-card p-6 text-center ring-1 ring-border">
      <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary">
        <Icon className="size-5 text-muted-foreground" />
      </div>
      <div className="mt-3 font-medium">{title}</div>
      <div className="mt-1 text-[13px] text-muted-foreground">{body}</div>
    </div>
  );
}
