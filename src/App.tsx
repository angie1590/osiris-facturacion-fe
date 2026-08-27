import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/shared/ProtectedRoute";
import { RoleGuard } from "@/components/shared/RoleGuard";
import AppLayout from "@/layouts/AppLayout";
import AuthLayout from "@/layouts/AuthLayout";
import Forbidden from "@/pages/Forbidden";
import NotFound from "@/pages/NotFound";

// Auth pages
const LoginPage = lazy(() => import("@/pages/auth/LoginPage"));
const ChangePasswordPage = lazy(
  () => import("@/pages/auth/ChangePasswordPage"),
);

// App pages
const DashboardPage = lazy(() => import("@/pages/DashboardPage"));
const PersonasPage = lazy(() => import("@/pages/PersonasPage"));
const ProductosPage = lazy(() => import("@/pages/ProductosPage"));
const CategoriasCanonicasPage = lazy(() => import("@/pages/CategoriasPage"));
const AtributosPage = lazy(() => import("@/pages/AtributosPage"));
const CategoriasAtributosPage = lazy(() => import("@/pages/CategoriasAtributosPage"));
const BodegasPage = lazy(() => import("@/pages/BodegasPage"));
const ConfiguracionOperativaPage = lazy(() => import("@/pages/ConfiguracionOperativaPage"));
const ImpuestosPage = lazy(() => import("@/pages/ImpuestosPage"));
const EmpresaCanonicaPage = lazy(() => import("@/pages/EmpresaCanonicaPage"));
const VentasPage = lazy(() => import("@/pages/VentasPage"));
const CuentasPorPagarPage = lazy(() => import("@/pages/CuentasPorPagarPage"));
const ComprasPage = lazy(() => import("@/pages/ComprasPage"));
const RetencionesPage = lazy(() => import("@/pages/RetencionesPage"));
const RetencionesHistorialPage = lazy(() => import("@/pages/RetencionesHistorialPage"));
const ReporteComprasPage = lazy(() => import("@/pages/ReporteComprasPage"));
const ReporteCarteraPagarPage = lazy(() => import("@/pages/ReporteCarteraPagarPage"));
const ReporteSRIPage = lazy(() => import("@/pages/ReporteSRIPage"));
const ReporteTributarioPage = lazy(() => import("@/pages/ReporteTributarioPage"));
const DocumentosSRIPage = lazy(() => import("@/pages/DocumentosSRIPage"));
const CategoriesPage = lazy(() => import("@/pages/catalog/CategoriesPage"));
const ProductsPage = lazy(() => import("@/pages/catalog/ProductsPage"));
const ProductDetailPage = lazy(
  () => import("@/pages/catalog/ProductDetailPage"),
);
const ProductFormPage = lazy(() => import("@/pages/catalog/ProductFormPage"));
const RecategorizePage = lazy(() => import("@/pages/catalog/RecategorizePage"));
const CatalogsPage = lazy(() => import("@/pages/catalog/CatalogsPage"));
const SuppliersPage = lazy(() => import("@/pages/catalog/SuppliersPage"));
const CustomersPage = lazy(() => import("@/pages/catalog/CustomersPage"));
const RemapPage = lazy(() => import("@/pages/catalog/RemapPage"));
const IngresosPage = lazy(() => import("@/pages/inventory/IngresosPage"));
const IngresoNewPage = lazy(() => import("@/pages/inventory/IngresoNewPage"));
const IngresoDetailPage = lazy(
  () => import("@/pages/inventory/IngresoDetailPage"),
);
const EgresosPage = lazy(() => import("@/pages/inventory/EgresosPage"));
const EgresoNewPage = lazy(() => import("@/pages/inventory/EgresoNewPage"));
const EgresoDetailPage = lazy(
  () => import("@/pages/inventory/EgresoDetailPage"),
);
const EgresoPrintPage = lazy(() => import("@/pages/inventory/EgresoPrintPage"));
const ConteosPage = lazy(() => import("@/pages/inventory/ConteosPage"));
const ConteoNewPage = lazy(() => import("@/pages/inventory/ConteoNewPage"));
const ConteoDetailPage = lazy(
  () => import("@/pages/inventory/ConteoDetailPage"),
);
const KardexPage = lazy(() => import("@/pages/KardexPage"));
const ReportsPage = lazy(() => import("@/pages/reports/ReportsPage"));
const AuditPage = lazy(() => import("@/pages/AuditPage"));
const AdminUsersPage = lazy(() => import("@/pages/admin/AdminUsersPage"));
const AdminParamsPage = lazy(() => import("@/pages/admin/AdminParamsPage"));
const AdminCompanyPage = lazy(() => import("@/pages/admin/AdminCompanyPage"));

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
            {/* Auth routes */}
            <Route element={<AuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/change-password" element={<ChangePasswordPage />} />
            </Route>

            {/* Protected app routes */}
            <Route element={<ProtectedRoute />}>
              <Route
                element={
                  <RoleGuard roles={["admin", "operator", "supervisor"]} />
                }
              >
                <Route
                  path="/inventory/egresos/:id/print"
                  element={<EgresoPrintPage />}
                />
              </Route>
              <Route element={<AppLayout />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/personas" element={<PersonasPage />} />
                <Route path="/productos" element={<ProductosPage />} />
                <Route path="/categorias" element={<CategoriasCanonicasPage />} />
                <Route path="/atributos" element={<AtributosPage />} />
                <Route path="/categorias-atributos" element={<CategoriasAtributosPage />} />
                <Route path="/bodegas" element={<BodegasPage />} />
                <Route path="/configuracion-operativa" element={<ConfiguracionOperativaPage />} />
                <Route path="/impuestos" element={<ImpuestosPage />} />
                <Route path="/empresa" element={<EmpresaCanonicaPage />} />
                <Route path="/ventas" element={<VentasPage />} />
                <Route path="/compras" element={<ComprasPage />} />
                <Route path="/retenciones" element={<RetencionesPage />} />
                <Route path="/retenciones/historial" element={<RetencionesHistorialPage />} />
                <Route path="/reportes/compras" element={<ReporteComprasPage />} />
                <Route path="/reportes/cartera-pagar" element={<ReporteCarteraPagarPage />} />
                <Route path="/reportes/sri" element={<ReporteSRIPage />} />
                <Route path="/reportes/tributario" element={<ReporteTributarioPage />} />
                <Route path="/documentos-sri" element={<DocumentosSRIPage />} />
                <Route path="/cuentas-por-pagar" element={<CuentasPorPagarPage />} />

                {/* Categories - all roles can view; write is gated in-page (admin + supervisor) */}
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/suppliers" element={<SuppliersPage />} />
                <Route path="/customers" element={<CustomersPage />} />
                <Route path="/products/new" element={<ProductFormPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route
                  path="/products/:id/edit"
                  element={<ProductFormPage />}
                />
                {/* Recategorization + attribute remap - admin + supervisor */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/recategorize" element={<RecategorizePage />} />
                  <Route path="/remap" element={<RemapPage />} />
                </Route>
                {/* Master catalogs - admin + supervisor */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/catalogs" element={<CatalogsPage />} />
                </Route>

                {/* Ingresos: vendedores solo pueden registrar compras */}
                <Route
                  element={
                    <RoleGuard roles={["admin", "operator", "supervisor"]} />
                  }
                >
                  <Route
                    path="/inventory/ingresos"
                    element={<IngresosPage />}
                  />
                  <Route
                    path="/inventory/ingresos/new"
                    element={<IngresoNewPage />}
                  />
                  <Route
                    path="/inventory/ingresos/:id"
                    element={<IngresoDetailPage />}
                  />
                  <Route
                    path="/inventory/bajas"
                    element={<Navigate to="/inventory/egresos" replace />}
                  />
                  <Route
                    path="/inventory/bajas/new"
                    element={<Navigate to="/inventory/egresos/new" replace />}
                  />
                  <Route
                    path="/inventory/bajas/:id"
                    element={<Navigate to="/inventory/egresos" replace />}
                  />
                  <Route
                    path="/inventory/ajustes"
                    element={<Navigate to="/inventory/ingresos" replace />}
                  />
                  <Route
                    path="/inventory/ajustes/new"
                    element={<Navigate to="/inventory/ingresos/new" replace />}
                  />
                  <Route
                    path="/inventory/ajustes/:id"
                    element={<Navigate to="/inventory/ingresos" replace />}
                  />
                </Route>

                {/* Egresos y conteos - todos los roles */}
                <Route path="/inventory/egresos" element={<EgresosPage />} />
                <Route
                  path="/inventory/egresos/new"
                  element={<EgresoNewPage />}
                />
                <Route
                  path="/inventory/egresos/:id"
                  element={<EgresoDetailPage />}
                />
                <Route
                  path="/inventory/conteos/new"
                  element={<ConteoNewPage />}
                />

                <Route path="/inventory/conteos" element={<ConteosPage />} />
                <Route
                  path="/inventory/conteos/:id"
                  element={<ConteoDetailPage />}
                />

                {/* Kardex - admin + supervisor */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/kardex" element={<KardexPage />} />
                  <Route path="/kardex/:productId" element={<KardexPage />} />
                </Route>

                {/* Reports + Audit - admin + supervisor */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/reports/*" element={<ReportsPage />} />
                  <Route path="/audit" element={<AuditPage />} />
                </Route>

                {/* Admin */}
                <Route element={<RoleGuard roles={["admin", "supervisor"]} />}>
                  <Route path="/admin/users" element={<AdminUsersPage />} />
                  <Route path="/admin/company" element={<AdminCompanyPage />} />
                </Route>
                <Route element={<RoleGuard roles={["admin"]} />}>
                  <Route path="/admin/params" element={<AdminParamsPage />} />
                </Route>
              </Route>
            </Route>

            <Route path="/403" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}
