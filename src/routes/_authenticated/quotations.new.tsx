import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyTemplates, getMyBusiness, nextQuotationNumber } from "@/lib/queries";
import { QuestionScreen } from "@/components/QuestionScreen";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/quotations/new")({
  head: () => ({
    meta: [
      { title: "New quotation — Quotient" },
      { name: "description", content: "Pick a template to start a new quotation." },
    ],
  }),
  component: NewQuotation,
});

const TINTS = ["bg-mist", "bg-mint", "bg-lavender", "bg-peach", "bg-butter"];

function NewQuotation() {
  const navigate = useNavigate();
  const { data: templates } = useQuery({ queryKey: ["templates"], queryFn: getMyTemplates });
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: getMyBusiness });
  const [creating, setCreating] = useState(false);
  const active = (templates ?? []).filter((t) => t.status === "active");

  async function pick(tplId: string) {
    if (!business) return toast.error("Set up your business first");
    if (creating) return;
    setCreating(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;
      const number = await nextQuotationNumber(business);
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 30);
      const { data, error } = await supabase
        .from("quotations")
        .insert({
          user_id: user.user.id,
          business_id: business.id,
          template_id: tplId,
          quotation_number: number,
          status: "draft",
          currency: business.currency,
          expiry_date: expiry.toISOString().slice(0, 10),
          answers: {},
          items: [],
        })
        .select()
        .single();
      if (error) throw error;
      navigate({ to: "/quotations/$id", params: { id: data.id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create");
      setCreating(false);
    }
  }

  // Auto-pick when only one active template exists — no unnecessary choice.
  useEffect(() => {
    if (templates && business && active.length === 1 && !creating) {
      pick(active[0].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, business]);

  return (
    <QuestionScreen
      onClose={() => navigate({ to: "/dashboard" })}
      eyebrow="New quotation"
      title="Which template should we use?"
      subtitle="Pick a starting point. You can change everything after."
    >
      {active.length === 0 ? (
        <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-border">
          <p className="text-[14px] text-muted-foreground">
            You don't have an active template yet.
          </p>
          <button
            onClick={() => navigate({ to: "/onboarding" })}
            className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-foreground px-5 py-3.5 text-[14px] font-semibold text-background"
          >
            Set up my first template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {active.map((t, i) => (
            <button
              key={t.id}
              onClick={() => pick(t.id)}
              disabled={creating}
              className="flex w-full items-center gap-4 rounded-3xl bg-card p-4 text-left ring-1 ring-border transition active:scale-[0.99] disabled:opacity-50"
            >
              <div
                className={`grid size-14 shrink-0 place-items-center rounded-2xl ${TINTS[i % TINTS.length]}`}
              >
                <Sparkles className="size-5 text-foreground/70" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{t.name}</div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  Updated{" "}
                  {new Date(t.updated_at).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </QuestionScreen>
  );
}
