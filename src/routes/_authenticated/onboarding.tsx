import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { QuestionScreen } from "@/components/QuestionScreen";
import { toast } from "sonner";
import { Upload, FileText, LayoutTemplate, Check, Plus, X, Sparkles } from "lucide-react";
import {
  STARTER_TEMPLATES,
  getStarterTemplate,
  type BusinessCategoryId,
} from "@/lib/templates.config";
import {
  FIELD_TYPES,
  FIELD_CATEGORIES,
  fieldTypeGlyph,
  fieldTypeLabel,
  slugifyKey,
  dedupeKeys,
  type TemplateFieldDraft,
  type TemplateLineItemDraft,
  type TemplateFixedContent,
} from "@/lib/template-types";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Quotient" },
      { name: "description", content: "Set up your business and first quotation template." },
    ],
  }),
  component: Onboarding,
});

const ACCEPTED_REFERENCE_TYPES = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const MAX_REFERENCE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

type Step =
  "welcome" | "name" | "contact" | "address" | "category" | "template" | "reference" | "review";
const STEPS: Step[] = [
  "welcome",
  "name",
  "contact",
  "address",
  "category",
  "template",
  "reference",
  "review",
];

const TONES: Record<Step, string> = {
  welcome: "bg-hero-warm",
  name: "bg-hero-warm",
  contact: "bg-hero-cool",
  address: "bg-hero-warm",
  category: "bg-hero-cool",
  template: "bg-hero-warm",
  reference: "bg-hero-cool",
  review: "bg-hero-warm",
};

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("welcome");
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    contact_name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    tax_info: "",
    currency: "USD",
  });

  const [categoryId, setCategoryId] = useState<BusinessCategoryId | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [fixedContent, setFixedContent] = useState<TemplateFixedContent>({});
  const [fields, setFields] = useState<TemplateFieldDraft[]>([]);
  const [lineItems, setLineItems] = useState<TemplateLineItemDraft[]>([]);
  const [editField, setEditField] = useState<TemplateFieldDraft | null>(null);
  const [newLineItemName, setNewLineItemName] = useState("");

  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("businesses")
      .select("*")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setBusinessId(data.id);
          setForm({
            name: data.name ?? "",
            category: data.category ?? "",
            contact_name: data.contact_name ?? "",
            email: data.email ?? "",
            phone: data.phone ?? "",
            address: data.address ?? "",
            website: data.website ?? "",
            tax_info: data.tax_info ?? "",
            currency: data.currency ?? "USD",
          });
          if (data.name) setStep("category");
        }
      });
  }, []);

  const idx = STEPS.indexOf(step);
  const total = STEPS.length;
  const goNext = (s: Step) => setStep(s);
  const goBack = () => {
    const prev = STEPS[idx - 1];
    if (prev) setStep(prev);
  };

  async function persistBusiness(overrides?: Partial<typeof form>) {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("You need to be signed in.");
      navigate({ to: "/auth" });
      return null;
    }
    const payload = { ...form, ...overrides, user_id: user.user.id };
    if (businessId) {
      const { error } = await supabase.from("businesses").update(payload).eq("id", businessId);
      if (error) {
        toast.error(error.message);
        return null;
      }
      return businessId;
    }
    const { data, error } = await supabase.from("businesses").insert(payload).select().single();
    if (error) {
      toast.error(error.message);
      return null;
    }
    setBusinessId(data.id);
    return data.id;
  }

  function selectCategory(id: BusinessCategoryId) {
    const starter = getStarterTemplate(id);
    setCategoryId(id);
    setTemplateName(starter.name);
    setFixedContent({ ...starter.fixedContent });
    setFields(starter.fields.map((f) => ({ ...f })));
    setLineItems(starter.lineItems.map((li) => ({ ...li })));
    setForm((f) => ({ ...f, category: f.category || starter.categoryLabel }));
    persistBusiness({ category: form.category || starter.categoryLabel });
    goNext("template");
  }

  function startBlank() {
    selectCategory("custom_blank");
  }

  function removeField(key: string) {
    setFields((prev) => prev.filter((f) => f.key !== key));
  }

  function addField() {
    setEditField({
      key: slugifyKey("", "field"),
      label: "",
      field_type: "short_text",
      category: "variable",
      required: false,
    });
  }

  function saveField(f: TemplateFieldDraft) {
    const key = f.key.startsWith("field_") ? slugifyKey(f.label, "field") : f.key;
    const next = { ...f, key };
    setFields((prev) => {
      const exists = prev.some((x) => x.key === editField?.key);
      const withoutOld = editField ? prev.filter((x) => x.key !== editField.key) : prev;
      return dedupeKeys(exists ? [...withoutOld, next] : [...prev, next]);
    });
    setEditField(null);
  }

  function removeLineItem(name: string) {
    setLineItems((prev) => prev.filter((li) => li.name !== name));
  }

  function addLineItem() {
    const name = newLineItemName.trim();
    if (!name) return;
    setLineItems((prev) => [...prev, { name }]);
    setNewLineItemName("");
  }

  function handleFileChange(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    if (!ACCEPTED_REFERENCE_TYPES.includes(f.type)) {
      toast.error("Please upload a PDF, PNG, JPG, or WEBP file.");
      return;
    }
    if (f.size > MAX_REFERENCE_SIZE_BYTES) {
      toast.error("File is too large — please keep it under 10MB.");
      return;
    }
    setFile(f);
  }

  async function uploadReference(): Promise<boolean> {
    if (!file) return true;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      toast.error("You need to be signed in.");
      navigate({ to: "/auth" });
      return false;
    }
    const path = `${user.user.id}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("quotation-uploads").upload(path, file);
    if (error) {
      toast.error(`Couldn't upload the reference file: ${error.message}`);
      return false;
    }
    setUploadedPath(path);
    return true;
  }

  async function continueFromReference() {
    const ok = await uploadReference();
    if (ok) goNext("review");
  }

  async function saveTemplate() {
    if (saving) return;
    const name = templateName.trim();
    if (!name) {
      toast.error("Give your template a name.");
      return;
    }
    if (fields.some((f) => !f.label.trim())) {
      toast.error("Every field needs a label before you can save.");
      return;
    }

    setSaving(true);
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        toast.error("You need to be signed in.");
        navigate({ to: "/auth" });
        return;
      }
      const bId = businessId ?? (await persistBusiness());
      if (!bId) return;

      const { data: existing, error: existingErr } = await supabase
        .from("templates")
        .select("id")
        .eq("user_id", user.user.id)
        .ilike("name", name);
      if (existingErr) {
        toast.error(existingErr.message);
        return;
      }
      if (existing && existing.length > 0) {
        toast.error("You already have a template with that name — choose a different one.");
        return;
      }

      const { data: tpl, error } = await supabase
        .from("templates")
        .insert({
          user_id: user.user.id,
          business_id: bId,
          name,
          status: "active",
          source_file_path: uploadedPath,
          source_file_name: file?.name ?? null,
          fixed_content: fixedContent as never,
        })
        .select()
        .single();
      if (error) {
        toast.error(`Couldn't save your template: ${error.message}`);
        return;
      }

      const rows = dedupeKeys(fields).map((f, i) => ({
        template_id: tpl.id,
        user_id: user.user!.id,
        key: f.key,
        label: f.label,
        help_text: f.help_text,
        field_type: f.field_type,
        category: f.category,
        required: f.required,
        example_value: f.example_value,
        options: f.options ? (f.options as never) : null,
        default_value: f.default_value === undefined ? null : (f.default_value as never),
        sort_order: i,
      }));
      if (rows.length) {
        const { error: fieldsErr } = await supabase.from("template_fields").insert(rows);
        if (fieldsErr) {
          toast.error(`Template saved, but fields failed to save: ${fieldsErr.message}`);
          navigate({ to: "/templates/$id", params: { id: tpl.id } });
          return;
        }
      }

      const itemRows = lineItems.filter((it) => it.name.trim());
      if (itemRows.length) {
        await supabase.from("rate_card_items").insert(
          itemRows.map((it) => ({
            user_id: user.user!.id,
            name: it.name,
            description: it.description,
            unit: it.unit || "unit",
            rate: it.rate || 0,
          })),
        );
      }

      toast.success("You're all set");
      navigate({ to: "/dashboard" });
    } finally {
      setSaving(false);
    }
  }

  const PrimaryBtn = ({
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
  const SecondaryBtn = ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button
      onClick={onClick}
      className="h-12 w-full rounded-2xl bg-card text-[14px] font-medium text-foreground/80 ring-1 ring-border"
    >
      {children}
    </button>
  );

  if (step === "welcome") {
    return (
      <QuestionScreen
        title="Let's make something beautiful."
        subtitle="Two minutes, one quotation, and you're ready to send quotes in minutes for years to come."
        toneClass={TONES.welcome}
        onClose={() => navigate({ to: "/dashboard" })}
        primary={<PrimaryBtn onClick={() => goNext("name")}>Begin</PrimaryBtn>}
      >
        <div className="mt-2 space-y-3">
          {[
            { icon: FileText, text: "Tell us a little about your business" },
            { icon: LayoutTemplate, text: "Choose a starting template for your quotations" },
            { icon: Sparkles, text: "Customize it once, use it for every quote after." },
          ].map((s) => (
            <div
              key={s.text}
              className="flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border"
            >
              <div className="grid size-10 place-items-center rounded-xl bg-mist">
                <s.icon className="size-4 text-foreground/70" />
              </div>
              <div className="text-[14px] text-foreground/80">{s.text}</div>
            </div>
          ))}
        </div>
      </QuestionScreen>
    );
  }

  if (step === "name") {
    return (
      <QuestionScreen
        step={idx + 1}
        total={total}
        onBack={goBack}
        onClose={() => navigate({ to: "/dashboard" })}
        eyebrow="About you"
        title="What's your business called?"
        subtitle="This appears at the top of every quotation."
        toneClass={TONES.name}
        primary={
          <PrimaryBtn onClick={() => goNext("contact")} disabled={!form.name.trim()}>
            Continue
          </PrimaryBtn>
        }
      >
        <Input
          autoFocus
          placeholder="e.g. Ivy Studios"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="h-16 rounded-2xl bg-card px-5 text-lg font-medium"
        />
      </QuestionScreen>
    );
  }

  if (step === "contact") {
    return (
      <QuestionScreen
        step={idx + 1}
        total={total}
        onBack={goBack}
        onClose={() => navigate({ to: "/dashboard" })}
        eyebrow="How can clients reach you?"
        title="Your best contact details."
        subtitle="We'll add these next to your logo on every quote."
        toneClass={TONES.contact}
        primary={
          <PrimaryBtn onClick={() => goNext("address")} disabled={!form.email.trim()}>
            Continue
          </PrimaryBtn>
        }
      >
        <div className="space-y-3">
          <Input
            placeholder="Your name"
            value={form.contact_name}
            onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            className="h-14 rounded-2xl bg-card px-5"
          />
          <Input
            type="email"
            inputMode="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="h-14 rounded-2xl bg-card px-5"
          />
          <Input
            type="tel"
            inputMode="tel"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="h-14 rounded-2xl bg-card px-5"
          />
        </div>
      </QuestionScreen>
    );
  }

  if (step === "address") {
    return (
      <QuestionScreen
        step={idx + 1}
        total={total}
        onBack={goBack}
        onClose={() => navigate({ to: "/dashboard" })}
        eyebrow="A few last things"
        title="Where are you based?"
        subtitle="Optional. Helps make quotations look official."
        toneClass={TONES.address}
        primary={<PrimaryBtn onClick={() => goNext("category")}>Continue</PrimaryBtn>}
      >
        <div className="space-y-3">
          <Textarea
            placeholder="Address"
            rows={3}
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            className="rounded-2xl bg-card p-4"
          />
          <Input
            placeholder="Website"
            value={form.website}
            onChange={(e) => setForm({ ...form, website: e.target.value })}
            className="h-14 rounded-2xl bg-card px-5"
          />
          <Input
            placeholder="Tax / GST number"
            value={form.tax_info}
            onChange={(e) => setForm({ ...form, tax_info: e.target.value })}
            className="h-14 rounded-2xl bg-card px-5"
          />
          <Input
            placeholder="Currency"
            value={form.currency}
            onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
            className="h-14 rounded-2xl bg-card px-5 uppercase"
          />
        </div>
      </QuestionScreen>
    );
  }

  if (step === "category") {
    return (
      <QuestionScreen
        step={idx + 1}
        total={total}
        onBack={goBack}
        onClose={() => navigate({ to: "/dashboard" })}
        eyebrow="Choose a starting template"
        title="Which type of quotation do you create?"
        subtitle="Pick the closest match. You'll customize everything next."
        toneClass={TONES.category}
      >
        <div className="grid grid-cols-2 gap-3">
          {STARTER_TEMPLATES.map((t) => {
            const Icon = t.icon;
            const isBlank = t.id === "custom_blank";
            return (
              <button
                key={t.id}
                onClick={() => selectCategory(t.id)}
                className={[
                  "flex flex-col items-start gap-3 rounded-3xl p-4 text-left ring-1 transition active:scale-[0.98]",
                  isBlank ? "bg-card/60 ring-border/70" : "bg-card ring-border",
                ].join(" ")}
              >
                <div className="grid size-10 place-items-center rounded-xl bg-mist">
                  <Icon className="size-5 text-foreground/70" />
                </div>
                <div>
                  <div className="text-[13px] font-semibold leading-snug">{t.categoryLabel}</div>
                  <div className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    {t.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </QuestionScreen>
    );
  }

  if (step === "template") {
    const starter = categoryId ? getStarterTemplate(categoryId) : null;
    return (
      <QuestionScreen
        step={idx + 1}
        total={total}
        onBack={goBack}
        onClose={() => navigate({ to: "/dashboard" })}
        eyebrow={starter?.categoryLabel ?? "Recommended structure"}
        title="Here's your starting template."
        subtitle="Remove what you don't need, add anything custom. Everything stays editable later."
        toneClass={TONES.template}
        primary={<PrimaryBtn onClick={() => goNext("reference")}>Use this template</PrimaryBtn>}
        secondary={
          categoryId !== "custom_blank" ? (
            <SecondaryBtn onClick={startBlank}>Start from a blank template instead</SecondaryBtn>
          ) : undefined
        }
      >
        <div className="space-y-5">
          <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">
              Template name
            </div>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-12 rounded-xl bg-secondary/60 px-4 text-[15px] font-medium"
            />
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat label="Fields" value={fields.length} />
              <Stat label="Line items" value={lineItems.length} />
              <Stat
                label="Fixed content"
                value={Object.values(fixedContent).filter(Boolean).length}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Suggested fields
              </div>
              <button
                onClick={addField}
                className="rounded-full bg-card px-3 py-1.5 text-[12px] font-medium ring-1 ring-border"
              >
                <Plus className="mr-1 inline size-3.5" /> Add field
              </button>
            </div>
            <div className="space-y-2">
              {fields.map((f) => (
                <div
                  key={f.key}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-border"
                >
                  <button
                    onClick={() => setEditField(f)}
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-[11px] text-muted-foreground"
                  >
                    {fieldTypeGlyph(f.field_type)}
                  </button>
                  <button onClick={() => setEditField(f)} className="min-w-0 flex-1 text-left">
                    <div className="truncate text-[14px] font-medium">{f.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {fieldTypeLabel(f.field_type)} · {f.category}
                      {f.required ? " · required" : ""}
                    </div>
                  </button>
                  <button
                    onClick={() => removeField(f.key)}
                    aria-label="Remove field"
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="rounded-2xl bg-card p-5 text-center text-[13px] text-muted-foreground ring-1 ring-border">
                  No fields yet. Add your first one.
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Suggested line items
            </div>
            <div className="space-y-2">
              {lineItems.map((li) => (
                <div
                  key={li.name}
                  className="flex items-center justify-between rounded-2xl bg-card p-3.5 ring-1 ring-border"
                >
                  <div className="text-[14px] font-medium">{li.name}</div>
                  <button
                    onClick={() => removeLineItem(li.name)}
                    aria-label="Remove line item"
                    className="grid size-7 shrink-0 place-items-center rounded-lg text-muted-foreground"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  placeholder="Add a line item"
                  value={newLineItemName}
                  onChange={(e) => setNewLineItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addLineItem();
                    }
                  }}
                  className="h-11 flex-1 rounded-xl bg-card px-4 text-[13px] ring-1 ring-border"
                />
                <button
                  onClick={addLineItem}
                  className="grid size-11 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-border"
                  aria-label="Add line item"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <FieldEditor field={editField} onClose={() => setEditField(null)} onSave={saveField} />
      </QuestionScreen>
    );
  }

  if (step === "reference") {
    return (
      <QuestionScreen
        step={idx + 1}
        total={total}
        onBack={goBack}
        onClose={() => navigate({ to: "/dashboard" })}
        eyebrow="Optional"
        title="Upload an old quotation for reference."
        subtitle="We'll store it so you can look back at it while you customize your template by hand — it isn't scanned or processed automatically."
        toneClass={TONES.reference}
        primary={<PrimaryBtn onClick={continueFromReference}>Continue</PrimaryBtn>}
        secondary={<SecondaryBtn onClick={() => goNext("review")}>Skip for now</SecondaryBtn>}
      >
        <label className="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/70 bg-card p-6 text-center ring-soft transition active:scale-[0.99]">
          <input
            type="file"
            accept={ACCEPTED_REFERENCE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
          />
          <div className="grid size-16 place-items-center rounded-2xl bg-mist">
            {file ? (
              <Check className="size-6 text-foreground/70" />
            ) : (
              <Upload className="size-6 text-foreground/70" />
            )}
          </div>
          {file ? (
            <>
              <div className="text-[15px] font-medium">{file.name}</div>
              <div className="text-[12px] text-muted-foreground">Tap to choose another</div>
            </>
          ) : (
            <>
              <div className="text-[15px] font-medium">Choose a file</div>
              <div className="text-[12px] text-muted-foreground">
                PDF, PNG, JPG or WEBP · up to 10MB
              </div>
            </>
          )}
        </label>
      </QuestionScreen>
    );
  }

  // review
  return (
    <QuestionScreen
      onBack={() => setStep("reference")}
      onClose={() => navigate({ to: "/dashboard" })}
      eyebrow="Almost done"
      title="Save your template."
      subtitle="You can keep fine-tuning fields, terms, and line items any time from Templates."
      toneClass={TONES.review}
      primary={
        <PrimaryBtn onClick={saveTemplate} disabled={!templateName.trim() || saving}>
          {saving ? "Saving…" : "Save my template"}
        </PrimaryBtn>
      }
    >
      <div className="space-y-4">
        <div>
          <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">Template name</div>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-14 rounded-2xl bg-card px-5 text-[15px] font-medium"
          />
        </div>
        <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
          <div className="flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Summary
            </div>
            {categoryId && (
              <div className="text-[12px] text-foreground/70">
                {getStarterTemplate(categoryId).categoryLabel}
              </div>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            <Stat label="Fields" value={fields.length} />
            <Stat label="Line items" value={lineItems.length} />
            <Stat label="Reference" value={file ? 1 : 0} />
          </div>
        </div>
        {fields.length > 0 && (
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fields you'll be asked for
            </div>
            <div className="space-y-2">
              {fields.slice(0, 8).map((f) => (
                <div
                  key={f.key}
                  className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-border"
                >
                  <div className="grid size-8 place-items-center rounded-lg bg-secondary text-[11px] text-muted-foreground">
                    {fieldTypeGlyph(f.field_type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-medium">{f.label}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {fieldTypeLabel(f.field_type)}
                    </div>
                  </div>
                  {f.required && (
                    <span className="text-[10px] font-medium text-foreground/60">required</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </QuestionScreen>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-secondary/60 py-3">
      <div className="text-[20px] font-semibold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}

function FieldEditor({
  field,
  onClose,
  onSave,
}: {
  field: TemplateFieldDraft | null;
  onClose: () => void;
  onSave: (f: TemplateFieldDraft) => void;
}) {
  const [f, setF] = useState<TemplateFieldDraft | null>(field);
  useEffect(() => setF(field), [field]);
  if (!f) return null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] pb-safe"
      >
        <SheetHeader>
          <SheetTitle className="text-left text-[20px]">
            {field?.label ? "Edit field" : "New field"}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">
          <div>
            <label className="text-[12px] font-medium text-muted-foreground">Label</label>
            <Input
              autoFocus
              value={f.label}
              onChange={(e) => setF({ ...f, label: e.target.value })}
              className="mt-1 h-14 rounded-2xl bg-card px-4 text-[15px] font-medium"
            />
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-muted-foreground">Type</div>
            <div className="flex flex-wrap gap-2">
              {FIELD_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setF({ ...f, field_type: t })}
                  className={[
                    "rounded-full px-3.5 py-1.5 text-[12px] transition",
                    f.field_type === t
                      ? "bg-foreground text-background"
                      : "bg-card text-foreground/70 ring-1 ring-border",
                  ].join(" ")}
                >
                  {fieldTypeLabel(t)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-muted-foreground">Category</div>
            <div className="flex flex-wrap gap-2">
              {FIELD_CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setF({ ...f, category: c })}
                  className={[
                    "rounded-full px-3.5 py-1.5 text-[12px] transition",
                    f.category === c
                      ? "bg-foreground text-background"
                      : "bg-card text-foreground/70 ring-1 ring-border",
                  ].join(" ")}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center justify-between rounded-2xl bg-card px-4 py-3.5 ring-1 ring-border">
            <span className="text-[14px] font-medium">Required</span>
            <input
              type="checkbox"
              className="size-5 accent-foreground"
              checked={f.required}
              onChange={(e) => setF({ ...f, required: e.target.checked })}
            />
          </label>

          <button
            onClick={() => onSave(f)}
            disabled={!f.label.trim()}
            className="h-14 w-full rounded-2xl bg-foreground text-[15px] font-semibold text-background disabled:opacity-40"
          >
            Save field
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
