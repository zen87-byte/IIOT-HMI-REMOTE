import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type UserRole = "viewer" | "operator";

interface User {
  id: string;
  username: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Demo users for the IIoT class - NOT for production use
const DEMO_USERS: Record<string, { password: string; role: UserRole }> = {
  viewer: { password: "viewer123", role: "viewer" },
  operator: { password: "operator123", role: "operator" },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for existing session
    const stored = localStorage.getItem("iiot_user");
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        localStorage.removeItem("iiot_user");
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const demoUser = DEMO_USERS[username.toLowerCase()];
    if (!demoUser) {
      return { success: false, error: "User not found" };
    }

    if (demoUser.password !== password) {
      return { success: false, error: "Invalid password" };
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      username: username.toLowerCase(),
      role: demoUser.role,
    };

    setUser(newUser);
    localStorage.setItem("iiot_user", JSON.stringify(newUser));
    return { success: true };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("iiot_user");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}