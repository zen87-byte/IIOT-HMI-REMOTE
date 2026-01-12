import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Gauge, LayoutDashboard, Activity, Settings, Bell, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Monitoring", path: "/monitoring", icon: Activity },
    { name: "Alarm", path: "/alarm", icon: Bell },
  ];

  return (
    // 1. KUNCI: h-screen dan overflow-hidden di container paling luar
    <div className="h-screen w-screen bg-background flex flex-col overflow-hidden">
      
      {/* --- TOP NAVIGATION BAR (Fixed Height) --- */}
      <header className="flex-none border-b border-border bg-card z-50 h-16">
        <div className="w-full h-full px-6 flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Gauge className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground leading-tight">TF4017</h1>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Industrial IOT</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-secondary/50 p-1 rounded-lg">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? "bg-card text-primary shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* User Profile */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex flex-col items-end">
               <span className="text-sm font-medium">{user?.username || "User"}</span>
               <span className="text-xs text-muted-foreground capitalize">{user?.role}</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full relative overflow-hidden bg-background">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;