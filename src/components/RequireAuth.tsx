import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useState, useCallback } from "react";
import LoginScreen from "@/components/LoginScreen";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem("app_logged_in") === "true");

  const handleLogin = useCallback(() => {
    setLoggedIn(true);
  }, []);

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </main>
    );
  }

  if (!isAuthenticated) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  if (!loggedIn) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return children;
}
