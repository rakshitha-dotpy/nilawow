import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerProfile from "./pages/CustomerProfile";
import AddRecord from "./pages/AddRecord";
import DailySummary from "./pages/DailySummary";
import Records from "./pages/Records";
import RequireAuth from "./components/RequireAuth";
import Splash from "./pages/Splash";
import { migrateLocalRecordsOnce } from "./services/records";

const queryClient = new QueryClient();

const LocalRecordsMigration = () => {
  useEffect(() => {
    void migrateLocalRecordsOnce().catch((e) => {
      // eslint-disable-next-line no-console
      console.error("[app] migrateLocalRecordsOnce failed", e);
    });
  }, []);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner theme="dark" position="top-center" />
      <BrowserRouter>
        <LocalRecordsMigration />
        <Routes>
          <Route path="/" element={<Splash />} />
          <Route path="/passcode" element={<Index />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <Dashboard />
              </RequireAuth>
            }
          />
          <Route
            path="/customers"
            element={
              <RequireAuth>
                <Customers />
              </RequireAuth>
            }
          />
          <Route
            path="/customers/:id"
            element={
              <RequireAuth>
                <CustomerProfile />
              </RequireAuth>
            }
          />
          <Route
            path="/add"
            element={
              <RequireAuth>
                <AddRecord />
              </RequireAuth>
            }
          />
          <Route
            path="/summary"
            element={
              <RequireAuth>
                <DailySummary />
              </RequireAuth>
            }
          />
          <Route
            path="/records"
            element={
              <RequireAuth>
                <Records />
              </RequireAuth>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
