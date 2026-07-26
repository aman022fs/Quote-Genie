// Shared field taxonomy for quotation templates. Single source of truth for
// the field_type / category enums used by template_fields rows, the starter
// template config, and every screen that renders or edits template fields.

export type FieldType =
  | "short_text"
  | "long_text"
  | "number"
  | "currency"
  | "percentage"
  | "date"
  | "dropdown"
  | "boolean"
  | "line_items";

export type FieldCategory = "fixed" | "variable" | "calculated" | "optional";

export const FIELD_TYPES: FieldType[] = [
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

export const FIELD_CATEGORIES: FieldCategory[] = ["variable", "fixed", "calculated", "optional"];

// Local (not-yet-persisted) shape used while building/editing a template —
// mirrors the template_fields table minus id/template_id/user_id/timestamps.
export interface TemplateFieldDraft {
  key: string;
  label: string;
  field_type: FieldType;
  category: FieldCategory;
  required: boolean;
  help_text?: string;
  example_value?: string;
  options?: string[];
  default_value?: string | number | boolean | null;
}

export interface TemplateLineItemDraft {
  name: string;
  description?: string;
  unit?: string;
  rate?: number;
}

// Fixed (non-repeating) business/legal content blocks stored on templates.fixed_content.
export interface TemplateFixedContent {
  company_intro?: string;
  terms?: string;
  payment_terms?: string;
  bank_details?: string;
  footer?: string;
  notes?: string;
}

const TYPE_GLYPHS: Record<FieldType, string> = {
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

export function fieldTypeGlyph(t: string): string {
  return TYPE_GLYPHS[t as FieldType] ?? "•";
}

export function fieldTypeLabel(t: string): string {
  return t.replace("_", " ");
}

export function slugifyKey(label: string, fallback = "field"): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return base || `${fallback}_${Date.now()}`;
}

export function dedupeKeys<T extends { key: string }>(items: T[]): T[] {
  const seen = new Map<string, number>();
  return items.map((item) => {
    const count = seen.get(item.key) ?? 0;
    seen.set(item.key, count + 1);
    return count === 0 ? item : { ...item, key: `${item.key}_${count}` };
  });
}
