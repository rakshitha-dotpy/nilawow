import { getCustomers } from "@/services/customers";
import { getRecords } from "@/services/records";

export async function exportBackupJson() {
  const [customers, records] = await Promise.all([
    getCustomers(),
    getRecords(),
  ]);
  return {
    exportedAt: new Date().toISOString(),
    customers,
    records,
  };
}
