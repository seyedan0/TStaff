import React, { createContext, useContext, useState, useEffect } from "react";
import type { CurrentUser } from "../../shared/types.js";
import { apiClient } from "../../shared/api-client.js";
import { safeStorage } from "../../shared/storage.js";
import type { UserStage } from "@tstaff/contracts";

interface AuthContextType {
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  login: (phoneNumber: string, pass: string) => Promise<void>;
  logout: () => void;
  setStage: (stage: UserStage) => void;
  setUser: (user: CurrentUser | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(() => {
    const savedUser = safeStorage.getItem("tstaff_user_profile");
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        return null;
      }
    }
    // Default demo session for UI preview
    return {
      id: "11111111-1111-1111-1111-111111111111",
      phoneNumber: "09121234567",
      fullName: "دکتر علی رضایی (مدیر استانی و مدیر علمی)",
      stage: "INTERN",
      isSuspended: false,
      role: "MAIN_SUPERVISOR",
    };
  });

  useEffect(() => {
    if (currentUser) {
      safeStorage.setItem("tstaff_user_profile", JSON.stringify(currentUser));
      apiClient.setAuth(
        safeStorage.getItem("tstaff_token") || "mock-jwt-token",
        currentUser.stage,
        currentUser.id,
      );
    } else {
      safeStorage.removeItem("tstaff_user_profile");
      apiClient.setAuth(null, "APPRENTICE", null);
    }
  }, [currentUser]);

  const login = async (phoneNumber: string, _pass: string) => {
    // In Phase 1: password login (OTP deferred to post-MVP per project rules)
    const mockUser: CurrentUser = {
      id: "11111111-1111-1111-1111-111111111111",
      phoneNumber,
      fullName: "پژوهشگر نمونه سامانه",
      stage: "INTERN",
      isSuspended: false,
      role: "MAIN_SUPERVISOR",
    };
    setCurrentUser(mockUser);
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const setStage = (stage: UserStage) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, stage });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        logout,
        setStage,
        setUser: setCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
