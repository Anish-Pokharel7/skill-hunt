"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/lib/db/types";
import { SEED_USERS } from "@/lib/auth/mock-users";

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isLoading: boolean;
  loginAsRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Default to SUPER_ADMIN or first user for demo convenience
  const [user, setUser] = useState<User | null>(SEED_USERS[0]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Check active session from API
    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (data.authenticated && data.user) {
          setUser(data.user);
        } else {
          // Initialize session with default SUPER_ADMIN for seamless developer preview
          await loginAsRole("SUPER_ADMIN");
        }
      } catch {
        setUser(SEED_USERS[0]);
      } finally {
        setIsLoading(false);
      }
    }
    checkSession();
  }, []);

  const loginAsRole = async (targetRole: UserRole) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: targetRole }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Login as role failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const switchUser = async (userId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch (err) {
      console.error("Switch user failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await fetch("/api/auth/session", { method: "DELETE" });
      setUser(SEED_USERS.find((u) => u.role === "CONSUMER") || null);
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || "CONSUMER",
        isLoading,
        loginAsRole,
        logout,
        switchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
