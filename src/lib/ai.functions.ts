import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

const AnalyzeInput = z.object({
  fileBase64: z.string().min(10),
  mimeType: z.string().min(1),
  fileName: z.string().optional(),
});

export interface AnalysisResult {
  business_category: string;
  suggested_template_name: string;
  fixed_content: {
    company_intro?: string;
    terms?: string;
    payment_terms?: string;
    bank_details?: string;
    footer?: string;
  };
  fields: Array<{
    key: string;
    label: string;
    field_type:
      | "short_text"
      | "long_text"
      | "number"
      | "currency"
      | "percentage"
      | "date"
      | "dropdown"
      | "boolean"
      | "line_items";
    category: "fixed" | "variable" | "calculated" | "optional";
    required: boolean;
    example_value?: string;
    help_text?: string;
    default_value?: string | number | boolean | null;
    options?: string[];
    confidence: number;
  }>;
  suggested_line_items?: Array<{
    name: string;
    description?: string;
    unit?: string;
    rate?: number;
  }>;
}

// Response validation: mirrors AnalysisResult above. We validate the model's
// JSON before trusting it rather than casting it blindly.
const AnalysisResultSchema = z.object({
  business_category: z.string(),
  suggested_template_name: z.string(),
  fixed_content: z.object({
    company_intro: z.string().optional(),
    terms: z.string().optional(),
    payment_terms: z.string().optional(),
    bank_details: z.string().optional(),
    footer: z.string().optional(),
  }),
  fields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      field_type: z.enum([
        "short_text",
        "long_text",
        "number",
        "currency",
        "percentage",
        "date",
        "dropdown",
        "boolean",
        "line_items",
      ]),
      category: z.enum(["fixed", "variable", "calculated", "optional"]),
      required: z.boolean(),
      example_value: z.string().optional(),
      help_text: z.string().optional(),
      default_value: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional(),
      options: z.array(z.string()).optional(),
      confidence: z.number(),
    }),
  ),
  suggested_line_items: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        unit: z.string().optional(),
        rate: z.number().optional(),
      }),
    )
    .optional(),
});

const SYSTEM_PROMPT = `You analyse a business quotation document and extract its structure so it can be turned into a reusable quotation template.

Return STRICT JSON matching the schema. Rules:
- Detect the business category (e.g. "wedding photography", "t-shirt manufacturing", "marketing agency", "software services").
- Separate FIXED content (business identity, standard T&Cs, footer, bank details) from VARIABLE fields (client name, dates, quantities, rates, discounts, notes) from CALCULATED fields (subtotal, tax, grand total) from OPTIONAL sections (travel, discounts, notes).
- For each variable field, propose a snake_case key and a clean human label.
- For each field give a confidence 0..1.
- If the doc has repeating priced items (services/products/line items), add ONE field of type "line_items" with key "items" and suggest 2-6 example line items in suggested_line_items.
- Always include core fields: client_name, quotation_date, valid_until_days (number), and the "items" line_items field.
- Keep 6-16 fields total. Prefer clarity over completeness.`;

// JSON schema (OpenAPI 3.0 subset) accepted by Gemini's responseSchema.
const RESPONSE_SCHEMA = {
  type: "object",
  required: ["business_category", "suggested_template_name", "fixed_content", "fields"],
  properties: {
    business_category: { type: "string" },
    suggested_template_name: { type: "string" },
    fixed_content: {
      type: "object",
      properties: {
        company_intro: { type: "string" },
        terms: { type: "string" },
        payment_terms: { type: "string" },
        bank_details: { type: "string" },
        footer: { type: "string" },
      },
    },
    fields: {
      type: "array",
      items: {
        type: "object",
        required: ["key", "label", "field_type", "category", "required", "confidence"],
        properties: {
          key: { type: "string" },
          label: { type: "string" },
          field_type: {
            type: "string",
            enum: [
              "short_text",
              "long_text",
              "number",
              "currency",
              "percentage",
              "date",
              "dropdown",
              "boolean",
              "line_items",
            ],
          },
          category: {
            type: "string",
            enum: ["fixed", "variable", "calculated", "optional"],
          },
          required: { type: "boolean" },
          example_value: { type: "string" },
          help_text: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          confidence: { type: "number" },
        },
      },
    },
    suggested_line_items: {
      type: "array",
      items: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          unit: { type: "string" },
          rate: { type: "number" },
        },
      },
    },
  },
};

// Internal model id -> actual provider model mapping. Only one AI feature
// exists today (quotation analysis); add more entries here as needed.
const AI_MODELS = {
  "quotation-analysis": process.env.GOOGLE_GENERATIVE_AI_MODEL || "gemini-3.6-flash",
} as const;

const REQUEST_TIMEOUT_MS = 60_000;

export const analyzeQuotation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AnalyzeInput.parse(input))
  .handler(async ({ data }): Promise<AnalysisResult> => {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY missing. Set it in your .env file.");

    const ai = new GoogleGenAI({ apiKey });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let text: string | undefined;
    try {
      const response = await ai.models.generateContent({
        model: AI_MODELS["quotation-analysis"],
        contents: [
          {
            role: "user",
            parts: [
              { text: "Analyse this quotation document and return the JSON template structure." },
              { inlineData: { mimeType: data.mimeType, data: data.fileBase64 } },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
          abortSignal: controller.signal,
        },
      });
      text = response.text;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new Error("AI analysis timed out — please try again.");
      }
      const message = err instanceof Error ? err.message : String(err);
      if (/quota|rate.?limit|429/i.test(message)) {
        throw new Error("Rate limit — please try again in a moment.");
      }
      if (/credit|billing|402/i.test(message)) {
        throw new Error("AI credits exhausted. Check your Google AI billing settings.");
      }
      throw new Error(`AI analysis failed: ${message.slice(0, 300)}`);
    } finally {
      clearTimeout(timeout);
    }

    if (!text) throw new Error("AI returned no content");

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    const result = AnalysisResultSchema.safeParse(parsed);
    if (!result.success) {
      throw new Error("AI response did not match the expected structure");
    }
    return result.data;
  });
