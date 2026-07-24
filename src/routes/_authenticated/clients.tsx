import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getMyClients } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { ChevronLeft, Plus, UserPlus } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients")({
  head: () => ({
    meta: [
      { title: "Clients — Quotient" },
      { name: "description", content: "Your client directory." },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data, refetch } = useQuery({ queryKey: ["clients"], queryFn: getMyClients });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "", address: "" });

  async function save() {
    if (!form.name && !form.company) return toast.error("Please add a name or company");
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { error } = await supabase.from("clients").insert({ user_id: user.user.id, ...form });
    if (error) return toast.error(error.message);
    toast.success("Client added");
    setOpen(false);
    setForm({ name: "", company: "", email: "", phone: "", address: "" });
    refetch();
  }

  return (
    <div className="min-h-dvh">
      <header className="bg-hero-cool pt-safe">
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
          <h1 className="text-[28px] font-semibold tracking-tight">Clients</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">People you send quotations to.</p>
        </div>
      </header>

      <div className="space-y-3 px-6 py-6">
        {(data ?? []).length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center ring-1 ring-border">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-lavender">
              <UserPlus className="size-5 text-foreground/70" />
            </div>
            <div className="mt-3 font-medium">No clients yet</div>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Add one so you can reuse them later.
            </p>
          </div>
        ) : (
          data!.map((c) => {
            const label = c.company || c.name;
            const initials = (label ?? "??").slice(0, 2).toUpperCase();
            return (
              <div
                key={c.id}
                className="flex items-center gap-4 rounded-3xl bg-card p-4 ring-1 ring-border"
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-mist text-[13px] font-semibold text-foreground/80">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[15px] font-semibold">{label}</div>
                  <div className="truncate text-[12px] text-muted-foreground">
                    {c.email || c.phone || "—"}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] pb-safe"
        >
          <SheetHeader>
            <SheetTitle className="text-left text-[20px]">New client</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <Field
              label="Company"
              value={form.company}
              onChange={(v) => setForm({ ...form, company: v })}
            />
            <Field
              label="Contact name"
              value={form.name}
              onChange={(v) => setForm({ ...form, name: v })}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              onChange={(v) => setForm({ ...form, email: v })}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(v) => setForm({ ...form, phone: v })}
            />
            <div>
              <label className="text-[12px] font-medium text-muted-foreground">Address</label>
              <Textarea
                className="mt-1 rounded-2xl bg-card"
                rows={2}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>
            <Button
              onClick={save}
              className="mt-4 h-14 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
            >
              Add client
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
        value={value}
        type={type}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
