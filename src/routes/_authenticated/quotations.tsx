import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getMyQuotations } from "@/lib/queries";
import { formatCurrency } from "@/lib/calc";
import { StatusBadge } from "@/components/StatusBadge";
import { FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quotations")({
  head: () => ({
    meta: [
      { title: "Quotations — Quotient" },
      { name: "description", content: "All your quotations." },
    ],
  }),
  component: QuotationsList,
});

const FILTERS = ["All", "Draft", "Sent", "Accepted", "Expired"] as const;

function QuotationsList() {
  const { data } = useQuery({ queryKey: ["quotations"], queryFn: getMyQuotations });
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");

  const filtered = (data ?? []).filter((q) => {
    if (filter === "All") return true;
    if (filter === "Sent") return q.status === "sent" || q.status === "finalised";
    return q.status === filter.toLowerCase();
  });

  return (
    <div className="min-h-dvh">
      <header className="bg-hero-warm pt-safe">
        <div className="px-6 pb-5 pt-8">
          <h1 className="text-[28px] font-semibold tracking-tight">Quotations</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Everything you've quoted, in one place.
          </p>
        </div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-6 pb-5">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                "shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition",
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-card text-foreground/70 ring-1 ring-border",
              ].join(" ")}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="space-y-3 px-6 py-6">
        {filtered.length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-border">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary">
              <FileText className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-3 font-medium">Nothing here yet</div>
            <div className="mt-1 text-[13px] text-muted-foreground">
              Tap the + below to create your first quotation.
            </div>
          </div>
        ) : (
          filtered.map((q) => {
            const name = q.clients?.company || q.clients?.name || "Untitled";
            const initials = name.slice(0, 2).toUpperCase();
            return (
              <Link
                key={q.id}
                to="/quotations/$id"
                params={{ id: q.id }}
                className="flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-border active:scale-[0.99]"
              >
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-mist text-[13px] font-semibold text-foreground/80">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="truncate text-[15px] font-semibold">{name}</div>
                    <div className="shrink-0 text-[14px] font-semibold tabular-nums">
                      {formatCurrency(Number(q.total || 0), q.currency)}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {q.quotation_number} ·{" "}
                      {new Date(q.issue_date).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <StatusBadge status={q.status} />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
