import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Users,
  FileDown,
  Database,
  AlertTriangle,
  CheckCircle2,
  ListOrdered,
  ArrowUpRight,
  Clock3,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { exportBackupJson } from "@/lib/backup";
import { toast } from "sonner";
import { useMotionValue, useSpring } from "framer-motion";
import { getCustomers, type Customer } from "@/services/customers";
import { getDashboardStats, getRecords, type PurchaseRecord } from "@/services/records";

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRecords: 0,
    todayRecords: 0,
  });
  const [recent, setRecent] = useState<
    (PurchaseRecord & { customer?: Customer | null })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [s, custRows, recRows] = await Promise.all([
        getDashboardStats(),
        getCustomers(),
        getRecords(),
      ]);
      setStats(s);
      const map = new Map(
        custRows.filter((c) => c.id).map((c) => [c.id as string, c]),
      );
      const top = recRows
        .slice()
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 6)
        .map((r) => ({
          ...r,
          customer: map.get(r.customerId) ?? null,
        }));
      setRecent(top);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[dashboard] refresh failed", e);
      setLoadError("Could not load dashboard data.");
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  const total = stats.totalRecords;
  const status =
    total >= 10000 ? "limit" : total >= 8000 ? "near" : "healthy";

  const downloadBackup = async () => {
    try {
      const data = await exportBackupJson();
      if (data.customers.length === 0 && data.records.length === 0) {
        toast.error("Nothing to export");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nilawow-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Backup downloaded");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[dashboard] backup failed", e);
      toast.error("Backup failed");
    }
  };

  return (
    <AppShell wide>
      {loadError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}
      {status === "limit" && (
        <Banner
          tone="destructive"
          title="Limit reached"
          message={`You have ${total.toLocaleString()} records. Consider archiving older entries.`}
        />
      )}
      {status === "near" && (
        <Banner
          tone="warning"
          title="Near limit"
          message={`You have ${total.toLocaleString()} records.`}
        />
      )}

      {/* 1) Compact hero header */}
      <div className="mt-2 mb-5 flex items-end justify-between gap-6">
        <div>
          <h1 className="font-brand text-3xl md:text-4xl tracking-wide text-white">
            Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Today’s overview at a glance
          </p>
        </div>
        <button
          onClick={() => navigate("/customers")}
          className="hidden md:inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-white/85 hover:text-white transition-colors"
        >
          View customers <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* 2) Small elegant stat cards row */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Customers" value={stats.totalCustomers} loading={loading} />
        <Stat label="Records" value={stats.totalRecords} loading={loading} />
        <Stat label="Today" value={stats.todayRecords} loading={loading} />
      </div>

      {/* 3) Main primary action section (compact centered CTA card) */}
      <div className="mb-6">
        <div className="nw-card nw-glow px-5 py-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground">
              Primary action
            </div>
            <div className="mt-1 text-base font-semibold tracking-wide text-white/90 truncate">
              Add a new record
            </div>
            <div className="mt-1 text-sm text-muted-foreground truncate">
              Quick entry for stitch notes, amount, and customer
            </div>
          </div>
          <Button
            onClick={() => navigate("/add")}
            className="h-12 px-5 rounded-2xl bg-white text-black hover:bg-white/92 shadow-2xl shadow-white/10 font-semibold"
          >
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>

      {/* 4) Quick actions grid (compact square cards) */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-[0.34em] text-muted-foreground">
            Quick actions
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <QuickAction icon={<Users className="w-5 h-5" />} label="Customers" onClick={() => navigate("/customers")} />
          <QuickAction icon={<ListOrdered className="w-5 h-5" />} label="Records" onClick={() => navigate("/records")} />
          <QuickAction icon={<FileDown className="w-5 h-5" />} label="Summary" onClick={() => navigate("/summary")} />
          <QuickAction icon={<Database className="w-5 h-5" />} label="Backup" onClick={downloadBackup} />
        </div>
      </div>

      {/* 5) Recent activity section */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs uppercase tracking-[0.34em] text-muted-foreground">
            Recent activity
          </div>
          <button
            onClick={() => navigate("/records")}
            className="text-xs font-semibold tracking-wide text-white/75 hover:text-white transition-colors inline-flex items-center gap-2"
          >
            View all <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
        <div className="nw-card nw-glow overflow-hidden">
          {loading ? (
            <div className="px-5 py-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start justify-between gap-4 animate-pulse">
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 bg-white/10 rounded" />
                    <div className="h-3 w-1/2 bg-white/10 rounded" />
                    <div className="h-3 w-1/4 bg-white/10 rounded mt-2" />
                  </div>
                  <div className="h-4 w-16 bg-white/10 rounded" />
                </div>
              ))}
            </div>
          ) : recent.length === 0 ? (
            <div className="px-5 py-5 text-sm text-muted-foreground">
              No recent records yet.
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {recent.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => r.customer?.id && navigate(`/customers/${r.customer.id}`)}
                    className="w-full px-5 py-4 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white/90 truncate">
                          {r.customer?.name ?? r.customerName ?? "Customer"}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground truncate">
                          {r.note}
                        </div>
                        <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Clock3 className="w-3.5 h-3.5" />
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold text-white/90">
                        {typeof r.amount === "number" ? `₹${r.amount.toLocaleString()}` : "—"}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Status */}
      <div className="nw-card px-5 py-4 flex items-center gap-3 text-sm nw-glow">
        {status === "healthy" ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span className="text-muted-foreground">System status</span>
            <span className="ml-auto text-white/90 font-medium">Healthy</span>
          </>
        ) : status === "near" ? (
          <>
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-muted-foreground">System status</span>
            <span className="ml-auto text-white/90 font-medium">Near Limit</span>
          </>
        ) : (
          <>
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-muted-foreground">System status</span>
            <span className="ml-auto text-white/90 font-medium">Limit Reached</span>
          </>
        )}
      </div>
    </AppShell>
  );
};

const AnimatedNumber = ({ value }: { value: number }) => {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 120, damping: 18, mass: 0.6 });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  useEffect(() => {
    const unsub = spring.on("change", (v) => {
      setDisplay(Math.round(v).toLocaleString());
    });
    return () => unsub();
  }, [spring]);

  return (
    <span>{display}</span>
  );
};

const Stat = ({ label, value, loading }: { label: string; value: number; loading?: boolean }) => (
  <div className="nw-card nw-glow px-4 py-3.5 h-full flex flex-col justify-center min-h-[92px]">
    <div className="text-[10px] uppercase tracking-[0.34em] text-muted-foreground leading-none">
      {label}
    </div>
    <div className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight text-white leading-none">
      {loading ? (
        <div className="h-7 md:h-8 w-12 md:w-16 bg-white/10 animate-pulse rounded-md mt-1" />
      ) : (
        <AnimatedNumber value={value} />
      )}
    </div>
  </div>
);

const QuickAction = ({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className="nw-card nw-glow aspect-square px-4 py-4 hover:bg-white/[0.03] transition-colors flex flex-col items-start justify-between text-left"
  >
    <div className="p-2.5 rounded-2xl bg-white/6 text-white/85 border border-white/10">
      {icon}
    </div>
    <div className="w-full">
      <div className="text-sm font-semibold tracking-wide text-white/90">
        {label}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        Open
      </div>
    </div>
  </button>
);

const Banner = ({
  tone,
  title,
  message,
}: {
  tone: "warning" | "destructive";
  title: string;
  message: string;
}) => (
  <div
    className={`mb-6 p-4 rounded-xl border text-sm flex gap-3 ${
      tone === "destructive"
        ? "border-destructive/40 bg-destructive/10"
        : "border-warning/40 bg-warning/10"
    }`}
  >
    <AlertTriangle
      className={`w-5 h-5 shrink-0 ${
        tone === "destructive" ? "text-destructive" : "text-warning"
      }`}
    />
    <div>
      <div className="font-medium">{title}</div>
      <div className="text-muted-foreground">{message}</div>
    </div>
  </div>
);

export default Dashboard;
