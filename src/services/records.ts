import { supabase } from "@/integrations/supabase/client";
import { getCustomerById } from "@/services/customers";

const LEGACY_RECORDS_KEY = "nilawow:records";
const MIGRATION_FLAG_KEY = "nilawow:records_migrated_v1";

export type PurchaseRecord = {
  id: string;
  customerId: string;
  customerName: string | null;
  note: string;
  amount: number | null;
  createdAt: string;
};

type RecordRow = {
  id: string;
  customer_id: string;
  customer_name: string | null;
  note: string;
  amount: string | number | null;
  created_at: string;
};

function mapRow(row: RecordRow): PurchaseRecord {
  const raw = row.amount;
  const n = raw == null || raw === "" ? null : Number(raw);
  return {
    id: row.id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    note: row.note ?? "",
    amount: n == null || Number.isNaN(n) ? null : n,
    createdAt: row.created_at,
  };
}

const ymdLocal = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const isUuid = (s: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

type LegacyRecord = {
  id: string;
  customerId: string;
  note: string;
  amount?: number;
  createdAt: string;
};

export async function getRecords(): Promise<PurchaseRecord[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<RecordRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export async function getRecordsByCustomer(
  customerId: string,
): Promise<PurchaseRecord[]> {
  const { data, error } = await supabase
    .from("records")
    .select("*")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .returns<RecordRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

/** Local calendar day `YYYY-MM-DD` — matches Daily Summary filtering. */
export async function getRecordsByDate(ymd: string): Promise<PurchaseRecord[]> {
  const start = new Date(`${ymd}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { data, error } = await supabase
    .from("records")
    .select("*")
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString())
    .order("created_at", { ascending: true })
    .returns<RecordRow[]>();

  if (error) throw error;
  return (data ?? []).map(mapRow);
}

export type AddRecordInput = {
  customerId: string;
  customerName?: string | null;
  note: string;
  amount?: number | null;
};

export async function addRecord(input: AddRecordInput): Promise<PurchaseRecord> {
  let customerName = input.customerName ?? null;
  if (!customerName?.trim()) {
    const c = await getCustomerById(input.customerId);
    customerName = c?.name ?? null;
  }

  const amount = input.amount == null || Number.isNaN(input.amount) ? 0 : input.amount;

  const { data, error } = await supabase
    .from("records")
    .insert([
      {
        customer_id: input.customerId,
        customer_name: customerName,
        note: input.note.trim(),
        amount,
      },
    ])
    .select("*")
    .single<RecordRow>();

  if (error) throw error;
  return mapRow(data);
}

export async function deleteRecord(id: string): Promise<void> {
  const { error } = await supabase.from("records").delete().eq("id", id);
  if (error) throw error;
}

/** Dashboard / stats: today count uses local calendar day. */
export async function countRecordsForLocalDay(ymd: string): Promise<number> {
  const start = new Date(`${ymd}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const { count, error } = await supabase
    .from("records")
    .select("*", { count: "exact", head: true })
    .gte("created_at", start.toISOString())
    .lt("created_at", end.toISOString());

  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardStats(): Promise<{
  totalCustomers: number;
  totalRecords: number;
  todayRecords: number;
}> {
  const [{ count: customerCount, error: e1 }, { count: recordCount, error: e2 }] =
    await Promise.all([
      supabase.from("customers").select("*", { count: "exact", head: true }),
      supabase.from("records").select("*", { count: "exact", head: true }),
    ]);

  if (e1) throw e1;
  if (e2) throw e2;

  const today = ymdLocal(new Date());
  const todayRecords = await countRecordsForLocalDay(today);

  return {
    totalCustomers: customerCount ?? 0,
    totalRecords: recordCount ?? 0,
    todayRecords,
  };
}

/**
 * One-time migration: legacy localStorage `nilawow:records` → Supabase.
 * Only inserts rows whose `customerId` is a UUID that exists in `customers`.
 */
export async function migrateLocalRecordsOnce(): Promise<{
  migrated: number;
  skipped: number;
}> {
  if (typeof window === "undefined" || localStorage.getItem(MIGRATION_FLAG_KEY)) {
    return { migrated: 0, skipped: 0 };
  }

  let raw: string | null = null;
  try {
    raw = localStorage.getItem(LEGACY_RECORDS_KEY);
  } catch {
    return { migrated: 0, skipped: 0 };
  }

  if (!raw) {
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    return { migrated: 0, skipped: 0 };
  }

  let legacy: LegacyRecord[] = [];
  try {
    legacy = JSON.parse(raw) as LegacyRecord[];
  } catch {
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    return { migrated: 0, skipped: 0 };
  }

  if (!Array.isArray(legacy) || legacy.length === 0) {
    localStorage.removeItem(LEGACY_RECORDS_KEY);
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    return { migrated: 0, skipped: 0 };
  }

  const { data: custRows, error: custErr } = await supabase
    .from("customers")
    .select("id");

  if (custErr) throw custErr;

  const validIds = new Set((custRows ?? []).map((r: { id: string }) => r.id));

  let migrated = 0;
  let skipped = 0;

  try {
    for (const r of legacy) {
      if (!r.customerId || !isUuid(r.customerId) || !validIds.has(r.customerId)) {
        skipped += 1;
        continue;
      }

      let name: string | null = null;
      try {
        const c = await getCustomerById(r.customerId);
        name = c?.name ?? null;
      } catch {
        name = null;
      }

      const amount = r.amount == null || Number.isNaN(r.amount) ? 0 : r.amount;
      const { error } = await supabase.from("records").insert([
        {
          customer_id: r.customerId,
          customer_name: name,
          note: (r.note ?? "").trim() || "",
          amount,
          created_at: r.createdAt || new Date().toISOString(),
        },
      ]);

      if (error) {
        skipped += 1;
        // eslint-disable-next-line no-console
        console.error("[records-migrate] insert failed", error, r);
        continue;
      }
      migrated += 1;
    }

    localStorage.removeItem(LEGACY_RECORDS_KEY);
    localStorage.setItem(MIGRATION_FLAG_KEY, "1");
    return { migrated, skipped };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[records-migrate] aborted", e);
    throw e;
  }
}
