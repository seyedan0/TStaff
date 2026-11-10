import React, { createContext, useContext, useEffect, useState } from "react";
import type { CurrentUser } from "../../shared/types.js";
import { apiClient } from "../../shared/api-client.js";
import type { SystemRole, UserStage } from "@tstaff/contracts";

interface AuthContextType {
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresRoleSelection: boolean;
  loggedOutExplicitly: boolean;
  login: (phoneNumber: string, pass: string) => Promise<void>;
  loginDemo: (personaId: string) => Promise<void>;
  logout: () => void;
  setStage: (stage: UserStage) => void;
  setUser: (user: CurrentUser | null) => void;
  chooseRole: (role: CurrentUser["role"]) => void;
}

const SESSION_ROLE_KEY = "tstaff_active_role";

function readStoredRole(): SystemRole | null {
  try {
    const value = typeof window !== "undefined" ? window.sessionStorage.getItem(SESSION_ROLE_KEY) : null;
    return value ? (value as SystemRole) : null;
  } catch {
    return null;
  }
}

function writeStoredRole(role: SystemRole | null): void {
  try {
    if (typeof window === "undefined") return;
    if (role) window.sessionStorage.setItem(SESSION_ROLE_KEY, role);
    else window.sessionStorage.removeItem(SESSION_ROLE_KEY);
  } catch {
    // Ignore storage quota or sandbox restrictions
  }
}

function resolveSessionUser(user: CurrentUser, allowStoredRole: boolean): { user: CurrentUser; requiresSelection: boolean } {
  const roles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
  if (roles.length === 0) {
    return { user, requiresSelection: false };
  }
  if (roles.length === 1) {
    writeStoredRole(roles[0]!);
    return { user: { ...user, role: roles[0]!, roles }, requiresSelection: false };
  }
  const stored = allowStoredRole ? readStoredRole() : null;
  if (stored && roles.includes(stored)) {
    return { user: { ...user, role: stored, roles }, requiresSelection: false };
  }
  return { user: { ...user, role: roles[0]!, roles }, requiresSelection: true };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresRoleSelection, setRequiresRoleSelection] = useState(false);
  const [loggedOutExplicitly, setLoggedOutExplicitly] = useState(false);

  useEffect(() => {
    let mounted = true;
    void apiClient.get<{ user: CurrentUser }>("/auth/session")
      .then(({ user }) => {
        if (!mounted) return;
        const resolved = resolveSessionUser(user, true);
        setCurrentUser(resolved.user);
        setRequiresRoleSelection(resolved.requiresSelection);
      })
      .catch(() => { if (mounted) setCurrentUser(null); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const login = async (phoneNumber: string, pass: string) => {
    setLoggedOutExplicitly(false);
    writeStoredRole(null);
    const { user } = await apiClient.post<{ user: CurrentUser }>("/auth/login", { phoneNumber, password: pass });
    const roles = user.roles?.length ? user.roles : (user.role ? [user.role] : []);
    if (roles.length === 0) throw new Error("برای این حساب نقش سیستمی معتبری ثبت نشده است");
    const resolved = resolveSessionUser(user, false);
    setCurrentUser(resolved.user);
    setRequiresRoleSelection(resolved.requiresSelection);
  };

  const loginDemo = async (personaId: string) => {
    setLoggedOutExplicitly(false);
    writeStoredRole(null);
    const { user } = await apiClient.post<{ user: CurrentUser }>("/demo/login", { personaId });
    const resolved = resolveSessionUser(user, false);
    setCurrentUser(resolved.user);
    setRequiresRoleSelection(false);
  };

  const logout = () => {
    setLoggedOutExplicitly(true);
    writeStoredRole(null);
    void apiClient.post("/auth/logout").catch(() => undefined).finally(() => { setCurrentUser(null); setRequiresRoleSelection(false); });
  };

  const chooseRole = (role: CurrentUser["role"]) => {
    setCurrentUser((user) => {
      if (!user) return user;
      const roles = user.roles?.length ? user.roles : [user.role];
      if (!roles.includes(role)) return user;
      writeStoredRole(role);
      return { ...user, role };
    });
    setRequiresRoleSelection(false);
  };

  const setStage = (stage: UserStage) => {
    setCurrentUser((user) => user ? { ...user, stage } : null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, isLoading, requiresRoleSelection, loggedOutExplicitly, login, loginDemo, logout, setStage, setUser: setCurrentUser, chooseRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
