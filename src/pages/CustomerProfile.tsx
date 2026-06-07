import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Phone } from "lucide-react";
import { format } from "date-fns";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
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
import { deleteRecord, getRecordsByCustomer, type PurchaseRecord } from "@/services/records";
import { toast } from "sonner";
import { getCustomerById, type Customer, deleteCustomer } from "@/services/customers";

const CustomerProfile = () => {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [version, setVersion] = useState(0);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<PurchaseRecord[]>([]);
  const [loadingCustomer, setLoadingCustomer] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);
  const [showDeleteCustomerDialog, setShowDeleteCustomerDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCustomer(true);
    (async () => {
      try {
        const c = await getCustomerById(id);
        if (!cancelled) setCustomer(c);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[customer-profile] getCustomerById failed", e);
        if (!cancelled) toast.error("Failed to load customer");
      } finally {
        if (!cancelled) setLoadingCustomer(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadingRecords(true);
    setRecordsError(null);
    (async () => {
      try {
        const rows = await getRecordsByCustomer(id);
        if (!cancelled) setRecords(rows);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error("[customer-profile] getRecordsByCustomer failed", e);
        if (!cancelled) {
          setRecords([]);
          setRecordsError("Could not load purchase history.");
          toast.error("Failed to load records");
        }
      } finally {
        if (!cancelled) setLoadingRecords(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, version]);

  if (loadingCustomer) {
    return (
      <AppShell title="Customer" back>
        <div className="text-center py-20 text-muted-foreground text-sm">
          Loading…
        </div>
      </AppShell>
    );
  }

  if (!customer) {
    return (
      <AppShell title="Customer" back>
        <div className="text-center py-20 text-muted-foreground text-sm">
          Customer not found
        </div>
      </AppShell>
    );
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteRecord(pendingDelete);
      setPendingDelete(null);
      setVersion((v) => v + 1);
      toast.success("Record deleted");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[customer-profile] deleteRecord failed", e);
      toast.error("Failed to delete record");
    }
  };

  const handleDeleteCustomer = async () => {
    if (!customer?.id) return;
    setIsDeleting(true);
    try {
      await deleteCustomer(customer.id);
      toast.success("Customer deleted successfully");
      navigate("/customers");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[customer-profile] deleteCustomer failed", e);
      toast.error("Failed to delete customer");
    } finally {
      setIsDeleting(false);
      setShowDeleteCustomerDialog(false);
    }
  };

  const total = records.reduce((s, r) => s + (r.amount ?? 0), 0);

  return (
    <AppShell title={customer.name} back>
      <div className="mb-6 flex items-start justify-between">
        <div>
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-3.5 h-3.5" /> {customer.phone}
            </div>
          )}
          <div className="mt-4 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span>
              {loadingRecords ? "…" : `${records.length} records`}
            </span>
            {!loadingRecords && total > 0 && (
              <span>· Total ₹{total.toLocaleString()}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDeleteCustomerDialog(true)}
          className="p-3 rounded-xl bg-white/[0.03] border border-white/5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
          title="Delete Customer"
        >
          <Trash2 className="w-4.5 h-4.5" />
        </button>
      </div>

      <Button
        size="lg"
        className="w-full h-12 rounded-2xl mb-4 gap-2"
        onClick={() => navigate(`/add?customerId=${customer.id}`)}
      >
        <Plus className="w-4 h-4" /> Add Record
      </Button>

      {recordsError && (
        <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {recordsError}
        </div>
      )}

      {loadingRecords ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          Loading history…
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 text-sm text-muted-foreground">
          No records yet
        </div>
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li
              key={r.id}
              className="rounded-xl border hairline bg-card p-4 flex items-start gap-3"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm whitespace-pre-wrap break-words">
                  {r.note}
                </div>
                <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{format(new Date(r.purchaseDate), "dd MMM yyyy · p")}</span>
                  {r.amount != null && (
                    <span className="text-foreground font-medium">
                      ₹{r.amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setPendingDelete(r.id)}
                className="w-8 h-8 rounded-full hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex items-center justify-center transition-colors shrink-0"
                aria-label="Delete record"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(o) => !o && setPendingDelete(null)}
      >
        <AlertDialogContent className="bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl text-white">
                Delete record?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground/80 mt-2">
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-8 flex gap-3">
              <AlertDialogCancel className="flex-1 bg-white/[0.05] border-white/10 rounded-xl hover:bg-white/10 transition-colors">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="flex-1 bg-destructive/80 hover:bg-destructive rounded-xl transition-colors"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={showDeleteCustomerDialog}
        onOpenChange={setShowDeleteCustomerDialog}
      >
        <AlertDialogContent className="bg-[#0A0A0A] border border-white/10 rounded-3xl shadow-2xl overflow-hidden p-0">
          <div className="p-8">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display text-2xl text-white">
                Delete Customer?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground/80 mt-3 leading-relaxed">
                This will permanently delete <span className="text-white font-medium">{customer.name}</span> and all their associated records. This action cannot be reversed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-10 flex flex-col sm:flex-row gap-3">
              <AlertDialogCancel 
                disabled={isDeleting}
                className="w-full sm:flex-1 bg-white/[0.05] border-white/10 h-12 rounded-2xl hover:bg-white/10 transition-colors text-white/70"
              >
                Keep Customer
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleDeleteCustomer();
                }}
                disabled={isDeleting}
                className="w-full sm:flex-1 bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive hover:text-white h-12 rounded-2xl transition-all font-semibold"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default CustomerProfile;
