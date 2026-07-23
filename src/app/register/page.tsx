"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  Loader2,
  Building2,
  Users,
  ArrowLeft,
  Mail,
} from "lucide-react";

type Step = "choose" | "register" | "otp";

export default function RegisterPage() {
  const [step, setStep] = useState<Step>("choose");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    businessName: "",
  });

  const [otpCode, setOtpCode] = useState("");
  const [resending, setResending] = useState(false);

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.businessName.trim()
    ) {
      setError("All fields are required");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    setError("");

    const res = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        email: form.email.trim().toLowerCase(),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to send verification code");
      setLoading(false);
      return;
    }
    setStep("otp");
    setLoading(false);
  };

  const handleResendOTP = async () => {
    setResending(true);
    setError("");
    await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "send",
        email: form.email.trim().toLowerCase(),
      }),
    });
    setResending(false);
    setError("New code sent!");
    setTimeout(() => setError(""), 3000);
  };

  const handleVerifyAndRegister = async () => {
    if (otpCode.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError("");

    const verifyRes = await fetch("/api/otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify",
        email: form.email.trim().toLowerCase(),
        code: otpCode,
      }),
    });
    const verifyData = await verifyRes.json();
    if (!verifyRes.ok) {
      setError(verifyData.error || "Invalid code");
      setLoading(false);
      return;
    }

    const registerRes = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        businessName: form.businessName.trim(),
      }),
    });
    const registerData = await registerRes.json();
    if (!registerRes.ok) {
      setError(registerData.error || "Failed to create account");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    if (signInError) {
      setError("Account created! Go to login to sign in.");
      setLoading(false);
      return;
    }
    router.push("/welcome");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-[var(--color-primary)] relative overflow-hidden items-center justify-center">
        <div className="absolute top-[-80px] right-[-80px] w-64 h-64 rounded-full bg-white/5" />
        <div className="absolute bottom-[-120px] left-[-60px] w-96 h-96 rounded-full bg-white/5" />
        <div className="absolute top-1/3 left-1/4 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative z-10 max-w-md px-12">
          <img
            src="/icon.svg"
            alt="Registrar"
            className="w-16 h-16 rounded-2xl mb-8"
          />
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            Take control
            <br />
            of your business.
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Join Nigerian businesses tracking stock across warehouses and
            running smarter operations with Registrar.
          </p>
        </div>
      </div>

      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center bg-gray-50 px-6 py-8">
        <div className="w-full max-w-sm">
          {step === "choose" && (
            <div>
              <div className="text-center mb-8">
                <h2 className="text-xl font-semibold text-gray-900">
                  Get started
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  How would you like to use Registrar?
                </p>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setStep("register")}
                  className="w-full bg-white rounded-2xl border-2 border-gray-200 hover:border-[var(--color-primary)] p-5 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[var(--color-primary-light)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--color-primary)] transition-colors">
                      <Building2
                        size={22}
                        className="text-[var(--color-primary)] group-hover:text-white transition-colors"
                      />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        I own a business
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Create your account and start managing your warehouses,
                        stock, and staff
                      </p>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => router.push("/login")}
                  className="w-full bg-white rounded-2xl border-2 border-gray-200 hover:border-gray-400 p-5 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0 group-hover:bg-gray-200 transition-colors">
                      <Users size={22} className="text-gray-600" />
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900">
                        I&apos;m a staff member
                      </p>
                      <p className="text-sm text-gray-500 mt-1">
                        Your admin will create your account. Go to login to sign
                        in
                      </p>
                    </div>
                  </div>
                </button>
              </div>
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-[var(--color-primary)] font-medium hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {step === "register" && (
            <div>
              <button
                onClick={() => {
                  setStep("choose");
                  setError("");
                }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 cursor-pointer"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Create your account
                </h2>
                <p className="text-sm text-gray-500 mb-8">
                  Set up your business on Registrar
                </p>
                <form onSubmit={handleSendOTP} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business name
                    </label>
                    <input
                      type="text"
                      value={form.businessName}
                      onChange={(e) =>
                        updateField("businessName", e.target.value)
                      }
                      placeholder="e.g. Alhaji Distributors"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Your Username
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => updateField("name", e.target.value)}
                      placeholder="e.g. Alhaji"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email address
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateField("email", e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) =>
                          updateField("password", e.target.value)
                        }
                        placeholder="At least 6 characters"
                        required
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent pr-12"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                  {error && (
                    <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-100">
                      {error}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" /> Sending
                        verification code...
                      </>
                    ) : (
                      "Continue"
                    )}
                  </button>
                </form>
              </div>
              <p className="text-center text-sm text-gray-500 mt-6">
                Already have an account?{" "}
                <button
                  onClick={() => router.push("/login")}
                  className="text-[var(--color-primary)] font-medium hover:underline cursor-pointer"
                >
                  Sign in
                </button>
              </p>
            </div>
          )}

          {step === "otp" && (
            <div>
              <button
                onClick={() => {
                  setStep("register");
                  setError("");
                  setOtpCode("");
                }}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 mb-6 cursor-pointer"
              >
                <ArrowLeft size={16} /> Back
              </button>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="w-14 h-14 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Mail size={24} className="text-[var(--color-primary)]" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-1">
                  Check your email
                </h2>
                <p className="text-sm text-gray-500 mb-2">
                  We sent a 6-digit code to
                </p>
                <p className="text-sm font-medium text-gray-900 mb-8">
                  {form.email}
                </p>

                <div className="space-y-5">
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-4 py-4 rounded-xl border border-gray-300 text-center text-2xl font-bold tracking-[0.5em] text-gray-900 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
                  />
                  {error && (
                    <div
                      className={`text-sm px-4 py-3 rounded-xl ${error === "New code sent!" ? "bg-green-50 text-green-600 border border-green-100" : "bg-red-50 text-red-600 border border-red-100"}`}
                    >
                      {error}
                    </div>
                  )}
                  <button
                    onClick={handleVerifyAndRegister}
                    disabled={loading || otpCode.length !== 6}
                    className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white font-medium py-3 px-4 rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm shadow-sm cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />{" "}
                        Verifying...
                      </>
                    ) : (
                      "Verify & create account"
                    )}
                  </button>
                  <p className="text-sm text-gray-500">
                    Didn&apos;t receive it?{" "}
                    <button
                      onClick={handleResendOTP}
                      disabled={resending}
                      className="text-[var(--color-primary)] font-medium hover:underline cursor-pointer disabled:opacity-60"
                    >
                      {resending ? "Sending..." : "Resend code"}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
