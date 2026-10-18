"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { Sparkles, ShieldCheck, BookOpen, KeyRound } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { error: toastError, success: toastSuccess } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const showDemoHint = process.env.NEXT_PUBLIC_SHOW_DEMO_HINT !== "false";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Invalid email or password");
      }

      toastSuccess(`Welcome back, ${data.user.name}!`);

      const from = searchParams.get("from");
      if (from) {
        router.push(from);
      } else if (data.user.role === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/author");
      }
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in";
      setFormError(msg);
      toastError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setFormError("");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FFF5F6]">
      {/* Left Coral Hero */}
      <div className="w-full md:w-5/12 bg-[#F2697A] p-8 md:p-16 flex flex-col justify-between text-white relative overflow-hidden">
        {/* Soft blob overlay */}
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute top-10 right-10 w-64 h-64 rounded-full bg-[#E04F62] blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="bg-white px-4 py-2.5 rounded-[12px] inline-block shadow-sm">
            <Logo size="md" />
          </div>

          <div className="mt-16 md:mt-24 space-y-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight">
              Author Support, <br />
              <span className="text-[#DFF3F7]">Supercharged.</span>
            </h1>
            <p className="text-base md:text-lg text-white/90 max-w-md font-normal leading-relaxed">
              Faster resolutions, real-time royalty transparency, and AI-assisted care for over
              22,000+ published titles.
            </p>
          </div>
        </div>

        {/* Feature bullets */}
        <div className="relative z-10 mt-12 space-y-4 pt-8 border-t border-white/20">
          <div className="flex items-center gap-3 text-sm text-white/90">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span>Intelligent query classification and response drafting</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/90">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span>Real-time royalty tracking & distribution sync</span>
          </div>
          <div className="flex items-center gap-3 text-sm text-white/90">
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span>Role-based access control with audited operations</span>
          </div>
        </div>
      </div>

      {/* Right Login Form */}
      <div className="w-full md:w-7/12 flex items-center justify-center p-6 sm:p-12 md:p-16 relative">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-[#2E3A4B]">
              Sign in to your portal
            </h2>
            <p className="text-sm text-[#8A94A3] mt-2">
              Select or enter your credentials below to access Author or Admin dashboard.
            </p>
          </div>

          {formError && (
            <div className="p-4 rounded-[10px] bg-[#FDE4E8] border border-[#F3C9D0] text-[#D9435A] text-sm font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. ananya.reddy@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>

          {/* Demo Credentials Hint Box */}
          {showDemoHint && (
            <div className="p-5 rounded-[14px] bg-white border border-[#F3C9D0] shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#E04F62] uppercase tracking-wider">
                <KeyRound className="w-4 h-4" />
                <span>Demo Credentials (Click to Auto-fill)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => fillCredentials("admin@bookleafpub.com", "Admin@123")}
                  className="p-3 rounded-[10px] bg-[#FFF5F6] hover:bg-[#FDE4E8] border border-[#F3C9D0] text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-[#2E3A4B] flex items-center justify-between">
                    <span>Admin (Ops Lead)</span>
                    <span className="text-[10px] bg-[#4FB3C8] text-white px-1.5 py-0.2 rounded font-semibold">
                      Admin
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8A94A3] mt-0.5 truncate">
                    admin@bookleafpub.com
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials("ananya.reddy@email.com", "Author@123")}
                  className="p-3 rounded-[10px] bg-[#FFF5F6] hover:bg-[#FDE4E8] border border-[#F3C9D0] text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-[#2E3A4B] flex items-center justify-between">
                    <span>Ananya Reddy</span>
                    <span className="text-[10px] bg-[#F2697A] text-white px-1.5 py-0.2 rounded font-semibold">
                      Author
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8A94A3] mt-0.5 truncate">
                    ananya.reddy@email.com
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials("priya.sharma@email.com", "Author@123")}
                  className="p-3 rounded-[10px] bg-[#FFF5F6] hover:bg-[#FDE4E8] border border-[#F3C9D0] text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-[#2E3A4B] flex items-center justify-between">
                    <span>Priya Sharma</span>
                    <span className="text-[10px] bg-[#F2697A] text-white px-1.5 py-0.2 rounded font-semibold">
                      Author
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8A94A3] mt-0.5 truncate">
                    priya.sharma@email.com
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => fillCredentials("sneha.kulkarni@email.com", "Author@123")}
                  className="p-3 rounded-[10px] bg-[#FFF5F6] hover:bg-[#FDE4E8] border border-[#F3C9D0] text-left transition-colors cursor-pointer group"
                >
                  <div className="font-bold text-[#2E3A4B] flex items-center justify-between">
                    <span>Sneha Kulkarni</span>
                    <span className="text-[10px] bg-[#F2697A] text-white px-1.5 py-0.2 rounded font-semibold">
                      In-Prod
                    </span>
                  </div>
                  <div className="text-[11px] text-[#8A94A3] mt-0.5 truncate">
                    sneha.kulkarni@email.com
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#FFF5F6] text-[#F2697A] font-bold">
          Loading portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

