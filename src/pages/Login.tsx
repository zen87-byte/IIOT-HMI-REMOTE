import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Gauge, Eye, EyeOff, User, Lock } from "lucide-react";
import { toast } from "sonner";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error("Please enter both username and password");
      return;
    }

    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);

    if (result.success) {
      toast.success("Login successful");
      navigate("/");
    } else {
      toast.error(result.error || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="glass-card rounded-lg p-8">
          {/* Header */}
          <div className="flex flex-col items-center mb-8">
            <div className="p-3 rounded-lg bg-primary/10 mb-4">
              <Gauge className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">IIoT Motor Control</h1>
            <p className="text-muted-foreground mt-2 text-center">
              Sign in to access the monitoring dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="label-text">
                Username
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-10"
                  autoComplete="username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="label-text">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Demo Credentials */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground text-center mb-3">
              Demo Credentials for IIoT Class
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-medium text-label">Viewer</p>
                <p className="text-muted-foreground">viewer / viewer123</p>
                <p className="text-xs text-muted-foreground mt-1">Read-only access</p>
              </div>
              <div className="p-3 bg-secondary rounded-lg">
                <p className="font-medium text-label">Operator</p>
                <p className="text-muted-foreground">operator / operator123</p>
                <p className="text-xs text-muted-foreground mt-1">Full control</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;