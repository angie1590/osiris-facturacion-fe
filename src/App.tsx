import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import Forbidden from "@/pages/Forbidden";
import NotFound from "@/pages/NotFound";

const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ChangePasswordPage = lazy(() => import("@/pages/auth/ChangePasswordPage"));
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const PersonasPage = lazy(() => import("@/pages/personas/PersonasPage"));
const ClientesPage = lazy(() => import("@/pages/personas/ClientesPage"));
const ProveedoresPage = lazy(() => import("@/pages/personas/ProveedoresPage"));
const EmpresasPage = lazy(() => import("@/pages/admin/EmpresasPage"));

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      Cargando...
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>

            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/personas" element={<PersonasPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/proveedores" element={<ProveedoresPage />} />
                <Route path="/admin/empresas" element={<EmpresasPage />} />
              </Route>
            </Route>

            <Route path="/forbidden" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
