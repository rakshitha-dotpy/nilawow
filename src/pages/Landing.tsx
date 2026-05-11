import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  startSession,
  verifyPasscode,
} from "@/lib/auth";
import { toast } from "sonner";
import mark from "@/assets/nila-wow-mark.png";

const Landing = () => {
  const navigate = useNavigate();
  const [pass, setPass] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    const ok = await verifyPasscode(pass);
    setLoading(false);
    if (!ok) {
      toast.error("Incorrect passcode");
      setPass("");
      return;
    }
    startSession();
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 md:px-6 bg-background fade-in relative overflow-y-auto">
      <div className="relative flex flex-col items-center text-center slide-up mt-16 md:mt-24 w-full max-w-[320px]">
        <img
          src={mark}
          alt="NILA WOW logo"
          className="w-28 h-28 md:w-40 md:h-40 object-contain select-none opacity-95"
          draggable={false}
        />
        <h1 className="mt-8 font-brand text-5xl md:text-6xl tracking-wide">
          NILA WOW
        </h1>
        <p className="mt-3 text-[11px] md:text-xs tracking-[0.4em] uppercase text-muted-foreground">
          Style • Sparkle • Beauty
        </p>

        <form onSubmit={handleSubmit} className="w-full mt-12 space-y-4">
          <div className="space-y-2 text-left">
            <label htmlFor="pass" className="text-[10px] uppercase tracking-widest text-muted-foreground/60 ml-2">
              Enter Passcode
            </label>
            <Input
              id="pass"
              type="password"
              autoFocus
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              className="h-14 bg-[#050505] border-white/10 rounded-2xl px-5 text-center text-2xl tracking-[0.5em] focus-visible:ring-1 focus-visible:ring-white/30 transition-all font-mono"
              placeholder=""
            />
          </div>
          <Button
            type="submit"
            size="lg"
            disabled={loading || !pass}
            className="w-full h-14 rounded-2xl text-base font-medium mt-6 bg-white text-black hover:bg-white/90 shadow-xl"
          >
            {loading ? "Verifying..." : "Enter"}
          </Button>
        </form>
      </div>

      <div className="mt-auto pt-16 pb-8 text-[9px] text-muted-foreground/30 tracking-[0.4em] uppercase">
        a digital notebook
      </div>
    </div>
  );
};

export default Landing;
