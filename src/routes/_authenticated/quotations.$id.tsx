import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness, getMyClients, getMyRateCard } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { calculateTotals, formatCurrency, lineTotal, type LineItem } from "@/lib/calc";
import { generateQuotationPdf } from "@/lib/pdf";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";
import { QuestionScreen } from "@/components/QuestionScreen";
import { StatusBadge } from "@/components/StatusBadge";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Plus,
  Send,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/quotations/$id")({
  head: () => ({
    meta: [
      { title: "Quotation — Quotient" },
      { name: "description", content: "Guided quotation builder." },
    ],
  }),
  component: QuotationDetail,
});

interface TplField {
  id: string;
  key: string;
  label: string;
  help_text?: string | null;
  field_type: string;
  category: string;
  required: boolean;
  example_value?: string | null;
  options?: string[] | null;
}

type Screen = "client" | "detail" | "fields" | "items" | "adjust" | "notes" | "review";

function QuotationDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: business } = useQuery({ queryKey: ["business"], queryFn: getMyBusiness });
  const { data: clients, refetch: refetchClients } = useQuery({
    queryKey: ["clients"],
    queryFn: getMyClients,
  });
  const { data: rateCard } = useQuery({ queryKey: ["rateCard"], queryFn: getMyRateCard });

  const { data: quotation, refetch } = useQuery({
    queryKey: ["quotation", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("quotations").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: fields } = useQuery({
    enabled: !!quotation?.template_id,
    queryKey: ["template-fields", quotation?.template_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_fields")
        .select("*")
        .eq("template_id", quotation!.template_id!)
        .order("sort_order");
      if (error) throw error;
      return data as TplField[];
    },
  });

  const [answers, setAnswers] = useState<Record<string, string | number | boolean>>({});
  const [items, setItems] = useState<LineItem[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [title, setTitle] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [screen, setScreen] = useState<Screen>("client");
  const [clientSheet, setClientSheet] = useState(false);
  const [rateSheet, setRateSheet] = useState(false);
  const [itemDraft, setItemDraft] = useState<LineItem | null>(null);

  useEffect(() => {
    if (!quotation) return;
    setAnswers((quotation.answers as Record<string, string | number | boolean>) ?? {});
    setItems((quotation.items as unknown as LineItem[]) ?? []);
    setClientId(quotation.client_id ?? "");
    setNotes(quotation.notes ?? "");
    setTitle(quotation.title ?? "");
    setDiscount(Number(quotation.discount) || 0);
  }, [quotation]);

  const totals = useMemo(
    () => calculateTotals(items, discount, taxRate),
    [items, discount, taxRate],
  );
  const client = useMemo(() => clients?.find((c) => c.id === clientId), [clients, clientId]);
  const promptFields = useMemo(
    () =>
      (fields ?? []).filter(
        (f) =>
          f.field_type !== "line_items" && f.category !== "fixed" && f.category !== "calculated",
      ),
    [fields],
  );

  const SCREENS: Screen[] = ["client", "detail", "fields", "items", "adjust", "notes", "review"];
  const idx = SCREENS.indexOf(screen);

  function go(next: Screen) {
    setScreen(next);
  }
  function back() {
    const p = SCREENS[idx - 1];
    if (p) setScreen(p);
    else navigate({ to: "/quotations" });
  }
  async function close() {
    await save(true);
    navigate({ to: "/quotations" });
  }

  async function save(silent = false) {
    const { error } = await supabase
      .from("quotations")
      .update({
        answers,
        items: items as never,
        client_id: clientId || null,
        notes,
        title,
        discount,
        subtotal: totals.subtotal,
        tax: totals.taxAmount,
        total: totals.total,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!silent) toast.success("Saved");
    refetch();
  }

  async function finalise() {
    await save(true);
    await supabase.from("quotations").update({ status: "finalised" }).eq("id", id);
    toast.success("Finalised — ready to share");
    refetch();
  }

  function downloadPdf() {
    if (!business || !client) {
      toast.error("Pick a client first");
      return;
    }
    const doc = generateQuotationPdf({
      business,
      client,
      quotation: {
        number: quotation!.quotation_number,
        title,
        issue_date: quotation!.issue_date,
        expiry_date: quotation!.expiry_date,
        currency: quotation!.currency,
        notes,
      },
      items,
      totals,
    });
    doc.save(`${quotation!.quotation_number}.pdf`);
  }

  async function share() {
    downloadPdf();
    await finalise();
  }

  const Primary = ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="h-14 w-full rounded-2xl bg-foreground text-[15px] font-semibold text-background transition active:scale-[0.99] disabled:opacity-40"
    >
      {children}
    </button>
  );
  const Secondary = ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => (
    <button
      onClick={onClick}
      className="h-12 w-full rounded-2xl bg-card text-[14px] font-medium text-foreground/80 ring-1 ring-border"
    >
      {children}
    </button>
  );

  if (!quotation) {
    return <div className="grid min-h-dvh place-items-center text-muted-foreground">Loading…</div>;
  }

  const total = SCREENS.length;
  const stepProps = { step: idx + 1, total, onBack: back, onClose: close } as const;
  const currency = quotation.currency;

  // ---- Screens ----
  if (screen === "client") {
    return (
      <QuestionScreen
        {...stepProps}
        eyebrow={quotation.quotation_number}
        title="Who is this for?"
        subtitle="Pick a client from your directory, or add someone new."
        toneClass="bg-hero-warm"
        primary={
          <Primary onClick={() => go("detail")} disabled={!clientId}>
            Continue
          </Primary>
        }
        secondary={
          <Secondary onClick={() => setClientSheet(true)}>
            <UserPlus className="mr-2 inline size-4" /> Add new client
          </Secondary>
        }
      >
        {(clients ?? []).length === 0 ? (
          <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-border">
            <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-lavender">
              <UserPlus className="size-5 text-foreground/70" />
            </div>
            <div className="mt-3 font-medium">You don't have any clients yet</div>
            <p className="mt-1 text-[13px] text-muted-foreground">Add one to get going.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {clients!.map((c) => {
              const active = c.id === clientId;
              const label = c.company || c.name;
              const initials = (label ?? "??").slice(0, 2).toUpperCase();
              return (
                <button
                  key={c.id}
                  onClick={() => setClientId(c.id)}
                  className={[
                    "flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition active:scale-[0.99]",
                    active
                      ? "bg-foreground text-background ring-foreground"
                      : "bg-card ring-border",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "grid size-10 shrink-0 place-items-center rounded-xl text-[12px] font-semibold",
                      active ? "bg-background/15 text-background" : "bg-mist text-foreground/80",
                    ].join(" ")}
                  >
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{label}</div>
                    <div
                      className={[
                        "truncate text-[11px]",
                        active ? "opacity-70" : "text-muted-foreground",
                      ].join(" ")}
                    >
                      {c.email || c.phone || "—"}
                    </div>
                  </div>
                  {active && <Check className="size-4" />}
                </button>
              );
            })}
          </div>
        )}

        <NewClientSheet
          open={clientSheet}
          onOpenChange={setClientSheet}
          onCreated={(newId) => {
            setClientId(newId);
            refetchClients();
          }}
        />
      </QuestionScreen>
    );
  }

  if (screen === "detail") {
    return (
      <QuestionScreen
        {...stepProps}
        eyebrow="Details"
        title="Give this quotation a title."
        subtitle="Something short you'll recognise later."
        toneClass="bg-hero-cool"
        primary={
          <Primary onClick={() => go(promptFields.length ? "fields" : "items")}>Continue</Primary>
        }
      >
        <Input
          autoFocus
          placeholder={
            quotation!.template_id ? "e.g. Wedding — Sept 2026" : "e.g. Website redesign"
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-16 rounded-2xl bg-card px-5 text-lg font-medium"
        />
      </QuestionScreen>
    );
  }

  if (screen === "fields") {
    return (
      <QuestionScreen
        {...stepProps}
        eyebrow="Template questions"
        title="A few quick answers."
        subtitle="These fill in the personalised sections of your quotation."
        toneClass="bg-hero-warm"
        primary={<Primary onClick={() => go("items")}>Continue</Primary>}
      >
        <div className="space-y-3">
          {promptFields.map((f) => (
            <div key={f.id} className="rounded-2xl bg-card p-4 ring-1 ring-border">
              <div className="text-[12px] font-medium text-muted-foreground">
                {f.label}
                {f.required && <span className="text-destructive"> *</span>}
              </div>
              <div className="mt-2">
                {renderFieldInput(f, answers[f.key], (v) => setAnswers({ ...answers, [f.key]: v }))}
              </div>
              {f.help_text && (
                <div className="mt-1.5 text-[11px] text-muted-foreground">{f.help_text}</div>
              )}
            </div>
          ))}
        </div>
      </QuestionScreen>
    );
  }

  if (screen === "items") {
    return (
      <QuestionScreen
        {...stepProps}
        eyebrow="Line items"
        title="What are you quoting?"
        subtitle="Add as many as you need. Tap to edit."
        toneClass="bg-hero-cool"
        primary={<Primary onClick={() => go("adjust")}>Continue</Primary>}
        secondary={
          <div className="flex gap-2">
            <button
              onClick={() =>
                setItemDraft({ id: crypto.randomUUID(), name: "", quantity: 1, rate: 0 })
              }
              className="h-12 flex-1 rounded-2xl bg-foreground text-[14px] font-medium text-background"
            >
              <Plus className="mr-1 inline size-4" /> New
            </button>
            {(rateCard ?? []).length > 0 && (
              <button
                onClick={() => setRateSheet(true)}
                className="h-12 flex-1 rounded-2xl bg-card text-[14px] font-medium ring-1 ring-border"
              >
                From rate card
              </button>
            )}
          </div>
        }
      >
        {items.length === 0 ? (
          <div className="rounded-3xl bg-card p-8 text-center ring-1 ring-border">
            <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-mint">
              <Plus className="size-5 text-foreground/70" />
            </div>
            <div className="mt-3 font-medium">No items yet</div>
            <p className="mt-1 text-[13px] text-muted-foreground">Add the first one below.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => setItemDraft(it)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left ring-1 ring-border active:scale-[0.99]"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{it.name || "Untitled"}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {it.quantity}
                    {it.days && it.days > 1 ? ` × ${it.days}d` : ""} ×{" "}
                    {formatCurrency(it.rate, currency)}
                  </div>
                </div>
                <div className="text-[14px] font-semibold tabular-nums">
                  {formatCurrency(lineTotal(it), currency)}
                </div>
              </button>
            ))}
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
              <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
                Subtotal
              </span>
              <span className="text-[16px] font-semibold tabular-nums">
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>
          </div>
        )}

        <ItemSheet
          draft={itemDraft}
          currency={currency}
          onClose={() => setItemDraft(null)}
          onSave={(it) => {
            setItems((prev) =>
              prev.some((x) => x.id === it.id)
                ? prev.map((x) => (x.id === it.id ? it : x))
                : [...prev, it],
            );
            setItemDraft(null);
          }}
          onDelete={(iid) => {
            setItems((prev) => prev.filter((x) => x.id !== iid));
            setItemDraft(null);
          }}
        />

        <Sheet open={rateSheet} onOpenChange={setRateSheet}>
          <SheetContent
            side="bottom"
            className="max-h-[80dvh] overflow-y-auto rounded-t-[28px] pb-safe"
          >
            <SheetHeader>
              <SheetTitle className="text-left text-[18px]">Add from rate card</SheetTitle>
            </SheetHeader>
            <div className="mt-3 space-y-2">
              {(rateCard ?? []).map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    setItems((p) => [
                      ...p,
                      {
                        id: crypto.randomUUID(),
                        name: r.name,
                        description: r.description ?? undefined,
                        unit: r.unit ?? undefined,
                        quantity: 1,
                        rate: Number(r.rate),
                      },
                    ]);
                    setRateSheet(false);
                  }}
                  className="flex w-full items-center justify-between rounded-2xl bg-card p-4 text-left ring-1 ring-border"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[14px] font-semibold">{r.name}</div>
                    <div className="text-[11px] text-muted-foreground">per {r.unit}</div>
                  </div>
                  <div className="text-[14px] font-semibold">
                    {formatCurrency(Number(r.rate), currency)}
                  </div>
                </button>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </QuestionScreen>
    );
  }

  if (screen === "adjust") {
    return (
      <QuestionScreen
        {...stepProps}
        eyebrow="Fine tuning"
        title="Any discount or tax?"
        subtitle="Skip if none apply."
        toneClass="bg-hero-warm"
        primary={<Primary onClick={() => go("notes")}>Continue</Primary>}
      >
        <div className="space-y-3">
          <NumberField label={`Discount (%)`} value={discount} onChange={setDiscount} />
          <NumberField label="Tax (%)" value={taxRate} onChange={setTaxRate} />
          <div className="mt-2 rounded-3xl bg-card p-5 ring-1 ring-border">
            <TotalsRow label="Subtotal" value={formatCurrency(totals.subtotal, currency)} />
            {totals.discountAmount > 0 && (
              <TotalsRow
                label="Discount"
                value={`− ${formatCurrency(totals.discountAmount, currency)}`}
              />
            )}
            <TotalsRow label="Tax" value={formatCurrency(totals.taxAmount, currency)} />
            <div className="mt-2 border-t border-border pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Total
                </span>
                <span className="text-[24px] font-semibold tabular-nums">
                  {formatCurrency(totals.total, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </QuestionScreen>
    );
  }

  if (screen === "notes") {
    return (
      <QuestionScreen
        {...stepProps}
        eyebrow="Almost done"
        title="Anything else to add?"
        subtitle="Notes appear at the bottom of the quotation."
        toneClass="bg-hero-cool"
        primary={<Primary onClick={() => go("review")}>Continue</Primary>}
      >
        <Textarea
          rows={6}
          placeholder="e.g. Prices valid for 30 days. 50% deposit to confirm."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-2xl bg-card p-4 text-[15px]"
        />
      </QuestionScreen>
    );
  }

  // review
  return (
    <QuestionScreen
      {...stepProps}
      eyebrow="Review"
      title={title || "Your quotation"}
      subtitle={client ? `For ${client.company || client.name}` : "Ready to share."}
      toneClass="bg-hero-warm"
      primary={
        <Primary onClick={share}>
          <Send className="mr-2 inline size-4" /> Finalise & download PDF
        </Primary>
      }
      secondary={
        <div className="flex gap-2">
          <button
            onClick={() => save()}
            className="h-12 flex-1 rounded-2xl bg-card text-[14px] font-medium ring-1 ring-border"
          >
            Save draft
          </button>
          <button
            onClick={downloadPdf}
            className="h-12 flex-1 rounded-2xl bg-card text-[14px] font-medium ring-1 ring-border"
          >
            <Download className="mr-1 inline size-4" /> PDF
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <StatusBadge status={quotation.status} />
            <div className="font-mono text-[11px] text-muted-foreground">
              {quotation.quotation_number}
            </div>
          </div>
          <div className="mt-5 text-[34px] font-semibold leading-none tracking-tight tabular-nums">
            {formatCurrency(totals.total, currency)}
          </div>
          <div className="mt-1 text-[12px] text-muted-foreground">
            {items.length} {items.length === 1 ? "item" : "items"} · valid until{" "}
            {quotation.expiry_date}
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-border">
          <div className="border-b border-border p-4 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Items
          </div>
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-center justify-between border-b border-border p-4 last:border-b-0"
            >
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium">{it.name || "Untitled"}</div>
                <div className="text-[11px] text-muted-foreground">
                  {it.quantity} × {formatCurrency(it.rate, currency)}
                </div>
              </div>
              <div className="text-[14px] font-semibold tabular-nums">
                {formatCurrency(lineTotal(it), currency)}
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
          <TotalsRow label="Subtotal" value={formatCurrency(totals.subtotal, currency)} />
          {totals.discountAmount > 0 && (
            <TotalsRow
              label="Discount"
              value={`− ${formatCurrency(totals.discountAmount, currency)}`}
            />
          )}
          <TotalsRow label="Tax" value={formatCurrency(totals.taxAmount, currency)} />
          <div className="mt-2 flex items-baseline justify-between border-t border-border pt-3">
            <span className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              Total
            </span>
            <span className="text-[18px] font-semibold tabular-nums">
              {formatCurrency(totals.total, currency)}
            </span>
          </div>
        </div>

        {notes && (
          <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notes
            </div>
            <div className="mt-2 whitespace-pre-line text-[13px] text-foreground/80">{notes}</div>
          </div>
        )}

        <button
          onClick={() => go("client")}
          className="mx-auto mt-2 flex items-center gap-1 text-[12px] font-medium text-muted-foreground"
        >
          <ChevronLeft className="size-3.5" /> Edit from the beginning
        </button>
      </div>
    </QuestionScreen>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-border">
      <label className="text-[12px] font-medium text-muted-foreground">{label}</label>
      <Input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="mt-1 h-12 rounded-xl bg-secondary/60 px-3 text-[16px]"
      />
    </div>
  );
}

function TotalsRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-1 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function renderFieldInput(
  f: TplField,
  value: string | number | boolean | undefined,
  onChange: (v: string | number | boolean) => void,
) {
  const base = "h-12 w-full rounded-xl bg-secondary/60 px-3 text-[15px]";
  switch (f.field_type) {
    case "long_text":
      return (
        <Textarea
          rows={3}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className="rounded-xl bg-secondary/60 p-3"
        />
      );
    case "number":
    case "currency":
    case "percentage":
      return (
        <Input
          type="number"
          inputMode="decimal"
          value={value === undefined ? "" : Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
          className={base}
          placeholder={f.example_value ?? ""}
        />
      );
    case "date":
      return (
        <Input
          type="date"
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={base}
        />
      );
    case "boolean":
      return (
        <button
          onClick={() => onChange(!(value as boolean))}
          className={[
            "flex h-12 w-full items-center justify-between rounded-xl px-4 text-[14px] font-medium transition",
            (value as boolean)
              ? "bg-foreground text-background"
              : "bg-secondary/60 text-foreground/70",
          ].join(" ")}
        >
          {(value as boolean) ? "Yes" : "No"}
          {(value as boolean) && <Check className="size-4" />}
        </button>
      );
    case "dropdown":
      return (
        <div className="flex flex-wrap gap-2">
          {(f.options ?? []).map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={[
                "rounded-full px-4 py-2 text-[13px] transition",
                String(value) === opt
                  ? "bg-foreground text-background"
                  : "bg-secondary/60 text-foreground/80",
              ].join(" ")}
            >
              {opt}
            </button>
          ))}
        </div>
      );
    default:
      return (
        <Input
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          className={base}
          placeholder={f.example_value ?? ""}
        />
      );
  }
}

function ItemSheet({
  draft,
  currency,
  onClose,
  onSave,
  onDelete,
}: {
  draft: LineItem | null;
  currency: string;
  onClose: () => void;
  onSave: (it: LineItem) => void;
  onDelete: (id: string) => void;
}) {
  const [it, setIt] = useState<LineItem | null>(draft);
  useEffect(() => setIt(draft), [draft]);
  if (!it) return null;

  const setField = <K extends keyof LineItem>(k: K, v: LineItem[K]) => setIt({ ...it, [k]: v });

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] pb-safe"
      >
        <SheetHeader>
          <SheetTitle className="text-left text-[20px]">
            {draft?.name ? "Edit item" : "New item"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">What is it?</label>
            <Input
              autoFocus
              value={it.name}
              onChange={(e) => setField("name", e.target.value)}
              className="mt-1 h-14 rounded-2xl bg-card px-4 text-[15px] font-medium"
            />
          </div>
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">
              Description (optional)
            </label>
            <Textarea
              rows={2}
              value={it.description ?? ""}
              onChange={(e) => setField("description", e.target.value)}
              className="mt-1 rounded-2xl bg-card p-3"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <FieldBox label="Qty">
              <input
                type="number"
                inputMode="decimal"
                value={it.quantity}
                onChange={(e) => setField("quantity", Number(e.target.value) || 0)}
                className="w-full bg-transparent text-[16px] font-semibold outline-none"
              />
            </FieldBox>
            <FieldBox label="Days (opt)">
              <input
                type="number"
                inputMode="decimal"
                value={it.days ?? ""}
                onChange={(e) => setField("days", Number(e.target.value) || undefined)}
                className="w-full bg-transparent text-[16px] font-semibold outline-none"
              />
            </FieldBox>
            <FieldBox label={`Rate (${currency})`}>
              <input
                type="number"
                inputMode="decimal"
                value={it.rate}
                onChange={(e) => setField("rate", Number(e.target.value) || 0)}
                className="w-full bg-transparent text-[16px] font-semibold outline-none"
              />
            </FieldBox>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <FieldBox label="Discount %">
              <input
                type="number"
                inputMode="decimal"
                value={it.discount ?? 0}
                onChange={(e) => setField("discount", Number(e.target.value) || 0)}
                className="w-full bg-transparent text-[16px] font-semibold outline-none"
              />
            </FieldBox>
            <FieldBox label="Tax %">
              <input
                type="number"
                inputMode="decimal"
                value={it.tax_rate ?? 0}
                onChange={(e) => setField("tax_rate", Number(e.target.value) || 0)}
                className="w-full bg-transparent text-[16px] font-semibold outline-none"
              />
            </FieldBox>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-secondary/60 px-4 py-3">
            <span className="text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
              Line total
            </span>
            <span className="text-[18px] font-semibold tabular-nums">
              {formatCurrency(lineTotal(it), currency)}
            </span>
          </div>
          <div className="flex gap-2 pt-2">
            {draft?.name !== undefined && draft?.name !== "" && (
              <button
                onClick={() => onDelete(it.id)}
                className="grid size-14 place-items-center rounded-2xl bg-card text-destructive ring-1 ring-border"
                aria-label="Delete"
              >
                <Trash2 className="size-5" />
              </button>
            )}
            <button
              onClick={() => onSave(it)}
              disabled={!it.name.trim()}
              className="h-14 flex-1 rounded-2xl bg-foreground text-[15px] font-semibold text-background disabled:opacity-40"
            >
              Save item
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FieldBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-card px-3 py-2 ring-1 ring-border">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function NewClientSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (id: string) => void;
}) {
  const [form, setForm] = useState({ name: "", company: "", email: "", phone: "" });
  async function save() {
    if (!form.name && !form.company) return toast.error("Add a name or company");
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: user.user.id,
        ...form,
        name: form.name || form.company,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    toast.success("Client added");
    onCreated(data.id);
    setForm({ name: "", company: "", email: "", phone: "" });
    onOpenChange(false);
  }
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-[28px] pb-safe">
        <SheetHeader>
          <SheetTitle className="text-left text-[20px]">Add a client</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          <Input
            placeholder="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            className="h-14 rounded-2xl bg-card px-4"
          />
          <Input
            placeholder="Contact name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="h-14 rounded-2xl bg-card px-4"
          />
          <Input
            placeholder="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-14 rounded-2xl bg-card px-4"
          />
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-14 rounded-2xl bg-card px-4"
          />
          <button
            onClick={save}
            className="mt-2 h-14 w-full rounded-2xl bg-foreground text-[15px] font-semibold text-background"
          >
            Add
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
