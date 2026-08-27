"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="pt-20 label">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const params = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(params.get("next") || "/");
      router.refresh();
    } else {
      setError("Mot de passe incorrect.");
    }
  }

  return (
    <div className="pt-20">
      <span className="label-ink block">Alpinia® / Access</span>
      <form onSubmit={handleSubmit} className="mt-6 max-w-xs">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="PASSWORD"
          className="w-full border border-hair bg-transparent px-3 py-2 text-sm uppercase tracking-label text-ink placeholder:text-mute focus:border-ink focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-4 w-full border border-ink bg-ink px-3 py-2 text-[10px] uppercase tracking-label text-paper transition-colors duration-100 hover:bg-transparent hover:text-ink disabled:opacity-50"
        >
          {loading ? "Checking…" : "Enter"}
        </button>
        {error && <p className="mt-3 text-[10px] uppercase tracking-label text-red">{error}</p>}
      </form>
    </div>
  );
}
