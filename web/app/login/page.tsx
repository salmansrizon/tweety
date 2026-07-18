"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Prototype: real Supabase Auth (supabase.auth.signInWithPassword) is
    // wired once a live project + credentials exist. For now this just
    // demonstrates the flow into the gated dashboard shell.
    router.push("/dashboard/archive");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-white/10 bg-white/5 p-8">
        <h1 className="text-xl font-semibold">Tweety</h1>
        <p className="mt-1 text-sm text-white/60">Sign in to manage your archive</p>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm text-white/70">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm text-white/70">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/20 px-3 py-2 text-sm outline-none focus:border-white/30"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            className="mt-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-black hover:bg-white/90"
          >
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
