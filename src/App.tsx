import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { MotorProvider } from "./contexts/MotorContext";

import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Monitoring from "./pages/Monitoring"; 
import Controller from "./pages/Controller";
import NotFound from "./pages/NotFound";
import Alarm from "./pages/Alarms";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <AuthProvider>
          <MotorProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
                {/* Route Dashboard (Halaman Utama) */}
                <Route index element={<Dashboard />} /> 
                
                {/* PERBAIKAN DI SINI: */}
                <Route path="monitoring" element={<Monitoring />} /> 
                <Route path="alarm" element={<Alarm />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </MotorProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;