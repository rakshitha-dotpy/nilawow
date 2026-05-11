import { supabase } from "@/integrations/supabase/client";

export type Customer = {
  id?: string;
  name: string;
  phone: string;
  service?: string;
  amount?: number;
  notes?: string;
  created_at?: string;
};

export type AddCustomerInput = Omit<Customer, "id" | "created_at">;

function cleanLikeTerm(term: string) {
  return term.replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function addCustomer(input: AddCustomerInput): Promise<Customer> {
  const { data, error } = await supabase
    .from("customers")
    .insert([input])
    .select("*")
    .single<Customer>();

  if (error) throw error;
  return data;
}

export async function getCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<Customer[]>();

  if (error) throw error;
  return data ?? [];
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle<Customer>();

  if (error) throw error;
  return data ?? null;
}

export async function searchCustomersByName(name: string): Promise<Customer[]> {
  const term = cleanLikeTerm(name.trim());
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .ilike("name", `%${term}%`)
    .order("created_at", { ascending: false })
    .returns<Customer[]>();

  if (error) throw error;
  return data ?? [];
}

export async function searchCustomersByPhone(
  phone: string,
): Promise<Customer[]> {
  const term = cleanLikeTerm(phone.trim());
  const { data, error } = await supabase
    .from("customers")
    .select("*")
    .ilike("phone", `%${term}%`)
    .order("created_at", { ascending: false })
    .returns<Customer[]>();

  if (error) throw error;
  return data ?? [];
}

export async function deleteCustomer(id: string): Promise<void> {
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw error;
}

