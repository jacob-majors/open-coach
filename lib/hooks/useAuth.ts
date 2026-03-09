"use client";
import { useEffect, useState } from "react";

interface AuthUser {
  userId: number;
  username: string;
  email: string;
  role: string | null;
  is_admin: number;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        setUser(data?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const loginWithGoogle = async () => {
    const { signInWithGoogle } = await import("@/lib/firebase");
    const result = await signInWithGoogle();
    // null means redirect was triggered — page will navigate away, no further action needed
    if (!result) return null;
    const r = await fetch("/api/auth/firebase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: result.idToken }),
    });
    if (r.ok) {
      const me = await fetch("/api/auth/me").then((r2) => r2.json());
      setUser(me?.user ?? null);
      return me?.user;
    }
    return null;
  };

  const logout = async () => {
    const { signOutFirebase } = await import("@/lib/firebase");
    await Promise.all([
      fetch("/api/auth/logout", { method: "POST" }),
      signOutFirebase().catch(() => {}),
    ]);
    setUser(null);
    window.location.href = "/auth/login";
  };

  return { user, loading, loginWithGoogle, logout };
}
