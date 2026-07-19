"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-browser";
import {
  Sparkles,
  Warehouse,
  Package,
  ArrowRightLeft,
  ArrowRight,
  Loader2,
} from "lucide-react";

type Slide = {
  icon: React.ElementType;
  title: string;
  body: string;
};

export default function WelcomePage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [finishing, setFinishing] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setName(((user.user_metadata?.name as string) || "").trim());
    });
  }, [supabase]);

  const slides: Slide[] = [
    {
      icon: Sparkles,
      title: name ? `Welcome, ${name}.` : "Welcome to Registrar.",
      body: "Your stock, across every location, in one place. Here's the quick tour — it takes 20 seconds.",
    },
    {
      icon: Warehouse,
      title: "Add your warehouses",
      body: "Every place you keep goods is a warehouse — a shop, a store, a lock-up. Add as many as you have. You'll always see what's sitting in each one.",
    },
    {
      icon: Package,
      title: "Add products & stock them",
      body: "Add each product once, then record how much of it sits in each warehouse. No need to enter every sale — just the stock you're holding.",
    },
    {
      icon: ArrowRightLeft,
      title: "Record the movements that matter",
      body: "Goods arrive → Stock in. Moving between locations → Transfer. Sent out to a shop → Stock out. Registrar keeps every warehouse in sync so you always know exactly what's where.",
    },
  ];

  const isLast = step === slides.length - 1;
  const current = slides[step];
  const Icon = current.icon;

  const finish = async () => {
    setFinishing(true);
    // Mark onboarding complete via the server (service role) so it's reliable
    // regardless of row-level security on the users table.
    await fetch("/api/onboarding", { method: "POST" }).catch(() => {});
    router.push("/dashboard");
  };

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setStep((s) => s + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-primary-dark)] relative overflow-hidden flex flex-col">
      {/* Decorative circles */}
      <div className="absolute top-[-100px] right-[-80px] w-80 h-80 rounded-full bg-white/5" />
      <div className="absolute bottom-[-140px] left-[-80px] w-96 h-96 rounded-full bg-white/5" />

      {/* Skip */}
      <div className="relative z-10 flex justify-end p-6">
        <button
          onClick={finish}
          disabled={finishing}
          className="text-sm text-white/70 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
        >
          Skip
        </button>
      </div>

      {/* Slide */}
      <div className="relative z-10 flex-1 flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
            <Icon size={36} className="text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            {current.title}
          </h1>
          <p className="text-white/75 text-lg leading-relaxed">{current.body}</p>
        </div>
      </div>

      {/* Footer: dots + Continue */}
      <div className="relative z-10 flex items-center justify-between p-6 sm:p-8">
        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                i === step ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={next}
          disabled={finishing}
          className="cta-pulse inline-flex items-center gap-2 bg-white text-[var(--color-primary)] font-semibold py-3 px-6 rounded-2xl shadow-lg hover:scale-[1.03] transition-transform cursor-pointer disabled:opacity-70 disabled:hover:scale-100"
        >
          {finishing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Getting things ready…
            </>
          ) : isLast ? (
            <>
              Enter Registrar
              <ArrowRight size={18} />
            </>
          ) : (
            <>
              Continue
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </div>
    </div>
  );
}
