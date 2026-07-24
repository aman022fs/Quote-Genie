import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ChevronLeft, Plus, Trash2, Pencil } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/templates/$id")({
  head: () => ({
    meta: [
      { title: "Template — Quotient" },
      { name: "description", content: "Fine tune your template." },
    ],
  }),
  component: TemplateDetail,
});

interface TplField {
  id: string;
  key: string;
  label: string;
  field_type: string;
  category: string;
  required: boolean;
  sort_order: number;
}

const TYPES = [
  "short_text",
  "long_text",
  "number",
  "currency",
  "percentage",
  "date",
  "dropdown",
  "boolean",
  "line_items",
];
const CATEGORIES = ["variable", "fixed", "calculated", "optional"];

function TemplateDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { data: template, refetch: refetchTemplate } = useQuery({
    queryKey: ["template", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("templates").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const { data: fields, refetch } = useQuery({
    queryKey: ["template-fields", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("template_fields")
        .select("*")
        .eq("template_id", id)
        .order("sort_order");
      if (error) throw error;
      return data as TplField[];
    },
  });
  const [name, setName] = useState("");
  const [editField, setEditField] = useState<TplField | null>(null);
  useEffect(() => {
    if (template) setName(template.name);
  }, [template]);

  async function saveName() {
    if (!template || name === template.name) return;
    await supabase.from("templates").update({ name }).eq("id", id);
    toast.success("Saved");
    refetchTemplate();
  }

  async function addField() {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;
    const { data, error } = await supabase
      .from("template_fields")
      .insert({
        template_id: id,
        user_id: user.user.id,
        key: `field_${Date.now()}`,
        label: "New field",
        field_type: "short_text",
        category: "variable",
        required: false,
        sort_order: (fields ?? []).length,
      })
      .select()
      .single();
    if (error) return toast.error(error.message);
    setEditField(data as TplField);
    refetch();
  }

  async function deleteField(fid: string) {
    await supabase.from("template_fields").delete().eq("id", fid);
    refetch();
  }

  async function updateField(f: TplField) {
    await supabase
      .from("template_fields")
      .update({
        label: f.label,
        field_type: f.field_type,
        category: f.category,
        required: f.required,
      })
      .eq("id", f.id);
    setEditField(null);
    refetch();
  }

  async function archive() {
    await supabase.from("templates").update({ status: "archived" }).eq("id", id);
    toast.success("Template archived");
    navigate({ to: "/templates" });
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="bg-hero-cool pt-safe">
        <div className="flex items-center justify-between px-5 pt-4">
          <button
            onClick={() => navigate({ to: "/templates" })}
            aria-label="Back"
            className="grid size-10 place-items-center rounded-full bg-card/70 backdrop-blur"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            onClick={saveName}
            className="rounded-full bg-foreground px-4 py-2 text-[13px] font-medium text-background"
          >
            Save
          </button>
        </div>
        <div className="px-6 pb-8 pt-4">
          {template && (
            <div className="mb-3 flex items-center gap-2">
              <StatusBadge status={template.status} />
              <span className="text-[11px] text-muted-foreground">
                Updated{" "}
                {new Date(template.updated_at).toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-16 rounded-2xl border-0 bg-card px-5 text-[22px] font-semibold tracking-tight ring-1 ring-border"
          />
        </div>
      </header>

      <div className="space-y-6 px-6 py-6">
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Fields
            </div>
            <button
              onClick={addField}
              className="rounded-full bg-card px-3 py-1.5 text-[12px] font-medium ring-1 ring-border"
            >
              <Plus className="mr-1 inline size-3.5" /> Add
            </button>
          </div>
          <div className="space-y-2">
            {(fields ?? []).map((f) => (
              <button
                key={f.id}
                onClick={() => setEditField(f)}
                className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left ring-1 ring-border active:scale-[0.99]"
              >
                <div className="grid size-9 place-items-center rounded-xl bg-secondary text-[11px] text-muted-foreground">
                  {typeGlyph(f.field_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-semibold">{f.label}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {f.category} · {f.field_type.replace("_", " ")}
                    {f.required ? " · required" : ""}
                  </div>
                </div>
                <Pencil className="size-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </section>

        <button
          onClick={archive}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-card px-5 py-4 text-[14px] font-medium text-destructive ring-1 ring-border"
        >
          <Trash2 className="size-4" /> Archive template
        </button>
      </div>

      <FieldEditor
        field={editField}
        onClose={() => setEditField(null)}
        onSave={updateField}
        onDelete={(fid) => {
          deleteField(fid);
          setEditField(null);
        }}
      />
    </div>
  );
}

function FieldEditor({
  field,
  onClose,
  onSave,
  onDelete,
}: {
  field: TplField | null;
  onClose: () => void;
  onSave: (f: TplField) => void;
  onDelete: (id: string) => void;
}) {
  const [f, setF] = useState<TplField | null>(field);
  useEffect(() => setF(field), [field]);
  if (!f) return null;

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[92dvh] overflow-y-auto rounded-t-[28px] pb-safe"
      >
        <SheetHeader>
          <SheetTitle className="text-left text-[20px]">Edit field</SheetTitle>
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
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">{f.key}</div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-muted-foreground">Type</div>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
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
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-[12px] font-medium text-muted-foreground">Category</div>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
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

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onDelete(f.id)}
              className="grid size-14 place-items-center rounded-2xl bg-card text-destructive ring-1 ring-border"
              aria-label="Delete"
            >
              <Trash2 className="size-5" />
            </button>
            <button
              onClick={() => onSave(f)}
              className="h-14 flex-1 rounded-2xl bg-foreground text-[15px] font-semibold text-background"
            >
              Save changes
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
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
