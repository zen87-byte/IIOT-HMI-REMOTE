import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// Sesuaikan tipe User dengan respon dari Backend (server.ts)
export interface User {
  id: number;
  username: string;
  role: "viewer" | "operator";
  name?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // 1. Inisialisasi State dari LocalStorage agar tidak logout saat refresh
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("iiot_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem("iiot_token");
  });

  // 2. Fungsi Login ke Backend
  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Ambil URL Backend dari .env
      const apiUrl = import.meta.env.VITE_API_URL; 
      
      // Debugging: Cek URL di Console Browser
      console.log(`[Auth] Connecting to: ${apiUrl}/api/auth/login`);

      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: "POST",
        // --- KUNCI PERBAIKAN: Header JSON wajib ada ---
        headers: {
          "Content-Type": "application/json",
        },
        // ----------------------------------------------
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // 3. Jika Sukses: Simpan data ke State & LocalStorage
      const loggedUser = data.user;
      const loggedToken = data.token;

      setUser(loggedUser);
      setToken(loggedToken);

      localStorage.setItem("iiot_user", JSON.stringify(loggedUser));
      localStorage.setItem("iiot_token", loggedToken);

      return { success: true };

    } catch (error: any) {
      console.error("[Auth] Login Error:", error);
      // Jika error karena backend mati/IP salah
      if (error.message.includes("Failed to fetch")) {
        return { success: false, error: "Cannot connect to server. Check IP/Network." };
      }
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("iiot_user");
    localStorage.removeItem("iiot_token");
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!user }}>
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