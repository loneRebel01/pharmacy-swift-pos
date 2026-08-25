import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, User } from "lucide-react";

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const appName = localStorage.getItem("app_name") || "Free Buff Pharmacy";

  useEffect(() => {
    // Initialize defaults if not set
    if (!localStorage.getItem("login_username")) {
      localStorage.setItem("login_username", "admin");
    }
    if (!localStorage.getItem("login_password")) {
      localStorage.setItem("login_password", "admin123");
    }
  }, []);

  const handleLogin = () => {
    const storedUser = localStorage.getItem("login_username") || "admin";
    const storedPass = localStorage.getItem("login_password") || "admin123";

    if (username === storedUser && password === storedPass) {
      sessionStorage.setItem("app_logged_in", "true");
      onLogin();
    } else {
      setError("Invalid username or password");
      setPassword("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm mx-4">
        <div className="border-2 border-border bg-card p-8">
          {/* Logo / Title */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto bg-accent border-2 border-border flex items-center justify-center mb-3">
              <Lock className="size-8 text-foreground" />
            </div>
            <h1 className="text-xl font-bold uppercase tracking-wide">
              {appName}
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              Sign in to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-destructive/10 border border-destructive text-destructive text-xs text-center">
              {error}
            </div>
          )}

          {/* Username */}
          <div className="mb-3">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Username
            </label>
            <div className="relative mt-1">
              <User className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
                className="w-full h-9 pl-8 pr-3 text-sm border-2 border-border bg-background focus:border-primary outline-none"
                autoFocus
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password */}
          <div className="mb-4">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">
              Password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                onKeyDown={handleKeyDown}
                className="w-full h-9 pl-8 pr-3 text-sm border-2 border-border bg-background focus:border-primary outline-none"
                placeholder="Enter password"
              />
            </div>
          </div>

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            className="w-full nb-btn nb-btn-primary text-sm"
          >
            Sign In
          </Button>

          <p className="text-[10px] text-muted-foreground text-center mt-4">
            Default: admin / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
