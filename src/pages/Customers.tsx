import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, User } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  addCustomer,
  getCustomers,
  searchCustomersByName,
  searchCustomersByPhone,
  type Customer,
} from "@/services/customers";

const Customers = () => {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const filtered = useMemo(() => customers, [customers]);

  const refresh = async () => {
    setLoading(true);
    try {
      const rows = await getCustomers();
      setCustomers(rows);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[customers] getCustomers failed", e);
      toast.error("Failed to load customers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const term = q.trim();
    if (!term) {
      void refresh();
      return;
    }

    let cancelled = false;
    setSearching(true);

    const t = window.setTimeout(async () => {
      try {
        const [byName, byPhone] = await Promise.all([
          searchCustomersByName(term),
          searchCustomersByPhone(term),
        ]);
        if (cancelled) return;
        const map = new Map<string, Customer>();
        for (const c of [...byName, ...byPhone]) {
          if (c.id) map.set(c.id, c);
        }
        setCustomers(Array.from(map.values()));
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[customers] search failed", e);
        toast.error("Search failed");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    setSaving(true);
    try {
      const c = await addCustomer({
        name,
        phone,
      });
      toast.success("Customer added");
      setName("");
      setPhone("");
      setOpen(false);
      await refresh();
      navigate(`/customers/${c.id}`);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[customers] addCustomer failed", e);
      toast.error("Failed to add customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Customers"
      back
      right={
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full h-9 gap-1.5">
              <Plus className="w-4 h-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold tracking-wide">
                New Customer
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label htmlFor="cname">Name</Label>
                <Input
                  id="cname"
                  autoFocus
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1.5 h-11 bg-input border-border"
                  placeholder="Customer name"
                  maxLength={100}
                />
              </div>
              <div>
                <Label htmlFor="cphone">Phone (optional)</Label>
                <Input
                  id="cphone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1.5 h-11 bg-input border-border"
                  placeholder="Phone number"
                  inputMode="tel"
                  maxLength={20}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                className="w-full h-11 rounded-xl"
              >
                {saving ? "Saving..." : "Save Customer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      }
    >
      <div className="relative mb-5 nw-card nw-glow px-5 py-5">
        <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name or phone"
          className="pl-12 h-12 bg-black/50 border-white/10 rounded-2xl text-base focus-visible:ring-2 focus-visible:ring-white/40"
        />
      </div>

      {loading ? (
        <div className="text-center py-24 bg-[#050505] rounded-3xl border border-white/5">
          <div className="text-muted-foreground mt-4">Loading customers…</div>
        </div>
      ) : searching ? (
        <div className="text-center py-24 bg-[#050505] rounded-3xl border border-white/5">
          <div className="text-muted-foreground mt-4">Searching…</div>
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          message={
            customers.length === 0
              ? "No customers yet"
              : "No results found"
          }
        />
      ) : (
        <ul className="divide-y divide-white/5 border border-white/10 rounded-3xl bg-[#030303] overflow-hidden shadow-2xl">
          {filtered.map((c) => (
            <li key={c.id ?? c.name}>
              <button
                onClick={() => c.id && navigate(`/customers/${c.id}`)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-white/[0.03] transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#090909] flex items-center justify-center border border-white/5">
                  <User className="w-5 h-5 text-white/70" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[15px] text-white truncate">{c.name}</div>
                  {c.phone && (
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {c.phone}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-24 bg-[#050505] rounded-3xl border border-white/5">
    <div className="text-muted-foreground mt-4">{message}</div>
  </div>
);

export default Customers;
