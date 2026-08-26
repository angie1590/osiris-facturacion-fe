import { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";
import { useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";
import { useSessionTimer } from "@/hooks/use-session-timer";
import { getSessionTimeoutMinutes } from "@/lib/api";

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobile, setMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 1024,
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const { user, logout, reloadUser } = useAuth();
  const navigate = useNavigate();
  const timeoutMinutes = getSessionTimeoutMinutes();

  const { showWarning } = useSessionTimer(() => {
    void handleLogout();
  }, timeoutMinutes);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(max-width: 1023px)");
    const onChange = () => {
      const isMobile = media.matches;
      setMobile(isMobile);
      if (!isMobile) setMobileSidebarOpen(false);
    };
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const handleSidebarToggle = () => {
    if (mobile) {
      setMobileSidebarOpen((open) => !open);
      return;
    }
    setCollapsed((c) => !c);
  };

  return (
    <div className="flex h-dvh overflow-hidden bg-[hsl(var(--content-bg))]">
      {mobile && mobileSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-sticky bg-slate-950/45 lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Cerrar menú"
        />
      )}

      <Sidebar
        collapsed={collapsed}
        mobile={mobile}
        mobileOpen={mobileSidebarOpen}
        onToggle={handleSidebarToggle}
        onNavigate={() => setMobileSidebarOpen(false)}
        style={{ zIndex: "var(--z-drawer)" }}
      />

      <div className="flex min-w-0 min-h-0 flex-1 flex-col overflow-hidden">
        <Topbar
          fullName={user?.full_name}
          username={user?.username}
          role={user?.role}
          showMenuButton={mobile}
          onMenuToggle={() => setMobileSidebarOpen((open) => !open)}
          onRefreshUser={reloadUser}
          onLogout={handleLogout}
        />

        {showWarning && (
          <div className="mx-5 mt-4 flex shrink-0 items-center gap-2 rounded-lg border border-amber-400/80 bg-amber-100/95 px-4 py-2.5 text-sm text-amber-900 shadow-token-sm">
            Tu sesión está por expirar por inactividad.
          </div>
        )}

        <main className="min-h-0 flex-1 overflow-y-auto p-5">
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
