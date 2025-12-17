"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { LogOut, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/hooks";

export function Header() {
  const { theme, setTheme } = useTheme();
  const { user, loading, logout } = useAuth();

  const toggleTheme = React.useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [setTheme, theme]);

  return (
    <header className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">Console Admin</p>
        <p className="truncate text-xs text-muted-foreground">
          {loading ? "Carregando..." : user?.email ?? "Sem usuário"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" onClick={toggleTheme} aria-label="Alternar tema">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button
          variant="outline"
          onClick={() => void logout().then(() => (window.location.href = "/login"))}
          disabled={loading}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </header>
  );
}

