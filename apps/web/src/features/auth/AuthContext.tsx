import React, { createContext, useContext, useEffect, useState } from "react";
import type { CurrentUser } from "../../shared/types.js";
import { apiClient } from "../../shared/api-client.js";
import type { UserStage } from "@tstaff/contracts";

interface AuthContextType {
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  requiresRoleSelection: boolean;
  login: (phoneNumber: string, pass: string) => Promise<void>;
  loginDemo: (personaId: string) => Promise<void>;
  logout: () => void;
  setStage: (stage: UserStage) => void;
  setUser: (user: CurrentUser | null) => void;
  chooseRole: (role: CurrentUser["role"]) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requiresRoleSelection, setRequiresRoleSelection] = useState(false);

  useEffect(() => {
    let mounted = true;
    void apiClient.get<{ user: CurrentUser }>("/auth/session")
      .then(({ user }) => { if (mounted) { setCurrentUser(user); setRequiresRoleSelection((user.roles?.length ?? 0) > 1); } })
      .catch(() => { if (mounted) setCurrentUser(null); })
      .finally(() => { if (mounted) setIsLoading(false); });
    return () => { mounted = false; };
  }, []);

  const login = async (phoneNumber: string, pass: string) => {
    const { user } = await apiClient.post<{ user: CurrentUser }>("/auth/login", { phoneNumber, password: pass });
    const roles = user.roles ?? (user.role ? [user.role] : []);
    if (roles.length === 0) throw new Error("برای این حساب نقش سیستمی معتبری ثبت نشده است");
    setCurrentUser({ ...user, role: roles[0]!, roles });
    setRequiresRoleSelection(roles.length > 1);
  };

  const loginDemo = async (personaId: string) => {
    const { user } = await apiClient.post<{ user: CurrentUser }>("/demo/login", { personaId });
    setCurrentUser(user);
    setRequiresRoleSelection(false);
  };

  const logout = () => {
    void apiClient.post("/auth/logout").catch(() => undefined).finally(() => { setCurrentUser(null); setRequiresRoleSelection(false); });
  };

  const chooseRole = (role: CurrentUser["role"]) => {
    setCurrentUser((user) => user && user.roles?.includes(role) ? { ...user, role } : user);
    setRequiresRoleSelection(false);
  };

  const setStage = (stage: UserStage) => {
    setCurrentUser((user) => user ? { ...user, stage } : null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, isAuthenticated: !!currentUser, isLoading, requiresRoleSelection, login, loginDemo, logout, setStage, setUser: setCurrentUser, chooseRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};
