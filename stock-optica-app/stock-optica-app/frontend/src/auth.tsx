import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { me, setToken, User } from "./api";

type AuthState = {
  user: User | null;
  loading: boolean;
  setSession: (token: string | null, user: User | null) => void;
  logout: () => void;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = (token: string | null, nextUser: User | null) => {
    setToken(token);
    setUser(nextUser);
  };

  const logout = () => setSession(null, null);

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setLoading(false);
          return;
        }
        // validates token + returns user
        const res = await me();
        const u = res.user as any;
        setUser({ id: u._id || u.id, name: u.name, email: u.email, role: u.role });
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo(() => ({ user, loading, setSession, logout }), [user, loading]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be used within AuthProvider");
  return v;
}
