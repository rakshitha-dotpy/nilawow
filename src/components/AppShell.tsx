import { ReactNode } from "react";
import { ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import mark from "@/assets/nila-wow-mark.png";
import { endSession } from "@/lib/auth";

type Props = {
  title?: string;
  back?: boolean;
  right?: ReactNode;
  wide?: boolean;
  children: ReactNode;
};

const AppShell = ({ title, back, right, wide, children }: Props) => {
  const navigate = useNavigate();
  const container = wide ? "nw-container" : "nw-container";

  const handleLogout = () => {
    endSession();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 glass border-b hairline">
        <div className={`${container} h-20 md:h-22 flex items-center gap-4 md:gap-6`}>
          {back && (
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 -ml-2 rounded-full hover:bg-accent flex items-center justify-center transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
            </button>
          )}
          <button
            onClick={() => navigate("/dashboard")}
            className="shrink-0 flex items-center gap-3 hover:opacity-80 transition-opacity"
            aria-label="NILA WOW home"
          >
            <img
              src={mark}
              alt="NILA WOW"
              className="h-14 w-14 md:h-16 md:w-16 object-contain select-none"
              draggable={false}
            />
            <span className="font-brand text-2xl md:text-3xl tracking-wide hidden sm:inline">
              NILA WOW
            </span>
          </button>
          <div className="flex-1 min-w-0 flex justify-center">
            {title && (
              <h2 className="text-base md:text-lg font-medium tracking-wide truncate text-white/80">
                {title}
              </h2>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {right}
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-full hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Logout"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>
      <main className="fade-in">
        <div className={`${container} py-6 md:py-8 pb-20`}>{children}</div>
      </main>
    </div>
  );
};

export default AppShell;
