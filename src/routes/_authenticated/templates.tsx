import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyTemplates } from "@/lib/queries";
import { StatusBadge } from "@/components/StatusBadge";
import { ChevronRight, Plus, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/templates")({
  head: () => ({
    meta: [
      { title: "Templates — Quotient" },
      { name: "description", content: "Your quotation templates." },
    ],
  }),
  component: TemplatesList,
});

const TINTS = ["bg-mist", "bg-mint", "bg-lavender", "bg-peach", "bg-butter"];

function TemplatesList() {
  const { data: templates } = useQuery({ queryKey: ["templates"], queryFn: getMyTemplates });

  return (
    <div className="min-h-dvh">
      <header className="bg-hero-cool pt-safe">
        <div className="px-6 pb-8 pt-8">
          <h1 className="text-[28px] font-semibold tracking-tight">Templates</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            The blueprints behind every quotation you send.
          </p>
        </div>
      </header>

      <div className="space-y-3 px-6 py-6">
        {(templates ?? []).length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-border">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-lavender">
              <Sparkles className="size-5 text-foreground/70" />
            </div>
            <div className="mt-3 font-medium">Create your first template</div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Upload a quotation you already send. We'll do the rest.
            </p>
            <Link
              to="/onboarding"
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-3.5 text-[14px] font-semibold text-background"
            >
              Start now
            </Link>
          </div>
        ) : (
          <>
            {templates!.map((t, i) => (
              <Link
                key={t.id}
                to="/templates/$id"
                params={{ id: t.id }}
                className="block overflow-hidden rounded-3xl bg-card ring-1 ring-border active:scale-[0.99]"
              >
                <div className={`${TINTS[i % TINTS.length]} h-24 w-full`} />
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <StatusBadge status={t.status} />
                    <div className="text-[11px] text-muted-foreground">
                      Updated{" "}
                      {new Date(t.updated_at).toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[16px] font-semibold">{t.name}</div>
                      {t.description && (
                        <div className="mt-1 text-[13px] text-muted-foreground">
                          {t.description}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="size-5 text-muted-foreground" />
                  </div>
                </div>
              </Link>
            ))}
            <Link
              to="/onboarding"
              className="flex items-center justify-center gap-2 rounded-3xl border border-dashed border-border bg-card/40 py-6 text-[14px] font-medium text-foreground/70"
            >
              <Plus className="size-4" /> Add another template
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
