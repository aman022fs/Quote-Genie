import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ChevronRight, LogOut, Users, Tag, Building2, Settings2, Moon, Sun } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Profile — Quotient" },
      { name: "description", content: "Your account and business." },
    ],
  }),
  component: Profile,
});

function Profile() {
  const navigate = useNavigate();
  const { data: business, refetch } = useQuery({ queryKey: ["business"], queryFn: getMyBusiness });
  const [editOpen, setEditOpen] = useState(false);
  const [numberOpen, setNumberOpen] = useState(false);
  const [dark, setDark] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const has = document.documentElement.classList.contains("dark");
      setDark(has);
    }
  }, []);

  function toggleDark() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
  }

  async function signOut() {
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const name = business?.name || "Your business";
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-dvh">
      <div className="bg-hero-warm pt-safe">
        <div className="px-6 pb-8 pt-8 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-card text-[22px] font-semibold text-foreground/80 ring-1 ring-border">
            {initials}
          </div>
          <div className="mt-4 text-[20px] font-semibold tracking-tight">{name}</div>
          {business?.category && (
            <div className="mt-1 text-[13px] text-muted-foreground">{business.category}</div>
          )}
        </div>
      </div>

      <div className="space-y-6 px-6 py-6">
        <Group title="Business">
          <Row icon={Building2} label="Business details" onClick={() => setEditOpen(true)} />
          <Row icon={Settings2} label="Numbering & currency" onClick={() => setNumberOpen(true)} />
        </Group>

        <Group title="Library">
          <Row icon={Users} label="Clients" href="/clients" />
          <Row icon={Tag} label="Rate card" href="/rate-card" />
        </Group>

        <Group title="Appearance">
          <Row
            icon={dark ? Moon : Sun}
            label={dark ? "Dark mode" : "Light mode"}
            onClick={toggleDark}
          />
        </Group>

        <button
          onClick={signOut}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-card px-5 py-4 text-[14px] font-medium text-destructive ring-1 ring-border"
        >
          <LogOut className="size-4" /> Sign out
        </button>
      </div>

      <BusinessSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        business={business}
        onSaved={refetch}
      />
      <NumberingSheet
        open={numberOpen}
        onOpenChange={setNumberOpen}
        business={business}
        onSaved={refetch}
      />
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-border">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  href,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  href?: string;
  onClick?: () => void;
}) {
  const inner = (
    <>
      <div className="grid size-9 place-items-center rounded-xl bg-secondary">
        <Icon className="size-4 text-foreground/70" />
      </div>
      <div className="flex-1 text-[15px] font-medium">{label}</div>
      <ChevronRight className="size-4 text-muted-foreground" />
    </>
  );
  const base =
    "flex w-full items-center gap-3 px-4 py-3.5 border-b border-border last:border-b-0 active:bg-secondary/50";
  if (href)
    return (
      <Link to={href} className={base}>
        {inner}
      </Link>
    );
  return (
    <button onClick={onClick} className={base}>
      {inner}
    </button>
  );
}

function BusinessSheet({
  open,
  onOpenChange,
  business,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  business: Awaited<ReturnType<typeof getMyBusiness>> | undefined;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    category: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    tax_info: "",
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name ?? "",
        category: business.category ?? "",
        contact_name: business.contact_name ?? "",
        email: business.email ?? "",
        phone: business.phone ?? "",
        address: business.address ?? "",
        website: business.website ?? "",
        tax_info: business.tax_info ?? "",
      });
    }
  }, [business, open]);

  async function save() {
    if (!business) return;
    const { error } = await supabase.from("businesses").update(form).eq("id", business.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] pb-safe"
      >
        <SheetHeader>
          <SheetTitle className="text-left text-[20px]">Business details</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <SheetField
            label="Business name"
            value={form.name}
            onChange={(v) => setForm({ ...form, name: v })}
          />
          <SheetField
            label="Category"
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
          />
          <SheetField
            label="Contact person"
            value={form.contact_name}
            onChange={(v) => setForm({ ...form, contact_name: v })}
          />
          <SheetField
            label="Email"
            type="email"
            value={form.email}
            onChange={(v) => setForm({ ...form, email: v })}
          />
          <SheetField
            label="Phone"
            value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })}
          />
          <SheetField
            label="Website"
            value={form.website}
            onChange={(v) => setForm({ ...form, website: v })}
          />
          <SheetField
            label="Tax / GST info"
            value={form.tax_info}
            onChange={(v) => setForm({ ...form, tax_info: v })}
          />
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">Address</label>
            <Textarea
              className="mt-1 rounded-2xl bg-card"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              rows={3}
            />
          </div>
          <Button
            onClick={save}
            className="mt-4 h-14 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
          >
            Save changes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function NumberingSheet({
  open,
  onOpenChange,
  business,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  business: Awaited<ReturnType<typeof getMyBusiness>> | undefined;
  onSaved: () => void;
}) {
  const [prefix, setPrefix] = useState("QT");
  const [currency, setCurrency] = useState("USD");
  useEffect(() => {
    if (business) {
      setPrefix(business.quotation_prefix ?? "QT");
      setCurrency(business.currency ?? "USD");
    }
  }, [business, open]);
  async function save() {
    if (!business) return;
    const { error } = await supabase
      .from("businesses")
      .update({ quotation_prefix: prefix, currency })
      .eq("id", business.id);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
    onOpenChange(false);
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] pb-safe">
        <SheetHeader>
          <SheetTitle className="text-left text-[20px]">Numbering & currency</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <SheetField label="Quotation prefix" value={prefix} onChange={setPrefix} />
          <SheetField
            label="Currency (ISO)"
            value={currency}
            onChange={(v) => setCurrency(v.toUpperCase())}
          />
          <Button
            onClick={save}
            className="mt-4 h-14 w-full rounded-2xl bg-foreground text-background hover:bg-foreground/90"
          >
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function SheetField({
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
