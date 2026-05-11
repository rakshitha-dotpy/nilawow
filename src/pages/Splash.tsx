import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import mark from "@/assets/nila-wow-mark.png";

const DURATION_MS = 2000;

export default function Splash() {
  const navigate = useNavigate();

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 1 + Math.random() * 2,
        delay: Math.random() * 0.8,
        drift: 10 + Math.random() * 24,
        alpha: 0.08 + Math.random() * 0.12,
      })),
    [],
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      navigate("/passcode", { replace: true });
    }, DURATION_MS);
    return () => window.clearTimeout(t);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden relative">
      <div className="nw-splash-bg" aria-hidden="true" />
      <div className="nw-splash-noise" aria-hidden="true" />

      {particles.map((p) => (
        <motion.span
          key={p.id}
          aria-hidden="true"
          className="absolute rounded-full bg-white"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: p.size,
            height: p.size,
            opacity: p.alpha,
            filter: "blur(0.2px)",
          }}
          initial={{ y: 0, opacity: 0 }}
          animate={{ y: [-p.drift, 0, p.drift], opacity: [0, p.alpha, 0] }}
          transition={{
            duration: 5 + Math.random() * 4,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, scale: 0.92, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.95, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <motion.div
            className="relative"
            initial={{ opacity: 0, scale: 0.88 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: [0.2, 0.9, 0.2, 1] }}
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0) 70%)",
                filter: "blur(18px)",
              }}
              animate={{ opacity: [0.45, 0.75, 0.45], scale: [0.98, 1.05, 0.98] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <img
              src={mark}
              alt="NILA WOW"
              className="relative w-28 h-28 md:w-40 md:h-40 object-contain select-none"
              draggable={false}
            />
          </motion.div>

          <motion.h1
            className="mt-10 font-brand text-6xl md:text-7xl tracking-wide"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.15, ease: [0.2, 0.8, 0.2, 1] }}
          >
            NILA WOW
          </motion.h1>
          <motion.p
            className="mt-3 text-[11px] md:text-xs tracking-[0.45em] uppercase text-muted-foreground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
          >
            a digital notebook
          </motion.p>

          <motion.div
            className="mt-12 h-[2px] w-44 overflow-hidden rounded-full bg-white/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.45 }}
          >
            <motion.div
              className="h-full bg-white/40"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{
                duration: 1.15,
                delay: 0.55,
                ease: [0.2, 0.8, 0.2, 1],
              }}
            />
          </motion.div>
        </motion.div>

        <motion.div
          className="absolute bottom-10 text-[10px] tracking-[0.4em] uppercase text-muted-foreground/40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.75 }}
        >
          loading
        </motion.div>
      </motion.div>

      <motion.div
        className="pointer-events-none absolute inset-0 z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.8] }}
        transition={{ duration: 2.1, times: [0, 0.7, 1], ease: "easeInOut" }}
        style={{ background: "black" }}
        aria-hidden="true"
      />
    </div>
  );
}

