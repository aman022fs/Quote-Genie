import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { analyzeQuotation, type AnalysisResult } from "@/lib/ai.functions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { QuestionScreen } from "@/components/QuestionScreen";
import { toast } from "sonner";
import { Upload, FileText, Sparkles, Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Get started — Quotient" },
      { name: "description", content: "Set up your business and first quotation template." },
    ],
  }),
  component: Onboarding,
});

// One question per screen.
type Step = "welcome" | "name" | "contact" | "address" | "upload" | "analyzing" | "review";
const STEPS: Step[] = ["welcome", "name", "contact", "address", "upload", "review"];

const TONES: Record<Step, string> = {
  welcome: "bg-hero-warm",
  name: "bg-hero-warm",
  contact: "bg-hero-cool",
  address: "bg-hero-warm",
  upload: "bg-hero-cool",
  analyzing: "bg-hero-warm",
  review: "bg-hero-cool",
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
  const [file, setFile] = useState<File | null>(null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [templateName, setTemplateName] = useState("");
  const [progress, setProgress] = useState(0);
  const analyze = useServerFn(analyzeQuotation);

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
          if (data.name) setStep("upload");
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

  async function persistBusiness() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return null;
    const payload = { ...form, user_id: user.user.id };
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

  async function runAnalysis() {
    if (!file) return;
    const bId = await persistBusiness();
    if (!bId) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    setStep("analyzing");
    setProgress(15);

    const path = `${user.user.id}/${Date.now()}-${file.name}`;
    const { error: upErr } = await supabase.storage.from("quotation-uploads").upload(path, file);
    if (upErr) {
      toast.error(upErr.message);
      setStep("upload");
      return;
    }
    setUploadedPath(path);
    setProgress(45);

    try {
      const base64 = arrayBufferToBase64(await file.arrayBuffer());
      setProgress(65);
      const result = await analyze({
        data: { fileBase64: base64, mimeType: file.type || "application/pdf", fileName: file.name },
      });
      setAnalysis(result);
      setTemplateName(result.suggested_template_name);
      if (!form.category && result.business_category) {
        setForm((f) => ({ ...f, category: result.business_category }));
        await supabase
          .from("businesses")
          .update({ category: result.business_category })
          .eq("id", bId);
      }
      setProgress(100);
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
      setStep("upload");
    }
  }

  async function saveTemplate() {
    if (!analysis || !businessId) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data: tpl, error } = await supabase
      .from("templates")
      .insert({
        user_id: user.user.id,
        business_id: businessId,
        name: templateName || analysis.suggested_template_name,
        status: "active",
        source_file_path: uploadedPath,
        source_file_name: file?.name,
        analysis: analysis as never,
        fixed_content: analysis.fixed_content as never,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);

    const rows = analysis.fields.map((f, i) => ({
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
      confidence: f.confidence,
      sort_order: i,
    }));
    if (rows.length) await supabase.from("template_fields").insert(rows);

    if (analysis.suggested_line_items?.length) {
      await supabase.from("rate_card_items").insert(
        analysis.suggested_line_items.map((it) => ({
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
            { icon: Upload, text: "Upload a quotation you already send" },
            { icon: Sparkles, text: "We learn it. You send the next one in minutes." },
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
        <div className="mt-4">
          <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">
            What do you do?
          </div>
          <Input
            placeholder="e.g. Wedding photography"
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="h-14 rounded-2xl bg-card px-5"
          />
        </div>
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
        primary={<PrimaryBtn onClick={() => goNext("upload")}>Continue</PrimaryBtn>}
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
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Currency"
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              className="h-14 rounded-2xl bg-card px-5 uppercase"
            />
          </div>
        </div>
      </QuestionScreen>
    );
  }

  if (step === "upload") {
    return (
      <QuestionScreen
        step={idx + 1}
        total={total}
        onBack={goBack}
        onClose={() => navigate({ to: "/dashboard" })}
        eyebrow="Upload"
        title="Send us a quotation you've done before."
        subtitle="Any PDF will do. We turn it into a reusable template."
        toneClass={TONES.upload}
        primary={
          <PrimaryBtn onClick={runAnalysis} disabled={!file}>
            Analyse this quotation
          </PrimaryBtn>
        }
      >
        <label className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border/70 bg-card p-6 text-center ring-soft transition active:scale-[0.99]">
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
              <div className="text-[15px] font-medium">Choose a PDF</div>
              <div className="text-[12px] text-muted-foreground">Up to 10MB works best</div>
            </>
          )}
        </label>
      </QuestionScreen>
    );
  }

  if (step === "analyzing") {
    return (
      <QuestionScreen
        title="Reading your quotation…"
        subtitle="We're finding fixed sections, variable fields, and the way you price things."
        toneClass={TONES.analyzing}
      >
        <div className="mt-4 grid place-items-center py-10">
          <div className="relative grid size-32 place-items-center rounded-full bg-hero-warm ring-1 ring-border ring-soft">
            <Sparkles className="size-8 animate-pulse text-foreground/70" />
          </div>
          <div className="mt-8 h-1.5 w-full max-w-[240px] overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-foreground/70 transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-3 text-[12px] text-muted-foreground">
            {progress < 50
              ? "Uploading"
              : progress < 90
                ? "Understanding structure"
                : "Almost there"}
          </div>
        </div>
      </QuestionScreen>
    );
  }

  // review
  return (
    <QuestionScreen
      onBack={() => setStep("upload")}
      onClose={() => navigate({ to: "/dashboard" })}
      eyebrow="All done"
      title="Here's what we learned."
      subtitle="Give the template a name. You can fine-tune the fields anytime."
      toneClass={TONES.review}
      primary={
        <PrimaryBtn onClick={saveTemplate} disabled={!templateName.trim()}>
          Save my template
        </PrimaryBtn>
      }
    >
      {analysis && (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-[12px] font-medium text-muted-foreground">
              Template name
            </div>
            <Input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="h-14 rounded-2xl bg-card px-5 text-[15px] font-medium"
            />
          </div>
          <div className="rounded-3xl bg-card p-5 ring-1 ring-border">
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Detected
              </div>
              <div className="text-[12px] text-foreground/70">{analysis.business_category}</div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <Stat
                label="Variable"
                value={analysis.fields.filter((f) => f.category === "variable").length}
              />
              <Stat label="Fixed" value={Object.keys(analysis.fixed_content ?? {}).length} />
              <Stat label="Items" value={analysis.suggested_line_items?.length ?? 0} />
            </div>
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fields we'll ask you about
            </div>
            <div className="space-y-2">
              {analysis.fields
                .filter((f) => f.category !== "fixed" && f.category !== "calculated")
                .slice(0, 8)
                .map((f) => (
                  <div
                    key={f.key}
                    className="flex items-center gap-3 rounded-2xl bg-card p-3.5 ring-1 ring-border"
                  >
                    <div className="grid size-8 place-items-center rounded-lg bg-secondary text-[11px] text-muted-foreground">
                      {typeGlyph(f.field_type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14px] font-medium">{f.label}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {f.field_type.replace("_", " ")}
                      </div>
                    </div>
                    {f.required && (
                      <span className="text-[10px] font-medium text-foreground/60">required</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
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

function typeGlyph(t: string) {
  const map: Record<string, string> = {
    short_text: "Aa",
    long_text: "¶",
    number: "#",
    currency: "$",
    percentage: "%",
    date: "📅",
    dropdown: "≡",
    boolean: "☑",
    line_items: "≣",
  };
  return map[t] ?? "•";
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK)));
  }
  return btoa(binary);
}
