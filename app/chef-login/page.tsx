"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";  // ✅ Fixed import
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

// Main page component with Suspense
export default function ChefLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
        <div className="text-white text-2xl">Loading login...</div>
      </div>
    }>
      <ChefLoginContent />
    </Suspense>
  );
}

// Child component with useSearchParams (safe now)
function ChefLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();  // ✅ Now works!
  const redirectTo = searchParams.get("redirect") || "/chef";

  const [email, setEmail] = useState("chef@restaurant.com");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-redirect if already logged in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace(redirectTo);
      }
    });
    return () => unsub();
  }, [router, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(redirectTo);
    } catch (err: any) {
      console.error("Login failed", err);
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          👨‍🍳 Chef Login
        </h1>
        <p className="text-gray-300 text-center mb-8">
          Sign in to view and manage live orders.
        </p>

        {error && (
          <div className="mb-6 rounded-xl bg-red-500/20 border border-red-500/60 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-200 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/80 text-black border border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-200 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-white/80 text-black border border-white/50 focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold text-lg shadow-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          Need help? Contact restaurant admin.
        </p>
      </div>
    </div>
  );
}
