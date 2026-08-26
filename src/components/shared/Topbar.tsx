import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { LogOut, Menu, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_ITEMS } from "@/components/shared/Sidebar";

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  operator: "Vendedor",
  supervisor: "Supervisor",
};

interface TopbarProps {
  username?: string;
  fullName?: string;
  role?: string;
  showMenuButton?: boolean;
  onMenuToggle?: () => void;
  onRefreshUser: () => Promise<void>;
  onLogout: () => void | Promise<void>;
}

export function Topbar({
  username,
  fullName,
  role,
  showMenuButton = false,
  onMenuToggle,
  onLogout,
}: TopbarProps) {
  const location = useLocation();

  const currentSection = useMemo(() => {
    const found = NAV_ITEMS.find(
      (item) => item.to !== "/" && location.pathname.startsWith(item.to),
    );
    if (found) return found.label;
    if (location.pathname === "/") return "Dashboard";
    return "Panel";
  }, [location.pathname]);

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-[hsl(var(--header-bg))] px-5">
      <div className="flex items-center gap-3">
        {showMenuButton && (
          <Button variant="ghost" size="icon" onClick={onMenuToggle} aria-label="Abrir menú">
            <Menu className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg font-semibold">{currentSection}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium leading-tight">{fullName ?? username}</p>
          <p className="text-xs text-muted-foreground">{role ? (ROLE_LABELS[role] ?? role) : ""}</p>
        </div>
        <User className="h-5 w-5 text-muted-foreground" />
        <Button variant="ghost" size="icon" onClick={() => void onLogout()} aria-label="Cerrar sesión">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
