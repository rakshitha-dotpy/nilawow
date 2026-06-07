import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Trash2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { deleteRecord, getRecords, type PurchaseRecord } from "@/services/records";
import { toast } from "sonner";
import { getCustomers, type Customer } from "@/services/customers";

type Row = PurchaseRecord & { customer?: Customer | null };

const Records = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [version, setVersion] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [custRows, recRows] = await Promise.all([
        getCustomers(),
        getRecords(),
      ]);
      const map = new Map(
        custRows.filter((c) => c.id).map((c) => [c.id as string, c]),
      );
      setRows(
        recRows.map((r) => ({
          ...r,
          customer: map.get(r.customerId) ?? null,
        })),
      );
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[records] load failed", e);
      setRows([]);
      setError("Could not load records.");
      toast.error("Failed to load records");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, version]);

  const { filtered, total } = useMemo(() => {
    const all = rows.slice().sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate));
    const term = q.trim().toLowerCase();
    const filteredRows = term
      ? all.filter(
          (r) =>
            r.note.toLowerCase().includes(term) ||
            (r.customer?.name ?? r.customerName ?? "")
              .toLowerCase()
              .includes(term),
        )
      : all;
    return { filtered: filteredRows, total: all.length };
  }, [q, rows]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRecord(pendingDelete);
      setPendingDelete(null);
      setVersion((v) => v + 1);
      toast.success("Record deleted");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[records] delete failed", e);
      toast.error("Failed to delete record");
    }
  };

  return (
    <AppShell title="All Records" back wide>
      <div className="mb-6">
        <h1 className="font-display text-3xl md:text-4xl">All Records</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {loading ? "…" : `${total.toLocaleString()} total`}
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="relative mb-8">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by customer or note"
          disabled={loading}
          className="pl-12 h-14 bg-[#050505] border-white/10 rounded-2xl text-base focus-visible:ring-1 focus-visible:ring-white/30"
        />
      </div>

      {loading ? (
        <div className="text-center py-24 bg-[#050505] rounded-3xl border border-white/5 text-muted-foreground">
          Loading records…
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 bg-[#050505] rounded-3xl border border-white/5">
          <div className="text-muted-foreground mt-4">
            {total === 0 ? "No records yet." : "No results found."}
          </div>
        </div>
      ) : (
        <div className="border border-white/10 rounded-3xl bg-[#030303] overflow-hidden shadow-2xl">
          <div className="hidden md:grid grid-cols-[1.5fr_2.5fr_1fr_1.5fr_40px] gap-6 px-6 py-4 text-xs uppercase tracking-widest text-muted-foreground/70 border-b border-white/5 bg-[#050505]">
            <div>Customer</div>
            <div>Note</div>
            <div className="text-right">Amount</div>
            <div>Date</div>
            <div></div>
          </div>
          <ul className="divide-y divide-white/5">
            {filtered.map((r) => {
              const d = new Date(r.purchaseDate);
              const date = d.toLocaleDateString();
              const time = d.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              });
              return (
                <li
                  key={r.id}
                  className="md:grid md:grid-cols-[1.5fr_2.5fr_1fr_1.5fr_40px] md:gap-6 md:items-center px-6 py-5 hover:bg-white/[0.02] transition-colors"
                >
                  <button
                    className="text-left font-medium text-base truncate hover:text-white/80 transition-colors"
                    onClick={() =>
                      r.customer?.id && navigate(`/customers/${r.customer.id}`)
                    }
                  >
                    {r.customer?.name ?? r.customerName ?? "—"}
                  </button>
                  <div className="text-[15px] text-foreground/80 mt-1 md:mt-0 truncate">
                    {r.note}
                  </div>
                  <div className="text-base font-medium md:text-right mt-1 md:mt-0 text-white">
                    {typeof r.amount === "number" ? r.amount.toFixed(2) : "—"}
                  </div>
                  <div className="text-sm text-muted-foreground mt-1 md:mt-0">
                    {date} <span className="mx-1 opacity-50">·</span> {time}
                  </div>
                  <div className="mt-2 md:mt-0 md:text-right">
                    <button
                      onClick={() => setPendingDelete(r.id)}
                      className="w-9 h-9 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors inline-flex items-center justify-center"
                      aria-label="Delete record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl">
              Delete record?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default Records;
