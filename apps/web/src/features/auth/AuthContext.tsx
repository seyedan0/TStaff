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
    // Initially, user MUST log in first
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      safeStorage.setItem("tstaff_user_profile", JSON.stringify(currentUser));
      apiClient.setAuth(
        safeStorage.getItem("tstaff_token") || "session-token",
        currentUser.stage,
        currentUser.id,
      );
    } else {
      safeStorage.removeItem("tstaff_user_profile");
      safeStorage.removeItem("tstaff_token");
      apiClient.setAuth(null, "APPRENTICE", null);
    }
  }, [currentUser]);

  const login = async (phoneNumber: string, pass: string) => {
    try {
      const res = await apiClient.post<{ user: any; token: string }>("/auth/login", {
        phoneNumber,
        password: pass,
      });

      const user = res.user;
      const loggedInUser: CurrentUser = {
        id: user.id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName || "کاربر سامانه",
        stage: user.stage || "INTERN",
        isSuspended: !user.isActive,
        role: user.role || "INTERN",
      };

      safeStorage.setItem("tstaff_token", res.token);
      setCurrentUser(loggedInUser);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "شماره همراه یا گذرواژه واردشده نادرست است";
      throw new Error(message);
    }
  };

  const logout = () => {
    safeStorage.removeItem("tstaff_user_profile");
    safeStorage.removeItem("tstaff_token");
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
