import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyRateCard, getMyBusiness } from "@/lib/queries";
import { formatCurrency } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ChevronLeft, Plus, Tag, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/rate-card")({
  head: () => ({
    meta: [
      { title: "Rate card — Quotient" },
      { name: "description", content: "Your reusable services and rates." },
    ],
  }),
  component: RateCard,
});

function RateCard() {
  const { data, refetch } = useQuery({ queryKey: ["rateCard"], queryFn: getMyRateCard });
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: getMyBusiness });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "", unit: "unit", rate: 0 });

  async function save() {
    if (!form.name) return toast.error("Add a name");
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase
      .from("rate_card_items")
      .insert({ user_id: user.user.id, ...form });
    if (error) return toast.error(error.message);
    toast.success("Added");
    setOpen(false);
    setForm({ name: "", description: "", unit: "unit", rate: 0 });
    refetch();
  }
  async function del(id: string) {
    await supabase.from("rate_card_items").delete().eq("id", id);
    refetch();
  }

  return (
    <div className="min-h-dvh">
      <header className="bg-hero-warm pt-safe">
        <div className="flex items-center justify-between px-5 pt-4">
          <Link
            to="/settings"
            aria-label="Back"
            className="grid size-10 place-items-center rounded-full bg-card/70 backdrop-blur"
          >
            <ChevronLeft className="size-5" />
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background"
          >
            <Plus className="mr-1 inline size-3.5" /> New
          </button>
        </div>
        <div className="px-6 pb-8 pt-6">
          <h1 className="text-[28px] font-semibold tracking-tight">Rate card</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Services & products you quote often, ready to drop into any quotation.
          </p>
        </div>
      </header>

      <div className="space-y-3 px-6 py-6">
        {(data ?? []).length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-border">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-butter">
              <Tag className="size-5 text-foreground/70" />
            </div>
            <div className="mt-3 font-medium">Nothing here yet</div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Add your first service or product.
            </p>
          </div>
        ) : (
          data!.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-border"
            >
              <div className="grid size-11 place-items-center rounded-2xl bg-peach">
                <Tag className="size-4 text-foreground/70" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{r.name}</div>
                <div className="text-[12px] text-muted-foreground">
                  {formatCurrency(Number(r.rate), business?.currency ?? "USD")} / {r.unit}
                </div>
              </div>
              <button
                onClick={() => del(r.id)}
                className="grid size-9 place-items-center rounded-xl bg-secondary text-muted-foreground active:scale-95"
                aria-label="Delete"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="rounded-t-[28px] pb-safe">
          <SheetHeader>
            <SheetTitle className="text-left text-[20px]">New rate</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Field label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <Field
              label="Description"
              value={form.description}
              onChange={(v) => setForm({ ...form, description: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Unit"
                value={form.unit}
                onChange={(v) => setForm({ ...form, unit: v })}
              />
              <Field
                label="Rate"
                type="number"
                value={String(form.rate)}
                onChange={(v) => setForm({ ...form, rate: Number(v) })}
              />
            </div>
            <Button
              onClick={save}
              className="mt-4 h-14 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
            >
              Add
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
      <Input
        className="mt-1 h-12 rounded-2xl bg-card px-4"
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
