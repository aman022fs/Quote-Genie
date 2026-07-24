import { supabase } from "@/integrations/supabase/client";

export async function getMyBusiness() {
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getMyTemplates() {
  const { data, error } = await supabase
    .from("templates")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMyQuotations() {
  const { data, error } = await supabase
    .from("quotations")
    .select("*, clients(name, company)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMyClients() {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getMyRateCard() {
  const { data, error } = await supabase.from("rate_card_items").select("*").order("name");
  if (error) throw error;
  return data ?? [];
}

export async function nextQuotationNumber(business: {
  quotation_prefix: string;
  quotation_counter: number;
  id: string;
}) {
  const next = (business.quotation_counter || 0) + 1;
  const year = new Date().getFullYear();
  const number = `${business.quotation_prefix}-${year}-${String(next).padStart(4, "0")}`;
  await supabase.from("businesses").update({ quotation_counter: next }).eq("id", business.id);
  return number;
}
